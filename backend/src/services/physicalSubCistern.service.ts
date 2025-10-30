import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateSubCisternDto {
  parent_cistern_id: number;
  sub_cistern_name: string;
  capacity_liters: number;
}

export interface UpdateSubCisternDto {
  sub_cistern_name?: string;
  capacity_liters?: number;
  is_active?: boolean;
}

/**
 * Create sub-cisterns for a cumulative cistern
 */
export async function createSubCisterns(
  cisternId: number,
  subCisterns: CreateSubCisternDto[]
): Promise<void> {
  // Check if cistern exists and is cumulative
  const cistern = await prisma.physicalCisternFuel.findUnique({
    where: { id: cisternId }
  });

  if (!cistern) {
    throw new Error(`Cistern with ID ${cisternId} not found`);
  }

  if (!cistern.is_cumulative) {
    throw new Error(`Cistern ${cisternId} is not marked as cumulative`);
  }

  // Validate total capacity
  const totalCapacity = subCisterns.reduce((sum, sc) => sum + sc.capacity_liters, 0);
  
  if (totalCapacity > cistern.capacity_liters) {
    throw new Error(
      `Total sub-cistern capacity (${totalCapacity}L) exceeds parent cistern capacity (${cistern.capacity_liters}L)`
    );
  }

  // Create sub-cisterns
  await prisma.$transaction(
    subCisterns.map(subCistern =>
      prisma.physicalSubCistern.create({
        data: {
          parent_cistern_id: cisternId,
          sub_cistern_name: subCistern.sub_cistern_name,
          capacity_liters: subCistern.capacity_liters,
          current_quantity_liters: 0,
          current_quantity_kg: 0,
          is_active: true
        }
      })
    )
  );

  // Mark cistern as cumulative
  await prisma.physicalCisternFuel.update({
    where: { id: cisternId },
    data: { is_cumulative: true }
  });

  logger.info(`Created ${subCisterns.length} sub-cisterns for cistern ${cisternId}`);
}

/**
 * Update sub-cistern configuration
 */
export async function updateSubCistern(
  subCisternId: number,
  data: UpdateSubCisternDto
): Promise<void> {
  await prisma.physicalSubCistern.update({
    where: { id: subCisternId },
    data
  });

  logger.info(`Updated sub-cistern ${subCisternId}`);
}

/**
 * Get all active sub-cisterns
 */
export async function getAllSubCisterns() {
  return prisma.$queryRaw<any[]>`
    SELECT * FROM "PhysicalSubCistern" WHERE "is_active" = true ORDER BY "createdAt" DESC
  `.catch(() => []);
}

/**
 * Get all sub-cisterns for a parent cistern
 */
export async function getSubCisternsByParent(parentCisternId: number) {
  return prisma.physicalSubCistern.findMany({
    where: {
      parent_cistern_id: parentCisternId,
      is_active: true
    },
    include: {
      subCisternMrn: {
        where: {
          remaining_quantity_kg: { gt: 0 }
        },
        orderBy: {
          date_added: 'asc'
        }
      }
    },
    orderBy: {
      sub_cistern_name: 'asc'
    }
  });
}

/**
 * Distribute fuel from cistern to sub-cisterns (proportional to capacity)
 */
export async function distributeFuelToSubCisterns(
  cisternId: number,
  quantityLiters: number,
  quantityKg: number
): Promise<void> {
  const cistern = await prisma.physicalCisternFuel.findUnique({
    where: { id: cisternId },
    include: {
      subCisterns: {
        where: { is_active: true }
      }
    }
  });

  if (!cistern || !cistern.is_cumulative) {
    throw new Error(`Cistern ${cisternId} is not cumulative`);
  }

  if (cistern.subCisterns.length === 0) {
    logger.warn(`No sub-cisterns configured for cistern ${cisternId}`);
    return;
  }

  // Calculate proportional distribution
  const totalCapacity = cistern.subCisterns.reduce((sum, sc) => sum + sc.capacity_liters, 0);

  await prisma.$transaction(async (tx) => {
    for (const subCistern of cistern.subCisterns) {
      const proportion = subCistern.capacity_liters / totalCapacity;
      const subQuantityLiters = quantityLiters * proportion;
      const subQuantityKg = quantityKg * proportion;

      // Update sub-cistern quantities
      await tx.physicalSubCistern.update({
        where: { id: subCistern.id },
        data: {
          current_quantity_liters: {
            increment: subQuantityLiters
          },
          current_quantity_kg: {
            increment: subQuantityKg
          }
        }
      });

      logger.info(
        `Distributed ${subQuantityLiters.toFixed(2)}L to sub-cistern ${subCistern.sub_cistern_name}`
      );
    }

    // Update parent cistern totals
    const allSubCisterns = await tx.physicalSubCistern.findMany({
      where: {
        parent_cistern_id: cisternId,
        is_active: true
      }
    });

    let totalLiters = 0;
    let totalKg = 0;

    for (const sc of allSubCisterns) {
      const proportion = sc.capacity_liters / totalCapacity;
      totalLiters += sc.current_quantity_liters + (quantityLiters * proportion);
      totalKg += sc.current_quantity_kg + (quantityKg * proportion);
    }

    const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;

    await tx.physicalCisternFuel.update({
      where: { id: cisternId },
      data: {
        current_quantity_liters: totalLiters,
        current_quantity_kg: totalKg,
        average_density: averageDensity
      }
    });

    logger.info(`Updated parent cistern ${cisternId} after fuel distribution`);
  });
}

/**
 * Deduct fuel from sub-cisterns using FIFO logic
 */
export async function deductFuelFromSubCisterns(
  cisternId: number,
  quantityLiters: Decimal,
  quantityKg: Decimal,
  fuelingOperationId?: number
): Promise<void> {
  const cistern = await prisma.physicalCisternFuel.findUnique({
    where: { id: cisternId },
    include: {
      subCisterns: {
        where: { is_active: true }
      }
    }
  });

  if (!cistern || !cistern.is_cumulative) {
    throw new Error(`Cistern ${cisternId} is not cumulative`);
  }

  if (cistern.subCisterns.length === 0) {
    logger.warn(`No sub-cisterns configured for cistern ${cisternId}`);
    return;
  }

  // Calculate proportional deduction from each sub-cistern
  const totalCapacity = cistern.subCisterns.reduce((sum, sc) => sum + sc.capacity_liters, 0);
  
  await prisma.$transaction(async (tx) => {
    let remainingLiters = quantityLiters;
    let remainingKg = quantityKg;

    for (const subCistern of cistern.subCisterns) {
      if (remainingLiters.lessThanOrEqualTo(0)) break;

      // Calculate proportional amount for this sub-cistern
      const proportion = subCistern.capacity_liters / totalCapacity;
      const deductLiters = remainingLiters.mul(proportion);
      const deductKg = remainingKg.mul(proportion);

      // FIFO deduction from sub-cistern MRN records
      await deductFuelFromSubCisternFIFO(
        tx as any,
        subCistern.id,
        deductLiters,
        deductKg,
        fuelingOperationId
      );

      // Update sub-cistern quantities
      await tx.physicalSubCistern.update({
        where: { id: subCistern.id },
        data: {
          current_quantity_liters: {
            decrement: deductLiters.toNumber()
          },
          current_quantity_kg: {
            decrement: deductKg.toNumber()
          }
        }
      });

      remainingLiters = remainingLiters.sub(deductLiters);
      remainingKg = remainingKg.sub(deductKg);
    }

    // Update parent cistern totals
    const allSubCisterns = await tx.physicalSubCistern.findMany({
      where: {
        parent_cistern_id: cisternId,
        is_active: true
      }
    });

    let totalLiters = 0;
    let totalKg = 0;

    for (const sc of allSubCisterns) {
      totalLiters += sc.current_quantity_liters;
      totalKg += sc.current_quantity_kg;
    }

    // Subtract the deducted amounts
    totalLiters -= quantityLiters.toNumber();
    totalKg -= quantityKg.toNumber();

    const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;

    await tx.physicalCisternFuel.update({
      where: { id: cisternId },
      data: {
        current_quantity_liters: totalLiters,
        current_quantity_kg: totalKg,
        average_density: averageDensity
      }
    });

    logger.info(`Updated parent cistern ${cisternId} after fuel deduction`);
  });

  logger.info(
    `Deducted ${quantityLiters.toFixed(2)}L / ${quantityKg.toFixed(2)}kg from sub-cisterns`
  );
}

/**
 * FIFO deduction from a single sub-cistern
 */
async function deductFuelFromSubCisternFIFO(
  tx: any,
  subCisternId: number,
  quantityLiters: Decimal,
  quantityKg: Decimal,
  fuelingOperationId?: number
): Promise<void> {
  // Get all MRN records for this sub-cistern (FIFO)
  const mrnRecords = await tx.physicalSubCisternMrn.findMany({
    where: {
      sub_cistern_id: subCisternId,
      remaining_quantity_kg: { gt: 0 }
    },
    orderBy: {
      date_added: 'asc'
    }
  });

  let remainingKg = quantityKg;
  let remainingLiters = quantityLiters;

  for (const mrnRecord of mrnRecords) {
    if (remainingKg.lessThanOrEqualTo(0)) break;

    const recordKg = new Decimal(mrnRecord.remaining_quantity_kg);
    const deductKg = Decimal.min(recordKg, remainingKg);

    // Calculate liters to deduct based on original density
    const density = new Decimal(mrnRecord.density_at_intake);
    const deductLiters = deductKg.div(density);

    // Update MRN record
    const newRemainingKg = recordKg.sub(deductKg);
    const newRemainingLiters = new Decimal(mrnRecord.remaining_quantity_liters).sub(deductLiters);

    await tx.physicalSubCisternMrn.update({
      where: { id: mrnRecord.id },
      data: {
        remaining_quantity_kg: newRemainingKg,
        remaining_quantity_liters: newRemainingLiters
      }
    });

    remainingKg = remainingKg.sub(deductKg);
    remainingLiters = remainingLiters.sub(deductLiters);
  }

  if (remainingKg.greaterThan(0.001)) {
    logger.warn(
      `Insufficient fuel in sub-cistern ${subCisternId} MRN records. Remaining: ${remainingKg.toFixed(2)}kg`
    );
  }
}

/**
 * Manual update sub-cistern quantities (reconciliation)
 */
export async function manualUpdateSubCistern(
  subCisternId: number,
  data: {
    current_quantity_liters: number;
    current_quantity_kg: number;
    notes?: string;
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get the sub-cistern to find its parent
    const subCistern = await tx.physicalSubCistern.findUnique({
      where: { id: subCisternId }
    });

    if (!subCistern) {
      throw new Error(`Sub-cistern with ID ${subCisternId} not found`);
    }

    // Update sub-cistern quantities
    await tx.physicalSubCistern.update({
      where: { id: subCisternId },
      data: {
        current_quantity_liters: data.current_quantity_liters,
        current_quantity_kg: data.current_quantity_kg
      }
    });

    // Recalculate parent cistern totals
    const allSubCisterns = await tx.physicalSubCistern.findMany({
      where: {
        parent_cistern_id: subCistern.parent_cistern_id,
        is_active: true
      }
    });

    // Sum up all sub-cistern quantities
    let totalLiters = 0;
    let totalKg = 0;

    for (const sc of allSubCisterns) {
      // Use updated values for the current sub-cistern
      if (sc.id === subCisternId) {
        totalLiters += data.current_quantity_liters;
        totalKg += data.current_quantity_kg;
      } else {
        totalLiters += sc.current_quantity_liters;
        totalKg += sc.current_quantity_kg;
      }
    }

    // Calculate weighted average density
    const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;

    // Update parent cistern with totals
    await tx.physicalCisternFuel.update({
      where: { id: subCistern.parent_cistern_id },
      data: {
        current_quantity_liters: totalLiters,
        current_quantity_kg: totalKg,
        average_density: averageDensity
      }
    });

    logger.info(`Manually updated sub-cistern ${subCisternId} and parent cistern ${subCistern.parent_cistern_id} quantities`);
  });
}

/**
 * Transfer fuel between sub-cisterns
 */
export async function transferBetweenSubCisterns(
  data: {
    source_sub_cistern_id: number;
    destination_sub_cistern_id: number;
    quantity_liters: number;
    quantity_kg: number;
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get source sub-cistern
    const source = await tx.physicalSubCistern.findUnique({
      where: { id: data.source_sub_cistern_id }
    });

    if (!source) {
      throw new Error('Source sub-cistern not found');
    }

    // Check if enough fuel
    if (source.current_quantity_liters < data.quantity_liters) {
      throw new Error('Insufficient fuel in source sub-cistern');
    }

    // Get destination sub-cistern
    const destination = await tx.physicalSubCistern.findUnique({
      where: { id: data.destination_sub_cistern_id }
    });

    if (!destination) {
      throw new Error('Destination sub-cistern not found');
    }

    // Check capacity
    if (destination.current_quantity_liters + data.quantity_liters > destination.capacity_liters) {
      throw new Error('Transfer would exceed destination sub-cistern capacity');
    }

    // Update source
    await tx.physicalSubCistern.update({
      where: { id: data.source_sub_cistern_id },
      data: {
        current_quantity_liters: {
          decrement: data.quantity_liters
        },
        current_quantity_kg: {
          decrement: data.quantity_kg
        }
      }
    });

    // Calculate weighted average density for destination
    const currentTotalKg = destination.current_quantity_kg;
    const currentTotalLiters = destination.current_quantity_liters;
    const transferredKg = data.quantity_kg;
    const transferredLiters = data.quantity_liters;
    
    // Weighted average calculation
    const finalTotalKg = currentTotalKg + transferredKg;
    const finalTotalLiters = currentTotalLiters + transferredLiters;

    // Update destination with weighted average (total kg recalculated to maintain correct density)
    await tx.physicalSubCistern.update({
      where: { id: data.destination_sub_cistern_id },
      data: {
        current_quantity_liters: {
          increment: data.quantity_liters
        },
        current_quantity_kg: {
          set: finalTotalKg
        }
      }
    });

    // Update parent cistern totals (if they share the same parent)
    if (source.parent_cistern_id === destination.parent_cistern_id) {
      // Get all sub-cisterns for this parent
      const allSubCisterns = await tx.physicalSubCistern.findMany({
        where: {
          parent_cistern_id: source.parent_cistern_id,
          is_active: true
        }
      });

      // Sum up all sub-cistern quantities (with updated values)
      let totalLiters = 0;
      let totalKg = 0;

      for (const sc of allSubCisterns) {
        if (sc.id === data.source_sub_cistern_id) {
          totalLiters += source.current_quantity_liters - data.quantity_liters;
          totalKg += source.current_quantity_kg - data.quantity_kg;
        } else if (sc.id === data.destination_sub_cistern_id) {
          totalLiters += finalTotalLiters;
          totalKg += finalTotalKg;
        } else {
          totalLiters += sc.current_quantity_liters;
          totalKg += sc.current_quantity_kg;
        }
      }

      // Calculate weighted average density
      const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;

      // Update parent cistern
      await tx.physicalCisternFuel.update({
        where: { id: source.parent_cistern_id },
        data: {
          current_quantity_liters: totalLiters,
          current_quantity_kg: totalKg,
          average_density: averageDensity
        }
      });

      logger.info(`Updated parent cistern ${source.parent_cistern_id} after sub-cistern transfer`);
    }
  });

  logger.info(`Transferred fuel from sub-cistern ${data.source_sub_cistern_id} to ${data.destination_sub_cistern_id}`);
}

/**
 * Delete sub-cistern (soft delete by setting is_active to false)
 */
export async function deleteSubCistern(subCisternId: number): Promise<void> {
  await prisma.physicalSubCistern.update({
    where: { id: subCisternId },
    data: { is_active: false }
  });

  logger.info(`Deleted sub-cistern ${subCisternId}`);
}

/**
 * Add fuel to specific sub-cistern
 */
export async function addFuelToSpecificSubCistern(
  tx: any,
  subCisternId: number,
  quantityLiters: number,
  quantityKg: number
): Promise<void> {
  await tx.physicalSubCistern.update({
    where: { id: subCisternId },
    data: {
      current_quantity_liters: {
        increment: quantityLiters
      },
      current_quantity_kg: {
        increment: quantityKg
      }
    }
  });

  logger.info(`Added fuel to sub-cistern ${subCisternId}`);
}
