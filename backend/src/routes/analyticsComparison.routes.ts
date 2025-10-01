/**
 * analyticsComparison.routes.ts
 * API rute za analitiku i komparaciju
 */

import { Router } from 'express';
import { 
  getWeeklyComparison,
  getMonthlyComparison,
  getYearlyComparison,
  getCustomComparison,
  getAirlineComparison,
  getWeeklyTrends,
  getMonthlyTrends,
  getYearOverYearTrends,
  getSeasonalPatterns,
  getAnomalies,
  getCachedAnalytics,
  getAirlines,
  getDestinations,
  getAirlineDestinationComparison,
  getWeeklyFilteredAnalysis,
  getMonthlyFilteredAnalysis,
  getCustomFilteredAnalysis
} from '../controllers/analyticsComparison.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// Middleware za autentifikaciju i autorizaciju
router.use(authenticateToken);
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

/**
 * GET /api/analytics/comparison/weekly
 * Generiše sedmičnu komparaciju (trenutna vs prethodna sedmica)
 */
router.get('/weekly', getWeeklyComparison);

/**
 * GET /api/analytics/comparison/monthly
 * Generiše mjesečnu komparaciju (trenutni vs prethodni mjesec)
 */
router.get('/monthly', getMonthlyComparison);

/**
 * GET /api/analytics/comparison/yearly
 * Generiše godišnju komparaciju (trenutna vs prethodna godina)
 */
router.get('/yearly', getYearlyComparison);

/**
 * POST /api/analytics/comparison/custom
 * Generiše custom komparaciju između dva proizvoljna perioda
 */
router.post('/custom', getCustomComparison);

/**
 * POST /api/analytics/comparison/airlines
 * Generiše detaljnu komparaciju između aviokompanija
 */
router.post('/airlines', getAirlineComparison);

/**
 * GET /api/analytics/comparison/trends/weekly
 * Generiše sedmične trend podatke
 */
router.get('/trends/weekly', getWeeklyTrends);

/**
 * GET /api/analytics/comparison/trends/monthly
 * Generiše mjesečne trend podatke
 */
router.get('/trends/monthly', getMonthlyTrends);

/**
 * GET /api/analytics/comparison/trends/year-over-year
 * Generiše year-over-year trend podatke
 */
router.get('/trends/year-over-year', getYearOverYearTrends);

/**
 * GET /api/analytics/comparison/trends/seasonal
 * Generiše sezonske obrasce
 */
router.get('/trends/seasonal', getSeasonalPatterns);

/**
 * POST /api/analytics/comparison/anomalies
 * Detekcija anomalija između dva perioda
 */
router.post('/anomalies', getAnomalies);

/**
 * GET /api/analytics/comparison/cached
 * Dohvata cached analitiku za dashboard
 */
router.get('/cached', getCachedAnalytics);

/**
 * GET /api/analytics/comparison/airlines
 * Dohvata listu aviokompanija za filter
 */
router.get('/airlines', getAirlines);

/**
 * GET /api/analytics/comparison/destinations
 * Dohvata listu destinacija za filter (opcionalno filtrirane po aviokompaniji)
 */
router.get('/destinations', getDestinations);

/**
 * POST /api/analytics/comparison/airline-destination
 * Komparacija po aviokompaniji i/ili destinaciji
 */
router.post('/airline-destination', getAirlineDestinationComparison);

/**
 * POST /api/analytics/comparison/weekly-filtered
 * Sedmična analiza sa filterima za aviokompaniju i destinaciju
 */
router.post('/weekly-filtered', getWeeklyFilteredAnalysis);

/**
 * POST /api/analytics/comparison/monthly-filtered
 * Mjesečna analiza sa filterima za aviokompaniju i destinaciju
 */
router.post('/monthly-filtered', getMonthlyFilteredAnalysis);

/**
 * POST /api/analytics/comparison/custom-filtered
 * Prilagođena analiza sa filterima za aviokompaniju i destinaciju
 */
router.post('/custom-filtered', getCustomFilteredAnalysis);

/**
 * POST /api/analytics/comparison/period-comparison
 * Komparacija dva proizvoljna perioda
 */
router.post('/period-comparison', async (req, res) => {
  try {
    const { period1, period2, airlineId, destinationId } = req.body;
    
    // Import controller function
    const { getPeriodComparison } = await import('../controllers/analyticsComparison.controller');
    
    const result = await getPeriodComparison(
      period1,
      period2,
      airlineId,
      destinationId
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in period comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju komparacije perioda'
    });
  }
});

export default router;