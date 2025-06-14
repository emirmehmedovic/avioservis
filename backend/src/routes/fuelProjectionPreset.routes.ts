import { Router } from 'express';
import { getFuelProjectionPreset, upsertFuelProjectionPreset } from '../controllers/fuelProjectionPreset.controller';
import asyncHandler from '../middleware/asyncHandler'; // Import asyncHandler

const router = Router();

// These routes are for a global, non-user-specific preset.
// Authentication/authorization can be added here if needed in the future.
router.get('/default', asyncHandler(getFuelProjectionPreset));
router.put('/default', asyncHandler(upsertFuelProjectionPreset));

export default router;
