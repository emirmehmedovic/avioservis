import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Interface for the result of a tank consistency check.
 */
export interface TankConsistencyResult {
  tankId: number;
  tankName: string;
  isConsistent: boolean;
  // Liter-based fields
  currentQuantityLiters: Decimal;
  sumMrnQuantitiesLiters: Decimal;
  differenceLiters: Decimal;
  toleranceLiters: Decimal;
  isConsistentByLiters: boolean;
  // Kilogram-based fields (primarni način provjere)
  currentQuantityKg: Decimal;
  sumMrnQuantitiesKg: Decimal;
  differenceKg: Decimal;
  toleranceKg: Decimal;
  isConsistentByKg: boolean;
  // MRN records
  mrnRecords: {
    id: number;
    customsDeclarationNumber: string;
    remainingQuantityLiters: Decimal;
    remainingQuantityKg: Decimal | null;
    dateAdded: Date;
  }[];
}

/**
 * Verifies the consistency of a fuel tank's quantity against the sum of its MRN records.
 * 
 * @param tankId The ID of the fixed tank to check.
 * @param tx Optional Prisma transaction client.
 * @returns A promise that resolves to the consistency check result.
 */
export async function verifyTankConsistency(
  tankId: number, 
  tx?: Prisma.TransactionClient
): Promise<TankConsistencyResult> {
  const client = tx || prisma;
  
  const tank = await client.fixedStorageTanks.findUnique({
    where: { id: tankId },
    select: { 
      id: true, 
      tank_name: true, 
      current_quantity_liters: true,
      current_quantity_kg: true // Dodajemo polje za kilograme
    }
  });
  
  if (!tank) {
    throw new Error(`Tank with ID ${tankId} not found.`);
  }
  
  const mrnRecordsRaw = await client.tankFuelByCustoms.findMany({
    where: { fixed_tank_id: tankId },
    select: {
      id: true,
      customs_declaration_number: true,
      remaining_quantity_liters: true,
      remaining_quantity_kg: true,
      date_added: true
    }
  });

  // Map raw records to the expected type for the result, ensuring type safety.
  const mrnRecords = mrnRecordsRaw.map(r => ({
      id: r.id,
      customsDeclarationNumber: r.customs_declaration_number,
      remainingQuantityLiters: r.remaining_quantity_liters,
      remainingQuantityKg: r.remaining_quantity_kg,
      dateAdded: r.date_added,
  }));
  
  // Filtriramo zapise s negativnim vrijednostima i logiramo ih
  const validMrnRecords = mrnRecords.filter(record => {
    const hasNegativeValues = 
      (record.remainingQuantityLiters && record.remainingQuantityLiters.isNegative()) || 
      (record.remainingQuantityKg && record.remainingQuantityKg.isNegative());
    
    if (hasNegativeValues) {
      logger.warn(
        `Ignoring negative values in MRN record ID=${record.id}, ` +
        `MRN=${record.customsDeclarationNumber}: ` +
        `L=${record.remainingQuantityLiters}, ` +
        `KG=${record.remainingQuantityKg}`
      );
      return false; // Ignorirajmo zapise s negativnim vrijednostima
    }
    return true;
  });
  
  // 1. Izračun po litrima (original, ali s većom tolerancijom)
  const sumMrnQuantitiesLiters = validMrnRecords.reduce(
    (sum, record) => sum.plus(record.remainingQuantityLiters),
    new Decimal(0)
  );
  
  const currentQuantityLiters = new Decimal(tank.current_quantity_liters);
  const differenceLiters = currentQuantityLiters.minus(sumMrnQuantitiesLiters).abs();
  // Povećavamo toleranciju za litre na 2% ili 200L
  const toleranceLiters = Decimal.max(currentQuantityLiters.mul(0.02), new Decimal(200)); 
  const isConsistentByLiters = differenceLiters.lessThanOrEqualTo(toleranceLiters);

  // 2. Izračun po kilogramima (novi primarni način)
  const sumMrnQuantitiesKg = validMrnRecords.reduce(
    (sum, record) => {
      if (record.remainingQuantityKg === null) return sum;
      return sum.plus(record.remainingQuantityKg);
    },
    new Decimal(0)
  );
  
  const currentQuantityKg = new Decimal(tank.current_quantity_kg);
  const differenceKg = currentQuantityKg.minus(sumMrnQuantitiesKg).abs();
  // Manja tolerancija za kilograme: 0.1% ili 20kg
  const toleranceKg = Decimal.max(currentQuantityKg.mul(0.001), new Decimal(20)); 
  const isConsistentByKg = differenceKg.lessThanOrEqualTo(toleranceKg);

  // Tank je konzistentan ako je konzistentan po kilogramima (primarni kriterij)
  // ILI ako je konzistentan po litrama (sekundarni kriterij)
  const isConsistent = isConsistentByKg || isConsistentByLiters;

  // Ažuriramo logiranje
  if (!isConsistent) {
    logger.warn(
      `Tank ${tank.tank_name} (ID: ${tankId}) is inconsistent. \n` +
      `KG: Difference: ${differenceKg.toFixed(2)} kg, ` +
      `Tank: ${currentQuantityKg.toFixed(2)} kg, ` +
      `MRN Sum: ${sumMrnQuantitiesKg.toFixed(2)} kg, ` +
      `Tolerance: ${toleranceKg.toFixed(2)} kg \n` +
      `Liters: Difference: ${differenceLiters.toFixed(2)} L, ` +
      `Tank: ${currentQuantityLiters.toFixed(2)} L, ` +
      `MRN Sum: ${sumMrnQuantitiesLiters.toFixed(2)} L, ` +
      `Tolerance: ${toleranceLiters.toFixed(2)} L`
    );
  } else if (isConsistentByKg && !isConsistentByLiters) {
    // Specifičan log ako je konzistentan samo po kg
    logger.info(
      `Tank ${tank.tank_name} (ID: ${tankId}) is consistent by KG but not by liters. ` +
      `This is acceptable due to temperature/volume variations.`
    );
  }

  return {
    tankId: tank.id,
    tankName: tank.tank_name,
    isConsistent,
    isConsistentByKg,
    isConsistentByLiters,
    currentQuantityLiters,
    sumMrnQuantitiesLiters,
    differenceLiters,
    toleranceLiters,
    currentQuantityKg,
    sumMrnQuantitiesKg,
    differenceKg,
    toleranceKg,
    mrnRecords: validMrnRecords, // Koristimo filtrirane zapise
  };
}

/**
 * Verifies the consistency for multiple tanks at once.
 * 
 * @param tankIds Array of tank IDs to check.
 * @param tx Optional Prisma transaction client.
 * @returns An array of consistency check results.
 */
export async function verifyMultipleTanksConsistency(
  tankIds: number[],
  tx?: Prisma.TransactionClient
): Promise<TankConsistencyResult[]> {
  return Promise.all(tankIds.map(id => verifyTankConsistency(id, tx)));
}

/**
 * Checks if a fuel operation can be performed based on available quantity.
 * This function now checks against KG, as it's the source of truth.
 * 
 * @param tankId The ID of the tank.
 * @param requiredAmountKg The amount of fuel in KG required for the operation.
 * @param tx Optional Prisma transaction client.
 * @returns True if the operation can be performed, otherwise false.
 */
export async function canPerformFuelOperation(
  tankId: number,
  requiredAmountKg: Decimal,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  const client = tx || prisma;
  
  const tank = await client.fixedStorageTanks.findUnique({
    where: { id: tankId },
    select: { current_quantity_kg: true }
  });
  
  if (!tank) {
    logger.error(`Tank with ID ${tankId} not found during fuel operation check.`);
    return false;
  }
  
  const currentKg = new Decimal(tank.current_quantity_kg);
  return currentKg.greaterThanOrEqualTo(requiredAmountKg);
}
