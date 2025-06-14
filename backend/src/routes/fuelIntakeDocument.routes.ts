import { Router } from 'express';
import {
  uploadFuelIntakeDocument,
  getDocumentsForIntakeRecord,
  getFuelIntakeDocumentById,
  deleteFuelIntakeDocument,
  downloadFuelIntakeDocument,
} from '../controllers/fuelIntakeDocument.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router({ mergeParams: true }); // mergeParams allows us to access :recordId from parent router

// Base path for these routes will be /api/fuel/intake-records/:recordId/documents
// and /api/fuel/documents/:documentId

// Upload a new document for a specific intake record
// POST /api/fuel/intake-records/:recordId/documents
router.post('/', uploadFuelIntakeDocument);

// Get all documents for a specific intake record
// GET /api/fuel/intake-records/:recordId/documents
router.get('/', getDocumentsForIntakeRecord);

// Separate route for fetching/deleting a document directly by its own ID
// This is useful if you don't have the parent recordId handy
const singleDocumentRouter = Router();
// GET /api/fuel/documents/:documentId
singleDocumentRouter.get('/:documentId', authenticateToken, getFuelIntakeDocumentById);
// DELETE /api/fuel/documents/:documentId
singleDocumentRouter.delete('/:documentId', authenticateToken, deleteFuelIntakeDocument);
// GET /api/fuel/documents/:documentId/download - Download a specific document
singleDocumentRouter.get('/:documentId/download', authenticateToken, downloadFuelIntakeDocument);

export { router as fuelIntakeRecordDocumentsRoutes, singleDocumentRouter as fuelDocumentRoutes };
