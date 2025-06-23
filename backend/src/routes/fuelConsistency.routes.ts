import express from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import {
  getTankConsistencyCheck,
  getAllTanksConsistencyCheck,
  correctTankInconsistency,
  overrideInconsistencyCheck
} from '../controllers/fuelConsistency.controller';

const router = express.Router();

// Svi endpointi zahtijevaju autentikaciju
router.use(authenticateToken);
// Administratori, kontrola i operateri goriva mogu pristupiti ovim rutama
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

// GET /api/fuel-consistency/tanks - provjera konzistentnosti svih tankova
router.get('/tanks', getAllTanksConsistencyCheck);

// GET /api/fuel-consistency/tanks/:id - provjera konzistentnosti jednog tanka
router.get('/tanks/:id', getTankConsistencyCheck);

// POST /api/fuel-consistency/tanks/:id/correct - korekcija nekonzistentnosti
router.post('/tanks/:id/correct', correctTankInconsistency);

// POST /api/fuel-consistency/tanks/:tankId/override - generiranje tokena za zaobilaženje provjere konzistentnosti
router.post('/tanks/:tankId/override', overrideInconsistencyCheck);

export default router;
