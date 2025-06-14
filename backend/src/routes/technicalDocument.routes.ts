import { Router } from 'express';
import { downloadDocument, downloadFuelingOperationDocument } from '../controllers/technicalDocument.controller';
import { authenticateToken } from '../middleware/auth'; // Corrected import path

const router = Router();

// Protect the download routes with authentication
router.get('/download/:documentId', authenticateToken, downloadDocument);
router.get('/fueling-operations/:documentId', authenticateToken, downloadFuelingOperationDocument);

export default router;
