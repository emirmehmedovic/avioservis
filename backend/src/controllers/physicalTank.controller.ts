import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma';

// ============================================================================
// PHYSICAL TANKS CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/physical-tanks
 * Dohvati sve fizičke tankove
 */
export const getPhysicalTanks: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { fuel_type, is_active } = req.query;

    const whereClause: any = {};
    
    if (fuel_type) {
      whereClause.fuel_type = fuel_type as string;
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const tanks = await prisma.physicalTanks.findMany({
      where: whereClause,
      orderBy: { display_order: 'asc' },
      select: {
        id: true,
        tank_name: true,
        tank_identifier: true,
        capacity_liters: true,
        current_quantity_liters: true,
        current_quantity_kg: true,
        average_density: true,
        fuel_type: true,
        location_description: true,
        display_order: true,
        is_active: true,
        createdAt: true,
        updatedAt: true,
        physicalTankMrn: {
          where: {
            remaining_quantity_kg: { gt: 0 }
          },
          select: {
            id: true,
            customs_declaration_number: true,
            remaining_quantity_liters: true,
            remaining_quantity_kg: true,
            density_at_intake: true,
            date_added: true
          },
          orderBy: { date_added: 'asc' }
        }
      }
    });

    // Izračunaj prosječnu gustoću i last_fuel_intake_date za svaki tank
    const tanksWithAvgDensity = tanks.map(tank => {
      // Koristi average_density iz baze ako postoji, inače računaj iz MRN zapisa
      let avgDensity = tank.average_density || 0.8; // Default
      let lastFuelIntakeDate: Date | null = null;

      // Ako nema average_density u bazi, računaj iz MRN zapisa
      if (!tank.average_density && tank.physicalTankMrn.length > 0) {
        const totalKg = tank.physicalTankMrn.reduce((sum, mrn) => 
          sum + Number(mrn.remaining_quantity_kg), 0);
        const totalLiters = tank.physicalTankMrn.reduce((sum, mrn) => 
          sum + Number(mrn.remaining_quantity_liters), 0);
        
        if (totalLiters > 0) {
          avgDensity = totalKg / totalLiters;
        }
      }

      // Find the most recent date_added from all MRN records
      if (tank.physicalTankMrn.length > 0) {
        const dates = tank.physicalTankMrn
          .map(mrn => new Date(mrn.date_added))
          .filter(date => !isNaN(date.getTime()));

        if (dates.length > 0) {
          lastFuelIntakeDate = new Date(Math.max(...dates.map(d => d.getTime())));
        }
      }

      return {
        ...tank,
        average_density: avgDensity,
        mrn_count: tank.physicalTankMrn.length,
        last_fuel_intake_date: lastFuelIntakeDate
      };
    });

    logger.info(`Retrieved ${tanksWithAvgDensity.length} physical tanks`);
    res.status(200).json(tanksWithAvgDensity);
  } catch (error) {
    logger.error('Error fetching physical tanks:', error);
    next(error);
  }
};

/**
 * GET /api/physical-tanks/:id
 * Dohvati detalje jednog fizičkog tanka
 */
export const getPhysicalTankById: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const tankId = parseInt(id);

    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID' });
      return;
    }

    const tank = await prisma.physicalTanks.findUnique({
      where: { id: tankId },
      include: {
        physicalTankMrn: {
          orderBy: { date_added: 'asc' }
        }
      }
    });

    if (!tank) {
      res.status(404).json({ message: `Physical tank with ID ${tankId} not found` });
      return;
    }

    // Izračunaj prosječnu gustoću i last_fuel_intake_date
    let avgDensity = 0.8;
    let lastFuelIntakeDate: Date | null = null;
    const activeMrn = tank.physicalTankMrn.filter(mrn => Number(mrn.remaining_quantity_kg) > 0);
    
    if (activeMrn.length > 0) {
      const totalKg = activeMrn.reduce((sum, mrn) => sum + Number(mrn.remaining_quantity_kg), 0);
      const totalLiters = activeMrn.reduce((sum, mrn) => sum + Number(mrn.remaining_quantity_liters), 0);
      if (totalLiters > 0) {
        avgDensity = totalKg / totalLiters;
      }
    }

    // Find the most recent date_added from all MRN records
    if (tank.physicalTankMrn.length > 0) {
      const dates = tank.physicalTankMrn
        .map(mrn => new Date(mrn.date_added))
        .filter(date => !isNaN(date.getTime()));

      if (dates.length > 0) {
        lastFuelIntakeDate = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    res.status(200).json({
      ...tank,
      average_density: avgDensity,
      last_fuel_intake_date: lastFuelIntakeDate
    });
  } catch (error) {
    logger.error(`Error fetching physical tank ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * POST /api/physical-tanks
 * Kreiraj novi fizički tank
 */
export const createPhysicalTank: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const {
      tank_name,
      tank_identifier,
      capacity_liters,
      fuel_type,
      location_description,
      display_order
    } = req.body;

    // Validacija
    if (!tank_name || !tank_identifier || !capacity_liters || !fuel_type) {
      res.status(400).json({ 
        message: 'Missing required fields: tank_name, tank_identifier, capacity_liters, fuel_type' 
      });
      return;
    }

    const parsedCapacity = Number(capacity_liters);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      res.status(400).json({ message: 'Capacity must be a positive number' });
      return;
    }

    // Provjeri da li već postoji tank sa istim imenom ili identifikatorom
    const existingTank = await prisma.physicalTanks.findFirst({
      where: {
        OR: [
          { tank_name: tank_name },
          { tank_identifier: tank_identifier }
        ]
      }
    });

    if (existingTank) {
      if (existingTank.tank_name === tank_name) {
        res.status(400).json({ message: `Tank sa imenom "${tank_name}" već postoji` });
        return;
      }
      if (existingTank.tank_identifier === tank_identifier) {
        res.status(400).json({ message: `Tank sa identifikatorom "${tank_identifier}" već postoji` });
        return;
      }
    }

    // Ako display_order nije proslijeđen, postavi ga na max + 1
    let finalDisplayOrder = display_order;
    if (!finalDisplayOrder) {
      const maxOrder = await prisma.physicalTanks.aggregate({
        _max: { display_order: true }
      });
      finalDisplayOrder = (maxOrder._max.display_order || 0) + 1;
    }

    const newTank = await prisma.physicalTanks.create({
      data: {
        tank_name,
        tank_identifier,
        capacity_liters: parsedCapacity,
        fuel_type,
        location_description,
        display_order: finalDisplayOrder
      }
    });

    logger.info(`Created new physical tank: ${newTank.tank_name} (ID: ${newTank.id})`);
    res.status(201).json(newTank);
  } catch (error: any) {
    logger.error('Error creating physical tank:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      res.status(400).json({ 
        message: 'Tank sa ovim imenom ili identifikatorom već postoji' 
      });
      return;
    }
    
    next(error);
  }
};

/**
 * PUT /api/physical-tanks/:id
 * Ažuriraj fizički tank
 */
export const updatePhysicalTank: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const tankId = parseInt(id);

    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID' });
      return;
    }

    const {
      tank_name,
      tank_identifier,
      capacity_liters,
      location_description,
      display_order,
      is_active,
      fuel_type
    } = req.body;

    // Provjeri da li tank postoji
    const existingTank = await prisma.physicalTanks.findUnique({
      where: { id: tankId }
    });

    if (!existingTank) {
      res.status(404).json({ message: `Physical tank with ID ${tankId} not found` });
      return;
    }

    // Provjeri da li novo ime već postoji (ako se mijenja)
    if (tank_name && tank_name !== existingTank.tank_name) {
      const duplicateName = await prisma.physicalTanks.findFirst({
        where: {
          tank_name: tank_name,
          id: { not: tankId }
        }
      });

      if (duplicateName) {
        res.status(400).json({ message: `Tank sa imenom "${tank_name}" već postoji` });
        return;
      }
    }

    // Provjeri da li novi identifikator već postoji (ako se mijenja)
    if (tank_identifier && tank_identifier !== existingTank.tank_identifier) {
      const duplicateIdentifier = await prisma.physicalTanks.findFirst({
        where: {
          tank_identifier: tank_identifier,
          id: { not: tankId }
        }
      });

      if (duplicateIdentifier) {
        res.status(400).json({ message: `Tank sa identifikatorom "${tank_identifier}" već postoji` });
        return;
      }
    }

    // Validacija kapaciteta ako se mijenja
    if (capacity_liters !== undefined) {
      const parsedCapacity = Number(capacity_liters);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        res.status(400).json({ message: 'Capacity must be a positive number' });
        return;
      }
    }

    const updateData: any = {};
    if (tank_name !== undefined) updateData.tank_name = tank_name;
    if (tank_identifier !== undefined) updateData.tank_identifier = tank_identifier;
    if (capacity_liters !== undefined) updateData.capacity_liters = Number(capacity_liters);
    if (location_description !== undefined) updateData.location_description = location_description;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (fuel_type !== undefined) updateData.fuel_type = fuel_type;

    const updatedTank = await prisma.physicalTanks.update({
      where: { id: tankId },
      data: updateData
    });

    logger.info(`Updated physical tank: ${updatedTank.tank_name} (ID: ${updatedTank.id})`);
    res.status(200).json(updatedTank);
  } catch (error: any) {
    logger.error(`Error updating physical tank ${req.params.id}:`, error);
    
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Tank sa ovim imenom već postoji' });
      return;
    }
    
    next(error);
  }
};

/**
 * DELETE /api/physical-tanks/:id
 * Obriši (deaktiviraj) fizički tank
 */
export const deletePhysicalTank: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const tankId = parseInt(id);

    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID' });
      return;
    }

    const tank = await prisma.physicalTanks.findUnique({
      where: { id: tankId }
    });

    if (!tank) {
      res.status(404).json({ message: `Physical tank with ID ${tankId} not found` });
      return;
    }

    // Provjeri da li je tank prazan
    if (tank.current_quantity_liters > 0) {
      res.status(400).json({ 
        message: `Tank mora biti prazan prije brisanja. Trenutno stanje: ${tank.current_quantity_liters} L` 
      });
      return;
    }

    // Soft delete - postavi is_active na false
    const deletedTank = await prisma.physicalTanks.update({
      where: { id: tankId },
      data: { is_active: false }
    });

    logger.info(`Deleted (deactivated) physical tank: ${deletedTank.tank_name} (ID: ${deletedTank.id})`);
    res.status(200).json({ 
      message: `Tank "${deletedTank.tank_name}" uspješno obrisan`,
      tank: deletedTank
    });
  } catch (error) {
    logger.error(`Error deleting physical tank ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * GET /api/physical-tanks/:id/mrn-breakdown
 * Dohvati MRN breakdown za fizički tank
 */
export const getPhysicalTankMrnBreakdown: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const tankId = parseInt(id);

    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID' });
      return;
    }

    const mrnRecords = await prisma.physicalTankMrn.findMany({
      where: {
        physical_tank_id: tankId,
        remaining_quantity_kg: { gt: 0 }
      },
      orderBy: { date_added: 'asc' }
    });

    // Izračunaj totale
    const totalLiters = mrnRecords.reduce((sum, mrn) => 
      sum + Number(mrn.remaining_quantity_liters), 0);
    const totalKg = mrnRecords.reduce((sum, mrn) => 
      sum + Number(mrn.remaining_quantity_kg), 0);
    const avgDensity = totalLiters > 0 ? totalKg / totalLiters : 0.8;

    res.status(200).json({
      mrn_records: mrnRecords,
      summary: {
        total_liters: totalLiters,
        total_kg: totalKg,
        average_density: avgDensity,
        record_count: mrnRecords.length
      }
    });
  } catch (error) {
    logger.error(`Error fetching MRN breakdown for tank ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * GET /api/physical-tanks/summary
 * Dohvati ukupan pregled svih fizičkih tankova
 */
export const getPhysicalTanksSummary: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const tanks = await prisma.physicalTanks.findMany({
      where: { is_active: true },
      include: {
        physicalTankMrn: {
          where: {
            remaining_quantity_kg: { gt: 0 }
          }
        }
      }
    });

    let totalLiters = 0;
    let totalKg = 0;
    let totalCapacity = 0;

    tanks.forEach(tank => {
      totalLiters += tank.current_quantity_liters;
      totalKg += tank.current_quantity_kg;
      totalCapacity += tank.capacity_liters;
    });

    const avgDensity = totalLiters > 0 ? totalKg / totalLiters : 0.8;
    const fillPercentage = totalCapacity > 0 ? (totalLiters / totalCapacity) * 100 : 0;

    res.status(200).json({
      total_tanks: tanks.length,
      total_capacity_liters: totalCapacity,
      total_current_liters: totalLiters,
      total_current_kg: totalKg,
      average_density: avgDensity,
      fill_percentage: fillPercentage,
      tanks: tanks.map(tank => ({
        id: tank.id,
        tank_name: tank.tank_name,
        current_liters: tank.current_quantity_liters,
        current_kg: tank.current_quantity_kg,
        capacity_liters: tank.capacity_liters,
        fill_percentage: (tank.current_quantity_liters / tank.capacity_liters) * 100
      }))
    });
  } catch (error) {
    logger.error('Error fetching physical tanks summary:', error);
    next(error);
  }
};

/**
 * POST /api/physical-tanks/:id/manual-update
 * Ručno ažuriranje stanja tanka (reconciliation)
 */
export const manualUpdatePhysicalTank: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const tankId = parseInt(id);

    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID' });
      return;
    }

    const { measured_liters, measured_kg, notes } = req.body;

    if (measured_liters === undefined || measured_kg === undefined) {
      res.status(400).json({ 
        message: 'Missing required fields: measured_liters, measured_kg' 
      });
      return;
    }

    const parsedLiters = Number(measured_liters);
    const parsedKg = Number(measured_kg);

    if (isNaN(parsedLiters) || isNaN(parsedKg) || parsedLiters < 0 || parsedKg < 0) {
      res.status(400).json({ message: 'Measured values must be non-negative numbers' });
      return;
    }

    const tank = await prisma.physicalTanks.findUnique({
      where: { id: tankId },
      include: {
        physicalTankMrn: {
          where: {
            remaining_quantity_kg: { gt: 0 }
          }
        }
      }
    });

    if (!tank) {
      res.status(404).json({ message: `Physical tank with ID ${tankId} not found` });
      return;
    }

    const beforeLiters = tank.current_quantity_liters;
    const beforeKg = tank.current_quantity_kg;
    const diffLiters = parsedLiters - beforeLiters;
    const diffKg = parsedKg - beforeKg;

    // Izračunaj prosječnu gustoću
    const averageDensity = parsedLiters > 0 ? parsedKg / parsedLiters : 0;
    console.log(`Calculating average density: ${parsedKg} / ${parsedLiters} = ${averageDensity}`);

    // Ažuriraj tank
    const updatedTank = await prisma.physicalTanks.update({
      where: { id: tankId },
      data: {
        current_quantity_liters: parsedLiters,
        current_quantity_kg: parsedKg,
        average_density: averageDensity
      }
    });
    
    console.log(`Updated tank ${tankId} with average_density: ${averageDensity}`);
    console.log(`Updated tank data:`, {
      id: updatedTank.id,
      current_quantity_liters: updatedTank.current_quantity_liters,
      current_quantity_kg: updatedTank.current_quantity_kg,
      average_density: updatedTank.average_density
    });

    // Proporcionalno ažuriraj MRN zapise ako postoje
    if (tank.physicalTankMrn.length > 0 && beforeLiters > 0) {
      const adjustmentFactor = parsedLiters / beforeLiters;
      
      for (const mrn of tank.physicalTankMrn) {
        const newLiters = Number(mrn.remaining_quantity_liters) * adjustmentFactor;
        const newKg = Number(mrn.remaining_quantity_kg) * adjustmentFactor;

        await prisma.physicalTankMrn.update({
          where: { id: mrn.id },
          data: {
            remaining_quantity_liters: new Decimal(newLiters.toFixed(3)),
            remaining_quantity_kg: new Decimal(newKg.toFixed(3))
          }
        });
      }
    }

    logger.info(`Manual update for tank ${tank.tank_name}: ${beforeLiters}L → ${parsedLiters}L (${diffLiters > 0 ? '+' : ''}${diffLiters.toFixed(2)}L)`);

    res.status(200).json({
      message: 'Tank uspješno ažuriran',
      tank: updatedTank,
      changes: {
        before_liters: beforeLiters,
        after_liters: parsedLiters,
        diff_liters: diffLiters,
        before_kg: beforeKg,
        after_kg: parsedKg,
        diff_kg: diffKg
      }
    });
  } catch (error) {
    logger.error(`Error manually updating physical tank ${req.params.id}:`, error);
    next(error);
  }
};


