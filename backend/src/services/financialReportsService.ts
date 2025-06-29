/**
 * financialReportsService.ts
 * Servisni sloj za generisanje finansijskih izvještaja
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { parseMrnBreakdown, groupByMrn, calculateTotals, type MrnBreakdownItem } from '../utils/mrnBreakdownParser';
import { convertToBAM, EUR_TO_BAM_RATE } from '../utils/currencyConverter';

// Inicijalizacija Prisma klijenta
const prisma = new PrismaClient();

/**
 * Cache za MRN podatke da izbegnemо duplikate database poziva
 */
const mrnDataCache: Map<string, {
  costPerKg: number;
  totalQuantityKg: number;
}> = new Map();

/**
 * Helper funkcija za dohvaćanje MRN podataka s grupiranjem
 * @param mrn - MRN broj
 * @returns Grupisani MRN podaci
 */
async function getMrnData(mrn: string): Promise<{ costPerKg: number; totalQuantityKg: number }> {
  // Provjeri cache prvo
  if (mrnDataCache.has(mrn)) {
    return mrnDataCache.get(mrn)!;
  }

  // Dohvati sve zapise za ovaj MRN
  const mrnRecords = await prisma.tankFuelByCustoms.findMany({
    where: {
      customs_declaration_number: mrn
    },
    include: {
      fuelIntakeRecord: true
    }
  });

  if (mrnRecords.length === 0) {
    const result = { costPerKg: 0, totalQuantityKg: 0 };
    mrnDataCache.set(mrn, result);
    return result;
  }

  // Grupiraj podatke
  let totalQuantityKg = 0;
  let costPerKg = 0;

  for (const record of mrnRecords) {
    totalQuantityKg += record.quantity_kg ? Number(record.quantity_kg) : 0;
    // Svi zapisi za isti MRN trebaju imati istu cijenu, uzimamo iz prvog zapisa
    if (costPerKg === 0 && record.fuelIntakeRecord?.price_per_kg) {
      costPerKg = Number(record.fuelIntakeRecord.price_per_kg);
    }
  }

  const result = { costPerKg, totalQuantityKg };
  mrnDataCache.set(mrn, result);
  return result;
}

/**
 * Helper funkcija za konverziju revenue u BAM
 * @param operation - Fueling operacija
 * @returns Revenue u BAM valuti
 */
function calculateRevenueInBAM(operation: any): number {
  const operationRevenue = Number(operation.price_per_kg) * Number(operation.quantity_kg);
  
  if (operation.currency === 'USD' && operation.usd_exchange_rate) {
    return convertToBAM(operationRevenue, 'USD', Number(operation.usd_exchange_rate));
  } else if (operation.currency === 'EUR') {
    return convertToBAM(operationRevenue, 'EUR');
  } else {
    // BAM ili nepoznata valuta
    return operationRevenue;
  }
}

/**
 * Interfejsi za filtere
 */
interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Interfejs za element profitabilnosti po MRN
 */
interface MrnProfitabilityItem {
  mrn: string;
  intakeDate: Date;
  initialQuantity: number;
  remainingQuantity: number;
  usedQuantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity_liters: number;
  quantity_kg: number;
}

/**
 * Interfejs za odgovor izvještaja profitabilnosti po MRN
 */
interface MrnProfitabilityResponse {
  items: MrnProfitabilityItem[];
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageMargin: number;
    totalQuantityLiters: number;
    totalQuantityKg: number;
  };
}

/**
 * Interfejs za element profitabilnosti po destinaciji
 */
interface DestinationProfitabilityItem {
  destination: string;
  flightCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity_liters: number;
  quantity_kg: number;
}

/**
 * Interfejs za element profitabilnosti po aviokompaniji
 */
interface AirlineProfitabilityItem {
  airlineId: number;
  airlineName: string;
  flightCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity_liters: number;
  quantity_kg: number;
}

/**
 * Interfejs za ukupni finansijski izvještaj
 */
interface SummaryFinancialReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  totalQuantityLiters: number;
  totalQuantityKg: number;
  monthlyBreakdown: {
    month: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    quantityLiters: number;
    quantityKg: number;
  }[];
  topDestinations: DestinationProfitabilityItem[];
  topAirlines: AirlineProfitabilityItem[];
}

/**
 * Generiše izvještaj profitabilnosti po MRN
 * @param filter - Filter datuma za izvještaj
 * @returns Izvještaj profitabilnosti po MRN
 */
export async function generateMrnProfitabilityReport(filter: DateRangeFilter): Promise<MrnProfitabilityResponse> {
  // Očisti cache prije početka
  mrnDataCache.clear();
  
  // Prvo dohvaćamo sve aktivne MRN-ove (TankFuelByCustoms) unutar datumskog opsega
  const mrnRecords = await prisma.tankFuelByCustoms.findMany({
    where: {
      date_added: {
        gte: filter.startDate,
        lte: filter.endDate
      },
    },
    include: {
      fuelIntakeRecord: true
    }
  });

  // Dohvaćamo sve operacije točenja unutar datumskog opsega koje imaju mrnBreakdown
  const fuelingOperations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      },
      mrnBreakdown: {
        not: null
      }
    },
    orderBy: {
      dateTime: 'asc'
    }
  });

  // Struktura za praćenje prodane količine goriva po MRN
  const mrnUsage: Record<string, { 
    liters: number, 
    kg: number, 
    revenue: number,
    operations: number 
  }> = {};

  // Analiziramo operacije točenja i izračunavamo koliko je koji MRN iskorišten
  for (const operation of fuelingOperations) {
    if (!operation.mrnBreakdown) continue;
    
    const breakdown = parseMrnBreakdown(operation.mrnBreakdown);
    if (!breakdown) continue;
    
    for (const item of breakdown.breakdown) {
      if (!mrnUsage[item.mrn]) {
        mrnUsage[item.mrn] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
      }
      
      mrnUsage[item.mrn].liters += Number(item.liters);
      mrnUsage[item.mrn].kg += Number(item.kg);
      
      // Izračun prihoda za ovaj dio MRN-a u ovoj operaciji
      // Prvo izračunamo udio ovog MRN u ukupnoj količini operacije
      const totalKg = Number(operation.quantity_kg);
      const itemShare = item.kg / totalKg;
      
      // Izračunamo prihod za ovaj dio MRN-a
      const operationRevenue = Number(operation.price_per_kg) * Number(operation.quantity_kg);
      
      // Konverzija prihoda u BAM zavisno od valute transakcije
      let revenueInBAM;
      if (operation.currency === 'USD' && operation.usd_exchange_rate) {
        // Za USD koristimo exchange_rate iz transakcije
        revenueInBAM = convertToBAM(
          operationRevenue, 
          'USD', 
          Number(operation.usd_exchange_rate)
        );
      } else if (operation.currency === 'EUR') {
        // Za EUR koristimo fiksni kurs
        revenueInBAM = convertToBAM(operationRevenue, 'EUR');
      } else {
        // BAM ili nepoznata valuta - bez konverzije
        revenueInBAM = operationRevenue;
      }
      
      const mrnRevenue = revenueInBAM * itemShare;
      
      mrnUsage[item.mrn].revenue += mrnRevenue;
      mrnUsage[item.mrn].operations += 1;
    }
  }

  // Grupiramo MRN zapise po broju da izbjeknemo duplikate
  const mrnGroups: Record<string, {
    mrn: string;
    earliestDate: Date;
    totalInitialQuantityLiters: number;
    totalRemainingQuantityLiters: number;
    totalInitialQuantityKg: number;
    totalRemainingQuantityKg: number;
    costPerKg: number;
  }> = {};

  for (const mrnRecord of mrnRecords) {
    const mrn = mrnRecord.customs_declaration_number;
    
    if (!mrnGroups[mrn]) {
      mrnGroups[mrn] = {
        mrn,
        earliestDate: mrnRecord.date_added,
        totalInitialQuantityLiters: 0,
        totalRemainingQuantityLiters: 0,
        totalInitialQuantityKg: 0,
        totalRemainingQuantityKg: 0,
        costPerKg: mrnRecord.fuelIntakeRecord?.price_per_kg 
          ? Number(mrnRecord.fuelIntakeRecord.price_per_kg)
          : 0
      };
    }

    // Uzimamo najraniji datum za MRN
    if (mrnRecord.date_added < mrnGroups[mrn].earliestDate) {
      mrnGroups[mrn].earliestDate = mrnRecord.date_added;
    }

    // Sabirati količine za isti MRN
    mrnGroups[mrn].totalInitialQuantityLiters += Number(mrnRecord.quantity_liters);
    mrnGroups[mrn].totalRemainingQuantityLiters += Number(mrnRecord.remaining_quantity_liters);
    mrnGroups[mrn].totalInitialQuantityKg += mrnRecord.quantity_kg ? Number(mrnRecord.quantity_kg) : 0;
    mrnGroups[mrn].totalRemainingQuantityKg += mrnRecord.remaining_quantity_kg ? Number(mrnRecord.remaining_quantity_kg) : 0;
  }

  // Pripremamo podatke za izvještaj
  const items: MrnProfitabilityItem[] = [];
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalQuantityLiters = 0;
  let totalQuantityKg = 0;

  // Za svaki grupisan MRN izračunavamo profitabilnost
  for (const [mrn, mrnGroup] of Object.entries(mrnGroups)) {
    const usage = mrnUsage[mrn] || { liters: 0, kg: 0, revenue: 0, operations: 0 };
    
    // Konverzija nabavne cijene iz EUR u BAM
    const costPerKgBAM = convertToBAM(mrnGroup.costPerKg, 'EUR');
    
    // Ukupni trošak za iskorištenu količinu u BAM
    const cost = costPerKgBAM * usage.kg;
    
    // Profit za ovaj MRN (sve vrijednosti su već u BAM)
    const profit = usage.revenue - cost;
    
    // Marža u procentima (profit podijeljen s troškom, pomnožen sa 100)
    const margin = cost > 0 ? (profit / cost) * 100 : 0;
    
    const item: MrnProfitabilityItem = {
      mrn,
      intakeDate: mrnGroup.earliestDate,
      initialQuantity: mrnGroup.totalInitialQuantityLiters,
      remainingQuantity: mrnGroup.totalRemainingQuantityLiters,
      usedQuantity: mrnGroup.totalInitialQuantityLiters - mrnGroup.totalRemainingQuantityLiters,
      revenue: usage.revenue,
      cost,
      profit,
      margin,
      quantity_liters: usage.liters,
      quantity_kg: usage.kg
    };
    
    items.push(item);
    
    // Ažuriramo totale
    totalRevenue += usage.revenue;
    totalCost += cost;
    totalProfit += profit;
    totalQuantityLiters += usage.liters;
    totalQuantityKg += usage.kg;
  }
  
  // Izračun prosječne marže
  const averageMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  
  // Sortiranje stavki po profitu (od najvećeg ka najmanjem)
  items.sort((a, b) => b.profit - a.profit);
  
  return {
    items,
    summary: {
      totalRevenue,
      totalCost,
      totalProfit,
      averageMargin,
      totalQuantityLiters,
      totalQuantityKg
    }
  };
}

/**
 * Generiše izvještaj profitabilnosti po destinaciji
 * @param filter - Filter datuma za izvještaj
 * @returns Izvještaj profitabilnosti po destinaciji
 */
export async function generateDestinationProfitabilityReport(filter: DateRangeFilter): Promise<DestinationProfitabilityItem[]> {
  // Očisti cache prije početka
  mrnDataCache.clear();
  
  // Dohvaćamo sve operacije točenja unutar datumskog opsega
  const fuelingOperations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      }
    },
    include: {
      airline: true,  // Uključujemo aviokompaniju da dobijemo njeno ime
    },
    orderBy: {
      dateTime: 'asc'
    }
  });

  // Pomoćna struktura za grupiranje po destinaciji
  const destinationsMap: Map<string, {
    flightCount: number;
    revenue: number;
    cost: number;
    quantity_liters: number;
    quantity_kg: number;
  }> = new Map();

  // Analiziramo operacije točenja i izračunavamo profitabilnost po destinaciji
  for (const operation of fuelingOperations) {
    const destination = operation.destination;
    const revenue = calculateRevenueInBAM(operation);
    
    // Inicijalizacija ako destinacija nije još u mapi
    if (!destinationsMap.has(destination)) {
      destinationsMap.set(destination, {
        flightCount: 0,
        revenue: 0,
        cost: 0,
        quantity_liters: 0,
        quantity_kg: 0
      });
    }

    const destData = destinationsMap.get(destination)!;
    
    // Ažuriramo statistiku za destinaciju
    destData.flightCount += 1;
    destData.revenue += revenue;
    destData.quantity_liters += Number(operation.quantity_liters);
    destData.quantity_kg += Number(operation.quantity_kg);
    
    // Ako operacija ima mrnBreakdown, izračunavamo trošak
    if (operation.mrnBreakdown) {
      const breakdown = parseMrnBreakdown(operation.mrnBreakdown);
      if (breakdown) {
        for (const item of breakdown.breakdown) {
          const mrnData = await getMrnData(item.mrn);
          
          if (mrnData.costPerKg > 0) {
            // Konverzija nabavne cijene iz EUR u BAM
            const costPerKgBAM = convertToBAM(mrnData.costPerKg, 'EUR');
            const itemCost = costPerKgBAM * item.kg;
            
            // Ažuriramo ukupni trošak za destinaciju
            destData.cost += itemCost;
          }
        }
      }
    }
  }
  
  // Konvertujemo mapu u listu i dodajemo izračun marže
  const result: DestinationProfitabilityItem[] = Array.from(destinationsMap.entries()).map(([destination, data]) => {
    const profit = data.revenue - data.cost;
    const margin = data.cost > 0 ? (profit / data.cost) * 100 : 0;
    
    return {
      destination,
      flightCount: data.flightCount,
      revenue: data.revenue,
      cost: data.cost,
      profit,
      margin,
      quantity_liters: data.quantity_liters,
      quantity_kg: data.quantity_kg
    };
  });
  
  // Sortiramo po profitu (od najvećeg ka najmanjem)
  result.sort((a, b) => b.profit - a.profit);
  
  return result;
}

/**
 * Generiše izvještaj profitabilnosti po aviokompaniji
 * @param filter - Filter datuma za izvještaj
 * @returns Izvještaj profitabilnosti po aviokompaniji
 */
export async function generateAirlineProfitabilityReport(filter: DateRangeFilter): Promise<AirlineProfitabilityItem[]> {
  // Očisti cache prije početka
  mrnDataCache.clear();
  
  // Dohvaćamo sve operacije točenja unutar datumskog opsega
  const fuelingOperations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      }
    },
    include: {
      airline: true  // Uključujemo aviokompaniju da dobijemo njeno ime
    },
    orderBy: {
      dateTime: 'asc'
    }
  });

  // Pomoćna struktura za grupiranje po aviokompaniji
  const airlinesMap: Map<number, {
    airlineName: string;
    flightCount: number;
    revenue: number;
    cost: number;
    quantity_liters: number;
    quantity_kg: number;
  }> = new Map();

  // Analiziramo operacije točenja i izračunavamo profitabilnost po aviokompaniji
  for (const operation of fuelingOperations) {
    const airlineId = operation.airlineId;
    const airlineName = operation.airline.name;
    const revenue = calculateRevenueInBAM(operation);
    
    // Inicijalizacija ako aviokompanija nije još u mapi
    if (!airlinesMap.has(airlineId)) {
      airlinesMap.set(airlineId, {
        airlineName,
        flightCount: 0,
        revenue: 0,
        cost: 0,
        quantity_liters: 0,
        quantity_kg: 0
      });
    }

    const airlineData = airlinesMap.get(airlineId)!;
    
    // Ažuriramo statistiku za aviokompaniju
    airlineData.flightCount += 1;
    airlineData.revenue += revenue;
    airlineData.quantity_liters += Number(operation.quantity_liters);
    airlineData.quantity_kg += Number(operation.quantity_kg);
    
    // Ako operacija ima mrnBreakdown, izračunavamo trošak
    if (operation.mrnBreakdown) {
      const breakdown = parseMrnBreakdown(operation.mrnBreakdown);
      if (breakdown) {
        for (const item of breakdown.breakdown) {
          const mrnData = await getMrnData(item.mrn);
          
          if (mrnData.costPerKg > 0) {
            // Konverzija nabavne cijene iz EUR u BAM
            const costPerKgBAM = convertToBAM(mrnData.costPerKg, 'EUR');
            const itemCost = costPerKgBAM * item.kg;
            
            // Ažuriramo ukupni trošak za aviokompaniju
            airlineData.cost += itemCost;
          }
        }
      }
    }
  }
  
  // Konvertujemo mapu u listu i dodajemo izračun marže
  const result: AirlineProfitabilityItem[] = Array.from(airlinesMap.entries()).map(([airlineId, data]) => {
    const profit = data.revenue - data.cost;
    const margin = data.cost > 0 ? (profit / data.cost) * 100 : 0;
    
    return {
      airlineId,
      airlineName: data.airlineName,
      flightCount: data.flightCount,
      revenue: data.revenue,
      cost: data.cost,
      profit,
      margin,
      quantity_liters: data.quantity_liters,
      quantity_kg: data.quantity_kg
    };
  });
  
  // Sortiramo po profitu (od najvećeg ka najmanjem)
  result.sort((a, b) => b.profit - a.profit);
  
  return result;
}

/**
 * Generiše ukupni finansijski izvještaj
 * @param filter - Filter datuma za izvještaj
 * @returns Ukupni finansijski izvještaj
 */
export async function generateSummaryFinancialReport(filter: DateRangeFilter): Promise<SummaryFinancialReport> {
  // Koristimo već implementirane funkcije za dobijanje podataka
  const [mrnReport, destinationsReport, airlinesReport] = await Promise.all([
    generateMrnProfitabilityReport(filter),
    generateDestinationProfitabilityReport(filter),
    generateAirlineProfitabilityReport(filter)
  ]);
  
  // Dohvaćamo sve operacije točenja unutar datumskog opsega za mjesečni pregled
  const fuelingOperations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      }
    },
    orderBy: {
      dateTime: 'asc'
    }
  });

  // Pomoćna struktura za grupiranje po mjesecima
  const monthlyData: Record<string, {
    revenue: number;
    cost: number;
    quantityLiters: number;
    quantityKg: number;
  }> = {};

  // Analiziramo operacije točenja i izračunavamo profitabilnost po mjesecima
  for (const operation of fuelingOperations) {
    const date = new Date(operation.dateTime);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const revenue = calculateRevenueInBAM(operation);
    
    // Inicijalizacija ako mjesec nije još u objektu
    if (!monthlyData[month]) {
      monthlyData[month] = {
        revenue: 0,
        cost: 0,
        quantityLiters: 0,
        quantityKg: 0
      };
    }

    const monthData = monthlyData[month];
    
    // Ažuriramo statistiku za mjesec
    monthData.revenue += revenue;
    monthData.quantityLiters += Number(operation.quantity_liters);
    monthData.quantityKg += Number(operation.quantity_kg);
    
    // Ako operacija ima mrnBreakdown, izračunavamo trošak
    if (operation.mrnBreakdown) {
      const breakdown = parseMrnBreakdown(operation.mrnBreakdown);
      if (breakdown) {
        for (const item of breakdown.breakdown) {
          const mrnData = await getMrnData(item.mrn);
          
          if (mrnData.costPerKg > 0) {
            // Konverzija nabavne cijene iz EUR u BAM
            const costPerKgBAM = convertToBAM(mrnData.costPerKg, 'EUR');
            const itemCost = costPerKgBAM * item.kg;
            
            // Ažuriramo ukupni trošak za mjesec
            monthData.cost += itemCost;
          }
        }
      }
    }
  }
  
  // Konvertujemo objekt u sortiranu listu mjesečnih breakdowna
  const monthlyBreakdown = Object.entries(monthlyData)
    .map(([month, data]) => {
      const profit = data.revenue - data.cost;
      const margin = data.cost > 0 ? (profit / data.cost) * 100 : 0;
      
      return {
        month,
        revenue: data.revenue,
        cost: data.cost,
        profit,
        margin,
        quantityLiters: data.quantityLiters,
        quantityKg: data.quantityKg
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
  
  // Izračun ukupnih podataka
  const totalRevenue = mrnReport.summary.totalRevenue;
  const totalCost = mrnReport.summary.totalCost;
  const totalProfit = mrnReport.summary.totalProfit;
  const averageMargin = mrnReport.summary.averageMargin;
  const totalQuantityLiters = mrnReport.summary.totalQuantityLiters;
  const totalQuantityKg = mrnReport.summary.totalQuantityKg;
  
  // Top destinacije i aviokompanije
  const topDestinations = destinationsReport.slice(0, 5); // Top 5 destinacija
  const topAirlines = airlinesReport.slice(0, 5); // Top 5 aviokompanija
  
  return {
    totalRevenue,
    totalCost,
    totalProfit,
    averageMargin,
    totalQuantityLiters,
    totalQuantityKg,
    monthlyBreakdown,
    topDestinations,
    topAirlines
  };
}
