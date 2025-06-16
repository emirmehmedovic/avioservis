import express from 'express';
import * as reserveFuelController from '../controllers/reserveFuel.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Rute za upravljanje rezervnim gorivom
router.get('/summary', authenticateToken, reserveFuelController.getReserveFuelSummary);
router.get('/tank/:tankId/:tankType?', authenticateToken, reserveFuelController.getReserveFuelByTank);
router.post('/dispense/:tankId/:tankType?', authenticateToken, reserveFuelController.dispenseReserveFuel);

// Nove rute za praćenje automatskih zamjena viška goriva
router.get('/exchange-history/:tankId/:tankType?', authenticateToken, reserveFuelController.getExchangeHistory);
router.get('/exchange-details/:exchangeId', authenticateToken, reserveFuelController.getExchangeDetails);

// Ruta za izvršavanje zamjene viška goriva
router.post('/exchange-excess/:tankId', authenticateToken, reserveFuelController.exchangeExcessFuel);

export default router;
