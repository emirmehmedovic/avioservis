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
      where: {
        is_deleted: false // Isključujemo obrisane cisterne
      }
    });
    
    // Za svaki tank, izračunaj calculated_kg iz MRN podataka
    const tanksWithCalculatedKg = await Promise.all(
      fuelTanks.map(async (tank: any) => {
        try {
          // Dohvati MRN podatke za ovaj tank
          const mrnData = await (prisma as any).mobileTankCustoms.findMany({
            where: {
              mobile_tank_id: tank.id,
              remaining_quantity_kg: { gt: 0 } // Samo aktivni MRN zapisi
            }
          });
          
          // Izračunaj ukupnu kg vrijednost iz MRN podataka
          const calculatedKg = mrnData.reduce((sum: number, item: any) => {
            return sum + (parseFloat(item.remaining_quantity_kg) || 0);
          }, 0);
          
          console.log(`🔍 Tank ${tank.id} (${tank.name}): current_kg=${tank.current_kg}, calculated_kg=${calculatedKg}`);
          
          // Dodaj calculated_kg u odgovor
          return {
            ...tank,
            calculated_kg: calculatedKg > 0 ? calculatedKg : undefined
          };
        } catch (error) {
          console.error(`Error calculating kg for tank ${tank.id}:`, error);
          return tank; // Vrati originalni tank ako je greška
        }
      })
    );
    
    res.status(200).json(tanksWithCalculatedKg);
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
      where: { 
        id: tankId,
        is_deleted: false // Ne prikazujemo obrisane cisterne
      },
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
        AND mtc.remaining_quantity_kg > 0
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
    // prikaži upozorenje ali NE ažurira automatski
    const currentLiters = parseFloat(String(fuelTank.current_liters || 0));
    const litersDifference = Math.abs(totalRemainingLiters - currentLiters);
    const currentKg = parseFloat(String(fuelTank.current_kg || fuelTank.current_quantity_kg || 0));
    const kgDifference = Math.abs(calculatedKg - currentKg);
    
    // Ako je razlika veća od 1 litre ili 1kg, prikaži upozorenje ali NE ažurira automatski
    if (litersDifference > 1 || kgDifference > 1) {
      console.log(`[getFuelTankById] UPOZORENJE - Neslaganje podataka o cisterni ID=${id}:`);
      console.log(`- Litre: ${currentLiters} (trenutno) vs ${totalRemainingLiters} (iz MRN zapisa) - razlika: ${litersDifference.toFixed(2)}L`);
      console.log(`- KG: ${currentKg} (trenutno) vs ${calculatedKg} (iz MRN zapisa) - razlika: ${kgDifference.toFixed(2)}kg`);
      
      // Orphaned liters calculation
      const orphanedLiters = currentLiters - totalRemainingLiters;
      if (orphanedLiters > 1) {
        console.log(`[getFuelTankById] ORPHANED LITERS DETECTED: ${orphanedLiters.toFixed(2)}L u tanku ID=${id}`);
        console.log(`[getFuelTankById] Ovi litri će trebati transfer u Excess Fuel Holding Tank`);
        
        // TODO: Implementirati automatski transfer orphaned litara u holding tank
        // Za sada ne brišemo podatke - čuvamo ih
      }
      
      console.log(`[getFuelTankById] PRESERVING existing tank data - no destructive sync performed`);
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
    console.log('getTankTransactions called for tank ID:', id);
    
    // Check if the tank exists
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!tank) {
      console.log('Tank not found for ID:', id);
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    console.log('Tank found:', tank.name || tank.identifier);
    
    // Get all transactions for this tank
    const transactions = [];
    
    // 1. Get refills from suppliers
    const supplierRefills = await (prisma as any).fuelTankRefill.findMany({
      where: { tankId: Number(id) },
      orderBy: { date: 'desc' },
    });
    
    console.log('Supplier refills found:', supplierRefills.length);
    
    // Map supplier refills to our transaction format
    const mappedSupplierRefills = supplierRefills.map((refill: any) => ({
      id: refill.id,
      transaction_datetime: refill.date,
      type: 'supplier_refill',
      quantity_liters: Number(refill.quantity_liters),
      supplier_name: refill.supplier,
      invoice_number: refill.invoice_number,
      price_per_liter: refill.price_per_liter,
      notes: refill.notes,
    }));
    
    // 2. Get transfers from fixed tanks
    const fixedTankTransfers = await (prisma as any).fixedTankTransfers.findMany({
      where: { 
        activity_type: 'TANKER_TRANSFER_OUT',
        notes: { contains: `Transfer to mobile tanker ID: ${id}` }
      },
      select: {
        id: true,
        transfer_datetime: true,
        quantity_liters_transferred: true,
        affected_fixed_tank_id: true,
        notes: true,
        // Dohvati informacije o fiksnom tanku
        affectedFixedTank: {
          select: {
            id: true,
            tank_name: true,
            tank_identifier: true,
          },
        },
      },
      orderBy: { transfer_datetime: 'desc' },
    });
    
    console.log('Fixed tank transfers found:', fixedTankTransfers.length);
    console.log('Fixed tank transfers details:', fixedTankTransfers);
    
    // Map fixed tank transfers to our transaction format
    const mappedFixedTankTransfers = fixedTankTransfers.map((transfer: any) => ({
      id: transfer.id,
      transaction_datetime: transfer.transfer_datetime,
      type: 'fixed_tank_transfer',
      quantity_liters: Number(transfer.quantity_liters_transferred),
      source_name: transfer.affectedFixedTank?.tank_name,
      source_id: transfer.affected_fixed_tank_id,
      notes: transfer.notes,
    }));
    
    console.log('Mapped fixed tank transfers:', mappedFixedTankTransfers);
    
    // 3. Get fueling operations (where this tank was used to fuel aircraft)
    const fuelingOperations = await (prisma as any).fuelingOperation.findMany({
      where: { 
        tankId: Number(id),
        is_deleted: false // Ne uključujemo obrisane operacije
      },
      orderBy: { dateTime: 'desc' },
    });
    
    console.log('Fueling operations found:', fuelingOperations.length);
    
    // Map fueling operations to our transaction format
    const mappedFuelingOperations = fuelingOperations.map((operation: any) => ({
      id: operation.id,
      transaction_datetime: operation.dateTime,
      type: 'aircraft_fueling',
      quantity_liters: Number(operation.quantity_liters),
      destination_name: operation.aircraft_registration || operation.flight_number,
      destination_id: operation.id,
      notes: operation.notes,
    }));
    
    // Combine all transactions and sort by date (newest first)
    transactions.push(...mappedSupplierRefills, ...mappedFixedTankTransfers, ...mappedFuelingOperations);
    transactions.sort((a, b) => new Date(b.transaction_datetime).getTime() - new Date(a.transaction_datetime).getTime());
    
    console.log('Total transactions found:', transactions.length);
    console.log('Transaction types:', transactions.map(t => t.type));
    console.log('Transaction type counts:', {
      supplier_refill: transactions.filter(t => t.type === 'supplier_refill').length,
      fixed_tank_transfer: transactions.filter(t => t.type === 'fixed_tank_transfer').length,
      aircraft_fueling: transactions.filter(t => t.type === 'aircraft_fueling').length
    });
    
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
    
    // Umjesto stvarnog brisanja, implementiramo "soft delete" - označavamo tank kao obrisan
    // ali zadržavamo sve povezane zapise (fuelingOperation, transferi, itd.)
    
    // 1. Prvo provjeravamo postoji li is_deleted polje u FuelTank modelu
    try {
      // Soft Delete - označavamo tank kao obrisan umjesto stvarnog brisanja
      await (prisma as any).fuelTank.update({
        where: { id: Number(id) },
        data: { is_deleted: true }
      });
      
      res.status(200).json({ message: 'Tanker uspješno označen kao obrisan' });
    } catch (updateError: any) {
      // Ako polje is_deleted ne postoji u bazi, dodajemo ga.
      // Ovo će se izvršiti samo pri prvom pozivu ove funkcije nakon izmjene.
      if (updateError?.message?.includes('is_deleted')) {
        console.log('Polje is_deleted ne postoji u FuelTank modelu, potrebna migracija');
        
        // Koristimo stari način - stvarno brisanje, ali upozoravamo korisnika
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
        
        res.status(200).json({ 
          message: 'Tanker je obrisan zajedno s povezanim zapisima. Preporučujemo migraciju baze za implementaciju soft-delete funkcionalnosti.', 
          recommendation: 'Dodajte polje is_deleted u FuelTank model putem Prisma migracije za buduće korištenje soft-delete funkcionalnosti.'
        });
      } else {
        // Neka druga greška
        throw updateError;
      }
    }
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
        AND mtc.remaining_quantity_kg > 0
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

// GET /api/fuel/tanks/density/oldest-active-mrn - Get density of oldest active MRN in a tank
export const getOldestActiveMrnDensity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tankIdentifier } = req.query;

    if (!tankIdentifier || typeof tankIdentifier !== 'string') {
      res.status(400).json({ message: 'Tank identifier is required and must be a string.' });
      return;
    }

    // Pronađi tank po identifier-u
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { identifier: tankIdentifier },
      select: {
        id: true,
        identifier: true,
        name: true,
        fuel_type: true
      }
    });

    if (!tank) {
      res.status(404).json({
        message: `Tank with identifier '${tankIdentifier}' not found.`,
        data: null
      });
      return;
    }

    // Definiraj tip za rezultat upita
    type OldestMrnRecord = {
      id: number;
      customs_declaration_number: string;
      density_at_intake: string | number | null;
      remaining_quantity_kg: string | number | null;
      remaining_quantity_liters: string | number | null;
      date_added: Date;
    };

    // Dohvati najstariji aktivni MRN zapis (FIFO - First In First Out)
    // Primjedba: MobileTankCustoms se koristi za mobilne tankove, ali trebamo dohvatiti specific_gravity
    // sa FuelIntakeRecords koja ima originalni intake specific_gravity
    // Trebat ćemo da nađemo preko customs_declaration_number
    const oldestMrnRecord = await prisma.$queryRaw<OldestMrnRecord[]>`
      SELECT
        mtc.id,
        mtc.customs_declaration_number,
        mtc.density_at_intake,
        mtc.remaining_quantity_kg,
        mtc.remaining_quantity_liters,
        mtc.date_added
      FROM "MobileTankCustoms" mtc
      WHERE mtc.mobile_tank_id = ${tank.id}
        AND mtc.remaining_quantity_kg > 0
      ORDER BY mtc.date_added ASC
      LIMIT 1
    `;

    // Ako nema aktivnog MRN-a
    if (!oldestMrnRecord || oldestMrnRecord.length === 0) {
      res.status(200).json({
        tank: tank,
        data: {
          density: null,
          mrn_number: null,
          remaining_kg: null,
          remaining_liters: null,
          date_added: null
        }
      });
      return;
    }

    const record = oldestMrnRecord[0];

    // Dohvati originalni specific_gravity sa FuelIntakeRecords preko TankFuelByCustoms
    let originalSpecificGravity = null;
    try {
      const fuelIntakeRecord = await (prisma as any).tankFuelByCustoms.findFirst({
        where: {
          customs_declaration_number: record.customs_declaration_number,
          fuel_intake_record_id: { not: null }
        },
        select: {
          fuelIntakeRecord: {
            select: {
              specific_gravity: true
            }
          }
        }
      });

      if (fuelIntakeRecord && fuelIntakeRecord.fuelIntakeRecord) {
        originalSpecificGravity = fuelIntakeRecord.fuelIntakeRecord.specific_gravity;
      }
    } catch (e) {
      console.error('Error fetching original specific_gravity:', e);
    }

    // Koristi originalni specific_gravity ako postoji, inače pad back na density_at_intake
    let density = null;
    const densityValue = originalSpecificGravity !== null ? originalSpecificGravity : record.density_at_intake;

    if (densityValue !== null && densityValue !== undefined) {
      try {
        density = Number(Number(String(densityValue)).toFixed(4));
      } catch (e) {
        console.error('Error parsing density value', e);
        density = null;
      }
    }

    // Sigurno parsiranje remaining_quantity_kg
    let remaining_kg = null;
    if (record.remaining_quantity_kg !== null && record.remaining_quantity_kg !== undefined) {
      try {
        remaining_kg = Number(Number(String(record.remaining_quantity_kg)).toFixed(3));
      } catch (e) {
        console.error('Error parsing remaining_quantity_kg', e);
        remaining_kg = null;
      }
    }

    // Sigurno parsiranje remaining_quantity_liters
    let remaining_liters = null;
    if (record.remaining_quantity_liters !== null && record.remaining_quantity_liters !== undefined) {
      try {
        remaining_liters = Number(Number(String(record.remaining_quantity_liters)).toFixed(3));
      } catch (e) {
        console.error('Error parsing remaining_quantity_liters', e);
        remaining_liters = null;
      }
    }

    res.status(200).json({
      tank: tank,
      data: {
        density: density,
        mrn_number: record.customs_declaration_number,
        remaining_kg: remaining_kg,
        remaining_liters: remaining_liters,
        date_added: record.date_added
      }
    });

  } catch (error: any) {
    console.error('[getOldestActiveMrnDensity] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({ message: 'Database error.', details: error.message });
      return;
    }
    next(error);
  }
};

// GET /api/fuel/summary - Get total fuel summary with both liters and kilograms
export const getTotalFuelSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get fixed tanks data (excluding EXCESS_FUEL_HOLDING tank with ID 4)
    const fixedTanks = await prisma.fixedStorageTanks.findMany({
      where: {
        id: { not: 4 }, // Exclude EXCESS_FUEL_HOLDING tank
        deletedAt: null // Only include non-deleted tanks
      },
      select: {
        id: true,
        tank_name: true,
        current_quantity_liters: true,
        fuel_type: true
      }
    });
    
    // Get mobile tanks data
    const mobileTanks = await prisma.fuelTank.findMany({
      select: {
        id: true,
        name: true,
        current_liters: true,
        fuel_type: true
      }
    });
    
    // Calculate fixed tanks totals
    let fixedTanksTotalLiters = 0;
    let fixedTanksTotalKg = 0;
    
    for (const tank of fixedTanks) {
      const liters = Number(tank.current_quantity_liters || 0);
      fixedTanksTotalLiters += liters;
      
      // Get customs breakdown for this tank to get accurate kg data
      try {
        const customsBreakdown = await prisma.$queryRaw<any[]>`
          SELECT 
            SUM(CAST(remaining_quantity_kg AS DECIMAL(10,3))) as total_kg
          FROM "TankFuelByCustoms" 
          WHERE fixed_tank_id = ${tank.id} 
            AND remaining_quantity_kg > 0
        `;
        
        const tankKg = customsBreakdown[0]?.total_kg || 0;
        fixedTanksTotalKg += Number(tankKg);
      } catch (error) {
        console.error(`Error getting customs data for fixed tank ${tank.id}:`, error);
        // Fallback to calculation using default density
        fixedTanksTotalKg += liters * 0.8;
      }
    }
    
    // Calculate mobile tanks totals
    let mobileTanksTotalLiters = 0;
    let mobileTanksTotalKg = 0;
    
    for (const tank of mobileTanks) {
      const liters = Number(tank.current_liters || 0);
      mobileTanksTotalLiters += liters;
      
      // Get customs breakdown for this tank to get accurate kg data
      try {
        const customsBreakdown = await prisma.$queryRaw<any[]>`
          SELECT 
            SUM(CAST(remaining_quantity_kg AS DECIMAL(10,3))) as total_kg
          FROM "MobileTankCustoms" 
          WHERE mobile_tank_id = ${tank.id} 
            AND remaining_quantity_kg > 0
        `;
        
        const tankKg = customsBreakdown[0]?.total_kg || 0;
        mobileTanksTotalKg += Number(tankKg);
      } catch (error) {
        console.error(`Error getting customs data for mobile tank ${tank.id}:`, error);
        // Fallback to calculation using default density
        mobileTanksTotalKg += liters * 0.8;
      }
    }
    
    // Calculate grand totals
    const grandTotalLiters = fixedTanksTotalLiters + mobileTanksTotalLiters;
    const grandTotalKg = fixedTanksTotalKg + mobileTanksTotalKg;
    
    res.status(200).json({
      fixedTanksTotal: fixedTanksTotalLiters,
      mobileTanksTotal: mobileTanksTotalLiters,
      grandTotal: grandTotalLiters,
      fixedTanksTotalKg: Number(fixedTanksTotalKg.toFixed(2)),
      mobileTanksTotalKg: Number(mobileTanksTotalKg.toFixed(2)),
      grandTotalKg: Number(grandTotalKg.toFixed(2))
    });
    
  } catch (error: any) {
    console.error('[getTotalFuelSummary] Error:', error);
    res.status(500).json({ 
      message: 'Greška pri dohvatu ukupnog stanja goriva.',
      details: error.message 
    });
  }
};