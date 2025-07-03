import { Request, Response } from 'express';
import { PrismaClient, FuelingOperation, Airline, FuelTank, Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

const prisma = new PrismaClient();

// Define types to use for our operations
interface TankData { // This interface is for FuelTank (mobile tankers)
  id: number;
  identifier: string; 
  name: string;       
  capacity_liters: Decimal;
  current_liters: Decimal; // Assuming this is the correct field in FuelTank model
  fuel_type: string;
}

interface TankMetric {
  tankerId: number;
  tankerName: string;
  totalIntake: number;
  totalOutput: number;
  balance: number;
}

// Updated OperationData to explicitly include fields causing linter errors
interface OperationData extends Omit<FuelingOperation, 'quantity_liters'> {
  tip_saobracaja: string | null;
  airline: Airline & { isForeign: boolean | null };
  tank: FuelTank;
  dateTime: Date;
  destination: string;
  quantity_liters: Decimal;
  tankId: number;
}

// New interface for our comprehensive statistics
interface ComprehensiveFuelStatistics {
  totalFuelDispensed: number;
  fuelByAirline: { airlineName: string; totalLiters: number }[];
  fuelByDay: { date: string; totalLiters: number }[];
  fuelByDestination: { destination: string; totalLiters: number }[];
  currentTankLevels: {
    tankName: string;
    currentLiters: number;
    capacityLiters: number;
    utilizationPercentage: number;
    fuelType: string;
  }[];
  tankerMetrics: TankMetric[];
  fixedTankMetrics: {
    fixedTankId: number;
    fixedTankName: string;
    totalIntake: number;
    totalOutput: number;
    balance: number;
  }[];
  consumptionByTrafficType: { trafficType: string; totalLiters: number }[];
  consumptionByCompanyType: { companyType: string; totalLiters: number }[];
}

// This OperationData type is used in exportFuelData
// We ensure it explicitly includes fields we know are present from the query
interface CsvExportOperationData {
  id: number;
  dateTime: Date;
  aircraft_registration: string | null;
  destination: string;
  quantity_liters: Decimal;
  flight_number: string | null;
  operator_name: string;
  notes: string | null;
  tip_saobracaja: string | null; // Explicitly add here
  airline: {
    id: number;
    name: string;
    isForeign: boolean | null; // Explicitly add here
  };
  tank: {
    id: number;
    identifier: string;
    name: string;
  } | null; // Tank can be null if relation is optional and not present
}

export const getFuelStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, airlineId } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Datumski raspon je obavezan' });
      return;
    }
    
    const startDateTime = new Date(startDate as string);
    const endDateTime = new Date(endDate as string);
    endDateTime.setDate(endDateTime.getDate() + 1); // To include the whole end date
    
    const dateFilter = {
      gte: startDateTime,
      lt: endDateTime,
    };

    const fuelingOperationWhereFilter: any = {
      dateTime: dateFilter
    };
    if (airlineId && airlineId !== 'all') {
      fuelingOperationWhereFilter.airlineId = Number(airlineId);
    }
    
    // For getFuelStatistics, OperationData (which extends Prisma types) is fine
    const fuelingOperations = await prisma.fuelingOperation.findMany({
      where: {
        ...fuelingOperationWhereFilter,
        is_deleted: false // Ne uključujemo obrisane operacije
      },
      include: {
        airline: true, 
        tank: true,    
      },
      orderBy: { dateTime: 'asc' },
    }).then(ops => ops as unknown as OperationData[]); // Using then to safely cast

    let totalFuelDispensed = 0;
    fuelingOperations.forEach(op => {
      totalFuelDispensed += Number(op.quantity_liters);
    });

    const fuelByAirlineMap = new Map<string, number>();
    fuelingOperations.forEach(op => {
      const airlineName = op.airline.name;
      fuelByAirlineMap.set(airlineName, (fuelByAirlineMap.get(airlineName) || 0) + Number(op.quantity_liters));
    });
    const fuelByAirline = Array.from(fuelByAirlineMap, ([airlineName, totalLiters]) => ({ airlineName, totalLiters }))
      .sort((a, b) => b.totalLiters - a.totalLiters);

    const fuelByDayMap = new Map<string, number>();
    fuelingOperations.forEach(op => {
      const date = op.dateTime.toISOString().split('T')[0];
      fuelByDayMap.set(date, (fuelByDayMap.get(date) || 0) + Number(op.quantity_liters));
    });
    const fuelByDay = Array.from(fuelByDayMap, ([date, totalLiters]) => ({ date, totalLiters }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const fuelByDestinationMap = new Map<string, number>();
    fuelingOperations.forEach(op => {
      const destination = op.destination || 'Unknown';
      fuelByDestinationMap.set(destination, (fuelByDestinationMap.get(destination) || 0) + Number(op.quantity_liters));
    });
    const fuelByDestination = Array.from(fuelByDestinationMap, ([destination, totalLiters]) => ({ destination, totalLiters }))
      .sort((a, b) => b.totalLiters - a.totalLiters);

    const fuelTanks = await prisma.fuelTank.findMany({
      select: {
        id: true,
        identifier: true,
        name: true,
        capacity_liters: true,
        current_liters: true, // Assuming this is the correct field
        fuel_type: true,
      }
    }).then(tanks => tanks as unknown as TankData[]); // Using then to safely cast

    const currentTankLevels = fuelTanks.map(tank => ({
      tankName: `${tank.identifier} - ${tank.name}`,
      currentLiters: Number(tank.current_liters), 
      capacityLiters: Number(tank.capacity_liters),
      utilizationPercentage: Number(tank.capacity_liters) > 0 ? Math.min(100, (Number(tank.current_liters) / Number(tank.capacity_liters)) * 100) : 0,
      fuelType: tank.fuel_type,
    })); 

    const mobileTankRefillsForTankers = await prisma.mobileTankRefills.findMany({
        where: { transfer_datetime: dateFilter },
        select: { target_mobile_tank_id: true, quantity_liters: true }
    });

    const tankerMetricsMap = new Map<number, { totalIntake: number, totalOutput: number }>();

    mobileTankRefillsForTankers.forEach(refill => {
        const current = tankerMetricsMap.get(refill.target_mobile_tank_id) || { totalIntake: 0, totalOutput: 0 };
        current.totalIntake += Number(refill.quantity_liters);
        tankerMetricsMap.set(refill.target_mobile_tank_id, current);
    });

    fuelingOperations.forEach(op => {
        const current = tankerMetricsMap.get(op.tankId) || { totalIntake: 0, totalOutput: 0 };
        current.totalOutput += Number(op.quantity_liters);
        tankerMetricsMap.set(op.tankId, current);
    });
    
    const tankerDetails = await prisma.fuelTank.findMany({ 
      select: { 
        id: true, 
        identifier: true, 
        name: true 
      }
    });
    const tankerMetrics = Array.from(tankerMetricsMap, ([tankerId, metrics]) => {
        const detail = tankerDetails.find(t => t.id === tankerId);
        return {
            tankerId: tankerId,
            tankerName: detail ? `${detail.identifier} - ${detail.name}` : 'Nepoznat tanker',
            ...metrics,
            balance: metrics.totalIntake - metrics.totalOutput,
        };
    });

    // Calculate Fixed Tank Metrics
    const fixedTankMetricsMap = new Map<number, { totalIntake: number, totalOutput: number }>();

    // Inputs to fixed tanks are from FuelIntakeRecords via FixedTankTransfers
    const intakeTransfersToFixedTanks = await prisma.fixedTankTransfers.findMany({
      where: {
        transfer_datetime: dateFilter 
      },
      select: { affected_fixed_tank_id: true, quantity_liters_transferred: true }
    });

    intakeTransfersToFixedTanks.forEach(transfer => {
      const current = fixedTankMetricsMap.get(transfer.affected_fixed_tank_id) || { totalIntake: 0, totalOutput: 0 };
      current.totalIntake += Number(transfer.quantity_liters_transferred);
      fixedTankMetricsMap.set(transfer.affected_fixed_tank_id, current);
    });
    
    // Outputs from fixed tanks are transfers to mobile tankers (FuelTransferToTanker model)
    const transfersFromFixedToMobile = await prisma.fuelTransferToTanker.findMany({
        where: { 
          dateTime: dateFilter // Assuming 'dateTime' is the correct field for date filtering
        },
        select: { sourceFixedStorageTankId: true, quantityLiters: true }
    });

    transfersFromFixedToMobile.forEach(transfer => {
      if (transfer.sourceFixedStorageTankId) {
        const current = fixedTankMetricsMap.get(transfer.sourceFixedStorageTankId) || { totalIntake: 0, totalOutput: 0 };
        current.totalOutput += Number(transfer.quantityLiters);
        fixedTankMetricsMap.set(transfer.sourceFixedStorageTankId, current);
      }
    });

    const fixedTankDetails = await prisma.fixedStorageTanks.findMany({ select: { id: true, tank_name: true, tank_identifier: true }});
    const fixedTankMetrics = Array.from(fixedTankMetricsMap, ([fixedTankId, metrics]) => {
        const detail = fixedTankDetails.find(t => t.id === fixedTankId);
        return {
            fixedTankId,
            fixedTankName: detail ? `${detail.tank_identifier} - ${detail.tank_name}` : 'Nepoznat fiksni tank',
            ...metrics,
            balance: metrics.totalIntake - metrics.totalOutput,
        };
    });

    const consumptionByTrafficTypeMap = new Map<string, number>();
    fuelingOperations.forEach(op => {
      if (op.tip_saobracaja) { 
        consumptionByTrafficTypeMap.set(op.tip_saobracaja, (consumptionByTrafficTypeMap.get(op.tip_saobracaja) || 0) + Number(op.quantity_liters));
      }
    });
    const consumptionByTrafficType = Array.from(consumptionByTrafficTypeMap, ([trafficType, totalLiters]) => ({ trafficType, totalLiters }));

    const consumptionByCompanyTypeMap = new Map<string, number>();
    fuelingOperations.forEach(op => {
      const companyType = op.airline.isForeign ? 'Strana' : 'Domaća';
      consumptionByCompanyTypeMap.set(companyType, (consumptionByCompanyTypeMap.get(companyType) || 0) + Number(op.quantity_liters));
    });
    const consumptionByCompanyType = Array.from(consumptionByCompanyTypeMap, ([companyType, totalLiters]) => ({ companyType, totalLiters }));

    const statistics: ComprehensiveFuelStatistics = {
      totalFuelDispensed,
      fuelByAirline,
      fuelByDay,
      fuelByDestination,
      currentTankLevels,
      tankerMetrics,
      fixedTankMetrics,
      consumptionByTrafficType,
      consumptionByCompanyType,
    };
    
    res.status(200).json(statistics);
  } catch (error) {
    console.error('Error generating fuel statistics:', error);
    res.status(500).json({ message: 'Greška pri generisanju sveobuhvatne statistike' });
  }
};

export const exportFuelData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, airlineId, format } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Datumski raspon je obavezan' });
      return;
    }
    
    if (!format || (format !== 'csv' && format !== 'json')) {
      res.status(400).json({ message: 'Format mora biti "csv" ili "json"' });
      return;
    }
    
    const startDateTime = new Date(startDate as string);
    const endDateTime = new Date(endDate as string);
    endDateTime.setDate(endDateTime.getDate() + 1);
    
    const whereFilter: any = {
      dateTime: {
        gte: startDateTime,
        lt: endDateTime,
      }
    };
    if (airlineId && airlineId !== 'all') {
      whereFilter.airlineId = Number(airlineId);
    }
    
    // Use the more explicit CsvExportOperationData type for casting here
    const fuelingOperations = await prisma.fuelingOperation.findMany({
      where: {
        ...whereFilter,
        is_deleted: false // Ne uključujemo obrisane operacije
      },
      select: {
        id: true,
        dateTime: true,
        notes: true,
        aircraft_registration: true,
        destination: true,
        flight_number: true,
        operator_name: true,
        k_number: true,
        tankId: true,
        quantity_liters: true,
        
        airline: {
          select: {
            id: true,
            name: true,
            isForeign: true,
          },
        },
        tank: {
          select: {
            id: true,
            name: true,
            identifier: true, 
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    }).then(ops => ops as unknown as CsvExportOperationData[]); // Using then to safely cast
    
    if (format === 'json') {
      res.status(200).json(fuelingOperations);
      return;
    } else if (format === 'csv') {
      let csv = 'ID,Datum,Vrijeme,Registracija,Avio Kompanija,Tip Kompanije,Destinacija,Količina (L),Tanker,Broj Leta,Operater,Tip Saobraćaja,Napomene\n';
      
      fuelingOperations.forEach(op => {
        const date = op.dateTime.toISOString().split('T')[0];
        const time = op.dateTime.toISOString().split('T')[1].substring(0, 5);
        // Accessing airline.isForeign and tip_saobracaja should now be fine due to CsvExportOperationData type
        const companyType = op.airline.isForeign ? 'Strana' : 'Domaća'; 
        const trafficType = op.tip_saobracaja || '';       
        
        const escapeCsvValue = (value: string | number | null | undefined) => 
          `"${(value?.toString() || '').replace(/"/g, '""')}"`;
        
        csv += [
          op.id,
          date,
          time,
          escapeCsvValue(op.aircraft_registration),
          escapeCsvValue(op.airline.name),
          escapeCsvValue(companyType),
          escapeCsvValue(op.destination),
          op.quantity_liters, 
          escapeCsvValue(op.tank ? `${op.tank.identifier} - ${op.tank.name}` : 'N/A'),
          escapeCsvValue(op.flight_number),
          escapeCsvValue(op.operator_name),
          escapeCsvValue(trafficType),
          escapeCsvValue(op.notes)
        ].join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="fuel-report-${startDate}-to-${endDate}.csv"`
      );
      res.status(200).send(csv);
      return;
    }
  } catch (error) {
    console.error('Error exporting fuel data:', error);
    res.status(500).json({ message: 'Greška pri izvozu podataka' });
  }
}; 