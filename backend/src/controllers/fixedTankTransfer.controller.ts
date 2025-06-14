import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, FixedTankStatus } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/fuel/transfers - Kreiranje novog transfera u fiksni tank
// Ovo se može pozivati i kao dio kreiranja FuelIntakeRecord
export const createFixedTankTransfer: RequestHandler = async (req, res, next) => {
  try {
    const {
      fuel_intake_record_id,
      affected_fixed_tank_id,
      quantity_liters_transferred,
      transfer_datetime,
      notes,
      activity_type, // Added activity_type
    } = req.body;

    if (fuel_intake_record_id == null || affected_fixed_tank_id == null || quantity_liters_transferred == null) {
      res.status(400).json({
        message:
          'Missing required fields: fuel_intake_record_id, affected_fixed_tank_id, quantity_liters_transferred are required.',
      });
      return;
    }

    // Check if related records exist
    const intakeRecord = await prisma.fuelIntakeRecords.findUnique({ where: { id: parseInt(fuel_intake_record_id) } });
    if (!intakeRecord) {
      res.status(404).json({ message: `FuelIntakeRecord with id ${fuel_intake_record_id} not found.` });
      return;
    }
    const fixedTank = await prisma.fixedStorageTanks.findUnique({ where: { id: parseInt(affected_fixed_tank_id) } });
    if (!fixedTank) {
      res.status(404).json({ message: `FixedStorageTank with id ${affected_fixed_tank_id} not found.` });
      return;
    }

    // Check if there's enough fuel in the intake record (conceptually, if needed)
    // For now, assume direct transfer. Update fixed tank's current_quantity_liters and current_quantity_kg.
    const newCurrentLiters = fixedTank.current_quantity_liters + parseFloat(quantity_liters_transferred);
    if (newCurrentLiters > fixedTank.capacity_liters) {
        res.status(400).json({ message: `Transfer would exceed tank ${fixedTank.tank_identifier} capacity. Available: ${fixedTank.capacity_liters - fixedTank.current_quantity_liters} L.`});
        return;
    }
    
    // Dohvati specifičnu gustoću iz intake recorda ili koristi defaultnu vrijednost
    let specificGravity = 0.8; // Default vrijednost za Jet A1 gorivo
    if (intakeRecord && intakeRecord.specific_gravity) {
      specificGravity = parseFloat(intakeRecord.specific_gravity.toString());
    }
    
    // Izračunaj količinu u kilogramima na osnovu litara i gustoće
    const quantity_kg_transferred = parseFloat(quantity_liters_transferred) * specificGravity;
    // Ažuriramo i litre i kilograme u fiksnom tanku
    const currentKg = fixedTank.current_quantity_kg || 0; // Provjera ako je current_quantity_kg null
    const newCurrentKg = currentKg + quantity_kg_transferred;

    const newTransfer = await prisma.fixedTankTransfers.create({
      data: {
        activity_type, // Added activity_type from req.body
        fuel_intake_record_id: parseInt(fuel_intake_record_id),
        affected_fixed_tank_id: parseInt(affected_fixed_tank_id),
        quantity_liters_transferred: parseFloat(quantity_liters_transferred),
        quantity_kg_transferred: quantity_kg_transferred, // Koristimo izračunatu vrijednost
        transfer_datetime: transfer_datetime ? new Date(transfer_datetime) : new Date(),
        notes,
      },
    });

    // Update current_quantity_liters AND current_quantity_kg in the FixedStorageTank
    await prisma.fixedStorageTanks.update({
        where: { id: parseInt(affected_fixed_tank_id) },
        data: { 
          current_quantity_liters: newCurrentLiters,
          current_quantity_kg: newCurrentKg // Dodajemo ažuriranje kilograma
        }
    });

    res.status(201).json(newTransfer);
  } catch (error: any) {
    // Catch specific Prisma errors if necessary, e.g., P2003 for foreign key constraints
    // For now, general error handling
    next(error);
  }
};

// GET /api/fuel/transfers - Dobijanje liste svih transfera
export const getAllFixedTankTransfers: RequestHandler = async (req, res, next) => {
  try {
    const { intakeId, tankId, startDate, endDate } = req.query;
    const filters: any = {};

    if (intakeId) filters.fuel_intake_record_id = parseInt(intakeId as string);
    if (tankId) filters.affected_fixed_tank_id = parseInt(tankId as string);
    if (startDate && endDate) {
      filters.transfer_datetime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const transfers = await prisma.fixedTankTransfers.findMany({
      where: filters,
      include: {
        affectedFixedTank: true,
        fuelIntakeRecord: true,
      },
      orderBy: {
        transfer_datetime: 'desc',
      },
    });
    res.status(200).json(transfers);
  } catch (error: any) {
    next(error);
  }
};

// GET /api/fuel/transfers/:id - Dobijanje detalja specifičnog transfera
export const getFixedTankTransferById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transfer = await prisma.fixedTankTransfers.findUnique({
      where: { id: parseInt(id) },
      include: {
        affectedFixedTank: true,
        fuelIntakeRecord: true,
      }
    });
    if (!transfer) {
      res.status(404).json({ message: 'Fixed tank transfer not found' });
      return;
    }
    res.status(200).json(transfer);
  } catch (error: any) {
    next(error);
  }
};

// PUT /api/fuel/transfers/:id - Ažuriranje transfera
// Note: Updating a transfer might require complex logic, e.g., adjusting tank levels.
// This example provides a basic update of notes or datetime.
// Changing quantities would require recalculating tank levels and potentially source record levels.
export const updateFixedTankTransfer: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity_liters_transferred, transfer_datetime, notes } = req.body;

    const existingTransfer = await prisma.fixedTankTransfers.findUnique({ where: { id: parseInt(id) } });
    if (!existingTransfer) {
        res.status(404).json({ message: 'Transfer not found for update.' });
        return;
    }

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (transfer_datetime !== undefined) updateData.transfer_datetime = new Date(transfer_datetime);

    // CAUTION: Updating quantity_liters_transferred is complex.
    // It requires adjusting the target tank's current_quantity_liters.
    // This example does NOT adjust tank levels on update for simplicity.
    // A full implementation would need to:
    // 1. Revert the original transfer's effect on the tank's current_quantity_liters.
    // 2. Apply the new transfer's effect on the tank's current_quantity_liters.
    // 3. Ensure capacity is not exceeded.
    if (quantity_liters_transferred !== undefined) {
        const newQuantity = parseFloat(quantity_liters_transferred);
        const oldQuantity = Number(existingTransfer.quantity_liters_transferred);
        const difference = newQuantity - oldQuantity;

        const targetTank = await prisma.fixedStorageTanks.findUnique({ where: { id: existingTransfer.affected_fixed_tank_id }});
        if (!targetTank) {
            res.status(404).json({ message: `Target tank for transfer not found.`});
            return;
        }
        const newTankLevel = targetTank.current_quantity_liters + difference;
        if (newTankLevel < 0 || newTankLevel > targetTank.capacity_liters) {
            res.status(400).json({ message: `Updated quantity would result in invalid tank level (underflow or overflow). Current level: ${targetTank.current_quantity_liters}, capacity: ${targetTank.capacity_liters}, proposed change: ${difference}`});
            return;
        }
        
        // Dohvati specifičnu gustoću iz transfera ili koristi defaultnu vrijednost
        let specificGravity = 0.8; // Default vrijednost
        const fuelIntakeRecord = existingTransfer.fuel_intake_record_id ? 
          await prisma.fuelIntakeRecords.findUnique({ 
            where: { id: existingTransfer.fuel_intake_record_id } 
          }) : null;
        if (fuelIntakeRecord && fuelIntakeRecord.specific_gravity) {
          specificGravity = parseFloat(fuelIntakeRecord.specific_gravity.toString());
        }
        
        // Izračunaj promjenu u kilogramima
        const differenceKg = difference * specificGravity;
        const currentKg = targetTank.current_quantity_kg || 0;
        const newKgLevel = currentKg + differenceKg;
        
        updateData.quantity_liters_transferred = newQuantity;
        updateData.quantity_kg_transferred = parseFloat(existingTransfer.quantity_kg_transferred.toString()) + differenceKg;
        
        // Update tank level in a transaction with transfer update
        await prisma.$transaction([
            prisma.fixedTankTransfers.update({
                where: { id: parseInt(id) },
                data: updateData,
            }),
            prisma.fixedStorageTanks.update({
                where: { id: targetTank.id },
                data: { 
                  current_quantity_liters: newTankLevel,
                  current_quantity_kg: newKgLevel // Ažuriramo i kilograme
                }
            })
        ]);
        // Since we are doing a transaction, we fetch the updated transfer to return it.
        const updatedTransfer = await prisma.fixedTankTransfers.findUnique({ where: { id: parseInt(id) }, include: { affectedFixedTank: true, fuelIntakeRecord: true }});
        res.status(200).json(updatedTransfer);
        return; // Return early as transaction handles the response
    }
    
    // If only notes/datetime are updated
    if (Object.keys(updateData).length === 0 && quantity_liters_transferred === undefined) {
        res.status(400).json({ message: 'No fields provided for update.' });
        return;
    }

    const updatedTransfer = await prisma.fixedTankTransfers.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { affectedFixedTank:true, fuelIntakeRecord:true }
    });
    res.status(200).json(updatedTransfer);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Fixed tank transfer not found for update.' });
      return;
    }
    next(error);
  }
};

// DELETE /api/fuel/transfers/:id - Brisanje transfera
// CAUTION: Deleting a transfer should ideally revert the quantity in the fixed tank.
export const deleteFixedTankTransfer: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transferToDelete = await prisma.fixedTankTransfers.findUnique({
        where: {id: parseInt(id)}
    });

    if (!transferToDelete) {
        res.status(404).json({message: 'Transfer not found for deletion.'});
        return;
    }

    const targetTank = await prisma.fixedStorageTanks.findUnique({where: {id: transferToDelete.affected_fixed_tank_id}});
    if (!targetTank) {
        // This case should ideally not happen if data is consistent
        res.status(404).json({message: `Target tank for transfer ID ${id} not found. Cannot adjust tank level.`});
        return;
    }

    const newTankLevel = Number(targetTank.current_quantity_liters) - Number(transferToDelete.quantity_liters_transferred);
    if (newTankLevel < 0) {
        // This indicates an inconsistency, but proceed with deletion and log warning/error
        console.warn(`Warning: Deleting transfer ID ${id} results in negative tank level for tank ID ${targetTank.id}.`);
        // Optionally, prevent deletion or set level to 0
    }

    await prisma.$transaction([
        prisma.fixedTankTransfers.delete({ where: { id: parseInt(id) } }),
        prisma.fixedStorageTanks.update({
            where: { id: targetTank.id },
            data: { current_quantity_liters: Math.max(0, newTankLevel) } // Ensure it doesn't go below 0
        })
    ]);
    
    res.status(200).json({ message: 'Fixed tank transfer deleted successfully and tank level adjusted.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Fixed tank transfer not found for deletion.' });
      return;
    }
    next(error);
  }
};
