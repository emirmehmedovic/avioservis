import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createFixedStorageTank,
  getAllFixedStorageTanks,
  getFixedStorageTankById,
  updateFixedStorageTank,
  deleteFixedStorageTank,
  getFixedTankHistory,
  getTotalFixedTankIntake,
  getCombinedIntakeHistoryList,
  transferFuelBetweenFixedTanks,
  getTankFuelByCustoms,
  getMrnTransactionHistory
} from '../controllers/fixedStorageTank.controller';
import { 
  createFixedStorageTankRules, 
  updateFixedStorageTankRules, 
  transferFuelBetweenFixedTanksRules, 
  validate 
} from '../validators/fixedStorageTank.validators';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based access control for all routes
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

// Multer setup for file uploads
const UPLOAD_TEMP_DIR = path.join(__dirname, '..', '..', 'uploads', 'temp');

// Ensure the temporary upload directory exists
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes for FixedStorageTanks
// Base path for these routes will be /api/fuel/fixed-tanks (defined in app.ts or main routes file)

// Create a new fixed storage tank
// POST /api/fuel/fixed-tanks
router.post('/', 
  upload.single('identificationDocument'), 
  createFixedStorageTankRules, 
  validate, 
  createFixedStorageTank
);

// Get all fixed storage tanks (with optional query params for filtering)
// GET /api/fuel/fixed-tanks
router.get('/', getAllFixedStorageTanks);

// Get a single fixed storage tank by ID
// GET /api/fuel/fixed-tanks/:id
router.get('/:id', getFixedStorageTankById);

// Update a fixed storage tank by ID
// PUT /api/fuel/fixed-tanks/:id
router.put('/:id', 
  upload.single('identificationDocument'), 
  updateFixedStorageTankRules, 
  validate, 
  updateFixedStorageTank
);

// Delete (or deactivate) a fixed storage tank by ID
// DELETE /api/fuel/fixed-tanks/:id
router.delete('/:id', deleteFixedStorageTank);

// Get transaction history for a specific fixed storage tank
// GET /api/fuel/fixed-tanks/:tankId/history
router.get('/:tankId/history', getFixedTankHistory);

// Get fuel breakdown by customs declarations (MRN) for a specific tank
// GET /api/fuel/fixed-tanks/:id/customs-breakdown
router.get('/:id/customs-breakdown', getTankFuelByCustoms);

// Get transaction history for a specific MRN number
// GET /api/fuel/fixed-tanks/mrn-history/:mrnNumber
router.get('/mrn-history/:mrnNumber', getMrnTransactionHistory);

// GET /api/fuel/fixed-tanks/summary/total-intake - New route for total intake summary
router.get('/summary/total-intake', getTotalFixedTankIntake);

// GET /api/fuel/fixed-tanks/summary/all-intakes-list - New route for a list of all intake transactions
router.get('/summary/all-intakes-list', getCombinedIntakeHistoryList);

// Transfer fuel between two fixed storage tanks
// POST /api/fuel/fixed-tanks/internal-transfer
router.post('/internal-transfer', transferFuelBetweenFixedTanksRules, validate, transferFuelBetweenFixedTanks);

export default router;
