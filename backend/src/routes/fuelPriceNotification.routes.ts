import { Router } from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import {
  getAirlinesForPriceNotification,
  updatePriceNotificationEmail,
  updatePriceNotificationCurrency,
  updatePriceNotificationActive,
  sendPriceToSingleAirline,
  sendPriceToAllAirlines,
  sendPriceSummary,
  getAirlinesWithoutRules,
  getGeneralPriceRules,
  sendPriceWithGeneralRule,
} from '../controllers/fuelPriceNotification.controller';

const router = Router();

// All routes require authentication and ADMIN or KONTROLA role
router.use(authenticateToken);
router.use(checkRole(['ADMIN', 'KONTROLA']));

// Get all airlines with their fuel price rules
router.get('/airlines', getAirlinesForPriceNotification);

// Get all airlines WITHOUT specific rules (for "Ostalo" general rules)
router.get('/airlines-without-rules', getAirlinesWithoutRules);

// Get all general rules (available currencies)
router.get('/general-rules', getGeneralPriceRules);

// Update airline's price notification email
router.put('/airlines/:airlineId/email', updatePriceNotificationEmail);

// Update airline's preferred currency for price notifications
router.put('/airlines/:airlineId/currency', updatePriceNotificationCurrency);

// Update airline's active state for price notifications
router.put('/airlines/:airlineId/active', updatePriceNotificationActive);

// Send fuel price notification to a single airline
router.post('/send/:airlineId', sendPriceToSingleAirline);

// Send fuel price notification to an airline using a general rule
router.post('/send-general/:airlineId', sendPriceWithGeneralRule);

// Send fuel price notifications to all airlines
router.post('/send-all', sendPriceToAllAirlines);

// Send summary email with all fuel prices
router.post('/send-summary', sendPriceSummary);

export default router;
