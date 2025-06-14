import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import * as z from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Validation schema for creating/updating a fuel tank
const fuelTankSchema = z.object({
  identifier: z.string().min(1, 'Identifikator je obavezan'),
  name: z.string().min(1, 'Naziv je obavezan'),
  location: z.string().min(1, 'Lokacija je obavezna'),
  capacity_liters: z.number().positive('Kapacitet mora biti pozitivan broj'),
  current_liters: z.number().min(0, 'Trenutna količina ne može biti negativna'),
  fuel_type: z.string().min(1, 'Tip goriva je obavezan'),
});

export const getAllFuelTanks = async (req: Request, res: Response): Promise<void> => {
  try {
    const fuelTanks = await (prisma as any).fuelTank.findMany({
      orderBy: { name: 'asc' },
    });
    
    res.status(200).json(fuelTanks);
  } catch (error) {
    console.error('Error fetching fuel tanks:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju tankera' });
  }
};

export const getFuelTankById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const tankId = Number(id);
    
    // Dohvaćamo osnovne podatke o tanku
    const fuelTank = await (prisma as any).fuelTank.findUnique({
      where: { id: tankId },
    });
    
    if (!fuelTank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    // Dohvaćamo MRN zapise za točan izračun kilograma
    const customsFuelRecords = await prisma.$queryRaw<any[]>`
      SELECT 
        mtc.id, 
        mtc.mobile_tank_id, 
        mtc.customs_declaration_number,
        mtc.remaining_quantity_liters,
        mtc.remaining_quantity_kg,
        mtc.density_at_intake
      FROM "MobileTankCustoms" mtc
      WHERE mtc.mobile_tank_id = ${tankId}
        AND mtc.remaining_quantity_liters > 0
      ORDER BY mtc.date_added ASC
    `;
    
    // Računamo točnu kilogram vrijednost na temelju litara i specifičnih gustoća
    let calculatedKg = 0;
    let totalRemainingLiters = 0;
    
    if (customsFuelRecords && customsFuelRecords.length > 0) {
      // Iteracija kroz sve MRN zapise za točan izračun
      for (const record of customsFuelRecords) {
        const remainingLiters = parseFloat(String(record.remaining_quantity_liters)) || 0;
        totalRemainingLiters += remainingLiters;
        
        // Dohvat specifične gustoće iz zapisa ili korištenje defaultne vrijednosti
        const specificGravity = record.density_at_intake !== null && record.density_at_intake !== undefined
          ? parseFloat(String(record.density_at_intake))
          : 0.8; // Defaultna vrijednost ako nema specifične gustoće
        
        // Izračun kilograma za ovaj MRN zapis
        const kgForRecord = remainingLiters * specificGravity;
        calculatedKg += kgForRecord;
      }
      
      // Zaokružimo na 3 decimale za konzistentnost
      calculatedKg = Number(calculatedKg.toFixed(3));
      
      // Logiranje debug podataka ako postoji značajna razlika
      const currentKg = parseFloat(String(fuelTank.current_kg || fuelTank.current_quantity_kg || 0));
      const kgDifference = Math.abs(currentKg - calculatedKg);
      
      if (kgDifference > 0.5) {
        console.log(`[getFuelTankById] Značajna razlika u kg: trenutno=${currentKg}, izračunato=${calculatedKg}, razlika=${kgDifference}`);
      }
    }
    
    // Proširimo odgovor s izračunatom vrijednosti
    const response = {
      ...fuelTank,
      calculated_kg: calculatedKg,
      total_remaining_liters_from_mrn: totalRemainingLiters,
      mrn_records: customsFuelRecords || []
    };
    
    // Ako postoje značajne razlike između prikazanih vrijednosti i MRN zapisa,
    // ažuriramo podatke o cisterni kako bi bili točniji
    const currentLiters = parseFloat(String(fuelTank.current_liters || 0));
    const litersDifference = Math.abs(totalRemainingLiters - currentLiters);
    const currentKg = parseFloat(String(fuelTank.current_kg || fuelTank.current_quantity_kg || 0));
    const kgDifference = Math.abs(calculatedKg - currentKg);
    
    // Ako je razlika veća od 1 litre ili 1kg, ažuriramo tank
    if (litersDifference > 1 || kgDifference > 1) {
      console.log(`[getFuelTankById] Sinkronizacija podataka o cisterni ID=${id}:`);
      console.log(`- Litre: ${currentLiters} -> ${totalRemainingLiters} (razlika: ${litersDifference.toFixed(2)})`);
      console.log(`- KG: ${currentKg} -> ${calculatedKg} (razlika: ${kgDifference.toFixed(2)})`);
      
      try {
        // Ažuriramo podatke o cisterni prema stvarnom MRN stanju
        await prisma.fuelTank.update({
          where: { id: tankId },
          data: {
            current_liters: totalRemainingLiters,
            current_kg: calculatedKg
          }
        });
        console.log(`[getFuelTankById] Podaci o cisterni ID=${id} su uspješno sinkronizirani s MRN zapisima.`);
        
        // Ažuriramo i odgovor s novim vrijednostima
        response.current_liters = totalRemainingLiters;
        response.current_kg = calculatedKg;
      } catch (updateError) {
        console.error(`[getFuelTankById] Greška pri ažuriranju podataka o cisterni:`, updateError);
      }
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching fuel tank:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju tankera' });
  }
};

export const getTankTransactions = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Check if the tank exists
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!tank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    // Get all transactions for this tank
    const transactions = [];
    
    // 1. Get refills from suppliers
    const supplierRefills = await (prisma as any).fuelTankRefill.findMany({
      where: { tankId: Number(id) },
      orderBy: { date: 'desc' },
    });
    
    // Map supplier refills to our transaction format
    const mappedSupplierRefills = supplierRefills.map((refill: any) => ({
      id: refill.id,
      transaction_datetime: refill.date,
      type: 'supplier_refill',
      quantity_liters: refill.quantity_liters,
      supplier_name: refill.supplier,
      invoice_number: refill.invoice_number,
      price_per_liter: refill.price_per_liter,
      notes: refill.notes,
    }));
    
    // 2. Get transfers from fixed tanks
    const fixedTankTransfers = await (prisma as any).fuelTransferToTanker.findMany({
      where: { targetFuelTankId: Number(id) },
      select: {
        id: true,
        dateTime: true,
        quantityLiters: true,
        sourceFixedStorageTankId: true,
        notes: true,
        mrnBreakdown: true,  // Dodajemo mrnBreakdown polje u select
        sourceFixedStorageTank: {
          select: {
            id: true,
            tank_name: true,
            tank_identifier: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { dateTime: 'desc' },
    });
    
    // Map fixed tank transfers to our transaction format
    const mappedFixedTankTransfers = fixedTankTransfers.map((transfer: any) => ({
      id: transfer.id,
      transaction_datetime: transfer.dateTime,
      type: 'fixed_tank_transfer',
      quantity_liters: transfer.quantityLiters,
      source_name: transfer.sourceFixedStorageTank?.tank_name,
      source_id: transfer.sourceFixedStorageTankId,
      notes: transfer.notes,
      user: transfer.user?.username,
      mrnBreakdown: transfer.mrnBreakdown, // Dodajemo mrnBreakdown polje
    }));
    
    // 3. Get fueling operations (where this tank was used to fuel aircraft)
    const fuelingOperations = await (prisma as any).fuelingOperation.findMany({
      where: { tankId: Number(id) },
      orderBy: { dateTime: 'desc' },
    });
    
    // Map fueling operations to our transaction format
    const mappedFuelingOperations = fuelingOperations.map((operation: any) => ({
      id: operation.id,
      transaction_datetime: operation.dateTime,
      type: 'aircraft_fueling',
      quantity_liters: operation.quantity_liters,
      destination_name: operation.aircraft_registration || operation.flight_number,
      destination_id: operation.id,
      notes: operation.notes,
    }));
    
    // Combine all transactions and sort by date (newest first)
    transactions.push(...mappedSupplierRefills, ...mappedFixedTankTransfers, ...mappedFuelingOperations);
    transactions.sort((a, b) => new Date(b.transaction_datetime).getTime() - new Date(a.transaction_datetime).getTime());
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching tank transactions:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju historije transakcija' });
  }
};

export const createFuelTank = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = fuelTankSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    const { identifier, name, location, capacity_liters, current_liters, fuel_type } = validationResult.data;
    
    // Check if identifier already exists
    const existingTank = await (prisma as any).fuelTank.findFirst({
      where: { identifier },
    });
    
    if (existingTank) {
      res.status(400).json({ message: 'Tanker s ovim identifikatorom već postoji' });
      return;
    }
    
    // Validate that current_liters <= capacity_liters
    if (current_liters > capacity_liters) {
      res.status(400).json({ 
        message: 'Trenutna količina goriva ne može biti veća od kapaciteta tankera' 
      });
      return;
    }
    
    const newFuelTank = await (prisma as any).fuelTank.create({
      data: {
        identifier,
        name,
        location,
        capacity_liters,
        current_liters,
        fuel_type,
      },
    });
    
    res.status(201).json(newFuelTank);
  } catch (error) {
    console.error('Error creating fuel tank:', error);
    res.status(500).json({ message: 'Greška pri kreiranju tankera' });
  }
};

export const updateFuelTank = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const validationResult = fuelTankSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    const { identifier, name, location, capacity_liters, current_liters, fuel_type } = validationResult.data;
    
    // Check if the tank exists
    const existingTank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!existingTank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    // Check if the new identifier already exists for a different tank
    const identifierExists = await (prisma as any).fuelTank.findFirst({
      where: {
        identifier,
        id: { not: Number(id) },
      },
    });
    
    if (identifierExists) {
      res.status(400).json({ message: 'Tanker s ovim identifikatorom već postoji' });
      return;
    }
    
    // Validate that current_liters <= capacity_liters
    if (current_liters > capacity_liters) {
      res.status(400).json({ 
        message: 'Trenutna količina goriva ne može biti veća od kapaciteta tankera' 
      });
      return;
    }
    
    const updatedFuelTank = await (prisma as any).fuelTank.update({
      where: { id: Number(id) },
      data: {
        identifier,
        name,
        location,
        capacity_liters,
        current_liters,
        fuel_type,
      },
    });
    
    res.status(200).json(updatedFuelTank);
  } catch (error) {
    console.error('Error updating fuel tank:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju tankera' });
  }
};

export const deleteFuelTank = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Check if the tank exists
    const existingTank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!existingTank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    // Delete related MobileTankCustoms records
    await (prisma as any).mobileTankCustoms.deleteMany({
      where: { mobile_tank_id: Number(id) },
    });

    // Delete related FuelingOperation records
    await (prisma as any).fuelingOperation.deleteMany({
      where: { tankId: Number(id) },
    });

    // Delete related FuelTransferToTanker records where this tank is the target
    await (prisma as any).fuelTransferToTanker.deleteMany({
      where: { targetFuelTankId: Number(id) },
    });

    // Delete related FuelTransferToTanker records where this tank is the source
    // Depending on your schema, you might also need to handle cases where the tank is a source
    // await (prisma as any).fuelTransferToTanker.deleteMany({
    //   where: { sourceFuelTankId: Number(id) },
    // });
    
    // Delete the tank image if it exists
    if (existingTank.image_url) {
      const imagePath = path.join(__dirname, '../../public', existingTank.image_url.replace(/^\/public/, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete the FuelTank
    await (prisma as any).fuelTank.delete({
      where: { id: Number(id) },
    });
    
    res.status(200).json({ message: 'Tanker uspješno obrisan' });
  } catch (error) {
    console.error('Error deleting fuel tank:', error);
    res.status(500).json({ message: 'Greška pri brisanju tankera' });
  }
}; 

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/tanks');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Samo slike (jpeg, jpg, png, gif) su dozvoljene!'));
  },
});

// Middleware for handling single image upload
export const uploadTankImage = upload.single('image');

// Controller function for uploading tank image
export const handleTankImageUpload = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Check if the tank exists
    const existingTank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!existingTank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({ message: 'Slika nije priložena' });
      return;
    }
    
    // Delete old image if it exists
    if (existingTank.image_url) {
      const oldImagePath = path.join(__dirname, '../../public', existingTank.image_url.replace(/^\/public/, ''));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Create image URL for database
    const imageUrl = `/public/uploads/tanks/${req.file.filename}`;
    
    // Update tank with new image URL
    const updatedTank = await (prisma as any).fuelTank.update({
      where: { id: Number(id) },
      data: { image_url: imageUrl },
    });
    
    res.status(200).json({ 
      message: 'Slika uspješno uploadana', 
      image_url: imageUrl,
      tank: updatedTank
    });
  } catch (error) {
    console.error('Error uploading tank image:', error);
    res.status(500).json({ message: 'Greška pri uploadu slike tankera' });
  }
}; 

// GET /api/fuel/tanks/:id/customs-breakdown - Dobijanje raščlanjenog stanja goriva po carinskim prijavama (MRN) za mobilne tankove
export const getMobileTankCustomsBreakdown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tankId = parseInt(req.params.id);
    
    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID format.' });
      return;
    }
    
    // Provjera da li tank postoji
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { id: tankId },
      select: {
        id: true,
        name: true,
        identifier: true,
        fuel_type: true,
        current_liters: true
      }
    });
    
    if (!tank) {
      res.status(404).json({ message: `Tank with ID ${tankId} not found.` });
      return;
    }
    
    // Definiraj tip za rezultat upita
    type CustomsFuelRecord = {
      id: number;
      mobile_tank_id: number;
      customs_declaration_number: string;
      quantity_liters: string | number;
      remaining_quantity_liters: string | number;
      quantity_kg: string | number | null;
      remaining_quantity_kg: string | number | null;
      density_at_intake: string | number | null;
      date_added: Date;
    };

    // Dohvati podatke o gorivu po carinskim prijavama za ovaj mobilni tank, sortirano po datumu (FIFO)
    const customsFuelBreakdown = await prisma.$queryRaw<CustomsFuelRecord[]>`
      SELECT 
        mtc.id, 
        mtc.mobile_tank_id, 
        mtc.customs_declaration_number,
        mtc.quantity_liters,
        mtc.remaining_quantity_liters,
        mtc.quantity_kg,
        mtc.remaining_quantity_kg,
        mtc.density_at_intake,
        mtc.date_added
      FROM "MobileTankCustoms" mtc
      WHERE mtc.mobile_tank_id = ${tankId}
        AND mtc.remaining_quantity_liters > 0
      ORDER BY mtc.date_added ASC
    `;
    
    // Pripremi odgovor
    const response = {
      tank: tank,
      customs_breakdown: customsFuelBreakdown.map((item: any) => {
        // Sigurnosno parsiranje za liter vrijednosti
        const quantity_liters = item.quantity_liters !== null && item.quantity_liters !== undefined
          ? parseFloat(String(item.quantity_liters))
          : 0;
          
        const remaining_quantity_liters = item.remaining_quantity_liters !== null && item.remaining_quantity_liters !== undefined
          ? parseFloat(String(item.remaining_quantity_liters))
          : 0;
          
        // Sigurnosno parsiranje za kg vrijednosti s formatiranjem na 3 decimale
        let quantity_kg = 0;
        if (item.quantity_kg !== null && item.quantity_kg !== undefined) {
          try {
            quantity_kg = Number(Number(String(item.quantity_kg)).toFixed(3));
          } catch (e) {
            console.error('Error parsing quantity_kg', e);
          }
        }
        
        let remaining_quantity_kg = 0;
        if (item.remaining_quantity_kg !== null && item.remaining_quantity_kg !== undefined) {
          try {
            remaining_quantity_kg = Number(Number(String(item.remaining_quantity_kg)).toFixed(3));
          } catch (e) {
            console.error('Error parsing remaining_quantity_kg', e);
          }
        }
        
        // Sigurnosno parsiranje density_at_intake vrijednosti
        let density_at_intake = 0.8; // Default ako nema vrijednosti
        if (item.density_at_intake !== null && item.density_at_intake !== undefined) {
          try {
            density_at_intake = Number(Number(String(item.density_at_intake)).toFixed(4));
          } catch (e) {
            console.error('Error parsing density_at_intake', e);
          }
        }
        
        // Objekt koji vraćamo
        return {
          id: item.id,
          customs_declaration_number: item.customs_declaration_number,
          quantity_liters,
          remaining_quantity_liters,
          quantity_kg,
          remaining_quantity_kg,
          density_at_intake,
          date_added: item.date_added
        };
      }),
      total_customs_tracked_liters: customsFuelBreakdown.reduce(
        (sum: number, item: any) => sum + parseFloat(item.remaining_quantity_liters.toString()), 0
      )
    };
    
    res.status(200).json(response);
    return;
    
  } catch (error: any) {
    console.error('[getMobileTankCustomsBreakdown] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({ message: 'Database error.', details: error.message });
      return;
    }
    next(error);
  }
};