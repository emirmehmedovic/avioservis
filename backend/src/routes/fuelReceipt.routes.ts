import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createUploader } from '../utils/file.utils';
import { createFuelReceiptRules, validate } from '../validators/fuelReceipt.validators';
import { createFuelReceipt } from '../controllers/fuelReceipt.controller'; // Kreirat ćemo ovaj kontroler

const router = Router();

// Inicijalizacija multer instance za 'fuel_receipts'
// Očekujemo jedan fajl pod nazivom polja 'document'
const uploadReceipt = createUploader('fuel_receipts');

router.post('/', 
  authenticateToken, // Add authentication middleware
  uploadReceipt.single('document'), // 'document' je ime polja u form-data za fajl
  createFuelReceiptRules, 
  validate, 
  createFuelReceipt
);

// Ovdje se mogu dodati i druge rute (GET, GET by ID, DELETE, itd.) kasnije

export default router;
