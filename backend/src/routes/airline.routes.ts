import { Router } from 'express';
import { getAllAirlines } from '../controllers/airline.controller';
import { authenticateToken } from '../middleware/auth'; // Corrected middleware import filename

const router = Router();

// GET /api/airlines - Get all airlines
router.get('/', authenticateToken, getAllAirlines);

export default router;
