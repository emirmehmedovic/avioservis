/**
 * fuelReportsTrends.routes.ts
 * Rute za trend analizu i prognozu potrošnje goriva
 */

import { Router } from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import {
  getTrendAnalysisData,
  getComparativeAnalysisData,
  getForecastingData,
  getSeasonalPatternsData,
  getDestinationTrendingData,
  getMarketShareAnalysisData
} from '../controllers/fuelReportsTrends.controller';

const router = Router();

/**
 * GET /api/fuel/reports/trends/weekly
 * Dohvata sedmične trend podatke
 * @query startDate - Početni datum (YYYY-MM-DD)
 * @query endDate - Završni datum (YYYY-MM-DD)
 * @returns Sedmični trend podaci
 */
router.get('/weekly', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getTrendAnalysisData);

/**
 * GET /api/fuel/reports/trends/monthly
 * Dohvata mjesečne trend podatke
 * @query startDate - Početni datum (YYYY-MM-DD)
 * @query endDate - Završni datum (YYYY-MM-DD)
 * @returns Mjesečni trend podaci
 */
router.get('/monthly', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getTrendAnalysisData);

/**
 * GET /api/fuel/reports/trends/year-over-year
 * Dohvata year-over-year poredbu
 * @query year - Godina za poredbu (YYYY)
 * @returns Year-over-year podaci
 */
router.get('/year-over-year', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getTrendAnalysisData);

/**
 * GET /api/fuel/reports/seasonal-patterns
 * Dohvata sezonske uzorke
 * @query startDate - Početni datum (YYYY-MM-DD)
 * @query endDate - Završni datum (YYYY-MM-DD)
 * @returns Sezonski uzorci
 */
router.get('/seasonal-patterns', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getSeasonalPatternsData);

/**
 * GET /api/fuel/reports/comparison/monthly
 * Dohvată mjesečnu komparativnu analizu
 * @query currentMonth - Trenutni mjesec (YYYY-MM)
 * @returns Mjesečna komparativna analiza
 */
router.get('/comparison/monthly', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getComparativeAnalysisData);

/**
 * GET /api/fuel/reports/comparison/yearly
 * Dohvată godišnju komparativnu analizu
 * @query currentYear - Trenutna godina (YYYY)
 * @returns Godišnja komparativna analiza
 */
router.get('/comparison/yearly', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getComparativeAnalysisData);

/**
 * GET /api/fuel/reports/destination-trends
 * Dohvața analizu trending destinacija
 * @query currentStartDate - Početni datum trenutnog perioda (YYYY-MM-DD)
 * @query currentEndDate - Završni datum trenutnog perioda (YYYY-MM-DD)
 * @query previousStartDate - Početni datum prethodnog perioda (YYYY-MM-DD)
 * @query previousEndDate - Završni datum prethodnog perioda (YYYY-MM-DD)
 * @returns Analiza trending destinacija
 */
router.get('/destination-trends', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getDestinationTrendingData);

/**
 * GET /api/fuel/reports/market-share
 * Dohvata analizu market share
 * @query currentStartDate - Početni datum trenutnog perioda (YYYY-MM-DD)
 * @query currentEndDate - Završni datum trenutnog perioda (YYYY-MM-DD)
 * @query previousStartDate - Početni datum prethodnog perioda (YYYY-MM-DD)
 * @query previousEndDate - Završni datum prethodnog perioda (YYYY-MM-DD)
 * @returns Market share analiza
 */
router.get('/market-share', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getMarketShareAnalysisData);

/**
 * GET /api/fuel/reports/forecast/linear
 * Dohvata linearnu trend prognozu
 * @query startDate - Početni datum historijskih podataka (YYYY-MM-DD)
 * @query endDate - Završni datum historijskih podataka (YYYY-MM-DD)
 * @query forecastMonths - Broj mjeseci za prognozu (default: 6)
 * @returns Linearna trend prognoza
 */
router.get('/forecast/linear', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getForecastingData);

/**
 * GET /api/fuel/reports/forecast/moving-average
 * Dohvata moving average prognozu
 * @query startDate - Početni datum historijskih podataka (YYYY-MM-DD)
 * @query endDate - Završni datum historijskih podataka (YYYY-MM-DD)
 * @query forecastMonths - Broj mjeseci za prognozu (default: 6)
 * @query windowSize - Veličina moving average prozora (default: 3)
 * @returns Moving average prognoza
 */
router.get('/forecast/moving-average', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getForecastingData);

/**
 * GET /api/fuel/reports/forecast/exponential
 * Dohvata exponential smoothing prognozu
 * @query startDate - Početni datum historijskih podataka (YYYY-MM-DD)
 * @query endDate - Završni datum historijskih podataka (YYYY-MM-DD)
 * @query forecastMonths - Broj mjeseci za prognozu (default: 6)
 * @query alpha - Smoothing parameter (default: 0.3)
 * @returns Exponential smoothing prognoza
 */
router.get('/forecast/exponential', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getForecastingData);

/**
 * GET /api/fuel/reports/forecast/destinations
 * Dohvata prognozu po destinacijama
 * @query startDate - Početni datum historijskih podataka (YYYY-MM-DD)
 * @query endDate - Završni datum historijskih podataka (YYYY-MM-DD)
 * @query forecastMonths - Broj mjeseci za prognozu (default: 6)
 * @returns Prognoza po destinacijama
 */
router.get('/forecast/destinations', authenticateToken, checkRole(['ADMIN', 'KONTROLA']), getForecastingData);

export default router; 