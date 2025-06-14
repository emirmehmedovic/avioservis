import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Destination folder for service record documents
const serviceRecordDocumentStorageDir = path.join(__dirname, '../../private_uploads/service-records');

// Ensure the folder exists
if (!fs.existsSync(serviceRecordDocumentStorageDir)) {
  fs.mkdirSync(serviceRecordDocumentStorageDir, { recursive: true });
}

// Configuration for storing documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, serviceRecordDocumentStorageDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filter for file types (only allow PDFs)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type! Only PDF documents are allowed.'));
  }
};

export const uploadServiceRecordDocument = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB file size limit
  },
  fileFilter: fileFilter
});
