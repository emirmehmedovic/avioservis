import { Request, Response } from 'express';
import { 
  reconcileTankWithMrnRecords, 
  performSystemWideDensityReconciliation,
  generateDensityAnalysisReport,
  analyzeDensityVariation,
  calculateWeightedAverageDensity 
} from '../utils/densityConsistencyManager';
import { logger } from '../utils/logger';

/**
 * Reconcile specific tank with its MRN records
 */
export const reconcileSingleTank = async (req: Request, res: Response) => {
  try {
    const { tankId } = req.params;
    
    if (!tankId || isNaN(Number(tankId))) {
      res.status(400).json({ 
        success: false, 
        message: 'Valid tank ID is required' 
      });
      return;
    }

    const result = await reconcileTankWithMrnRecords(Number(tankId));
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Tank successfully reconciled',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to reconcile tank',
        data: result
      });
    }

  } catch (error) {
    logger.error('Error in reconcileSingleTank:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during tank reconciliation',
      error: String(error)
    });
  }
};

/**
 * Reconcile all tanks system-wide
 */
export const reconcileAllTanks = async (req: Request, res: Response) => {
  try {
    logger.info('Starting system-wide tank reconciliation...');
    
    const results = await performSystemWideDensityReconciliation();
    
    const summary = {
      totalTanks: results.length,
      successfulReconciliations: results.filter(r => r.success).length,
      failedReconciliations: results.filter(r => !r.success).length,
      totalKgAdjustment: results.reduce((sum, r) => sum + r.adjustmentKg, 0),
      totalLitersAdjustment: results.reduce((sum, r) => sum + r.adjustmentLiters, 0)
    };

    res.status(200).json({
      success: true,
      message: 'System-wide reconciliation completed',
      summary,
      details: results
    });

  } catch (error) {
    logger.error('Error in reconcileAllTanks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during system-wide reconciliation',
      error: String(error)
    });
  }
};

/**
 * Generate density analysis report
 */
export const getDensityAnalysisReport = async (req: Request, res: Response) => {
  try {
    const report = await generateDensityAnalysisReport();
    
    res.status(200).json({
      success: true,
      message: 'Density analysis report generated successfully',
      data: report
    });

  } catch (error) {
    logger.error('Error generating density analysis report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate density analysis report',
      error: String(error)
    });
  }
};

/**
 * Analyze density variation for a specific operation
 */
export const analyzeDensityVariationForOperation = async (req: Request, res: Response) => {
  try {
    const { tankId, operationalDensity, quantityKg } = req.body;
    
    if (!tankId || !operationalDensity || !quantityKg) {
      res.status(400).json({
        success: false,
        message: 'tankId, operationalDensity, and quantityKg are required'
      });
      return;
    }

    // Get weighted average density for the tank
    const densityInfo = await calculateWeightedAverageDensity(Number(tankId));
    
    // Analyze the variation
    const analysis = analyzeDensityVariation(
      densityInfo.density,
      Number(operationalDensity),
      Number(quantityKg)
    );

    // Add tank-specific info
    analysis.tankId = Number(tankId);
    
    res.status(200).json({
      success: true,
      message: 'Density variation analysis completed',
      data: {
        tankInfo: densityInfo,
        analysis
      }
    });

  } catch (error) {
    logger.error('Error analyzing density variation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze density variation',
      error: String(error)
    });
  }
};

/**
 * Get tank density info for debugging
 */
export const getTankDensityInfo = async (req: Request, res: Response) => {
  try {
    const { tankId } = req.params;
    
    if (!tankId || isNaN(Number(tankId))) {
      res.status(400).json({ 
        success: false, 
        message: 'Valid tank ID is required' 
      });
      return;
    }

    const densityInfo = await calculateWeightedAverageDensity(Number(tankId));
    
    res.status(200).json({
      success: true,
      message: 'Tank density info retrieved successfully',
      data: densityInfo
    });

  } catch (error) {
    logger.error('Error getting tank density info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tank density info',
      error: String(error)
    });
  }
}; 