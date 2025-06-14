import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';

// Tip koji pokriva sve varijante transakcijskih klijenata koje koristimo
// Za jednostavnost koristimo 'any' za metode koje dodajemo Prisma TransactionClient-u
// jer nam nije potrebna stroga tipizacija za trenutne potrebe
export type AnyTransactionClient = Prisma.TransactionClient | {
  [key: string]: any;
  systemLog?: {
    create: (args: any) => Promise<any>;
  }
};

// Tip za provjere i castove, koristimo ga gdje je potrebno
export type ExtendedTransactionClient = AnyTransactionClient;

const prisma = new PrismaClient();

/**
 * Tip za rezultat provjere konzistentnosti tanka
 */
export interface TankConsistencyResult {
  tankId: number;
  tankName: string;
  isConsistent: boolean;
  currentQuantityLiters: number;
  sumMrnQuantities: number;
  difference: number;
  tolerance: number;
  mrnRecords: {
    id: number;
    customsDeclarationNumber: string;
    remainingQuantityLiters: number;
    remainingQuantityKg?: number;
    dateAdded?: Date;
  }[];
}

/**
 * Provjerava konzistentnost količine goriva u tanku sa sumom MRN zapisa
 * 
 * @param tankId ID fiksnog tanka za provjeru
 * @param tx Opcionalna Prisma transakcija
 * @returns Rezultat provjere konzistentnosti
 */
export async function verifyTankConsistency(
  tankId: number, 
  tx?: AnyTransactionClient
): Promise<TankConsistencyResult> {
  const client = tx || prisma;
  
  // Dohvati podatke o tanku
  const tank = await client.fixedStorageTanks.findUnique({
    where: { id: tankId },
    select: {
      id: true,
      tank_name: true,
      current_quantity_liters: true
    }
  });
  
  if (!tank) {
    throw new Error(`Tank s ID ${tankId} nije pronađen`);
  }
  
  // Dohvati sve MRN zapise vezane uz tank - uz dodatne detalje za bolju dijagnostiku
  const mrnRecords = await client.tankFuelByCustoms.findMany({
    where: { fixed_tank_id: tankId },
    select: {
      id: true,
      customs_declaration_number: true,
      remaining_quantity_liters: true,
      remaining_quantity_kg: true,
      quantity_liters: true,
      quantity_kg: true,
      date_added: true
    }
  });
  
  logger.debug(`Pronađeno ${mrnRecords.length} MRN zapisa za tank ID ${tankId}:`);
  mrnRecords.forEach((record: any, index: number) => {
    logger.debug(`MRN ${index + 1}: ${record.customs_declaration_number}, L: ${record.remaining_quantity_liters}, KG: ${record.remaining_quantity_kg}`);
  });
  
  // Izračunaj sumu preostalih količina iz MRN zapisa
  const sumMrnQuantities = mrnRecords.reduce(
    (sum: number, record: { remaining_quantity_liters: number }) => {
      const value = parseFloat(String(record.remaining_quantity_liters || 0));
      return sum + value;
    },
    0
  );
  
  // Izračunaj razliku između količine u tanku i sume MRN zapisa
  const difference = Math.abs(tank.current_quantity_liters - sumMrnQuantities);
  
  // Nađimo toleranciju koja je razumna za ovaj tank
  // Za veće količine goriva dozvoljavamo veću apsolutnu toleranciju
  const tolerance = Math.max(
    5.0, // Minimalna tolerancija od 5 litara
    tank.current_quantity_liters * 0.01 // 1% od ukupne količine
  );
  
  // Provjeri je li razlika unutar izračunate tolerancije
  const isConsistent = difference <= tolerance;
  
  // Logiraj rezultat provjere
  if (!isConsistent) {
    logger.warn(`Nekonzistentnost podataka u tanku ${tank.tank_name} (ID: ${tankId}): Tank sadrži ${tank.current_quantity_liters} L, suma MRN zapisa: ${sumMrnQuantities.toFixed(2)} L, razlika: ${difference.toFixed(3)} L (tolerancija: ${tolerance.toFixed(2)} L)`);
    
    // Ispiši detaljnije informacije o MRN zapisima za pomoć pri dijagnostici
    logger.warn(`Detalji MRN zapisa za tank ${tank.tank_name} (ID: ${tankId}):`);
    mrnRecords.forEach((record: any) => {
      logger.warn(`- MRN: ${record.customs_declaration_number || 'N/A'}, ID: ${record.id}, L: ${record.remaining_quantity_liters}, inicijalno L: ${record.quantity_liters}, dodan: ${record.date_added}`);
    });
  } else {
    logger.debug(`Tank ${tank.tank_name} (ID: ${tankId}) je konzistentan: ${tank.current_quantity_liters} L = ${sumMrnQuantities.toFixed(2)} L (razlika: ${difference.toFixed(3)} L, tolerancija: ${tolerance.toFixed(2)} L)`);
  }
  
  return {
    tankId: tank.id,
    tankName: tank.tank_name,
    isConsistent,
    currentQuantityLiters: tank.current_quantity_liters,
    sumMrnQuantities,
    difference,
    tolerance,
    mrnRecords: mrnRecords.map((record: any) => ({
      id: record.id,
      customsDeclarationNumber: record.customs_declaration_number || 'N/A',
      remainingQuantityLiters: parseFloat(String(record.remaining_quantity_liters || 0)),
      remainingQuantityKg: parseFloat(String(record.remaining_quantity_kg || 0)),
      dateAdded: record.date_added
    }))
  };
}

/**
 * Provjerava konzistentnost podataka za više tankova
 * 
 * @param tankIds Lista ID-eva tankova za provjeru
 * @param tx Opcionalna Prisma transakcija
 * @returns Rezultati provjere za sve tankove
 */
export async function verifyMultipleTanksConsistency(
  tankIds: number[],
  tx?: AnyTransactionClient
): Promise<TankConsistencyResult[]> {
  return Promise.all(tankIds.map(tankId => verifyTankConsistency(tankId, tx)));
}

/**
 * Provjerava postoji li dovoljno goriva za operaciju i je li raspodjela po MRN zapisima moguća
 * 
 * @param tankId ID fiksnog tanka
 * @param requestedQuantity Tražena količina goriva za operaciju
 * @param tx Opcionalna Prisma transakcija
 * @returns True ako je operacija moguća, inače false
 */
export async function canPerformFuelOperation(
  tankId: number,
  requestedQuantity: number,
  tx?: AnyTransactionClient
): Promise<boolean> {
  const client = tx || prisma;
  
  // Dohvati tank
  const tank = await client.fixedStorageTanks.findUnique({
    where: { id: tankId },
    select: {
      id: true,
      current_quantity_liters: true
    }
  });
  
  if (!tank) {
    return false;
  }
  
  // Provjeri ima li dovoljno goriva u tanku
  if (tank.current_quantity_liters < requestedQuantity) {
    return false;
  }
  
  // Dohvati MRN zapise i provjeri ima li dovoljno po MRN zapisima
  const mrnRecords = await client.tankFuelByCustoms.findMany({
    where: { fixed_tank_id: tankId },
    select: {
      id: true,
      remaining_quantity_liters: true
    },
    orderBy: { date_added: 'asc' } // FIFO princip
  });
  
  // Provjeri imaju li MRN zapisi dovoljno goriva
  let remainingToAllocate = requestedQuantity;
  // Eksplicitno definiranje tipa za cjeloviti niz a ne za pojedinačni element
  for (const record of mrnRecords as Array<{ id: number, remaining_quantity_liters: number }>) {
    remainingToAllocate -= Math.min(record.remaining_quantity_liters, remainingToAllocate);
    if (remainingToAllocate <= 0) {
      return true;
    }
  }
  
  // Ako smo došli do ovdje, nema dovoljno goriva u MRN zapisima
  return false;
}
