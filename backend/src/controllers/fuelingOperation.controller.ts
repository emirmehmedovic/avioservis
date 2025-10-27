import { Request, Response } from 'express';
import { PrismaClient, MrnTransactionType } from '@prisma/client';
import * as z from 'zod';
import * as path from 'path';
import { logActivity } from './activity.controller';
import { AuthRequest } from '../middleware/auth';
import { Decimal } from '@prisma/client/runtime/library'; // Za precizne decimalne kalkulacije
import { logger } from '../utils/logger';
// Import servisa za MRN transakcije
import { processMrnDeduction } from '../services/mrnTransaction.service';
import { performMrnCleanupIfNeeded } from '../services/mrnCleanupService';

const prisma = new PrismaClient();

// Validation schema for creating a fueling operation
// Kreiramo složeniju validacijsku shemu koja uzima u obzir valutu
const fuelingOperationSchema = z.object({
  dateTime: z.string().or(z.date()),
  aircraft_registration: z.string().min(1, 'Registracija aviona je obavezna'),
  airlineId: z.number().int().positive('ID avio kompanije mora biti pozitivan broj'),
  destination: z.string().min(1, 'Destinacija je obavezna'),
  quantity_liters: z.number().positive('Količina mora biti pozitivan broj'),
  specific_density: z.number().positive('Specifična gustoća mora biti pozitivan broj').default(0.8),
  quantity_kg: z.number().positive('Količina u kilogramima mora biti pozitivan broj').optional(),
  price_per_kg: z.number().positive('Cijena po kilogramu mora biti pozitivan broj').optional(),
  discount_percentage: z.number().min(0, 'Rabat ne može biti negativan').max(100, 'Rabat ne može biti veći od 100%').optional(),
  currency: z.enum(['BAM', 'EUR', 'USD']).optional(),
  // Poboljšana validacija za usd_exchange_rate - može biti null, string ili broj
  usd_exchange_rate: z.union([
    z.null(),
    z.string().transform(val => val === '' ? null : parseFloat(val)),
    z.number().positive('Kurs mora biti pozitivan broj')
  ]).nullable().optional(),
  total_amount: z.number().positive('Ukupan iznos mora biti pozitivan broj').optional(),
  tankId: z.number().int().positive('ID tankera mora biti pozitivan broj'),
  flight_number: z.string().optional(),
  operator_name: z.string().min(1, 'Ime operatera je obavezno'),
  notes: z.string().optional(),
  tip_saobracaja: z.string().optional(),
  delivery_note_number: z.string().optional(),
  payment_method: z.string().optional(),
  exd_number: z.string().max(50, 'EXD broj ne može biti duži od 50 karaktera').optional(),
  k_number: z.string().max(50, 'K broj ne može biti duži od 50 karaktera').optional(),
});

export const getAllFuelingOperations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, airlineId, destination, tankId, tip_saobracaja, currency, deliveryVoucher, payment_method } = req.query;

    // Debug logging
    console.log('🔍 All query parameters:', req.query);
    console.log('🔍 airlineIds from req.query:', req.query.airlineIds);
    console.log('🔍 destinations from req.query:', req.query.destinations);
    console.log('🔍 payment_method from req.query:', req.query.payment_method);
    console.log('🔍 airlineIds type:', typeof req.query.airlineIds);
    console.log('🔍 destinations type:', typeof req.query.destinations);
    console.log('🔍 payment_method type:', typeof req.query.payment_method);
    console.log('🔍 airlineIds isArray:', Array.isArray(req.query.airlineIds));
    console.log('🔍 destinations isArray:', Array.isArray(req.query.destinations));

    const whereClause: any = {};

    if (startDate) {
      const start = new Date(startDate as string);
      // Normalize to start of day regardless of provided time
      const normalizedStart = new Date(start);
      normalizedStart.setHours(0, 0, 0, 0);
      whereClause.dateTime = { ...whereClause.dateTime, gte: normalizedStart };
    }
    if (endDate) {
      const end = new Date(endDate as string);
      // Normalize to end of day regardless of provided time
      const normalizedEnd = new Date(end);
      normalizedEnd.setHours(23, 59, 59, 999);
      whereClause.dateTime = { ...whereClause.dateTime, lte: normalizedEnd };
    }
    
    // Handle airline filtering - support both single airlineId and multiple airlineIds
    // Express parses multiple parameters with same name as array or string
    if (req.query.airlineIds) {
      if (Array.isArray(req.query.airlineIds) && req.query.airlineIds.length > 0) {
        // Multiple airline IDs as array
        whereClause.airlineId = { in: req.query.airlineIds.map((id: any) => parseInt(id as string)) };
      } else if (typeof req.query.airlineIds === 'string' && req.query.airlineIds.length > 0) {
        // Single airline ID as string
        whereClause.airlineId = parseInt(req.query.airlineIds);
      }
    } else if (airlineId) {
      // Single airline ID
      whereClause.airlineId = parseInt(airlineId as string);
    }
    
    // Handle destination filtering - support both single destination and multiple destinations
    if (req.query.destinations) {
      if (Array.isArray(req.query.destinations) && req.query.destinations.length > 0) {
        // Multiple destinations as array
        whereClause.destination = { in: req.query.destinations };
      } else if (typeof req.query.destinations === 'string' && req.query.destinations.length > 0) {
        // Single destination as string
        whereClause.destination = req.query.destinations;
      }
    } else if (destination) {
      // Single destination
      whereClause.destination = { contains: destination as string, mode: 'insensitive' };
    }
    
    if (tankId) {
      whereClause.tankId = parseInt(tankId as string);
    }
    if (tip_saobracaja) {
      whereClause.tip_saobracaja = tip_saobracaja as string;
    }
    if (currency) {
      whereClause.currency = currency as string;
    }
    if (deliveryVoucher) {
      whereClause.delivery_note_number = { endsWith: deliveryVoucher as string, mode: 'insensitive' };
    }
    if (payment_method) {
      whereClause.payment_method = payment_method as string;
    }

    // Debug logging for whereClause
    console.log('🔍 Final whereClause:', JSON.stringify(whereClause, null, 2));

    const fuelingOperations = await (prisma as any).fuelingOperation.findMany({
      where: {
        ...whereClause,
        is_deleted: false // Ne uključujemo obrisane operacije
      },
      orderBy: { dateTime: 'desc' },
      include: {
        airline: true,
        tank: true,
        documents: true, // Include documents in the response
      },
    });
    
    // Parsiranje MRN breakdown podataka za sve operacije točenja
    const operationsWithParsedMrn = fuelingOperations.map((operation: any) => {
      if (operation.mrnBreakdown) {
        try {
          // Parsiraj MRN podatke
          let parsedMrnData = JSON.parse(operation.mrnBreakdown);
          
          // Provjeri da li su MRN podaci u ispravnom formatu (array)
          if (!Array.isArray(parsedMrnData)) {
            console.error(`Operation ${operation.id} - MRN data is not an array:`, parsedMrnData);
            parsedMrnData = [];
          }
          
          // Osiguraj da svaki MRN zapis ima i mrn i quantity polja
          const validMrnData = parsedMrnData.map((item: any) => {
            // Ako je objekt i ima quantity, ali nema mrn, dodaj placeholder
            if (item && typeof item === 'object' && 'quantity' in item) {
              return {
                mrn: item.mrn || 'MRN-PLACEHOLDER',
                quantity: item.quantity,
                quantity_kg: item.quantity_kg // Dodajemo quantity_kg
              };
            }
            // Ako je key-value par gdje je key MRN a value količina
            else if (item && typeof item === 'object' && Object.keys(item).length === 1) {
              const key = Object.keys(item)[0];
              return {
                mrn: key,
                quantity: item[key],
                quantity_kg: null // Pretpostavljamo da ovaj format nema kg, pa postavljamo na null
              };
            }
            // Ako je neispravan format, vrati null da ga možemo filtrirati
            return null;
          }).filter(Boolean); // Ukloni null vrijednosti
          
          console.log(`Operation ${operation.id} - Processed MRN data:`, validMrnData);
          
          // Postavi parsirane MRN podatke u response
          return {
            ...operation,
            parsedMrnBreakdown: validMrnData
          };
        } catch (e) {
          console.error(`Error parsing MRN breakdown for fueling operation ${operation.id}:`, e);
          return operation;
        }
      }
      return operation;
    });
    
    res.status(200).json(operationsWithParsedMrn);
  } catch (error) {
    console.error('Error fetching fueling operations:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju operacija točenja' });
  }
};

export const getFuelingOperationById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const fuelingOperation = await (prisma as any).fuelingOperation.findUnique({
      where: { 
        id: Number(id),
        is_deleted: false // Ne dohvaćamo obrisane operacije
      },
      include: {
        airline: true,
        tank: true,
        documents: true, // Include documents in the response
      },
    });
    
    if (!fuelingOperation) {
      res.status(404).json({ message: 'Operacija točenja nije pronađena' });
      return;
    }
    
    // Parsiranje MRN breakdown podataka ako postoje
    if (fuelingOperation.mrnBreakdown) {
      try {
        // Parsiraj MRN podatke
        let parsedMrnData = JSON.parse(fuelingOperation.mrnBreakdown);
        
        // Provjeri da li su MRN podaci u ispravnom formatu (array)
        if (!Array.isArray(parsedMrnData)) {
          console.error(`Operation ${id} - MRN data is not an array:`, parsedMrnData);
          parsedMrnData = [];
        }
        
        // Osiguraj da svaki MRN zapis ima i mrn i quantity polja
        const validMrnData = parsedMrnData.map((item: any) => {
          // Ako je objekt i ima quantity, ali nema mrn, dodaj placeholder
          if (item && typeof item === 'object' && 'quantity' in item) {
            return {
              mrn: item.mrn || 'MRN-PLACEHOLDER',
              quantity: item.quantity
            };
          }
          // Ako je key-value par gdje je key MRN a value količina
          else if (item && typeof item === 'object' && Object.keys(item).length === 1) {
            const key = Object.keys(item)[0];
            return {
              mrn: key,
              quantity: item[key]
            };
          }
          // Ako je neispravan format, vrati null da ga možemo filtrirati
          return null;
        }).filter(Boolean); // Ukloni null vrijednosti
        
        console.log(`Operation ${id} - Processed MRN data:`, validMrnData);
        
        // Postavi parsirane MRN podatke u response
        fuelingOperation.parsedMrnBreakdown = validMrnData;
      } catch (e) {
        console.error(`Error parsing MRN breakdown for fueling operation ${id}:`, e);
      }
    }
    
    // Debug informacije o usd_exchange_rate polju
    console.log(`Operation ${id} - usd_exchange_rate:`, fuelingOperation.usd_exchange_rate);
    
    res.status(200).json(fuelingOperation);
  } catch (error) {
    console.error('Error fetching fueling operation:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju operacije točenja' });
  }
};

export const createFuelingOperation = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info(`🛩️ Starting Fueling operation: AIRCRAFT_FUELING (attempt 1/4)`);
    logger.info(`📥 Request body:`, req.body);
    
    // Parse numeric fields from strings to numbers
    const parsedBody = {
      ...req.body,
      airlineId: req.body.airlineId ? parseInt(req.body.airlineId, 10) : undefined,
      tankId: req.body.tankId ? parseInt(req.body.tankId, 10) : undefined,
      quantity_liters: req.body.quantity_liters ? parseFloat(req.body.quantity_liters) : undefined,
      specific_density: req.body.specific_density ? parseFloat(req.body.specific_density) : undefined,
      quantity_kg: req.body.quantity_kg ? parseFloat(req.body.quantity_kg) : undefined,
      price_per_kg: req.body.price_per_kg ? parseFloat(req.body.price_per_kg) : undefined,
      discount_percentage: req.body.discount_percentage ? parseFloat(req.body.discount_percentage) : 0,
      // Properly handle usd_exchange_rate - parse it if it exists, otherwise null
      // For BAM currency, we always set exchange rate to null since it's the base currency
      usd_exchange_rate: req.body.currency === 'BAM' ? null : 
        (req.body.usd_exchange_rate !== undefined && req.body.usd_exchange_rate !== '' ? 
          parseFloat(req.body.usd_exchange_rate) : null),
      total_amount: req.body.total_amount ? parseFloat(req.body.total_amount) : undefined
    };
    
    const validationResult = fuelingOperationSchema.safeParse(parsedBody);
    
    if (!validationResult.success) {
      logger.error('❌ Validation error:', JSON.stringify(validationResult.error, null, 2));
      logger.error('❌ Parsed body:', JSON.stringify(parsedBody, null, 2));
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    logger.info('✅ Validation successful, parsed data:', validationResult.data);
    
    const { 
      dateTime, 
      aircraft_registration, 
      airlineId, 
      destination, 
      quantity_liters, 
      specific_density = 0.8, // Default value if not provided
      quantity_kg: providedQuantityKg, 
      price_per_kg, 
      discount_percentage = 0, // Default value if not provided
      currency, 
      total_amount: providedTotalAmount, 
      tankId, 
      flight_number, 
      operator_name, 
      notes, 
      tip_saobracaja,
      delivery_note_number
    } = validationResult.data;
    
    // Calculate quantity_kg if not provided
    // Since we've already parsed the values to numbers in parsedBody, we can use them directly
    // Ensure we have a valid quantity_kg value - koristimo punu preciznost za sve izračune
    const quantity_kg = providedQuantityKg !== null && providedQuantityKg !== undefined ? 
      providedQuantityKg : 
      new Decimal(quantity_liters).mul(new Decimal(specific_density)).toNumber(); // Koristi Decimal aritmetiku
    
    // Log the calculated values for debugging
    logger.info('🔢 Calculated values:', {
      quantity_liters,
      specific_density,
      providedQuantityKg,
      quantity_kg
    });
    
    // Calculate total_amount if price_per_kg is provided but total_amount is not
    // Since we've already parsed the values to numbers in parsedBody, we can use them directly
    let total_amount = providedTotalAmount;
    if (price_per_kg && !total_amount) {
      // Uklanjamo zaokruživanje za točniji izračun ukupnog iznosa
      total_amount = quantity_kg * price_per_kg;
    }
    
    logger.info('💰 Price and total calculations:', {
      price_per_kg,
      discount_percentage,
      providedTotalAmount,
      total_amount
    });
    // Check if the tank exists and has enough fuel
    const tank = await (prisma as any).fuelTank.findFirst({
      where: { 
        id: tankId 
      } as any, // Type assertion da izbjegnemo TS grešku
    });
    
    if (!tank) {
      logger.error(`❌ Tank ID ${tankId} not found or deleted`);
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    logger.info(`🛢️ Source mobile tank ${tank.name} (ID: ${tankId})`);
    logger.info(`🛢️ Raw current_liters value: ${tank.current_liters}`);
    logger.info(`🛢️ Raw capacity_liters value: ${tank.capacity_liters}`);
    logger.info(`🛢️ Parsed current_liters: ${tank.current_liters} L`);
    logger.info(`🛢️ Parsed capacity_liters: ${tank.capacity_liters} L`);
    logger.info(`🛢️ Mobile tank capacity check: Current: ${tank.current_liters} L, Capacity: ${tank.capacity_liters} L, Fueling: ${quantity_liters} L`);
    
    if (tank.current_liters < quantity_liters) {
      logger.error(`❌ Insufficient fuel in tank: ${tank.current_liters} L < ${quantity_liters} L required`);
      res.status(400).json({ 
        message: 'Nema dovoljno goriva u tankeru za ovu operaciju točenja' 
      });
      return;
    }
    
    logger.info(`🔍 Deducting ${quantity_kg} KG of fuel from mobile tank ID: ${tankId} by MRN records (KG-FIFO).`);
    
    // Dohvati sve MRN zapise za ovaj tank koji imaju preostalu količinu, sortirano po datumu (FIFO)
    const mobileTankCustoms = await (prisma as any).mobileTankCustoms.findMany({
      where: {
        mobile_tank_id: tankId,
        OR: [
          { remaining_quantity_liters: { gt: 0 } },
          { remaining_quantity_kg: { gt: 0 } }
        ]
      },
      orderBy: {
        date_added: 'asc'
      }
    });
    
    if (mobileTankCustoms.length === 0) {
      logger.error('❌ No available MRN records for this tank! Cannot perform FIFO deduction.');
      throw new Error('Nema dostupnih MRN zapisa za ovaj tank! Nemožemo izvršiti FIFO otpis.');
    } else {
      logger.info(`✅ Found ${mobileTankCustoms.length} MRN records for FIFO deduction`);
      mobileTankCustoms.forEach((record: any, index: number) => {
        logger.debug(`  ${index + 1}. MRN: ${record.customs_declaration_number}, Remaining: ${record.remaining_quantity_liters} L, ${record.remaining_quantity_kg} kg`);
      });
    }
    
    // Definicija proširenog tipa za MRN podatke
    interface MrnBreakdownItem {
      mrn: string;
      quantity: number;
      quantity_kg?: number;
      density_at_intake?: number;
    }
    
    logger.info(`Potrebno oduzeti: ${quantity_kg} kg, ${quantity_liters} L`);
    
    // Umjesto vlastite implementacije FIFO principa, koristit ćemo centralizirani servis processMrnDeduction
    // koji će oduzeti gorivo po MRN zapisima i kreirati odgovarajuće MrnTransactionLeg zapise
    logger.info(`🔍 Koristimo processMrnDeduction servis za oduzimanje ${quantity_kg} KG goriva iz tanka ID: ${tankId}`);
    
    // Check if the airline exists
    const airline = await (prisma as any).airline.findUnique({
      where: { id: airlineId },
    });
    
    if (!airline) {
      res.status(404).json({ message: 'Avio kompanija nije pronađena' });
      return;
    }
    
    // Process uploaded documents if any
    const documents = req.files as Express.Multer.File[];
    
    // Start a transaction to ensure all operations succeed or fail together
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Prvo kreiramo fueling operaciju bez MRN breakdown podataka
      // MRN breakdown će biti dodan kasnije nakon processMrnDeduction
      const newFuelingOperation = await tx.fuelingOperation.create({
        data: {
          dateTime: new Date(dateTime),
          aircraft_registration,
          airlineId,
          destination,
          quantity_liters,
          specific_density,
          quantity_kg,
          price_per_kg,
          discount_percentage,
          currency,
          total_amount,
          tankId,
          flight_number,
          operator_name,
          notes,
          tip_saobracaja: tip_saobracaja || null,
          delivery_note_number: delivery_note_number || null,
          payment_method: validationResult.data.payment_method || null,
          usd_exchange_rate: validationResult.data.usd_exchange_rate,
          // Inicijalno prazan mrnBreakdown - bit će ažuriran kasnije
          mrnBreakdown: null
        },
        include: {
          airline: true,
          tank: true,
          documents: true,
        }
      });
      
      // Koristi processMrnDeduction servis za oduzimanje goriva po MRN zapisima
      logger.info(`🔍 Pozivam processMrnDeduction za oduzimanje ${quantity_kg} KG goriva iz tanka ID: ${tankId}`);
      
      try {
        // Pozovi servis za oduzimanje goriva po MRN zapisima
        const deductionDetails = await processMrnDeduction(
          tx,                                // Prisma transakcijski klijent
          tankId,                            // ID izvora (mobilni tank)
          quantity_kg,                       // Količina u KG za oduzimanje
          specific_density,                  // Operativna gustoća
          true,                              // isMobileSource = true za mobilni tank
          MrnTransactionType.MOBILE_TO_AIRCRAFT_FUELING, // Tip transakcije
          String(newFuelingOperation.id)     // ID povezane operacije točenja
        );
        
        logger.info(`✅ Uspješno oduzeto gorivo po MRN zapisima:`, deductionDetails);
        
        // Kreiraj mrnBreakdown iz rezultata processMrnDeduction
        const mrnBreakdown = deductionDetails.map(item => ({
          mrn: item.mrn,
          quantity: new Decimal(item.deductedKg).dividedBy(new Decimal(specific_density)).toNumber(), // Litre
          quantity_kg: item.deductedKg.toNumber(),  // Kilogrami
          density_at_intake: specific_density       // Trenutna gustoća
        }));
        
        // Konvertiraj mrnBreakdown u JSON string za spremanje
        const mrnBreakdownJson = mrnBreakdown.length > 0 ? JSON.stringify(mrnBreakdown) : null;
        logger.info(`MRN breakdown JSON za spremanje u bazu: ${mrnBreakdownJson}`);
        
        // Ažuriraj fueling operaciju s mrnBreakdown podacima
        await tx.fuelingOperation.update({
          where: { id: newFuelingOperation.id },
          data: { mrnBreakdown: mrnBreakdownJson }
        });
      } catch (deductionError) {
        logger.error(`❌ Greška prilikom oduzimanja goriva po MRN zapisima: ${(deductionError as Error).message}`);
        throw deductionError; // Propagiraj grešku da bi se transakcija poništila
      }
      
      // Create document records if documents were uploaded
      if (documents && documents.length > 0) {
        for (const document of documents) {
          await tx.attachedDocument.create({
            data: {
              originalFilename: document.originalname,
              mimeType: document.mimetype,
              sizeBytes: document.size,
              storagePath: document.path.replace(/^public/, ''), // Remove 'public' prefix for URL access
              fuelingOperation: { connect: { id: newFuelingOperation.id } }
            }
          });
        }
      }
      
      // Update the tank's current_liters and current_kg
      await tx.fuelTank.update({
        where: { id: tankId },
        data: {
          current_liters: { decrement: quantity_liters },
          current_kg: { decrement: quantity_kg }
        }
      });
      
      // MRN Cleanup - Očisti male ostatke iz mobilnog tanka nakon fueling operacije
      logger.info('🧹 Performing MRN cleanup after fueling operation...');
      await performMrnCleanupIfNeeded(tx, tankId, 'mobile', 'AIRCRAFT_FUELING');
      
      // Fetch the updated operation with documents
      return await tx.fuelingOperation.findUnique({
        where: { id: newFuelingOperation.id },
        include: {
          airline: true,
          tank: true,
          documents: true,
        }
      });
    });
    
    
    logger.info(`✅ Completed Fueling operation: AIRCRAFT_FUELING`);
    logger.info(`🛩️ Aircraft ${validationResult.data.aircraft_registration} fueled with ${quantity_liters}L / ${quantity_kg}kg from tank ${tank.name}`);
    
    // Hook: Deduct fuel from physical cisterns if they exist
    try {
      const { deductFuelFromSubCisterns } = await import('../services/physicalSubCistern.service');
      const { Decimal } = await import('@prisma/client/runtime/library');
      
      // Find the cumulative cistern (if any)
      const cumulativeCistern = await (prisma as any).physicalCisternFuel.findFirst({
        where: { is_cumulative: true, is_active: true }
      });
      
      if (cumulativeCistern) {
        logger.info(`🔗 Physical cistern deduction hook triggered for cistern ID: ${cumulativeCistern.id}`);
        await deductFuelFromSubCisterns(
          cumulativeCistern.id,
          new Decimal(quantity_liters),
          new Decimal(quantity_kg),
          result.id
        );
      } else {
        logger.info('ℹ️ No cumulative cistern configured, skipping physical cistern deduction');
      }
    } catch (hookError) {
      // Don't fail the fueling operation if cistern deduction fails
      logger.warn('⚠️ Physical cistern deduction failed:', (hookError as Error).message);
    }
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('❌ Error creating fueling operation:', error);
    res.status(500).json({ message: 'Greška pri kreiranju operacije točenja' });
  }
};

export const getAirlines = async (req: Request, res: Response): Promise<void> => {
  try {
    const airlines = await (prisma as any).airline.findMany({
      orderBy: { name: 'asc' },
    });
    
    res.status(200).json(airlines);
  } catch (error) {
    console.error('Error fetching airlines:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju avio kompanija' });
  }
};

// PUT /api/fuel/fueling-operations/:id - Ažuriranje zapisa o točenju
export const updateFuelingOperation = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Provjeri postoji li operacija
    const existingOperation = await (prisma as any).fuelingOperation.findUnique({
      where: { id: Number(id) },
      include: {
        documents: true,
        airline: true,
        tank: true,
      },
    });
    
    if (!existingOperation) {
      res.status(404).json({ message: 'Operacija točenja nije pronađena' });
      return;
    }
    
    // Provjeri da li su poslani fajlovi
    const files = req.files as Express.Multer.File[];
    const hasFiles = files && files.length > 0;
    
    // Validiraj podatke za ažuriranje
    const updateData = req.body;
    
    // Ako se mijenja price_per_kg ili quantity_kg, automatski računaj total_amount
    if (updateData.price_per_kg !== undefined || updateData.quantity_kg !== undefined) {
      const newPricePerKg = updateData.price_per_kg !== undefined ? updateData.price_per_kg : existingOperation.price_per_kg;
      const newQuantityKg = updateData.quantity_kg !== undefined ? updateData.quantity_kg : existingOperation.quantity_kg;
      
      if (newPricePerKg && newQuantityKg) {
        // Računaj total_amount bez rabata
        let newTotalAmount = newPricePerKg * newQuantityKg;
        
        // Ako postoji rabat, primijeni ga
        const discountPercentage = updateData.discount_percentage !== undefined ? updateData.discount_percentage : existingOperation.discount_percentage;
        if (discountPercentage && discountPercentage > 0) {
          const discountAmount = newTotalAmount * (discountPercentage / 100);
          newTotalAmount = newTotalAmount - discountAmount;
        }
        
        updateData.total_amount = newTotalAmount;
      }
    }
    
    // Ako postoje fajlovi, dodaj ih
    if (hasFiles) {
      const uploadedDocuments = [];
      
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const storagePath = `private_uploads/fueling_documents/${fileName}`;
        const fullPath = path.join(__dirname, '../../', storagePath);
        
        // Kreiraj direktorij ako ne postoji
        const fs = await import('fs').then(m => m.default);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Spremi fajl - koristi file.path ako je disk storage, ili file.buffer ako je memory storage
        if (file.path) {
          // Disk storage - kopiraj fajl
          fs.copyFileSync(file.path, fullPath);
          // Obriši privremeni fajl
          fs.unlinkSync(file.path);
        } else if (file.buffer) {
          // Memory storage - spremi buffer
          fs.writeFileSync(fullPath, file.buffer);
        } else {
          console.error('File has neither path nor buffer:', file);
          continue;
        }
        
        // Kreiraj zapis u bazi
        const document = await prisma.attachedDocument.create({
          data: {
            fuelingOperationId: Number(id),
            originalFilename: file.originalname,
            storagePath: storagePath,
            sizeBytes: file.size,
            mimeType: file.mimetype,
          },
        });
        
        uploadedDocuments.push(document);
      }
      
      console.log(`Uploaded ${uploadedDocuments.length} documents for operation ${id}`);
    }
    
    // Ažuriraj operaciju
    const updatedOperation = await (prisma as any).fuelingOperation.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        airline: true,
        tank: true,
        documents: true,
      },
    });
    
    res.status(200).json(updatedOperation);
  } catch (error) {
    console.error('Error updating fueling operation:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju operacije točenja' });
  }
};

// DELETE /api/fuel/fueling-operations/:id - Brisanje zapisa o točenju
export const deleteFuelingOperation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Provjeri postoji li operacija
    const operationToDelete = await (prisma as any).fuelingOperation.findUnique({
      where: { id: Number(id) },
      include: {
        documents: true,
        airline: true,
        tank: true,
      },
    });
    
    if (!operationToDelete) {
      res.status(404).json({ message: 'Operacija točenja nije pronađena' });
      return;
    }
    
    // Izbriši operaciju i sve povezane dokumente
    await (prisma as any).$transaction(async (tx: any) => {
      // Prvo izbriši dokumente ako postoje
      if (operationToDelete.documents && operationToDelete.documents.length > 0) {
        // Izbriši fizičke datoteke
        for (const doc of operationToDelete.documents) {
          try {
            const fs = await import('fs').then(m => m.default);
            // Construct the full system path to the file for deletion
            const fullPathToDelete = path.join(__dirname, '../../public', doc.storagePath);
            if (fs.existsSync(fullPathToDelete)) {
              fs.unlinkSync(fullPathToDelete);
              console.log(`Deleted document file: ${fullPathToDelete}`);
            }
          } catch (fileError) {
            console.error(`Error deleting document file ${doc.storagePath}:`, fileError);
            // Nastavi s brisanjem operacije čak i ako brisanje datoteke ne uspije
          }
        }
      }
      
      // Soft delete operaciju - postavi is_deleted na true umjesto brisanja
      await tx.fuelingOperation.update({
        where: { id: Number(id) },
        data: { is_deleted: true }
      });

      // Vrati gorivo u tank - i litre i kilograme
      const sourceTank = await tx.fuelTank.findFirst({ 
        where: { 
          id: operationToDelete.tankId,
          is_deleted: false // Ne dohvaćamo obrisane cisterne
        } as any // Type assertion da izbjegnemo TS grešku
      });
      
      if (sourceTank) {
        // Ensure numeric operations by explicitly converting to numbers
        const currentLiters = new Decimal(sourceTank.current_liters || 0);
        const currentKg = new Decimal(sourceTank.current_kg || 0);
        const quantityLiters = new Decimal(operationToDelete.quantity_liters || 0);
        const quantityKg = new Decimal(operationToDelete.quantity_kg || 0);

        const newLiters = currentLiters.add(quantityLiters);
        const newKg = currentKg.add(quantityKg);
        
        console.log(`Trenutno stanje: ${currentLiters} L, ${currentKg} kg`);
        console.log(`Dodajem: ${quantityLiters} L, ${quantityKg} kg`);
        console.log(`Novo stanje će biti: ${newLiters} L, ${newKg} kg`);
        
        await tx.fuelTank.update({
          where: { id: operationToDelete.tankId },
          data: { 
            current_liters: newLiters,
            current_kg: newKg
          },
        });
        
        console.log(`Vraćeno u tank: ${quantityLiters} L, ${quantityKg} kg`);
        
        // Vrati gorivo u originalne MRN zapise
        if (operationToDelete.mrnBreakdown) {
          try {
            const mrnDetails = JSON.parse(operationToDelete.mrnBreakdown);
            console.log('Vraćanje goriva u MRN zapise:', mrnDetails);
            
            if (Array.isArray(mrnDetails)) {
              for (const detail of mrnDetails) {
                if (!detail.mrn || !detail.quantity) {
                  console.warn('Nepotpuni MRN podaci u zapisu:', detail);
                  continue;
                }
                
                // Pronađi originalni MRN zapis u mobileTankCustoms (za mobilne tankove)
                const mrnRecord = await tx.mobileTankCustoms.findFirst({
                  where: { 
                    customs_declaration_number: detail.mrn,
                    mobile_tank_id: operationToDelete.tankId
                  }
                });
                
                if (mrnRecord) {
                  // Vrati gorivo u MRN zapis - prioritiziraj kilograme
                  // Provjeri imamo li informaciju o kilogramima u detaljima
                  if (detail.quantity_kg) {
                    // Eksplicitno konvertiraj sve vrijednosti u brojeve
                    const currentLiters = new Decimal(mrnRecord.remaining_quantity_liters || 0);
                    const currentKg = new Decimal(mrnRecord.remaining_quantity_kg || 0);
                    const quantityLiters = new Decimal(detail.quantity || 0);
                    const quantityKg = new Decimal(detail.quantity_kg || 0);

                    const newLiters = currentLiters.add(quantityLiters);
                    const newKg = currentKg.add(quantityKg);
                    
                    console.log(`MRN ${detail.mrn} - Trenutno: ${currentLiters} L, ${currentKg} kg`);
                    console.log(`MRN ${detail.mrn} - Dodajem: ${quantityLiters} L, ${quantityKg} kg`);
                    console.log(`MRN ${detail.mrn} - Novo: ${newLiters} L, ${newKg} kg`);
                    
                    // Vratiti i litre i kilograme
                    const updatedRecord = await tx.mobileTankCustoms.update({
                      where: { id: mrnRecord.id },
                      data: { 
                        remaining_quantity_liters: newLiters,
                        remaining_quantity_kg: newKg,
                        updatedAt: new Date()
                      }
                    });
                    console.log(`Vraćeno ${quantityKg} kg / ${quantityLiters} L u MRN zapis ${detail.mrn}, novo stanje: ${updatedRecord.remaining_quantity_kg} kg / ${updatedRecord.remaining_quantity_liters} L`);
                  } else {
                    // Ako nemamo informaciju o kilogramima, izračunaj ih iz litara i specifične gustoće
                    // Eksplicitno konvertiraj sve vrijednosti u brojeve
                    const currentLiters = new Decimal(mrnRecord.remaining_quantity_liters || 0);
                    const currentKg = new Decimal(mrnRecord.remaining_quantity_kg || 0);
                    const quantityLiters = new Decimal(detail.quantity || 0);
                    const specificGravity = new Decimal(detail.density_at_intake || mrnRecord.density_at_intake || 0.8);

                    const quantityKg = quantityLiters.mul(specificGravity);

                    const newLiters = currentLiters.add(quantityLiters);
                    const newKg = currentKg.add(quantityKg);
                    
                    console.log(`MRN ${detail.mrn} - Trenutno: ${currentLiters} L, ${currentKg} kg`);
                    console.log(`MRN ${detail.mrn} - Dodajem: ${quantityLiters} L, ${quantityKg.toFixed(3)} kg (specifična gustoća: ${specificGravity})`);
                    console.log(`MRN ${detail.mrn} - Novo: ${newLiters} L, ${newKg.toFixed(3)} kg`);
                    
                    const updatedRecord = await tx.mobileTankCustoms.update({
                      where: { id: mrnRecord.id },
                      data: { 
                        remaining_quantity_liters: newLiters,
                        remaining_quantity_kg: newKg,
                        updatedAt: new Date()
                      }
                    });
                    console.log(`Vraćeno ${quantityKg.toFixed(3)} kg / ${quantityLiters} L u MRN zapis ${detail.mrn}, novo stanje: ${updatedRecord.remaining_quantity_kg} kg / ${updatedRecord.remaining_quantity_liters} L`);
                  }
                } else {
                  console.warn(`MRN zapis ${detail.mrn} nije pronađen za tank ${operationToDelete.tankId}`);
                }
              }
            } else {
              console.warn('MRN breakdown nije u ispravnom formatu (nije array):', mrnDetails);
            }
          } catch (err) {
            console.error('Greška pri vraćanju goriva u MRN zapise:', err);
          }
        } else {
          console.log('Nema MRN breakdown podataka za vraćanje goriva u MRN zapise');
        }
      } else {
        console.warn(`Source FuelTank with ID ${operationToDelete.tankId} not found when trying to revert quantity for deleted FuelingOperation ID ${id}.`);
      }
    });
    
    // Log the activity
    console.log('Attempting to log activity, req.user:', req.user);
    
    if (req.user) {
      try {
        const metadata = {
          operationId: operationToDelete.id,
          dateTime: operationToDelete.dateTime,
          aircraft_registration: operationToDelete.aircraft_registration,
          airline: operationToDelete.airline?.name,
          destination: operationToDelete.destination,
          quantity_liters: operationToDelete.quantity_liters,
          tank: operationToDelete.tank?.name || `ID: ${operationToDelete.tankId}`,
          returnedFuel: true
        };

        const description = `Korisnik ${req.user.username} je obrisao operaciju točenja ${operationToDelete.quantity_liters.toFixed(2)} litara goriva za ${operationToDelete.airline?.name || 'nepoznatu kompaniju'} (${operationToDelete.aircraft_registration || 'nepoznata registracija'}) i vratio gorivo u cisternu ${operationToDelete.tank?.name || `ID: ${operationToDelete.tankId}`}.`;

        console.log('Activity logging details:', {
          userId: req.user.id,
          username: req.user.username,
          actionType: 'DELETE_FUELING_OPERATION',
          resourceType: 'FuelingOperation',
          resourceId: operationToDelete.id,
          description: description,
        });

        await logActivity(
          req.user.id,
          req.user.username,
          'DELETE_FUELING_OPERATION',
          'FuelingOperation',
          operationToDelete.id,
          description,
          metadata,
          req
        );
        
        console.log('Activity logged successfully');
      } catch (activityError) {
        console.error('Error logging activity:', activityError);
      }
    } else {
      console.error('Cannot log activity: req.user is undefined');
    }
    
    res.status(200).json({ message: 'Operacija točenja uspješno izbrisana' });
  } catch (error) {
    console.error('Error deleting fueling operation:', error);
    res.status(500).json({ message: 'Greška pri brisanju operacije točenja' });
  }
}; 