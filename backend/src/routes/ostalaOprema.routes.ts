import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllOstalaOprema,
  getOstalaOpremaById,
  createOstalaOprema,
  updateOstalaOprema,
  deleteOstalaOprema,
  uploadOstalaOpremaDocument,
  generateOstalaOpremaPDF,
  generateFullReport
} from '../controllers/ostalaOprema.controller';

const router = express.Router();

// Multer konfiguracija za file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ostala_oprema_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Dozvoljena proširenja fajlova
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
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
router.get('/', getAllOstalaOprema);                 // GET /api/ostala-oprema
router.get('/:id', getOstalaOpremaById);             // GET /api/ostala-oprema/:id
router.post('/', createOstalaOprema);                // POST /api/ostala-oprema
router.put('/:id', updateOstalaOprema);              // PUT /api/ostala-oprema/:id
router.delete('/:id', deleteOstalaOprema);           // DELETE /api/ostala-oprema/:id
router.post('/:id/upload', upload.single('document'), uploadOstalaOpremaDocument); // POST /api/ostala-oprema/:id/upload
router.get('/:id/pdf', generateOstalaOpremaPDF);     // GET /api/ostala-oprema/:id/pdf
router.post('/full-report', generateFullReport);     // POST /api/ostala-oprema/full-report

export default router; 