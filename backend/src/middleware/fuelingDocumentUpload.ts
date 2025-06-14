import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Destination folder for fueling operation documents
const fuelingDocumentsStorageDir = path.join(__dirname, '../../private_uploads/fueling_documents');

// Ensure the folder exists
if (!fs.existsSync(fuelingDocumentsStorageDir)) {
  fs.mkdirSync(fuelingDocumentsStorageDir, { recursive: true });
}

// Configuration for storing documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, fuelingDocumentsStorageDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'fuelop-' + uniqueSuffix + extension); // Prefix to identify fueling op docs
  }
});

// Filter for allowed file types
const allowedMimeTypes = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type! Allowed types: PDF, TXT, DOC, DOCX, PNG, JPG/JPEG.'));
  }
};

// Middleware za upload jednog dokumenta (za kompatibilnost sa starim kodom)
export const uploadFuelingDocument = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 15 // 15MB file size limit (adjust as needed)
  },
  fileFilter: fileFilter
}).single('document');

// Middleware za upload više dokumenata
export const uploadMultipleFuelingDocuments = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 15, // 15MB file size limit per file
    files: 10 // Maximum 10 files at once
  },
  fileFilter: fileFilter
}).array('documents', 10); // 'documents' je ime polja, 10 je maksimalan broj dokumenata