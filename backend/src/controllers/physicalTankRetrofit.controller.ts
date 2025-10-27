import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * GET /api/physical-tanks/retrofit/preview
 * Get retrofit preview - shows available MRN records that can be retrofitted
 */
export const getRetrofitPreview: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { fuel_type } = req.query;

    // Get all fuel intake records that haven't been distributed to physical tanks
    const where: any = {
      customs_declaration_number: { not: null }
    };

    if (fuel_type && fuel_type !== 'all') {
      where.fuel_type = fuel_type;
    }

    const fuelIntakeRecords = await prisma.fuelIntakeRecords.findMany({
      where,
      orderBy: { intake_datetime: 'desc' }
    });

    // Get all MRN numbers that are already distributed to physical tanks
    const distributedMrns = await prisma.physicalTankMrn.findMany({
      select: {
        customs_declaration_number: true
      },
      distinct: ['customs_declaration_number']
    });

    const distributedMrnSet = new Set(distributedMrns.map(mrn => mrn.customs_declaration_number).filter((mrn): mrn is string => mrn !== null));

    // Filter out already distributed records and group by MRN
    const availableRecords = fuelIntakeRecords
      .filter(record => 
        record.customs_declaration_number && 
        !distributedMrnSet.has(record.customs_declaration_number)
      )
      .reduce((acc, record) => {
        if (!record.customs_declaration_number) return acc;
        
        const existingIndex = acc.findIndex(r => r.customs_declaration_number === record.customs_declaration_number);
        
        if (existingIndex === -1) {
          // New MRN - add it
          acc.push({
            customs_declaration_number: record.customs_declaration_number,
            total_liters: record.quantity_liters_received,
            total_kg: Number(record.quantity_kg_received),
            date_added: record.intake_datetime,
            density_at_intake: Number(record.specific_gravity),
            fuel_type: record.fuel_type,
            supplier_name: record.supplier_name,
            records: [record]
          });
        } else {
          // Existing MRN - sum up the quantities
          acc[existingIndex].total_liters += record.quantity_liters_received;
          acc[existingIndex].total_kg += Number(record.quantity_kg_received);
          acc[existingIndex].records.push(record);
        }
        
        return acc;
      }, [] as any[]);

    // Get physical tanks for selection
    const physicalTanks = await prisma.physicalTanks.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' }
    });

    res.status(200).json({
      existing_mrn_records: availableRecords,
      physical_tanks: physicalTanks,
      total_available_liters: availableRecords.reduce((sum, r) => sum + r.total_liters, 0),
      total_available_kg: availableRecords.reduce((sum, r) => sum + r.total_kg, 0)
    });
  } catch (error) {
    logger.error('Error fetching retrofit preview:', error);
    next(error);
  }
};

/**
 * POST /api/physical-tanks/retrofit/execute
 * Execute retrofit - distribute existing fuel intake records to physical tanks
 */
export const executeRetrofit: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { distributions } = req.body;

    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      res.status(400).json({ message: 'distributions array is required' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const distribution of distributions) {
        const {
          customs_declaration_number,
          physical_tank_id,
          quantity_liters,
          quantity_kg
        } = distribution;

        // Validate inputs
        if (!customs_declaration_number || !physical_tank_id || !quantity_liters || !quantity_kg) {
          throw new Error('Missing required fields: customs_declaration_number, physical_tank_id, quantity_liters, quantity_kg');
        }

        // Get the tank
        const tank = await tx.physicalTanks.findUnique({
          where: { id: physical_tank_id }
        });

        if (!tank) {
          throw new Error(`Physical tank with ID ${physical_tank_id} not found`);
        }

        // Check capacity
        const newQuantity = tank.current_quantity_liters + quantity_liters;
        if (newQuantity > tank.capacity_liters) {
          throw new Error(`Distribution would exceed tank ${tank.tank_name} capacity`);
        }

        // Get fuel intake record for density
        const intakeRecord = await tx.fuelIntakeRecords.findFirst({
          where: { customs_declaration_number },
          orderBy: { intake_datetime: 'asc' }
        });

        const density = intakeRecord 
          ? Number(intakeRecord.specific_gravity) 
          : (quantity_kg / quantity_liters);

        // Update tank quantities
        await tx.physicalTanks.update({
          where: { id: physical_tank_id },
          data: {
            current_quantity_liters: { increment: quantity_liters },
            current_quantity_kg: { increment: quantity_kg }
          }
        });

        // Create MRN record
        const mrnRecord = await tx.physicalTankMrn.create({
          data: {
            physical_tank_id,
            customs_declaration_number,
            quantity_liters,
            quantity_kg,
            remaining_quantity_liters: quantity_liters,
            remaining_quantity_kg: quantity_kg,
            density_at_intake: density,
            date_added: intakeRecord?.intake_datetime || new Date(),
            is_retrofitted: true
          }
        });

        results.push(mrnRecord);
      }

      return results;
    });

    res.status(201).json({
      message: 'Retrofit executed successfully',
      records_created: result.length
    });
  } catch (error: any) {
    logger.error('Error executing retrofit:', error);
    res.status(400).json({ message: error.message || 'Error executing retrofit' });
  }
};

/**
 * GET /api/physical-tanks/retrofit/status
 * Get retrofit status - shows current distribution status
 */
export const getRetrofitStatus: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    // Get all physical tanks with their MRN records
    const tanks = await prisma.physicalTanks.findMany({
      include: {
        physicalTankMrn: {
          where: {
            is_retrofitted: true
          },
          orderBy: { date_added: 'asc' }
        }
      }
    });

    // Calculate statistics
    const totalRetrofittedMrns = tanks.reduce((sum, tank) => sum + tank.physicalTankMrn.length, 0);
    const totalRetrofittedLiters = tanks.reduce((sum, tank) => 
      sum + tank.physicalTankMrn.reduce((tankSum, mrn) => tankSum + Number(mrn.quantity_liters), 0), 0
    );
    const totalRetrofittedKg = tanks.reduce((sum, tank) => 
      sum + tank.physicalTankMrn.reduce((tankSum, mrn) => tankSum + Number(mrn.quantity_kg), 0), 0
    );

    res.status(200).json({
      total_tanks: tanks.length,
      total_retrofitted_mrns: totalRetrofittedMrns,
      total_retrofitted_liters: totalRetrofittedLiters,
      total_retrofitted_kg: totalRetrofittedKg,
      tanks: tanks.map(tank => ({
        id: tank.id,
        tank_name: tank.tank_name,
        retrofitted_mrns: tank.physicalTankMrn.length,
        retrofitted_liters: tank.physicalTankMrn.reduce((sum, mrn) => sum + Number(mrn.quantity_liters), 0),
        retrofitted_kg: tank.physicalTankMrn.reduce((sum, mrn) => sum + Number(mrn.quantity_kg), 0)
      }))
    });
  } catch (error) {
    logger.error('Error fetching retrofit status:', error);
    next(error);
  }
};
