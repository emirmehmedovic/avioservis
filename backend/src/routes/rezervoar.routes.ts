import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import {
  getAllRezervoari,
  getRezervoarById,
  createRezervoar,
  updateRezervoar,
  deleteRezervoar,
  generateRezervoarPDF,
  downloadRezervoarDocument,
  generateFullReport
} from '../controllers/rezervoar.controller';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/'); // Temporary storage, will be moved by controller
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'rezervoar-temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Dozvoljeni su samo fajlovi: JPG, PNG, GIF, PDF, DOC, DOCX, TXT'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Routes
router.get('/', getAllRezervoari);
router.get('/:id', getRezervoarById);
router.get('/:id/pdf', authenticateToken, generateRezervoarPDF);
router.get('/:id/dokument', downloadRezervoarDocument);
router.post('/', authenticateToken, upload.single('dokument'), createRezervoar);
router.post('/full-report', authenticateToken, generateFullReport);
router.put('/:id', authenticateToken, upload.single('dokument'), updateRezervoar);
router.delete('/:id', authenticateToken, deleteRezervoar);

export default router; 