import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import * as LocationController from '../controllers/location.controller';
import { validateRequest } from '../middleware/validateRequest';
import { createLocationSchema, updateLocationSchema, locationIdSchema } from '../schemas/location.schema';

const router = Router();



// Get all locations
router.get('/', authenticateToken, LocationController.getAllLocations);

// Get location by id
router.get('/:id', authenticateToken, validateRequest(locationIdSchema), LocationController.getLocationById);

// Create location (ADMIN only)
router.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(createLocationSchema),
  LocationController.createLocation
);

// Update location (ADMIN only)
router.put(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(updateLocationSchema),
  LocationController.updateLocation
);

// Delete location (ADMIN only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(locationIdSchema),
  LocationController.deleteLocation
);

export default router;
