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
  currentQuantityLiters: Decimal;
  sumMrnQuantities: Decimal;
  difference: Decimal;
  tolerance: Decimal;
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
    select: { id: true, tank_name: true, current_quantity_liters: true }
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
  
  const sumMrnQuantities = mrnRecords.reduce(
    (sum, record) => sum.plus(record.remainingQuantityLiters),
    new Decimal(0)
  );
  
  const currentQuantityLiters = new Decimal(tank.current_quantity_liters);
  const difference = currentQuantityLiters.minus(sumMrnQuantities).abs();
  const tolerance = Decimal.max(currentQuantityLiters.mul(0.005), new Decimal(50)); // 0.5% or 50L, whichever is greater.
  const isConsistent = difference.lessThanOrEqualTo(tolerance);

  if (!isConsistent) {
    logger.warn(
      `Tank ${tank.tank_name} (ID: ${tankId}) is inconsistent. ` +
      `Difference: ${difference.toFixed(2)} L, ` +
      `Tank Qty: ${currentQuantityLiters.toFixed(2)} L, ` +
      `MRN Sum: ${sumMrnQuantities.toFixed(2)} L, ` +
      `Tolerance: ${tolerance.toFixed(2)} L`
    );
  }

  return {
    tankId: tank.id,
    tankName: tank.tank_name,
    isConsistent,
    currentQuantityLiters,
    sumMrnQuantities,
    difference,
    tolerance,
    mrnRecords, // Use the correctly mapped records.
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
