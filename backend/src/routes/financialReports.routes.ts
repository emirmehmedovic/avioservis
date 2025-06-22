/**
 * financialReports.routes.ts
 * Rute za finansijske izvještaje
 */

import { Router } from 'express';
import { 
  getMrnProfitabilityReport,
  getDestinationProfitabilityReport,
  getAirlineProfitabilityReport,
  getSummaryFinancialReport
} from '../controllers/financialReports.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/reports/financial/mrn
 * Dohvata izvještaj profitabilnosti po MRN
 * @query startDate - Početni datum za filter (YYYY-MM-DD)
 * @query endDate - Završni datum za filter (YYYY-MM-DD)
 * @returns Izvještaj profitabilnosti po MRN
 */
router.get('/mrn', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getMrnProfitabilityReport);

/**
 * GET /api/reports/financial/destination
 * Dohvata izvještaj profitabilnosti po destinaciji
 * @query startDate - Početni datum za filter (YYYY-MM-DD)
 * @query endDate - Završni datum za filter (YYYY-MM-DD)
 * @returns Izvještaj profitabilnosti po destinaciji
 */
router.get('/destination', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getDestinationProfitabilityReport);

/**
 * GET /api/reports/financial/airline
 * Dohvata izvještaj profitabilnosti po aviokompaniji
 * @query startDate - Početni datum za filter (YYYY-MM-DD)
 * @query endDate - Završni datum za filter (YYYY-MM-DD)
 * @returns Izvještaj profitabilnosti po aviokompaniji
 */
router.get('/airline', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getAirlineProfitabilityReport);

/**
 * GET /api/reports/financial/summary
 * Dohvata ukupni finansijski izvještaj
 * @query startDate - Početni datum za filter (YYYY-MM-DD)
 * @query endDate - Završni datum za filter (YYYY-MM-DD)
 * @returns Ukupni finansijski izvještaj
 */
router.get('/summary', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getSummaryFinancialReport);

export default router;
