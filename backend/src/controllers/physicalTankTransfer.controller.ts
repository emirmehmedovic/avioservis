import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * GET /api/physical-tank-transfers
 * Get all physical tank transfers with optional filters
 */
export const getTransfers: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { from_tank_id, to_cistern_id, date_from, date_to } = req.query;

    const where: any = {};
    
    if (from_tank_id) where.source_physical_tank_id = parseInt(from_tank_id as string);
    if (to_cistern_id) where.target_cistern_id = parseInt(to_cistern_id as string);
    if (date_from || date_to) {
      where.transfer_datetime = {};
      if (date_from) where.transfer_datetime.gte = new Date(date_from as string);
      if (date_to) where.transfer_datetime.lte = new Date(date_to as string);
    }

    const transfers = await prisma.physicalTankTransfer.findMany({
      where,
      include: {
        sourceTank: {
          select: {
            id: true,
            tank_name: true,
            tank_identifier: true
          }
        },
        targetCistern: {
          select: {
            id: true,
            cistern_identifier: true
          }
        }
      },
      orderBy: { transfer_datetime: 'desc' }
    });

    res.status(200).json(transfers);
  } catch (error) {
    logger.error('Error fetching physical tank transfers:', error);
    next(error);
  }
};

/**
 * GET /api/physical-tank-transfers/:id
 * Get transfer by ID
 */
export const getTransferById: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const transferId = parseInt(id);

    if (isNaN(transferId)) {
      res.status(400).json({ message: 'Invalid transfer ID' });
      return;
    }

    const transfer = await prisma.physicalTankTransfer.findUnique({
      where: { id: transferId },
      include: {
        sourceTank: {
          select: {
            id: true,
            tank_name: true,
            tank_identifier: true
          }
        },
        targetCistern: {
          select: {
            id: true,
            cistern_identifier: true
          }
        }
      }
    });

    if (!transfer) {
      res.status(404).json({ message: 'Transfer not found' });
      return;
    }

    res.status(200).json(transfer);
  } catch (error) {
    logger.error('Error fetching transfer:', error);
    next(error);
  }
};

/**
 * POST /api/physical-tank-transfers
 * Create new transfer from physical tank to cistern
 */
export const createTransfer: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const {
      source_physical_tank_id,
      target_cistern_id,
      target_sub_cistern_id,
      quantity_liters,
      quantity_kg,
      transfer_datetime,
      notes
    } = req.body;

    // Validation
    if (!source_physical_tank_id || !target_cistern_id || !quantity_liters || !quantity_kg) {
      res.status(400).json({ 
        message: 'source_physical_tank_id, target_cistern_id, quantity_liters, and quantity_kg are required' 
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get source tank
      const sourceTank = await tx.physicalTanks.findUnique({
        where: { id: source_physical_tank_id },
        include: {
          physicalTankMrn: {
            where: {
              remaining_quantity_kg: { gt: 0 }
            },
            orderBy: { date_added: 'asc' }
          }
        }
      });

      if (!sourceTank) {
        throw new Error('Source tank not found');
      }

      // Check if enough fuel
      if (sourceTank.current_quantity_liters < quantity_liters) {
        throw new Error('Insufficient fuel in source tank');
      }

      // Get target cistern
      const targetCistern = await tx.physicalCisternFuel.findUnique({
        where: { id: target_cistern_id }
      });

      if (!targetCistern) {
        throw new Error('Target cistern not found');
      }

      // Check if target has enough capacity
      const newQuantity = targetCistern.current_quantity_liters + quantity_liters;
      if (newQuantity > targetCistern.capacity_liters) {
        throw new Error('Transfer would exceed target cistern capacity');
      }

      // Calculate proportional deduction from all MRN records
      const totalRemainingLiters = sourceTank.physicalTankMrn.reduce(
        (sum, mrn) => sum + Number(mrn.remaining_quantity_liters), 0
      );

      if (totalRemainingLiters === 0) {
        throw new Error('No MRN records to deduct from');
      }

      const deductionRatio = quantity_liters / totalRemainingLiters;

      // Deduct proportionally from all MRN records
      const mrnBreakdown: any[] = [];
      
      for (const mrn of sourceTank.physicalTankMrn) {
        const mrnDeductionLiters = Number(mrn.remaining_quantity_liters) * deductionRatio;
        const mrnDeductionKg = Number(mrn.remaining_quantity_kg) * deductionRatio;

        await tx.physicalTankMrn.update({
          where: { id: mrn.id },
          data: {
            remaining_quantity_liters: {
              decrement: mrnDeductionLiters
            },
            remaining_quantity_kg: {
              decrement: mrnDeductionKg
            }
          }
        });

        mrnBreakdown.push({
          mrn_id: mrn.id,
          customs_declaration_number: mrn.customs_declaration_number,
          quantity_liters: mrnDeductionLiters,
          quantity_kg: mrnDeductionKg
        });
      }

      // Update source tank quantities
      await tx.physicalTanks.update({
        where: { id: source_physical_tank_id },
        data: {
          current_quantity_liters: {
            decrement: quantity_liters
          },
          current_quantity_kg: {
            decrement: quantity_kg
          }
        }
      });

      // If target_sub_cistern_id is provided, add fuel directly to the specific sub-cistern
      if (target_sub_cistern_id) {
        const subCistern = await tx.$queryRaw<any[]>`
          SELECT * FROM "PhysicalSubCistern" WHERE id = ${target_sub_cistern_id}
        `.then(result => result[0]);

        if (!subCistern) {
          throw new Error('Target sub-cistern not found');
        }

        // Check capacity
        const newSubQuantity = Number(subCistern.current_quantity_liters) + quantity_liters;
        if (newSubQuantity > Number(subCistern.capacity_liters)) {
          throw new Error('Transfer would exceed sub-cistern capacity');
        }

        // Update sub-cistern quantities
        await tx.$executeRaw`
          UPDATE "PhysicalSubCistern" 
          SET "current_quantity_liters" = "current_quantity_liters" + ${quantity_liters},
              "current_quantity_kg" = "current_quantity_kg" + ${quantity_kg}
          WHERE id = ${target_sub_cistern_id}
        `;
      } else {
        // Update target cistern quantities
        await tx.physicalCisternFuel.update({
          where: { id: target_cistern_id },
          data: {
            current_quantity_liters: {
              increment: quantity_liters
            },
            current_quantity_kg: {
              increment: quantity_kg
            }
          }
        });
      }

      // Create transfer record
      const transfer = await tx.physicalTankTransfer.create({
        data: {
          source_physical_tank_id,
          target_cistern_id,
          quantity_liters,
          quantity_kg,
          transfer_datetime: transfer_datetime ? new Date(transfer_datetime) : new Date(),
          notes: notes || null,
          mrn_breakdown: JSON.stringify(mrnBreakdown)
        }
      });

      return transfer;
    });

    res.status(201).json({
      message: 'Transfer created successfully',
      transfer_id: result.id
    });
  } catch (error: any) {
    logger.error('Error creating transfer:', error);
    res.status(400).json({ message: error.message || 'Error creating transfer' });
  }
};

/**
 * DELETE /api/physical-tank-transfers/:id
 * Delete transfer (reverse operation)
 */
export const deleteTransfer: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const transferId = parseInt(id);

    if (isNaN(transferId)) {
      res.status(400).json({ message: 'Invalid transfer ID' });
      return;
    }

    // Note: In production, you'd want to implement proper reverse logic
    // This is a placeholder that just deletes the record
    await prisma.physicalTankTransfer.delete({
      where: { id: transferId }
    });

    res.status(200).json({ message: 'Transfer deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting transfer:', error);
    res.status(400).json({ message: error.message || 'Error deleting transfer' });
  }
};
