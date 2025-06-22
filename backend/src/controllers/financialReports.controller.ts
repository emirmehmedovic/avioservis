/**
 * financialReports.controller.ts
 * Kontroler za rukovanje financijskim izvještajima
 */

import { Request, Response } from 'express';
import { 
  generateMrnProfitabilityReport,
  generateDestinationProfitabilityReport,
  generateAirlineProfitabilityReport,
  generateSummaryFinancialReport
} from '../services/financialReportsService';

/**
 * GET /api/reports/financial/mrn
 * Dohvaća izvještaj profitabilnosti po MRN
 */
export async function getMrnProfitabilityReport(req: Request, res: Response): Promise<void> {
  try {
    // Parsiranje datumskih parametara
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    
    if (!startDateParam || !endDateParam) {
      res.status(400).json({ 
        success: false, 
        message: 'Parametri startDate i endDate su obavezni' 
      });
      return;
    }
    
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravni datumski parametri. Format treba biti YYYY-MM-DD' 
      });
      return;
    }
    
    // Provjera validnosti datumskog raspona
    if (endDate < startDate) {
      res.status(400).json({ 
        success: false, 
        message: 'endDate ne može biti prije startDate' 
      });
      return;
    }
    
    const report = await generateMrnProfitabilityReport({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Greška pri generisanju izvještaja profitabilnosti po MRN:', error);
    res.status(500).json({
      success: false,
      message: 'Došlo je do greške pri generisanju izvještaja',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * GET /api/reports/financial/destination
 * Dohvaća izvještaj profitabilnosti po destinaciji
 */
export async function getDestinationProfitabilityReport(req: Request, res: Response): Promise<void> {
  try {
    // Parsiranje datumskih parametara
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    
    if (!startDateParam || !endDateParam) {
      res.status(400).json({ 
        success: false, 
        message: 'Parametri startDate i endDate su obavezni' 
      });
      return;
    }
    
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravni datumski parametri. Format treba biti YYYY-MM-DD' 
      });
      return;
    }
    
    // Provjera validnosti datumskog raspona
    if (endDate < startDate) {
      res.status(400).json({ 
        success: false, 
        message: 'endDate ne može biti prije startDate' 
      });
      return;
    }
    
    const report = await generateDestinationProfitabilityReport({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Greška pri generisanju izvještaja profitabilnosti po destinaciji:', error);
    res.status(500).json({
      success: false,
      message: 'Došlo je do greške pri generisanju izvještaja',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * GET /api/reports/financial/airline
 * Dohvaća izvještaj profitabilnosti po aviokompaniji
 */
export async function getAirlineProfitabilityReport(req: Request, res: Response): Promise<void> {
  try {
    // Parsiranje datumskih parametara
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    
    if (!startDateParam || !endDateParam) {
      res.status(400).json({ 
        success: false, 
        message: 'Parametri startDate i endDate su obavezni' 
      });
      return;
    }
    
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravni datumski parametri. Format treba biti YYYY-MM-DD' 
      });
      return;
    }
    
    // Provjera validnosti datumskog raspona
    if (endDate < startDate) {
      res.status(400).json({ 
        success: false, 
        message: 'endDate ne može biti prije startDate' 
      });
      return;
    }
    
    const report = await generateAirlineProfitabilityReport({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Greška pri generisanju izvještaja profitabilnosti po aviokompaniji:', error);
    res.status(500).json({
      success: false,
      message: 'Došlo je do greške pri generisanju izvještaja',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * GET /api/reports/financial/summary
 * Dohvaća ukupni financijski izvještaj
 */
export async function getSummaryFinancialReport(req: Request, res: Response): Promise<void> {
  try {
    // Parsiranje datumskih parametara
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    
    if (!startDateParam || !endDateParam) {
      res.status(400).json({ 
        success: false, 
        message: 'Parametri startDate i endDate su obavezni' 
      });
      return;
    }
    
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravni datumski parametri. Format treba biti YYYY-MM-DD' 
      });
      return;
    }
    
    // Provjera validnosti datumskog raspona
    if (endDate < startDate) {
      res.status(400).json({ 
        success: false, 
        message: 'endDate ne može biti prije startDate' 
      });
      return;
    }
    
    const report = await generateSummaryFinancialReport({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Greška pri generisanju ukupnog financijskog izvještaja:', error);
    res.status(500).json({
      success: false,
      message: 'Došlo je do greške pri generisanju izvještaja',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}
