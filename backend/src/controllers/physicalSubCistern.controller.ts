import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';
import {
  createSubCisterns,
  updateSubCistern,
  getSubCisternsByParent,
  getAllSubCisterns,
  manualUpdateSubCistern,
  transferBetweenSubCisterns,
  deleteSubCistern,
  CreateSubCisternDto
} from '../services/physicalSubCistern.service';

/**
 * GET /api/physical-sub-cisterns
 * Get all active sub-cisterns
 */
export const getAllSubCisternsHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const subCisterns = await getAllSubCisterns();
    res.status(200).json(subCisterns);
  } catch (error: any) {
    logger.error('Error getting all sub-cisterns:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * POST /api/physical-sub-cisterns
 * Create sub-cisterns for a cumulative cistern
 */
export const createSubCisternsHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { cisternId, subCisterns } = req.body;

    if (!cisternId || !subCisterns || !Array.isArray(subCisterns)) {
      res.status(400).json({
        message: 'cisternId and subCisterns array are required'
      });
      return;
    }

    if (subCisterns.length === 0) {
      res.status(400).json({
        message: 'At least one sub-cistern must be provided'
      });
      return;
    }

    await createSubCisterns(cisternId, subCisterns);

    res.status(201).json({
      message: 'Sub-cisterns created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating sub-cisterns:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * GET /api/physical-sub-cisterns/:parentCisternId
 * Get all sub-cisterns for a parent cistern
 */
export const getSubCisternsHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const parentCisternId = parseInt(req.params.parentCisternId);

    if (isNaN(parentCisternId)) {
      res.status(400).json({
        message: 'Invalid parentCisternId'
      });
      return;
    }

    const subCisterns = await getSubCisternsByParent(parentCisternId);

    // Convert Decimal values to numbers for JSON serialization
    const serialized = subCisterns.map((sc: any) => ({
      ...sc,
      capacity_liters: sc.capacity_liters,
      current_quantity_liters: sc.current_quantity_liters,
      current_quantity_kg: sc.current_quantity_kg,
      subCisternMrn: sc.subCisternMrn?.map((mrn: any) => ({
        ...mrn,
        quantity_liters: mrn.quantity_liters,
        quantity_kg: mrn.quantity_kg,
        remaining_quantity_liters: mrn.remaining_quantity_liters,
        remaining_quantity_kg: mrn.remaining_quantity_kg,
        density_at_intake: mrn.density_at_intake
      })) || []
    }));

    res.status(200).json(serialized);
  } catch (error: any) {
    logger.error('Error getting sub-cisterns:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * PUT /api/physical-sub-cisterns/:subCisternId
 * Update sub-cistern configuration
 */
export const updateSubCisternHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const subCisternId = parseInt(req.params.subCisternId);
    const updateData = req.body;

    if (isNaN(subCisternId)) {
      res.status(400).json({
        message: 'Invalid subCisternId'
      });
      return;
    }

    await updateSubCistern(subCisternId, updateData);

    res.status(200).json({
      message: 'Sub-cistern updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating sub-cistern:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};

export const manualUpdateHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const subCisternId = parseInt(req.params.subCisternId);
    const { current_quantity_liters, current_quantity_kg } = req.body;

    if (isNaN(subCisternId)) {
      res.status(400).json({
        message: 'Invalid subCisternId'
      });
      return;
    }

    if (current_quantity_liters === undefined || current_quantity_kg === undefined) {
      res.status(400).json({
        message: 'current_quantity_liters and current_quantity_kg are required'
      });
      return;
    }

    await manualUpdateSubCistern(subCisternId, {
      current_quantity_liters,
      current_quantity_kg
    });

    res.status(200).json({
      message: 'Sub-cistern manually updated successfully'
    });
  } catch (error: any) {
    logger.error('Error manually updating sub-cistern:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};

export const transferHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { source_sub_cistern_id, destination_sub_cistern_id, quantity_liters, quantity_kg } = req.body;

    if (!source_sub_cistern_id || !destination_sub_cistern_id || !quantity_liters || !quantity_kg) {
      res.status(400).json({
        message: 'All fields are required'
      });
      return;
    }

    await transferBetweenSubCisterns({
      source_sub_cistern_id,
      destination_sub_cistern_id,
      quantity_liters,
      quantity_kg
    });

    res.status(200).json({
      message: 'Transfer completed successfully'
    });
  } catch (error: any) {
    logger.error('Error transferring between sub-cisterns:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};

export const deleteSubCisternHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const subCisternId = parseInt(req.params.subCisternId);

    if (isNaN(subCisternId)) {
      res.status(400).json({
        message: 'Invalid subCisternId'
      });
      return;
    }

    await deleteSubCistern(subCisternId);

    res.status(200).json({
      message: 'Sub-cistern deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting sub-cistern:', error);
    res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
};
