import { Router } from 'express';
import {
  generateReport,
  getReport,
  getMyReports,
  deleteReport
} from '../controllers/report.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/reports/generate - Generiši izvještaj (zahtijeva autentifikaciju)
router.post('/generate', authenticateToken, generateReport);

// GET /api/reports/my - Moji izvještaji (zahtijeva autentifikaciju) - MORA BITI PRIJE /:token
router.get('/my', authenticateToken, getMyReports);

// GET /api/reports/{token} - Dohvati izvještaj (zahtijeva autentifikaciju)
router.get('/:token', authenticateToken, getReport);

// DELETE /api/reports/{id} - Obriši izvještaj (zahtijeva autentifikaciju)
router.delete('/:id', authenticateToken, deleteReport);

export default router;
