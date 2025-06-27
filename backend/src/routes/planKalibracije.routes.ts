import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllPlanKalibracije,
  getPlanKalibracijeById,
  createPlanKalibracije,
  updatePlanKalibracije,
  deletePlanKalibracije,
  uploadKalibracijaDocument,
  generatePlanKalibracijePDF,
  generateFullReport
} from '../controllers/planKalibracije.controller';

const router = express.Router();

// Multer konfiguracija za file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Dozvoljena proširenja fajlova
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Dozvoljen je samo upload slika, PDF i Office dokumenata'));
    }
  }
});

// API Routes
router.get('/', getAllPlanKalibracije);              // GET /api/plan-kalibracije
router.get('/:id', getPlanKalibracijeById);          // GET /api/plan-kalibracije/:id
router.post('/', createPlanKalibracije);             // POST /api/plan-kalibracije
router.put('/:id', updatePlanKalibracije);           // PUT /api/plan-kalibracije/:id
router.delete('/:id', deletePlanKalibracije);        // DELETE /api/plan-kalibracije/:id
router.post('/:id/upload', upload.single('document'), uploadKalibracijaDocument); // POST /api/plan-kalibracije/:id/upload
router.get('/:id/pdf', generatePlanKalibracijePDF);  // GET /api/plan-kalibracije/:id/pdf
router.post('/full-report', generateFullReport);     // POST /api/plan-kalibracije/full-report

export default router; 