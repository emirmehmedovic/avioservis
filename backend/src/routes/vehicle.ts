import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { createVehicleSchema, updateVehicleSchema, vehicleIdSchema } from '../schemas/vehicle.schema';
import express from 'express';
import { uploadVehicleImage } from '../middleware/imageUpload'; 
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid'; 

const router = express.Router();
const prisma = new PrismaClient();

// Get all vehicles
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { company: true, images: true }
  });
  res.json(vehicles);
});

// Get vehicle by id
router.get('/:id', authenticateToken, validateRequest(vehicleIdSchema), async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { 
      company: true, 
      images: true, 
      location: true,
      filterDocuments: true,
      technicalDocuments: true,
      hoseDocuments: true
    }
  });
  if (!vehicle) {
    res.status(404).json({ message: 'Vehicle not found' });
    return;
  }
  res.json(vehicle);
});

// Create vehicle (ADMIN only)
router.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(createVehicleSchema),
  async (req: AuthRequest, res: Response) => {

    try {
      const data = req.body;
      // Automatski izračunaj filter_expiry_date ako su oba polja prisutna
      if (data.filter_installation_date && data.filter_validity_period_months) {
        const installDate = new Date(data.filter_installation_date);
        const months = Number(data.filter_validity_period_months);
        const expiryDate = new Date(installDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);
        data.filter_expiry_date = expiryDate;
      }
      // Automatski izračunaj next_annual_inspection_date ako je prisutan last_annual_inspection_date
      if (data.last_annual_inspection_date) {
        const last = new Date(data.last_annual_inspection_date);
        const next = new Date(last);
        next.setFullYear(next.getFullYear() + 1);
        data.next_annual_inspection_date = next;
      }
      const vehicle = await prisma.vehicle.create({ data });
      res.status(201).json(vehicle);
    } catch (err) {
      console.error('Error creating vehicle:', err); // Detailed error log
      let errorMessage = 'Server error while creating vehicle.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      // Check for Prisma-specific errors if applicable
      // For example, if (err.code === 'P2002') { /* handle unique constraint violation */ }
      res.status(500).json({ message: 'Server error', error: errorMessage, details: err });
    }
  }
);

// Update vehicle (ADMIN only)
router.put(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(updateVehicleSchema),
  async (req: AuthRequest, res: Response) => {

    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      // Automatski izračunaj filter_expiry_date ako su oba polja prisutna
      if (data.filter_installation_date && data.filter_validity_period_months) {
        const installDate = new Date(data.filter_installation_date);
        const months = Number(data.filter_validity_period_months);
        const expiryDate = new Date(installDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);
        data.filter_expiry_date = expiryDate;
      }
      // Automatski izračunaj next_annual_inspection_date ako je prisutan last_annual_inspection_date
      if (data.last_annual_inspection_date) {
        const last = new Date(data.last_annual_inspection_date);
        const next = new Date(last);
        next.setFullYear(next.getFullYear() + 1);
        data.next_annual_inspection_date = next;
      }
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data
      });
      res.json(vehicle);
    } catch (err) {
      console.error('Error updating vehicle:', err); // Log the actual error
      res.status(404).json({ message: 'Vehicle not found or error updating' });
    }
  }
);

// Delete vehicle (ADMIN only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(vehicleIdSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Prvo provjerimo postoji li vozilo
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          images: true,
          filterDocuments: true,
          technicalDocuments: true,
          hoseDocuments: true,
          serviceRecords: true
        }
      });
      
      if (!vehicle) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }
      
      // Transakcija za brisanje svih povezanih zapisa i zatim vozila
      await prisma.$transaction(async (tx) => {
        // Brisanje slika
        if (vehicle.images && vehicle.images.length > 0) {
          await tx.vehicleImage.deleteMany({
            where: { vehicleId: id }
          });
          
          // Brisanje fizičkih slika (opciono)
          for (const image of vehicle.images) {
            try {
              const imagePath = path.join(__dirname, '../../public', image.imageUrl);
              if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
              }
            } catch (fileErr) {
              console.error(`Error deleting image file: ${fileErr}`);
              // Nastavljamo s brisanjem čak i ako ne možemo obrisati fizičku sliku
            }
          }
        }
        
        // Brisanje dokumenata filtera
        if (vehicle.filterDocuments && vehicle.filterDocuments.length > 0) {
          await tx.filterDocument.deleteMany({
            where: { vehicleId: id }
          });
        }
        
        // Brisanje tehničkih dokumenata
        if (vehicle.technicalDocuments && vehicle.technicalDocuments.length > 0) {
          await tx.technicalDocument.deleteMany({
            where: { vehicleId: id }
          });
        }
        
        // Brisanje dokumenata crijeva
        if (vehicle.hoseDocuments && vehicle.hoseDocuments.length > 0) {
          await tx.hoseDocument.deleteMany({
            where: { vehicleId: id }
          });
        }
        
        // Brisanje servisnih zapisa
        if (vehicle.serviceRecords && vehicle.serviceRecords.length > 0) {
          await tx.serviceRecord.deleteMany({
            where: { vehicleId: id }
          });
        }
        
        // Na kraju brišemo samo vozilo
        await tx.vehicle.delete({
          where: { id }
        });
      });
      
      res.json({ message: 'Vehicle and all related records successfully deleted' });
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      
      // Detaljnija poruka o grešci
      let errorMessage = 'Server error while deleting vehicle';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Prisma greške za referencijalni integritet
      const prismaError = err as any;
      if (prismaError.code === 'P2003') {
        res.status(400).json({ 
          message: 'Cannot delete vehicle because it is referenced by other records',
          details: prismaError.meta?.field_name || 'unknown relation'
        });
        return;
      }
      
      res.status(500).json({ 
        message: 'Error deleting vehicle', 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? err : undefined
      });
    }
  }
);

// Endpoint za upload slike za vozilo
router.post('/:vehicleId/images', authenticateToken, uploadVehicleImage.single('image'), async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId } = req.params;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'Nije priložen fajl za upload.' });
    return;
  }

  try {
    const vehicleExists = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId as string) }
    });

    if (!vehicleExists) {
      res.status(404).json({ error: 'Vozilo nije pronađeno.' });
      return;
    }

    const relativeImageUrl = path.join('/uploads/vehicles', file.filename).replace(/\\/g, '/');

    const newImage = await prisma.vehicleImage.create({
      data: {
        vehicleId: parseInt(vehicleId as string),
        imageUrl: relativeImageUrl,
      }
    });

    res.status(201).json(newImage);
  } catch (error) {
    console.error('Greška prilikom upload-a slike:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom upload-a slike.' });
  }
});

// Konfiguracija za upload dokumenata filtera

// Konfiguracija za spremanje dokumenata filtera
const filterDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Direktorij za spremanje dokumenata filtera (u public/uploads za Nginx)
    const uploadDir = path.join(__dirname, '../../public/uploads/filter_documents');
    // Osiguraj da direktorij postoji
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generiraj jedinstveno ime datoteke s originalnom ekstenzijom
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

const uploadFilterDocument = multer({ storage: filterDocumentStorage });

// Endpoint za upload dokumenta filtera
router.post('/:vehicleId/filter-documents', authenticateToken, uploadFilterDocument.single('file'), async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId } = req.params;
  const file = req.file;
  const { title, documentType } = req.body;

  if (!file) {
    res.status(400).json({ error: 'Nije priložen fajl za upload.' });
    return;
  }

  if (!title) {
    res.status(400).json({ error: 'Naslov dokumenta je obavezan.' });
    return;
  }

  try {
    const vehicleExists = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId as string) }
    });

    if (!vehicleExists) {
      res.status(404).json({ error: 'Vozilo nije pronađeno.' });
      return;
    }

    const relativeFileUrl = path.join('/uploads/filter_documents', file.filename).replace(/\\/g, '/');

    const newDocument = await prisma.filterDocument.create({
      data: {
        vehicleId: parseInt(vehicleId as string),
        title,
        documentType: documentType || 'other',
        fileUrl: relativeFileUrl,
        uploadedAt: new Date()
      }
    });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Greška prilikom upload-a dokumenta filtera:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom upload-a dokumenta filtera.' });
  }
});

// Endpoint za brisanje dokumenta filtera
router.delete('/:vehicleId/filter-documents/:documentId', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId, documentId } = req.params;

  try {
    // Provjeri postoji li dokument
    const document = await prisma.filterDocument.findFirst({
      where: {
        id: parseInt(documentId),
        vehicleId: parseInt(vehicleId)
      }
    });

    if (!document) {
      res.status(404).json({ error: 'Dokument nije pronađen.' });
      return;
    }

    // Obriši dokument iz baze
    await prisma.filterDocument.delete({
      where: { id: parseInt(documentId) }
    });

    // Pokušaj obrisati fizički fajl (ako postoji)
    try {
      const filePath = path.join(__dirname, '../../public', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Greška prilikom brisanja fajla:', fileError);
      // Nastavi s brisanjem iz baze čak i ako brisanje fajla ne uspije
    }

    res.json({ message: 'Dokument uspješno obrisan.' });
  } catch (error) {
    console.error('Greška prilikom brisanja dokumenta filtera:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom brisanja dokumenta filtera.' });
  }
});

// Konfiguracija za spremanje tehničkih dokumenata
const technicalDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Direktorij za spremanje tehničkih dokumenata (u public/uploads za Nginx)
    const uploadDir = path.join(__dirname, '../../public/uploads/technical_documents');
    // Osiguraj da direktorij postoji
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generiraj jedinstveno ime datoteke s originalnom ekstenzijom
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

const uploadTechnicalDocument = multer({ storage: technicalDocumentStorage });

// Endpoint za upload tehničkog dokumenta
router.post('/:vehicleId/technical-documents', authenticateToken, uploadTechnicalDocument.single('file'), async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId } = req.params;
  const file = req.file;
  const { title, documentType } = req.body;

  if (!file) {
    res.status(400).json({ error: 'Nije priložen fajl za upload.' });
    return;
  }

  if (!title) {
    res.status(400).json({ error: 'Naslov dokumenta je obavezan.' });
    return;
  }

  try {
    const vehicleExists = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId as string) }
    });

    if (!vehicleExists) {
      res.status(404).json({ error: 'Vozilo nije pronađeno.' });
      return;
    }

    const relativeFileUrl = path.join('/uploads/technical_documents', file.filename).replace(/\\/g, '/');

    const newDocument = await prisma.technicalDocument.create({
      data: {
        vehicleId: parseInt(vehicleId as string),
        title,
        documentType: documentType || 'other',
        fileUrl: relativeFileUrl,
        uploadedAt: new Date()
      }
    });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Greška prilikom upload-a tehničkog dokumenta:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom upload-a tehničkog dokumenta.' });
  }
});

// Endpoint za brisanje tehničkog dokumenta
router.delete('/:vehicleId/technical-documents/:documentId', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId, documentId } = req.params;

  try {
    // Provjeri postoji li dokument
    const document = await prisma.technicalDocument.findFirst({
      where: {
        id: parseInt(documentId),
        vehicleId: parseInt(vehicleId)
      }
    });

    if (!document) {
      res.status(404).json({ error: 'Dokument nije pronađen.' });
      return;
    }

    // Obriši dokument iz baze
    await prisma.technicalDocument.delete({
      where: { id: parseInt(documentId) }
    });

    // Pokušaj obrisati fizički fajl (ako postoji)
    try {
      const filePath = path.join(__dirname, '../../public', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Greška prilikom brisanja fajla:', fileError);
      // Nastavi s brisanjem iz baze čak i ako brisanje fajla ne uspije
    }

    res.json({ message: 'Dokument uspješno obrisan.' });
  } catch (error) {
    console.error('Greška prilikom brisanja tehničkog dokumenta:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom brisanja tehničkog dokumenta.' });
  }
});

// Konfiguracija za spremanje dokumenata crijeva
const hoseDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Direktorij za spremanje dokumenata crijeva (u public/uploads za Nginx)
    const uploadDir = path.join(__dirname, '../../public/uploads/hose_documents');
    // Osiguraj da direktorij postoji
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generiraj jedinstveno ime datoteke s originalnom ekstenzijom
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

const uploadHoseDocument = multer({ storage: hoseDocumentStorage });

// Endpoint za upload dokumenta crijeva
router.post('/:vehicleId/hose-documents', authenticateToken, uploadHoseDocument.single('file'), async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId } = req.params;
  const file = req.file;
  const { title, documentType } = req.body;

  if (!file) {
    res.status(400).json({ error: 'Nije priložen fajl za upload.' });
    return;
  }

  if (!title) {
    res.status(400).json({ error: 'Naslov dokumenta je obavezan.' });
    return;
  }

  try {
    const vehicleExists = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId as string) }
    });

    if (!vehicleExists) {
      res.status(404).json({ error: 'Vozilo nije pronađeno.' });
      return;
    }

    const relativeFileUrl = path.join('/uploads/hose_documents', file.filename).replace(/\\/g, '/');

    const newDocument = await prisma.hoseDocument.create({
      data: {
        vehicleId: parseInt(vehicleId as string),
        title,
        documentType: documentType || 'other',
        fileUrl: relativeFileUrl,
        uploadedAt: new Date()
      }
    });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Greška prilikom upload-a dokumenta crijeva:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom upload-a dokumenta crijeva.' });
  }
});

// Endpoint za brisanje dokumenta crijeva
router.delete('/:vehicleId/hose-documents/:documentId', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  const { vehicleId, documentId } = req.params;

  try {
    // Provjeri postoji li dokument
    const document = await prisma.hoseDocument.findFirst({
      where: {
        id: parseInt(documentId),
        vehicleId: parseInt(vehicleId)
      }
    });

    if (!document) {
      res.status(404).json({ error: 'Dokument nije pronađen.' });
      return;
    }

    // Obriši dokument iz baze
    await prisma.hoseDocument.delete({
      where: { id: parseInt(documentId) }
    });

    // Pokušaj obrisati fizički fajl (ako postoji)
    try {
      const filePath = path.join(__dirname, '../../public', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Greška prilikom brisanja fajla:', fileError);
      // Nastavi s brisanjem iz baze čak i ako brisanje fajla ne uspije
    }

    res.json({ message: 'Dokument uspješno obrisan.' });
  } catch (error) {
    console.error('Greška prilikom brisanja dokumenta crijeva:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom brisanja dokumenta crijeva.' });
  }
});

export default router;
