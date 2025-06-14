import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as z from 'zod';
import * as path from 'path';
import { logActivity } from './activity.controller';
import { AuthRequest } from '../middleware/auth';
import { Decimal } from '@prisma/client/runtime/library'; // Za precizne decimalne kalkulacije
import { logger } from '../utils/logger';
import { processExcessFuelExchange, ExcessFuelExchangeResult } from '../utils/excessFuelExchangeService'; // Import servisa za automatsku zamjenu viška goriva

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
  exd_number: z.string().max(50, 'EXD broj ne može biti duži od 50 karaktera').optional(),
  k_number: z.string().max(50, 'K broj ne može biti duži od 50 karaktera').optional(),
});

export const getAllFuelingOperations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, airlineId, destination, tankId, tip_saobracaja, currency, deliveryVoucher } = req.query;

    const whereClause: any = {};

    if (startDate) {
      whereClause.dateTime = { ...whereClause.dateTime, gte: new Date(startDate as string) };
    }
    if (endDate) {
      whereClause.dateTime = { ...whereClause.dateTime, lte: new Date(endDate as string) };
    }
    if (airlineId) {
      whereClause.airlineId = parseInt(airlineId as string);
    }
    if (destination) {
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

    const fuelingOperations = await (prisma as any).fuelingOperation.findMany({
      where: whereClause,
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
      where: { id: Number(id) },
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
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Request headers:', req.headers);
    console.log('Request method:', req.method);
    
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
      console.error('Validation error:', JSON.stringify(validationResult.error, null, 2));
      console.error('Parsed body:', JSON.stringify(parsedBody, null, 2));
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    console.log('Validation successful, parsed data:', validationResult.data);
    
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
      quantity_liters * specific_density; // Uklonjena .toFixed(2) metoda koja uzrokuje gubitak preciznosti
    
    // Log the calculated values for debugging
    console.log('Calculated values:', {
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
    
    console.log('Price and total calculations:', {
      price_per_kg,
      discount_percentage,
      providedTotalAmount,
      total_amount
    });
    
    // Check if the tank exists and has enough fuel
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { id: tankId },
    });
    
    if (!tank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    if (tank.current_liters < quantity_liters) {
      res.status(400).json({ 
        message: 'Nema dovoljno goriva u tankeru za ovu operaciju točenja' 
      });
      return;
    }
    
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
      console.error('Nema dostupnih MRN zapisa za ovaj tank! Nemožemo izvršiti FIFO otpis.');
      throw new Error('Nema dostupnih MRN zapisa za ovaj tank! Nemožemo izvršiti FIFO otpis.');
    } else {
      console.log(`Pronađeno ${mobileTankCustoms.length} MRN zapisa za FIFO otpis`);
      console.log('Prvi MRN zapis:', JSON.stringify(mobileTankCustoms[0]));
    }
    
    // Definicija proširenog tipa za MRN podatke
    interface MrnBreakdownItem {
      mrn: string;
      quantity: number;
      quantity_kg?: number;
      density_at_intake?: number;
    }
    
    // Pripremi varijablu za MRN breakdown podatke
    let mrnBreakdown: MrnBreakdownItem[] = [];
    let remainingQuantityLiters = quantity_liters;
    let remainingQuantityKg = quantity_kg; // Primarno pratimo kilograme
    const originalQuantityKg = quantity_kg; // Pamtimo originalnu vrijednost za precizno praćenje
    
    // Varijable za praćenje viška litara za automatsku zamjenu
    let excessLitersDetected = false;
    let totalExcessLiters = 0;
    let excessSourceMrnId: number | null = null;
    let excessSourceMrn: string | null = null;
    let excessSourceDensity = 0;
    
    console.log(`Potrebno oduzeti: ${quantity_kg} kg, ${quantity_liters} L`);
    
    // Implementacija FIFO principa za oduzimanje goriva po MRN brojevima - primarno po kilogramima
    if (mobileTankCustoms.length > 0) {
      // Filtriraj MRN zapise koji imaju preostalu količinu kilograma
      const updatedMobileTankCustoms = mobileTankCustoms.filter((item: any) => {
        return (
          item.remaining_quantity_kg !== null && 
          item.remaining_quantity_kg !== undefined && 
          item.remaining_quantity_kg > 0 &&
          item.remaining_quantity_liters !== null && 
          item.remaining_quantity_liters !== undefined && 
          item.remaining_quantity_liters > 0
        );
      });
      
      // Iteriraj kroz filtrirane zapise - primarni fokus na kilogramima
      for (let i = 0; i < updatedMobileTankCustoms.length && remainingQuantityKg > 0; i++) {
        const mrnRecord = updatedMobileTankCustoms[i];
        const currentMrnQuantityLiters = mrnRecord.remaining_quantity_liters || mrnRecord.quantity_liters;
        const currentMrnQuantityKg = mrnRecord.remaining_quantity_kg || mrnRecord.quantity_kg;
        
        // Izračunajmo specifičnu gustoću iz zapisa ili koristimo defaultnu
        const specificGravity = (mrnRecord.density_at_intake && mrnRecord.density_at_intake > 0) 
          ? mrnRecord.density_at_intake 
          : 0.8; // Defaultna vrijednost za Jet A1
        
        // Eksplicitna konverzija u brojeve za sigurno izračunavanje - koristimo Decimal za preciznost
        const currentMrnKg = new Decimal(currentMrnQuantityKg || 0).toNumber();
        const currentMrnLiters = new Decimal(currentMrnQuantityLiters || 0).toNumber();
        const remainingKg = new Decimal(remainingQuantityKg || 0).toNumber();
        const remainingLiters = new Decimal(remainingQuantityLiters || 0).toNumber();
        
        // Pratimo razliku između originalne količine i ukupno oduzete količine do sada
        let alreadyDeductedTotal = 0;
        mrnBreakdown.forEach((item: any) => {
          alreadyDeductedTotal += Number(item.quantity_kg || 0);
        });
        const exactRemainingToDeduct = originalQuantityKg - alreadyDeductedTotal;
        
        // Odredimo koliko kilograma možemo oduzeti iz ovog zapisa
        // Osiguramo da ukupna količina oduzimanja ne prekorači traženu količinu
        let kgToDeduct;
        
        // Logiraj stanje prije oduzimanja za dijagnostiku
        logger.debug(`Goriva oduzeto do sada: ${alreadyDeductedTotal.toFixed(3)} KG od ${originalQuantityKg.toFixed(3)} KG, preostalo za oduzeti: ${exactRemainingToDeduct.toFixed(3)} KG`);
        
        // Koristi vrijednost koju smo izračunali izravno iz mrnBreakdown za najveću preciznost
        // Ovo je ključna promjena koja osigurava točnost oduzimanja - koristimo stvarne oduzete vrijednosti
        const remainingToOriginal = exactRemainingToDeduct;
        
        if (remainingKg >= currentMrnKg || (currentMrnKg < 0.1 && remainingKg > 0)) {
          // Ako oduzimamo cijeli zapis ili je ostalo vrlo malo (manje od 0.1 kg)
          kgToDeduct = Math.min(currentMrnKg, remainingToOriginal);
          console.log(`Oduzimam ${kgToDeduct.toFixed(3)} kg (max: ${remainingToOriginal.toFixed(3)}) iz MRN zapisa ID ${mrnRecord.id}, zapis sadrži: ${currentMrnKg.toFixed(3)} kg`);
        } else {
          // Ograniči oduzimanje tako da ukupno bude točno originalQuantityKg
          kgToDeduct = Math.min(remainingKg, currentMrnKg, remainingToOriginal);
          console.log(`Oduzimam DIO MRN zapisa ID ${mrnRecord.id}: ${kgToDeduct.toFixed(3)} kg (max: ${remainingToOriginal.toFixed(3)}) od ${currentMrnKg.toFixed(3)} kg`);
        }
        
        // Nova implementacija - koristimo trenutnu gustoću za izračun litara
        // Za točenje goriva važno je koristiti trenutnu gustoću, a ne gustoću iz MRN zapisa
        // jer se faktura izdaje na osnovu trenutne gustoće
        
        // Izračunaj litre direktno iz kg koristeći trenutnu gustoću
        // specific_density je gustoća pri točenju
        const litersToDeduct = kgToDeduct / specific_density;
        
        console.log(`Izračun litara: ${kgToDeduct} kg / ${specific_density} kg/L = ${litersToDeduct} L (stari način bi dao: ${(currentMrnKg > 0 ? (kgToDeduct / currentMrnKg) * currentMrnLiters : Math.min(currentMrnLiters, remainingLiters))} L)`);

        // Detekcija viška litara kada kg padne na 0 - bitno za automatsku zamjenu
        if (kgToDeduct >= currentMrnKg && currentMrnLiters > litersToDeduct) {
          // Imamo višak litara jer smo oduzeli sve kilograme ali preostaje još litara
          const excessLiters = currentMrnLiters - litersToDeduct;
          if (excessLiters > 0.01) { // Ignoriramo vrlo male razlike (manje od 0.01L)
            excessLitersDetected = true;
            totalExcessLiters += excessLiters;
            
            // Pamtimo podatke o izvoru viška za automatsku zamjenu
            if (excessSourceMrnId === null) {
              excessSourceMrnId = mrnRecord.id;
              excessSourceMrn = mrnRecord.customs_declaration_number || null;
              excessSourceDensity = specificGravity;
            }
            
            logger.info(`[EXCESS_FUEL] Detektiran višak od ${excessLiters.toFixed(3)} L u MRN ${mrnRecord.customs_declaration_number || mrnRecord.id} kada su kg došli do 0.`);
          }
        }
        
        // Dodaj u MRN breakdown samo ako zapis ima validan MRN broj
        if (mrnRecord.customs_declaration_number) {
          mrnBreakdown.push({
            mrn: mrnRecord.customs_declaration_number,
            quantity: litersToDeduct,  // Litre
            quantity_kg: kgToDeduct,   // Kilogrami - primarna vrijednost
            density_at_intake: specificGravity
          });
          
          // Počietak provjere preciznosti - ovo je ključno
          // Izračunaj novu kumulativnu količinu i provjeri da li smo blizu tražene ukupne vrijednosti
          const totalKgDeducted = mrnBreakdown.reduce((sum: number, item: any) => sum + Number(item.quantity_kg || 0), 0);
          
          // Ako smo prešli traženu količinu (zbog greške zaokruživanja), ispravi zadnju dodanu vrijednost
          if (totalKgDeducted > originalQuantityKg && mrnBreakdown.length > 0) {
            const excess = totalKgDeducted - originalQuantityKg;
            const lastIndex = mrnBreakdown.length - 1;
            const lastEntry = mrnBreakdown[lastIndex];
            
            // Ispravi zadnju vrijednost tako da ukupna vrijednost bude točno originalQuantityKg
            if (lastEntry && typeof lastEntry.quantity_kg === 'number') {
              lastEntry.quantity_kg -= excess;
              
              // Ažuriraj kgToDeduct za kasniji izračun litara
              kgToDeduct -= excess;
              
              logger.warn(`Korekcija zadnjeg MRN zapisa: prekoračenje od ${excess.toFixed(5)} KG, novi kgToDeduct: ${lastEntry.quantity_kg.toFixed(3)} KG`);
            }
          }
          
          // Ponovno izračunaj litre na temelju ispravljene vrijednosti kilograma
          if (mrnBreakdown.length > 0) {
            const lastEntry = mrnBreakdown[mrnBreakdown.length - 1];
            if (lastEntry && typeof lastEntry.quantity_kg === 'number') {
              const correctedKgToDeduct = lastEntry.quantity_kg;
              
              // Ponovni izračun litara koristeći TRENUTNU gustoću operacije, a ne gustoću iz MRN zapisa
              // Ovo osigurava da su kilogrami i litre točno usklađeni prema trenutnoj gustoći goriva
              const correctedLitersToDeduct = correctedKgToDeduct / specific_density;
              
              console.log(`Korekcija litara: ${correctedKgToDeduct} kg / ${specific_density} kg/L = ${correctedLitersToDeduct} L`);
              
              
              lastEntry.quantity = correctedLitersToDeduct;
            }
          }
          
          console.log(`Dodajem MRN ${mrnRecord.customs_declaration_number} s količinom ${kgToDeduct.toFixed(3)} kg / ${litersToDeduct.toFixed(3)} L`);
        }
        
        // Ažuriraj količinu u MRN zapisu - direktno oduzmi potrebne kilograme i litre
        // Računamo nove vrijednosti
        const newRemainingLiters = Math.max(0, currentMrnLiters - litersToDeduct);
        const newRemainingKg = Math.max(0, currentMrnKg - kgToDeduct);
        
        // Ako je nova vrijednost vrlo mala (manje od 0.001), postavi je na 0
        // Ovo sprečava probleme s vrlo malim ostacima koji stvaraju nekonzistentnost
        const finalRemainingLiters = newRemainingLiters < 0.001 ? 0 : newRemainingLiters;
        const finalRemainingKg = newRemainingKg < 0.001 ? 0 : newRemainingKg;
        
        console.log(`MRN ${mrnRecord.customs_declaration_number || mrnRecord.id} - novo stanje:`);
        console.log(`Litre: ${currentMrnLiters.toFixed(3)} - ${litersToDeduct.toFixed(3)} = ${finalRemainingLiters.toFixed(3)}`);
        console.log(`KG: ${currentMrnKg.toFixed(3)} - ${kgToDeduct.toFixed(3)} = ${finalRemainingKg.toFixed(3)}`);
        
        await (prisma as any).mobileTankCustoms.update({
          where: { id: mrnRecord.id },
          data: { 
            remaining_quantity_liters: finalRemainingLiters,
            remaining_quantity_kg: finalRemainingKg
          }
        });
        
        // Smanjimo preostale količine
        remainingQuantityLiters = Math.max(0, remainingQuantityLiters - litersToDeduct);
        remainingQuantityKg = Math.max(0, remainingQuantityKg - kgToDeduct);
      }
      
      console.log(`Izračunati MRN breakdown za točenje po FIFO principu: ${JSON.stringify(mrnBreakdown)}`);
      
      // Ako nakon FIFO otpisa još uvijek imamo preostale kilograme za oduzeti, bacamo grešku
      if (remainingQuantityKg > 0) {
        throw new Error(`Nedovoljno goriva u MRN zapisima za operaciju točenja. Preostalo neoduzeto: ${remainingQuantityKg.toFixed(2)} kg, ${remainingQuantityLiters.toFixed(2)} L`);
      }
    } else {
      console.log('Nema MRN podataka za ovaj mobilni tank');
    }
    
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
      // Konvertiraj mrnBreakdown u JSON string za spremanje
      const mrnBreakdownJson = mrnBreakdown.length > 0 ? JSON.stringify(mrnBreakdown) : null;
      console.log(`MRN breakdown JSON za spremanje u bazu: ${mrnBreakdownJson}`);
      
      // Create the fueling operation with mrnBreakdown data
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
          usd_exchange_rate: validationResult.data.usd_exchange_rate,
          // Dodaj MRN breakdown podatke
          mrnBreakdown: mrnBreakdownJson
        },
        include: {
          airline: true,
          tank: true,
          documents: true,
        }
      });
      
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
    
    // Nakon uspješno završene transakcije, provjeri da li je detektiran višak litara
    // i inicijraj automatsku zamjenu ako ima viška
    let exchangeResult: any = null;
    if (excessLitersDetected && totalExcessLiters > 0 && tankId && excessSourceMrnId) {
      try {
        logger.info(`[EXCESS_FUEL] Iniciranje automatske zamjene viška goriva za tank ID=${tankId}: ${totalExcessLiters.toFixed(3)}L`);
        
        // Poziv servisa za automatsku zamjenu - asinhrono (ne čekamo završetak)
        processExcessFuelExchange(
          tankId, // ID mobilnog tanka 
          totalExcessLiters, // količina viška u litrama
          excessSourceMrnId, // ID MRN zapisa iz kojeg potječe višak
          excessSourceMrn || "", // MRN broj (koristimo prazan string umjesto undefined)
          excessSourceDensity // specifična gustoća goriva
        )
        .then((result: ExcessFuelExchangeResult) => {
          logger.info(`[EXCESS_FUEL] Uspješno završena automatska zamjena viška: ${JSON.stringify(result)}`);
          exchangeResult = result;
        })
        .catch((error: Error) => {
          // Greška kod automatske zamjene nije kritična za glavnu operaciju točenja
          logger.error(`[EXCESS_FUEL] Greška prilikom automatske zamjene viška goriva: ${error.message}`);
        });
        
        // Dodajemo info o iniciranoj automatskoj zamjeni u rezultat
        if (result) {
          (result as any).automaticExchangeInitiated = {
            excessLiters: totalExcessLiters,
            sourceMrnId: excessSourceMrnId,
            sourceMrn: excessSourceMrn,
            density: excessSourceDensity
          };
        }
      } catch (exchangeError) {
        // Greška kod automatske zamjene nije kritična za glavnu operaciju točenja
        logger.error(`[EXCESS_FUEL] Greška prilikom iniciranja automatske zamjene: ${(exchangeError as Error).message}`);
      }
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating fueling operation:', error);
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
      },
    });
    
    if (!existingOperation) {
      res.status(404).json({ message: 'Operacija točenja nije pronađena' });
      return;
    }
    
    // Validiraj podatke za ažuriranje
    const updateData = req.body;
    
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
      
      // Zatim izbriši operaciju (kaskadno će izbrisati i zapise dokumenata u bazi)
      await tx.fuelingOperation.delete({
        where: { id: Number(id) },
      });

      // Vrati gorivo u tank - i litre i kilograme
      const sourceTank = await tx.fuelTank.findUnique({ 
        where: { id: operationToDelete.tankId } 
      });
      
      if (sourceTank) {
        // Ensure numeric operations by explicitly converting to numbers
        const currentLiters = new Decimal(sourceTank.current_liters || 0);
        const currentKg = new Decimal(sourceTank.current_kg || 0);
        const quantityLiters = new Decimal(operationToDelete.quantity_liters || 0);
        const quantityKg = new Decimal(operationToDelete.quantity_kg || 0);

        const newLiters = currentLiters.plus(quantityLiters);
        const newKg = currentKg.plus(quantityKg);
        
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

                    const newLiters = currentLiters.plus(quantityLiters);
                    const newKg = currentKg.plus(quantityKg);
                    
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

                    const quantityKg = quantityLiters.times(specificGravity);

                    const newLiters = currentLiters.plus(quantityLiters);
                    const newKg = currentKg.plus(quantityKg);
                    
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