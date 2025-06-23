import { Router } from 'express';
// import { createUploader } from '../utils/file.utils'; // Not needed if no file upload for this route
import { createFuelTransferToTankerRules } from '../validators/fuelTransferToTanker.validators';
import { createFuelTransferToTanker } from '../controllers/fuelTransferToTanker.controller';
import { validate } from '../validators/validate';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// const uploadTransferDocument = createUploader('fuel_transfers'); // Not needed

router.post('/',
  authenticateToken,
  checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']),
  // uploadTransferDocument.single('document'), // Removed multer middleware
  createFuelTransferToTankerRules,
  validate,
  createFuelTransferToTanker
);

// Ovdje se mogu dodati i druge rute (GET, GET by ID, DELETE, itd.) kasnije

export default router;
