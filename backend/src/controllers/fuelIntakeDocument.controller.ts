import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resolveDocumentPath } from '../config/paths';

const prisma = new PrismaClient();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../public/uploads/fuel_documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and Word documents are allowed.'));
    }
  }
}).single('document'); // Expect a single file with fieldname 'document'

// POST /api/fuel/intake-records/:recordId/documents - Upload novog dokumenta za zapis o prijemu goriva
export const uploadFuelIntakeDocument: RequestHandler = (req, res, next) => {
  upload(req, res, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'Multer error: ' + err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message }); // Error from fileFilter
      }
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { recordId } = req.params;
    const { document_name, document_type } = req.body;

    if (!document_name || !document_type) {
        // If file is uploaded but metadata is missing, delete the uploaded file to prevent orphans
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Missing document_name or document_type.' });
    }

    try {
      const newDocument = await prisma.fuelIntakeDocuments.create({
        data: {
          fuel_intake_record_id: parseInt(recordId),
          document_name,
          document_path: `/uploads/fuel_documents/${req.file.filename}`, // Store relative path
          document_type,
          file_size_bytes: req.file.size,
          mime_type: req.file.mimetype,
        },
      });
      res.status(201).json(newDocument);
    } catch (error: any) {
        // If database operation fails, delete the uploaded file
        fs.unlinkSync(req.file.path);
        if (error.code === 'P2003') { // Foreign key constraint failed
             res.status(404).json({ message: `Fuel intake record with ID ${recordId} not found.` });
             return;
        }
        next(error);
    }
  });
};

// GET /api/fuel/intake-records/:recordId/documents - Dobijanje svih dokumenata za određeni zapis
export const getDocumentsForIntakeRecord: RequestHandler = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const documents = await prisma.fuelIntakeDocuments.findMany({
      where: { fuel_intake_record_id: parseInt(recordId) },
      orderBy: {
        uploaded_at: 'desc',
      }
    });
    if (!documents || documents.length === 0) {
        // Check if the parent record exists to give a more specific message
        const parentRecord = await prisma.fuelIntakeRecords.findUnique({where: {id: parseInt(recordId)}});
        if (!parentRecord) {
            res.status(404).json({ message: `Fuel intake record with ID ${recordId} not found.` });
            return;
        }
        res.status(200).json([]); // Return empty array if record exists but has no documents
        return;
    }
    res.status(200).json(documents);
  } catch (error: any) {
    next(error);
  }
};

// GET /api/fuel/documents/:documentId - Dobijanje specifičnog dokumenta (metapodaci)
export const getFuelIntakeDocumentById: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = await prisma.fuelIntakeDocuments.findUnique({
      where: { id: parseInt(documentId) },
    });
    if (!document) {
      res.status(404).json({ message: 'Fuel intake document not found' });
      return;
    }
    res.status(200).json(document);
  } catch (error: any) {
    next(error);
  }
};

// DELETE /api/fuel/documents/:documentId - Brisanje dokumenta
export const deleteFuelIntakeDocument: RequestHandler = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const document = await prisma.fuelIntakeDocuments.findUnique({
      where: { id: parseInt(documentId) },
    });

    if (!document) {
      res.status(404).json({ message: 'Fuel intake document not found for deletion.' });
      return;
    }

    // Delete file from filesystem using our path resolver
    const filePath = resolveDocumentPath(document.document_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.fuelIntakeDocuments.delete({
      where: { id: parseInt(documentId) },
    });
    res.status(200).json({ message: 'Fuel intake document deleted successfully.' });
  } catch (error: any) {
    if (error.code === 'P2025') { // Should be caught by the findUnique check above, but good to have
      res.status(404).json({ message: 'Fuel intake document not found for deletion.' });
      return;
    }
    next(error);
  }
};

// GET /api/fuel/documents/:documentId/download - Preuzimanje dokumenta
export const downloadFuelIntakeDocument: RequestHandler = async (req, res, next) => {
  const { documentId } = req.params;

  if (!documentId || isNaN(parseInt(documentId))) {
    res.status(400).json({ message: 'Invalid document ID provided.' });
    return;
  }

  try {
    const id = parseInt(documentId);
    const document = await prisma.fuelIntakeDocuments.findUnique({
      where: { id },
    });

    if (!document || !document.document_path) {
      res.status(404).json({ message: 'Document metadata not found.' });
      return;
    }

    // Koristi novu funkciju za rješavanje putanja dokumenata koja radi na svim okruženjima
    const filePath = resolveDocumentPath(document.document_path);
    
    // Provjeri postoji li datoteka
    if (!fs.existsSync(filePath)) {
      console.error(`Physical document file not found on server at: ${filePath}`);
      res.status(404).json({ message: 'Physical document file not found on server.' });
      return;
    }

    const finalFilename = document.document_name || path.basename(filePath);
    // Encode the filename to handle special characters
    const encodedFilename = encodeURIComponent(finalFilename);

    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file.' });
      }
      // next(err); // Avoid calling next if headers already sent or if pipe handles errors
    });

    fileStream.on('close', () => {
      // Ensure response is ended if pipe doesn't automatically do it in all cases, though it should.
      if (!res.writableEnded) {
        res.end();
      }
    });

  } catch (error) {
    console.error('Error in downloadFuelIntakeDocument:', error);
    next(error);
  }
};
