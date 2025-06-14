import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Dozvoljeni tipovi fajlova i njihove ekstenzije
const allowedMimeTypes: { [key: string]: string[] } = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Funkcija za kreiranje multer instance s dinamičkom destinacijom
export const createUploader = (destinationSubPath: string) => {
  // Kreiraj apsolutnu putanju do 'uploads' direktorija iz korijena projekta
  // Pretpostavka: 'uploads' direktorij je u korijenu backend dijela projekta
  const projectRoot = path.resolve(__dirname, '..', '..'); // Izlazi iz src/utils do backend korijena
  const uploadsBaseDir = path.join(projectRoot, 'uploads');
  const fullDestinationPath = path.join(uploadsBaseDir, destinationSubPath);

  // Osiguraj da destinacijski direktorij postoji
  if (!fs.existsSync(fullDestinationPath)) {
    fs.mkdirSync(fullDestinationPath, { recursive: true });
    console.log(`Created directory: ${fullDestinationPath}`);
  } else {
    console.log(`Directory already exists: ${fullDestinationPath}`);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, fullDestinationPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      // Koristi dio originalnog imena (bez ekstenzije) za veću čitljivost
      const basename = path.basename(file.originalname, extension);
      cb(null, `${basename}-${uniqueSuffix}${extension}`);
    },
  });

  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = allowedMimeTypes[file.mimetype];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      console.error(`Invalid file type attempt: ${file.originalname} (mimetype: ${file.mimetype}, ext: ${fileExtension})`);
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
    }
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  });
};
