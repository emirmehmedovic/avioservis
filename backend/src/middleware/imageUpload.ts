import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Odredišni folder za slike vozila
const vehicleImageStorageDir = path.join(__dirname, '../../private_uploads/vehicles');

// Osiguraj da folder postoji
if (!fs.existsSync(vehicleImageStorageDir)) {
  fs.mkdirSync(vehicleImageStorageDir, { recursive: true });
}

// Konfiguracija za čuvanje slika
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, vehicleImageStorageDir);
  },
  filename: (req, file, cb) => {
    // Generisanje jedinstvenog imena fajla
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filter za tipove fajlova (opciono, ali preporučljivo)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif' || file.mimetype === 'image/webp') {
    cb(null, true);
  } else {
    cb(new Error('Nije podržan tip fajla! Samo slike (jpeg, png, gif, webp) su dozvoljene.'));
  }
};

export const uploadVehicleImage = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit veličine fajla (opciono)
  },
  fileFilter: fileFilter
});
