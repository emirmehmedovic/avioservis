import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all physical cisterns
export const getPhysicalCisterns: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const cisterns = await prisma.physicalCisternFuel.findMany({
      where: {
        is_active: true
      },
      include: {
        cisternMrn: {
          where: {
            remaining_quantity_kg: {
              gt: 0
            }
          },
          orderBy: {
            date_added: 'asc'
          }
        }
      },
      orderBy: {
        cistern_identifier: 'asc'
      }
    });

    // Calculate average density for each cistern
    const cisternsWithAvgDensity = cisterns.map(cistern => {
      if (cistern.cisternMrn.length === 0) {
        return {
          ...cistern,
          average_density: 0
        };
      }

      const totalKg = cistern.cisternMrn.reduce((sum, mrn) => 
        sum + Number(mrn.remaining_quantity_kg), 0
      );
      const totalLiters = cistern.cisternMrn.reduce((sum, mrn) => 
        sum + Number(mrn.remaining_quantity_liters), 0
      );

      const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;

      return {
        ...cistern,
        average_density: averageDensity
      };
    });

    res.json(cisternsWithAvgDensity);
  } catch (error) {
    console.error('Error fetching physical cisterns:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get cistern by ID
export const getPhysicalCisternById: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const cisternId = parseInt(id);

    if (isNaN(cisternId)) {
      res.status(400).json({ message: 'Invalid cistern ID' });
      return;
    }

    const cistern = await prisma.physicalCisternFuel.findUnique({
      where: {
        id: cisternId
      },
      include: {
        cisternMrn: {
          orderBy: {
            date_added: 'asc'
          }
        }
      }
    });

    if (!cistern) {
      res.status(404).json({ message: 'Cistern not found' });
      return;
    }

    // Calculate average density
    const activeMrn = cistern.cisternMrn.filter(mrn => Number(mrn.remaining_quantity_kg) > 0);
    
    let averageDensity = 0;
    if (activeMrn.length > 0) {
      const totalKg = activeMrn.reduce((sum, mrn) => sum + Number(mrn.remaining_quantity_kg), 0);
      const totalLiters = activeMrn.reduce((sum, mrn) => sum + Number(mrn.remaining_quantity_liters), 0);
      averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;
    }

    res.json({
      ...cistern,
      average_density: averageDensity
    });
  } catch (error) {
    console.error('Error fetching cistern by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create new cistern
export const createPhysicalCistern: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const {
      cistern_identifier,
      capacity_liters,
      fuel_type,
      is_active = true,
      is_cumulative = false
    } = req.body;

    // Validate required fields
    if (!cistern_identifier || !capacity_liters || !fuel_type) {
      res.status(400).json({ 
        message: 'cistern_identifier, capacity_liters, and fuel_type are required' 
      });
      return;
    }

    // Check if cistern identifier already exists
    const existingCistern = await prisma.physicalCisternFuel.findFirst({
      where: {
        cistern_identifier: cistern_identifier
      }
    });

    if (existingCistern) {
      res.status(400).json({ 
        message: 'Cistern with this identifier already exists' 
      });
      return;
    }

    const newCistern = await prisma.physicalCisternFuel.create({
      data: {
        cistern_identifier,
        capacity_liters: parseFloat(capacity_liters),
        fuel_type,
        is_active,
        is_cumulative
      }
    });

    res.status(201).json(newCistern);
  } catch (error) {
    console.error('Error creating cistern:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update cistern
export const updatePhysicalCistern: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const cisternId = parseInt(id);

    if (isNaN(cisternId)) {
      res.status(400).json({ message: 'Invalid cistern ID' });
      return;
    }

    const {
      cistern_identifier,
      capacity_liters,
      fuel_type,
      is_active,
      is_cumulative
    } = req.body;

    // Check if cistern exists
    const existingCistern = await prisma.physicalCisternFuel.findUnique({
      where: { id: cisternId }
    });

    if (!existingCistern) {
      res.status(404).json({ message: 'Cistern not found' });
      return;
    }

    // Check for duplicate identifier if it's being changed
    if (cistern_identifier && cistern_identifier !== existingCistern.cistern_identifier) {
      const duplicateCistern = await prisma.physicalCisternFuel.findFirst({
        where: {
          cistern_identifier: cistern_identifier,
          id: { not: cisternId }
        }
      });

      if (duplicateCistern) {
        res.status(400).json({ 
          message: 'Cistern with this identifier already exists' 
        });
        return;
      }
    }

    const updatedCistern = await prisma.physicalCisternFuel.update({
      where: { id: cisternId },
      data: {
        ...(cistern_identifier && { cistern_identifier }),
        ...(capacity_liters && { capacity_liters: parseFloat(capacity_liters) }),
        ...(fuel_type && { fuel_type }),
        ...(is_active !== undefined && { is_active }),
        ...(is_cumulative !== undefined && { is_cumulative })
      }
    });

    res.json(updatedCistern);
  } catch (error) {
    console.error('Error updating cistern:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete cistern (soft delete)
export const deletePhysicalCistern: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const cisternId = parseInt(id);

    if (isNaN(cisternId)) {
      res.status(400).json({ message: 'Invalid cistern ID' });
      return;
    }

    const cistern = await prisma.physicalCisternFuel.findUnique({
      where: { id: cisternId }
    });

    if (!cistern) {
      res.status(404).json({ message: 'Cistern not found' });
      return;
    }

    // Soft delete by setting is_active to false
    const deletedCistern = await prisma.physicalCisternFuel.update({
      where: { id: cisternId },
      data: { is_active: false }
    });

    res.json({ message: 'Cistern deleted successfully', cistern: deletedCistern });
  } catch (error) {
    console.error('Error deleting cistern:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get cistern MRN breakdown
export const getCisternMrnBreakdown: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const cisternId = parseInt(id);

    if (isNaN(cisternId)) {
      res.status(400).json({ message: 'Invalid cistern ID' });
      return;
    }

    const mrnRecords = await prisma.physicalCisternMrn.findMany({
      where: {
        cistern_id: cisternId
      },
      orderBy: {
        date_added: 'asc'
      }
    });

    // Calculate totals
    const totalLiters = mrnRecords.reduce((sum, mrn) => 
      sum + Number(mrn.remaining_quantity_liters), 0
    );
    const totalKg = mrnRecords.reduce((sum, mrn) => 
      sum + Number(mrn.remaining_quantity_kg), 0
    );

    res.json({
      mrn_records: mrnRecords,
      total_liters: totalLiters,
      total_kg: totalKg,
      average_density: totalLiters > 0 ? totalKg / totalLiters : 0
    });
  } catch (error) {
    console.error('Error fetching cistern MRN breakdown:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get cisterns summary
export const getCisternsSummary: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const cisterns = await prisma.physicalCisternFuel.findMany({
      where: {
        is_active: true
      },
      include: {
        cisternMrn: {
          where: {
            remaining_quantity_kg: {
              gt: 0
            }
          }
        }
      }
    });

    const totalCisterns = cisterns.length;
    const totalCapacityLiters = cisterns.reduce((sum, cistern) => sum + cistern.capacity_liters, 0);
    const totalCurrentLiters = cisterns.reduce((sum, cistern) => sum + cistern.current_quantity_liters, 0);
    const totalCurrentKg = cisterns.reduce((sum, cistern) => sum + cistern.current_quantity_kg, 0);

    // Calculate overall average density
    const totalMrnKg = cisterns.reduce((sum, cistern) => {
      return sum + cistern.cisternMrn.reduce((mrnSum, mrn) => 
        mrnSum + Number(mrn.remaining_quantity_kg), 0
      );
    }, 0);

    const totalMrnLiters = cisterns.reduce((sum, cistern) => {
      return sum + cistern.cisternMrn.reduce((mrnSum, mrn) => 
        mrnSum + Number(mrn.remaining_quantity_liters), 0
      );
    }, 0);

    const averageDensity = totalMrnLiters > 0 ? totalMrnKg / totalMrnLiters : 0;

    res.json({
      total_cisterns: totalCisterns,
      total_capacity_liters: totalCapacityLiters,
      total_current_liters: totalCurrentLiters,
      total_current_kg: totalCurrentKg,
      average_density: averageDensity,
      cisterns: cisterns.map(cistern => ({
        id: cistern.id,
        cistern_identifier: cistern.cistern_identifier,
        capacity_liters: cistern.capacity_liters,
        current_quantity_liters: cistern.current_quantity_liters,
        current_quantity_kg: cistern.current_quantity_kg,
        fuel_type: cistern.fuel_type,
        is_active: cistern.is_active
      }))
    });
  } catch (error) {
    console.error('Error fetching cisterns summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Manual update cistern quantities
export const manualUpdateCistern: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const cisternId = parseInt(id);

    if (isNaN(cisternId)) {
      res.status(400).json({ message: 'Invalid cistern ID' });
      return;
    }

    const {
      current_quantity_liters,
      current_quantity_kg,
      notes
    } = req.body;

    if (current_quantity_liters === undefined || current_quantity_kg === undefined) {
      res.status(400).json({ 
        message: 'current_quantity_liters and current_quantity_kg are required' 
      });
      return;
    }

    const cistern = await prisma.physicalCisternFuel.findUnique({
      where: { id: cisternId }
    });

    if (!cistern) {
      res.status(404).json({ message: 'Cistern not found' });
      return;
    }

    const updatedCistern = await prisma.physicalCisternFuel.update({
      where: { id: cisternId },
      data: {
        current_quantity_liters: parseFloat(current_quantity_liters),
        current_quantity_kg: parseFloat(current_quantity_kg)
      }
    });

    // Log the manual update (you might want to create a separate table for this)
    console.log(`Manual update for cistern ${cisternId}:`, {
      old_liters: cistern.current_quantity_liters,
      new_liters: current_quantity_liters,
      old_kg: cistern.current_quantity_kg,
      new_kg: current_quantity_kg,
      notes
    });

    res.json(updatedCistern);
  } catch (error) {
    console.error('Error manually updating cistern:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
