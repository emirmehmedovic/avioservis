import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, Prisma, FixedTankActivityType, MrnTransactionType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from './activity.controller';
import { logger } from '../utils/logger';
import { executeFuelOperation } from '../utils/transactionUtils';


const prisma = new PrismaClient();

// GET /api/fuel/mrn-balances - Dohvaćanje balansa goriva za sve MRN brojeve
export const getMrnBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Dohvati sve zapise o unosu goriva koji imaju MRN broj
    const intakeRecords = await prisma.fuelIntakeRecords.findMany({
      where: {
        customs_declaration_number: {
          not: null
        }
      },
      include: {
        // Koristimo include umjesto select za puni pristup svim poljima
      }
    });
    
    // 2. Za svaki MRN broj, izračunaj balans goriva
    const mrnBalances: Record<string, { 
      totalIntake: number,
      totalUsed: number, 
      remainingFuel: number, 
      remainingFuelKg: number,      // Dodano za praćenje kg
      specificGravity: number       // Dodano za praćenje specifične gustoće
    }> = {};
    
    // Inicijaliziramo objekt s podacima o unosu goriva
    for (const record of intakeRecords) {
      if (record.customs_declaration_number) {
        // Korištenje količine u litrama i izračun kilograma
        const quantityLiters = record.quantity_liters_received || 0;
        
        // Dohvaćamo specifičnu gustoću iz zapisa ili koristimo standardnu vrijednost
        let specificDensity = 0.8; // Default vrijednost za gustoću (približno Jet A-1)
        if (typeof record.specific_gravity === 'number' && record.specific_gravity > 0) {
          specificDensity = record.specific_gravity;
        }
        
        // Izračun kg - ili direktno iz zapisa ili izračunat iz litara i gustoće
        let quantityKg = 0;
        if (record.quantity_kg_received) {
          // Pretvorimo Prisma Decimal u number
          quantityKg = typeof record.quantity_kg_received === 'object' && record.quantity_kg_received !== null ? 
                       Number(record.quantity_kg_received.toString()) : 
                       Number(record.quantity_kg_received) || 0;
        } else {
          quantityKg = quantityLiters * specificDensity;
        }
        
        mrnBalances[record.customs_declaration_number] = {
          totalIntake: quantityLiters,
          totalUsed: 0,
          remainingFuel: quantityLiters,
          remainingFuelKg: quantityKg,                 // Inicijalni kg
          specificGravity: specificDensity              // Specifična gustoća
        };
        
        console.log(`MRN ${record.customs_declaration_number} inicijalni balans: ${quantityLiters}L / ${quantityKg.toFixed(2)}kg (gustoća: ${specificDensity})`);
      }
    }
    
    // 3. Dohvati sve operacije točenja goriva koje imaju mrnBreakdown podatke
    const fuelingOperations = await prisma.fuelingOperation.findMany({
      where: {
        mrnBreakdown: {
          not: null
        }
      },
      select: {
        id: true,
        mrnBreakdown: true,
        quantity_liters: true
      }
    });
    
    // 4. Dohvati sve zapise o dreniranom gorivu koje imaju mrnBreakdown podatke
    const drainedFuel = await prisma.fuelDrainRecord.findMany({
      where: {
        mrnBreakdown: {
          not: null
        }
      },
      select: {
        id: true,
        mrnBreakdown: true,
        quantityLiters: true
      }
    });
    
    // 5. Izračunaj korišteno gorivo za svaki MRN broj
    // Operacije točenja
    for (const op of fuelingOperations) {
      if (op.mrnBreakdown) {
        try {
          const mrnData = JSON.parse(op.mrnBreakdown);
          for (const entry of mrnData) {
            if (entry.mrn && mrnBalances[entry.mrn]) {
              mrnBalances[entry.mrn].totalUsed += entry.quantity || 0;
              mrnBalances[entry.mrn].remainingFuel -= entry.quantity || 0;
            }
          }
        } catch (error) {
          console.error(`Greška pri parsiranju mrnBreakdown za operaciju ${op.id}:`, error);
        }
      }
    }
    
    // Drenirano gorivo
    for (const drain of drainedFuel) {
      if (drain.mrnBreakdown) {
        try {
          const mrnData = JSON.parse(drain.mrnBreakdown);
          for (const entry of mrnData) {
            if (entry.mrn && mrnBalances[entry.mrn]) {
              mrnBalances[entry.mrn].totalUsed += entry.quantity || 0;
              mrnBalances[entry.mrn].remainingFuel -= entry.quantity || 0;
            }
          }
        } catch (error) {
          console.error(`Greška pri parsiranju mrnBreakdown za drenirano gorivo ${drain.id}:`, error);
        }
      }
    }
    
    // 6. Vrati rezultate
    res.status(200).json(mrnBalances);
    
  } catch (error) {
    console.error('Error fetching MRN balances:', error);
    res.status(500).json({ message: 'Greška prilikom dohvaćanja balansa MRN brojeva', error: String(error) });
  }
};

// GET /api/fuel/mrn-report/:mrn - Dohvaćanje izvještaja za određeni MRN broj
export const getMrnReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mrn } = req.params;
    
    if (!mrn) {
      res.status(400).json({ message: 'MRN broj je obavezan.' });
      return;
    }

    // 1. Dohvati zapis o unosu goriva za dati MRN
    const intakeRecord = await prisma.fuelIntakeRecords.findFirst({
      where: { customs_declaration_number: mrn },
      include: {
        fixedTankTransfers: {
          include: {
            affectedFixedTank: true
          }
        },
        documents: true
      }
    });
    
    if (!intakeRecord) {
      res.status(404).json({ message: `Nije pronađen unos goriva za MRN: ${mrn}` });
      return;
    }

    // 2. Dohvati sve MrnTransactionLeg zapise povezane s ovim MRN-om
    // Prisma ne dozvoljava direktno filtriranje po mrn jer taj field ne postoji u MrnTransactionLeg
    // Moramo dohvatiti prvo customs ID-jeve za fiksne i mobilne tankove pa filtritati po njima
    const tankFuelByCustomsRecords = await prisma.tankFuelByCustoms.findMany({
      where: { customs_declaration_number: mrn },
      select: { id: true }
    });
    
    // Dohvati i mobile tank customs zapise
    const mobileTankCustomsRecords = await prisma.mobileTankCustoms.findMany({
      where: { customs_declaration_number: mrn },
      select: { id: true }
    });
    
    const tankCustomsIds = tankFuelByCustomsRecords.map(record => record.id);
    const mobileTankCustomsIds = mobileTankCustomsRecords.map(record => record.id);
    
    // Kreiraj WHERE uvjet koji će obuhvatiti i tankFuelByCustomsId i mobileTankCustomsId
    const whereCondition: any = {};
    if (tankCustomsIds.length > 0 && mobileTankCustomsIds.length > 0) {
      whereCondition.OR = [
        { tankFuelByCustomsId: { in: tankCustomsIds } },
        { mobileTankCustomsId: { in: mobileTankCustomsIds } }
      ];
    } else if (tankCustomsIds.length > 0) {
      whereCondition.tankFuelByCustomsId = { in: tankCustomsIds };
    } else if (mobileTankCustomsIds.length > 0) {
      whereCondition.mobileTankCustomsId = { in: mobileTankCustomsIds };
    } else {
      // Ako nema niti jednog ID-a, koristi nemogući uvjet da ne dohvati ništa
      whereCondition.id = -1;
    }
    
    // Dohvaćamo sve MrnTransactionLeg zapise povezane s ovim MRN-om preko tank ID-eva
    const mrnTransactionLegs = await prisma.mrnTransactionLeg.findMany({
      where: whereCondition,
      include: {
        tankFuelByCustoms: {
          include: {
            fixedTank: true
          }
        },
        mobileTankCustoms: true
      },
      orderBy: { timestamp: 'asc' }
    });
    
    // 3. Kalkuliraj sume i balans
    // Početna vrijednost je ukupan unos goriva za ovaj MRN
    const totalIntakeKg = Number(intakeRecord.quantity_kg_received) || 0;
    const totalIntakeLiters = Number(intakeRecord.quantity_liters_received) || 0;
    
    // Izračunaj ukupne odljeve i izračunaj stanje
    let totalOutflowKg = 0;
    let totalOutflowLiters = 0;
    let accumulatedLiterVariance = 0;
    let totalWeightedDensityKg = 0;
    let totalKgForDensityCalculation = 0;
    
    // Prikupi potencijalne ID-jeve povezanih FuelingOperation zapisa
    const fuelingOperationIds: number[] = [];
    
    // Dohvati sve operacije koje imaju relatedTransactionId
    logger.info(`🔍 Analiziram ${mrnTransactionLegs.length} MrnTransactionLeg zapisa za MRN: ${mrn}`);
    
    // Prvo konvertiraj sve validne relatedTransactionId vrijednosti u brojeve
    mrnTransactionLegs.forEach(leg => {
      logger.info(`🔗 Leg ID: ${leg.id}, Type: ${leg.transactionType}, relatedTransactionId: '${leg.relatedTransactionId}'`);
      
      // Poboljšana validacija - sigurnija konverzija u broj
      if (leg.relatedTransactionId !== null && leg.relatedTransactionId !== undefined) {
        try {
          const opId = parseInt(leg.relatedTransactionId);
          if (!isNaN(opId) && opId > 0) {
            fuelingOperationIds.push(opId);
            logger.info(`✅ Dodajem FuelingOperation ID: ${opId} u listu za dohvaćanje`);
          } else {
            logger.warn(`⚠️ relatedTransactionId nije validan pozitivan broj: '${leg.relatedTransactionId}'`);
          }
        } catch (err) {
          logger.warn(`⚠️ Greška pri konverziji relatedTransactionId '${leg.relatedTransactionId}' u broj`, err);
        }
      } else {
        logger.info(`❌ Nema relatedTransactionId za leg ID: ${leg.id}`);
      }
    });
    
    // NAPOMENA: Dummy operacije uklonjene jer nisu potrebne
    
    // Dohvati povezane FuelingOperation zapise ako postoje
    let fuelingOperations: any[] = [];
    if (fuelingOperationIds.length > 0) {
      logger.info(`🔍 Izvršavam Prisma upit za ${fuelingOperationIds.length} fuelingOperationIds:`, fuelingOperationIds);
      try {
        // Poboljšani upit s više uključenih relacija za potpunije podatke
        fuelingOperations = await prisma.fuelingOperation.findMany({
          where: { id: { in: fuelingOperationIds } },
          include: {
            airline: true,
            tank: true,
            documents: true,
            aircraft: true  // Dodajemo podatke o zrakoplovu
          }
        });
        
        logger.info(`✅ Rezultat Prisma upita - pronađeno ${fuelingOperations.length} fuelingOperations:`);
        fuelingOperations.forEach(op => {
          logger.info(`  - ID: ${op.id}, Aircraft: ${op.aircraft_registration || 'N/A'}, Airline: ${op.airline?.name || 'N/A'}`);
        });
        
        if (fuelingOperations.length === 0) {
          logger.warn(`⚠️ Nema pronađenih FuelingOperation zapisa iako su ID-jevi bili dostupni!`);
          // Provjeri da li operacije s tim ID-jevima uopće postoje
          const checkOps = await prisma.fuelingOperation.count({
            where: { id: { in: fuelingOperationIds } }
          });
          logger.info(`🔢 Provjera broja operacija s traženim ID-jevima: ${checkOps}`);
          
          // Dodatna provjera - dohvati par operacija direktno po ID-u za debugging
          if (fuelingOperationIds.length > 0 && checkOps === 0) {
            logger.info('🔬 Pokušavam direktno dohvatiti prvu operaciju za provjeru...');
            const testOp = await prisma.fuelingOperation.findUnique({
              where: { id: fuelingOperationIds[0] }
            });
            logger.info(`Test dohvata jedne operacije: ${testOp ? 'Uspješno' : 'Neuspješno'}`);
          }
        }
      } catch (err) {
        logger.error('❌ Greška pri dohvaćanju fuelingOperations:', err);
        // Dodajemo više informacija o grešci za dijagnostiku
        if (err instanceof Error) {
          logger.error('Detalji greške:', { 
            message: err.message,
            name: err.name,
            stack: err.stack
          });
        } else {
          logger.error('Nepoznata greška:', err);
        }
      }
    } else {
      logger.info('⚠️ Preskačem Prisma upit jer nema fuelingOperationIds');
    }

    // Kreiraj mapu ID -> { mrnBreakdown, aircraft_registration, airlineName } za brži pristup
    const fuelOpDetailsMap = new Map<number, { mrnBreakdown: string | null; aircraft_registration: string | null; airlineName: string | null }>();
    fuelingOperations.forEach(op => {
      fuelOpDetailsMap.set(op.id, {
        mrnBreakdown: op.mrnBreakdown || null,
        aircraft_registration: op.aircraft_registration || null,
        airlineName: op.airline?.name || null
      });
    });

    // Izgradi kronološki popis svih transakcija
    const transactionHistory = mrnTransactionLegs.map(leg => {
      // KG uvijek imaju prioritet kao pouzdana vrijednost
      const kgTransacted = Number(leg.kgTransacted) || 0;
      const litersTransacted = Number(leg.litersTransactedActual) || 0;
      
      // Povećavamo outflow SAMO za točenja goriva u avion (MOBILE_TO_AIRCRAFT_FUELING)
      // Interni transferi (npr. iz fiksnog u mobilni tanker) se ne računaju kao outflow
      if (leg.transactionType === MrnTransactionType.MOBILE_TO_AIRCRAFT_FUELING) {
        // Dodajemo logging za bolje razumijevanje podataka
        logger.info(`📂 MOBILE_TO_AIRCRAFT_FUELING (ID: ${leg.id}):`) 
        logger.info(`  - kgTransacted: ${kgTransacted}`)
        logger.info(`  - litersTransactedActual: ${leg.litersTransactedActual}`)
        logger.info(`  - litersTransacted: ${litersTransacted}`)
        logger.info(`  - operationalDensityUsed: ${leg.operationalDensityUsed}`)
        
        // Za točno računanje litara trebali bismo dohvatiti povezani FuelingOperation zapis
        // koji sadrži točne podatke o litrima (quantity_liters) i gustoći (specific_density)
        // Za sada ćemo koristiti samo kg vrijednosti za koje znamo da su ispravne
        
        totalOutflowKg += Math.abs(kgTransacted);
        
        // Privremeno koristimo litersTransactedActual ako postoji
        if (litersTransacted > 0) {
          totalOutflowLiters += litersTransacted;
          logger.info(`  - Za outflow koristimo litersTransacted: ${litersTransacted} L`);
        } else {
          // Ako nemamo litres, izračunamo ih iz kg i prosječne gustoće 0.78
          const procijenjeniLitri = Math.abs(kgTransacted) / 0.78;
          totalOutflowLiters += procijenjeniLitri;
          logger.info(`  - Za outflow koristimo procijenjene litre: ${procijenjeniLitri} L`);
        }
      }
      
      // Varianca u litrama
      if (leg.literVarianceForThisLeg) {
        accumulatedLiterVariance += Number(leg.literVarianceForThisLeg);
      }

      // Akumuliraj za prosječnu gustoću odljeva - koristimo SAMO transakcije točenja u avion
      if (leg.transactionType === MrnTransactionType.MOBILE_TO_AIRCRAFT_FUELING) {
        let density = 0;
        
        // Pokušaj dobiti gustoću iz operationalDensityUsed
        if (leg.operationalDensityUsed && !isNaN(Number(leg.operationalDensityUsed))) {
          density = Number(leg.operationalDensityUsed);
        }
        // Ako nemamo gustoću iz operationalDensityUsed, izračunaj iz kg i litara ako su dostupni
        else if (litersTransacted > 0 && kgTransacted > 0) {
          density = kgTransacted / litersTransacted;
        }
        
        // Koristi samo realne vrijednosti gustoće (između 0.7 i 0.9 za aviogorivo)
        if (density >= 0.7 && density <= 0.9) {
          logger.info(`  - Koristi gustoću: ${density} za izračun prosječne gustoće`);
          totalWeightedDensityKg += Math.abs(kgTransacted) * density;
          totalKgForDensityCalculation += Math.abs(kgTransacted);
        } else {
          // Ako nemamo validnu gustoću, koristi standardnu za težinu
          const standardDensity = 0.78;
          logger.info(`  - Koristi standardnu gustoću: ${standardDensity} za izračun prosječne gustoće`);
          totalWeightedDensityKg += Math.abs(kgTransacted) * standardDensity;
          totalKgForDensityCalculation += Math.abs(kgTransacted);
        }
      }
      
      // Provjeri postoji li povezani FuelingOperation i dodaj njegove detalje
      let mrnBreakdown = null;
      let aircraft_registration = null;
      let airlineName = null;

      if (leg.transactionType === MrnTransactionType.MOBILE_TO_AIRCRAFT_FUELING && leg.relatedTransactionId && !isNaN(parseInt(leg.relatedTransactionId))) {
        const fuelingOpId = parseInt(leg.relatedTransactionId);
        const details = fuelOpDetailsMap.get(fuelingOpId);
        if (details) {
          mrnBreakdown = details.mrnBreakdown;
          aircraft_registration = details.aircraft_registration;
          airlineName = details.airlineName;
        }
      }
      
      // Oblikuj objekt za povijest transakcija
      return {
        id: leg.id,
        date: leg.timestamp,
        transactionType: leg.transactionType,
        kgTransacted,
        litersTransacted,
        density: leg.operationalDensityUsed ? Number(leg.operationalDensityUsed) : null,
        customsDeclaration: leg.tankFuelByCustoms?.customs_declaration_number || null,
        mrnBreakdown, 
        aircraft_registration, // Dodaj registraciju aviona ako postoji
        airlineName, // Dodaj ime avio kompanije ako postoji
        tankInfo: leg.tankFuelByCustoms?.fixedTank ? {
          id: leg.tankFuelByCustoms.fixed_tank_id,
          name: leg.tankFuelByCustoms.fixedTank.tank_name
        } : null
      };
    });
    
    // 4. Izračunaj preostalo gorivo
    const remainingKg = totalIntakeKg - totalOutflowKg;
    const remainingLiters = totalIntakeLiters - totalOutflowLiters;
    
    // 5. Vrati kompletne podatke
    
    res.status(200).json({
      intake: intakeRecord,
      transactions: transactionHistory,
      fuelingOperations: fuelingOperations, // Lista operacija točenja goriva
      balance: {
        totalIntakeKg,
        totalIntakeLiters,
        totalOutflowKg,
        totalOutflowLiters,
        remainingKg,
        remainingLiters,
        accumulatedLiterVariance,
        averageDensity: totalKgForDensityCalculation > 0 ? totalWeightedDensityKg / totalKgForDensityCalculation : 0
      },
      isMrnClosed: remainingKg <= 0
    });
    
  } catch (error) {
    logger.error('Error fetching MRN report:', error);
    res.status(500).json({ message: 'Greška prilikom dohvaćanja MRN izvještaja', error: String(error) });
  }
};

/**
 * Generira opis transakcije na temelju tipa transakcije
 */
function getTransactionDescription(transaction: any): string {
  switch (transaction.type) {
    case 'FUEL_INTAKE':
      return 'Unos goriva iz carinske deklaracije';
    case 'FUELING_OPERATION':
      return `Točenje goriva ${transaction.operation_fueling?.airline?.name || ''} ${transaction.operation_fueling?.aircraft?.registration || ''}`;
    case 'DRAIN_OPERATION':
      return 'Drenaža goriva';
    case 'TRANSFER_TO_FIXED_TANK':
      return `Transfer u fiksni tank ${transaction.affected_fixed_tank?.name || ''}`;
    case 'TRANSFER_FROM_FIXED_TANK':
      return `Transfer iz fiksnog tanka ${transaction.affected_fixed_tank?.name || ''}`;
    case 'TRANSFER_TO_TANKER_IN':
      return `Prihvat u mobilni tanker ${transaction.affected_mobile_tank?.registration_number || ''}`;
    case 'TRANSFER_TO_TANKER_OUT':
      return `Izdavanje iz fiksnog tanka ${transaction.affected_fixed_tank?.name || ''}`;
    default:
      return `Transakcija tipa ${transaction.type}`;
  }
}

/**
 * Dobiva informacije o povezanom entitetu ovisno o tipu transakcije
 */
function getRelatedEntityInfo(transaction: any): any {
  switch (transaction.type) {
    case 'FUELING_OPERATION':
      return transaction.operation_fueling ? {
        id: transaction.operation_fueling.id,
        type: 'fueling',
        airline: transaction.operation_fueling.airline,
        aircraft: transaction.operation_fueling.aircraft
      } : null;
    case 'DRAIN_OPERATION':
      return transaction.operation_drain ? {
        id: transaction.operation_drain.id,
        type: 'drain'
      } : null;
    case 'TRANSFER_TO_FIXED_TANK':
    case 'TRANSFER_FROM_FIXED_TANK':
      return transaction.affected_fixed_tank ? {
        id: transaction.affected_fixed_tank.id,
        type: 'fixedTank',
        name: transaction.affected_fixed_tank.name
      } : null;
    case 'TRANSFER_TO_TANKER_IN':
    case 'TRANSFER_TO_TANKER_OUT':
      return transaction.affected_mobile_tank ? {
        id: transaction.affected_mobile_tank.id,
        type: 'mobileTank',
        registration: transaction.affected_mobile_tank.registration_number
      } : null;
    default:
      return null;
  }
};

/**
 * Validira format MRN broja carinske prijave
 * Standardni MRN format: 2 slova koda zemlje + 6 cifara godine i dana + 8 alfanumeričkih znakova + 1 kontrolna cifra
 * Npr. HR2305160123456C1
 * 
 * Alternativni format 1: 2 slova koda zemlje + 16 cifara (koji se koristi u nekim zemljama)
 * Npr. HR1234567899876543
 * 
 * Alternativni format 2: 2 broja + 2 slova + 12 brojeva + 1 slovo + 1 broj (format sa slike)
 * Npr. 24BA010304000120J6
 * 
 * Dozvoljava i testne/privremene MRN brojeve koji počinju sa 'TEST' ili 'UNTRACKED'
 */
function validateMRNNumber(mrn: string): boolean {
  // Provjera za testne/privremene MRN brojeve
  if (mrn.startsWith('TEST') || mrn.startsWith('UNTRACKED')) {
    return true;
  }
  
  // Standardni regex za MRN format (17 znakova)
  const standardMrnRegex = /^[A-Z]{2}\d{6}[A-Z0-9]{8}\d{1}$/;
  
  // Alternativni regex za MRN format (2 slova + 16 cifara = 18 znakova)
  const alternativeMrnRegex = /^[A-Z]{2}\d{16}$/;
  
  // Alternativni regex za MRN format sa slike (2 broja + 2 slova + 12 brojeva + 1 slovo + 1 broj = 18 znakova)
  const alternativeMrnRegex2 = /^\d{2}[A-Z]{2}\d{12}[A-Z]{1}\d{1}$/;
  
  // Provjera svih formata
  if (!standardMrnRegex.test(mrn) && !alternativeMrnRegex.test(mrn) && !alternativeMrnRegex2.test(mrn)) {
    console.log(`MRN validacija nije uspjela za: ${mrn}`); // Dodano za debugging
    return false;
  }
  
  // Dodatne provjere se mogu implementirati po potrebi
  // npr. validacija kontrolne cifre, provjera koda zemlje, itd.
  
  return true;
}

// POST /api/fuel/intake-records - Kreiranje novog zapisa o prijemu goriva
export const createFuelIntakeRecord: RequestHandler<unknown, unknown, any, unknown> = async (req, res, next): Promise<void> => {
  console.log("createFuelIntakeRecord controller invoked. Body:", req.body);
  const {
    delivery_vehicle_plate,
    delivery_vehicle_driver_name,
    intake_datetime,
    quantity_liters_received,
    quantity_kg_received,
    specific_gravity,
    fuel_type,
    fuel_category,
    refinery_name,
    supplier_name,
    delivery_note_number,
    customs_declaration_number,
    price_per_kg,
    currency,
    total_price,
    tank_distributions,
  } = req.body;

  if (
    !delivery_vehicle_plate ||
    !intake_datetime ||
    quantity_liters_received == null ||
    quantity_kg_received == null ||
    specific_gravity == null ||
    !fuel_type
  ) {
    console.log("Validation failed: Missing required fields for main record.");
    res.status(400).json({
      message:
        'Missing required fields: delivery_vehicle_plate, intake_datetime, quantity_liters_received, quantity_kg_received, specific_gravity, fuel_type are required.',
    });
    return; 
  }
  
  // Validacija MRN broja (carinske prijave) ako je unesen
  if (customs_declaration_number && !validateMRNNumber(customs_declaration_number)) {
    console.log("Validation failed: Invalid customs declaration (MRN) number format.");
    res.status(400).json({
      message: 'Neispravan format MRN broja carinske prijave.',
    });
    return;
  }

  if (!Array.isArray(tank_distributions) || tank_distributions.length === 0) {
    if (parseFloat(quantity_liters_received) > 0) {
        console.log("Validation failed: tank_distributions is missing or empty but quantity received is > 0.");
        res.status(400).json({ message: 'Tank distributions are required if quantity is received.' });
        return;
    }
  }

  let totalDistributedLiters = 0;
  if (Array.isArray(tank_distributions)) {
    for (const dist of tank_distributions) {
      if (dist.tank_id == null || dist.quantity_liters == null || parseFloat(dist.quantity_liters) <= 0) {
        console.log("Validation failed: Invalid tank distribution entry:", dist);
        res.status(400).json({ message: 'Each tank distribution must have a valid tank_id and a positive quantity_liters.' });
        return;
      }
      totalDistributedLiters += parseFloat(dist.quantity_liters);
    }
  }
  
  if (Math.abs(totalDistributedLiters - parseFloat(quantity_liters_received)) > 0.01 && parseFloat(quantity_liters_received) > 0) {
    console.log(`Validation failed: Distributed liters (${totalDistributedLiters} L) do not match received liters (${quantity_liters_received} L).`);
    res.status(400).json({
      message: `Total distributed quantity (${totalDistributedLiters.toFixed(2)} L) must match received quantity (${parseFloat(quantity_liters_received).toFixed(2)} L).`,
    });
    return;
  }

  try {
    logger.info("Starting fuel intake operation with high isolation level transaction.");
    
    // Prikupi ID-eve tankova za praćenje stanja prije i poslije operacije
    const tankIds = Array.isArray(tank_distributions) 
      ? tank_distributions.map(dist => parseInt(dist.tank_id)) 
      : [];
    
    const result = await executeFuelOperation(async (tx) => {
      logger.info("Inside transaction: Creating FuelIntakeRecords entry.");
      // Create data object with all fields
      const recordData: any = {
        delivery_vehicle_plate,
        delivery_vehicle_driver_name,
        intake_datetime: new Date(intake_datetime),
        quantity_liters_received: parseFloat(quantity_liters_received),
        quantity_kg_received: parseFloat(quantity_kg_received),
        specific_gravity: parseFloat(specific_gravity),
        fuel_type,
        fuel_category: fuel_category || 'Domaće tržište',
        refinery_name,
        supplier_name,
        delivery_note_number,
        customs_declaration_number,
        price_per_kg: price_per_kg ? parseFloat(price_per_kg) : null,
        currency: currency || null,
        total_price: total_price ? parseFloat(total_price) : null,
      };

      const newFuelIntakeRecord = await tx.fuelIntakeRecords.create({
        data: recordData,
      });
      logger.info("FuelIntakeRecords entry created, ID: " + newFuelIntakeRecord.id);

      if (Array.isArray(tank_distributions) && tank_distributions.length > 0) {
        for (const dist of tank_distributions) {
          const tankId = parseInt(dist.tank_id);
          const quantityLitersTransferred = parseFloat(dist.quantity_liters);

          console.log(`Processing distribution to tank ID: ${tankId}, Quantity: ${quantityLitersTransferred} L.`);

          const tank = await tx.fixedStorageTanks.findUnique({
            where: { id: tankId },
          });

          if (!tank) {
            console.error(`Transaction rollback: Tank with ID ${tankId} not found.`);
            throw new Error(`Tank with ID ${tankId} not found.`);
          }
          
          if (tank.fuel_type !== fuel_type) {
             console.error(`Transaction rollback: Tank ${tank.tank_name} (ID: ${tankId}) fuel type ${tank.fuel_type} does not match intake fuel type ${fuel_type}.`);
            throw new Error(`Tank ${tank.tank_name} (ID: ${tankId}) is for ${tank.fuel_type}, but intake is for ${fuel_type}.`);
          }

          const newCurrentLiters = tank.current_quantity_liters + quantityLitersTransferred;
          if (newCurrentLiters > tank.capacity_liters) {
            console.error(`Transaction rollback: Transfer to tank ID ${tankId} exceeds capacity.`);
            throw new Error(
              `Transferring ${quantityLitersTransferred} L to tank ${tank.tank_name} (ID: ${tankId}) would exceed its capacity of ${tank.capacity_liters} L. Current: ${tank.current_quantity_liters} L, Free: ${tank.capacity_liters - tank.current_quantity_liters} L.`
            );
          }
          
          console.log(`Creating transfer record for this tank`);
          // Izračunaj proporcionalnu količinu KG za ovaj tank na temelju postotka litara distribuiranih u tank
          const tankDistributionPercentage = parseFloat(dist.quantity_liters) / parseFloat(quantity_liters_received);
          const tankKg = parseFloat(quantity_kg_received) * tankDistributionPercentage;
          
          const transferRecord = await tx.fixedTankTransfers.create({
            data: {
              activity_type: FixedTankActivityType.INTAKE,
              affected_fixed_tank_id: tankId,
              quantity_liters_transferred: parseFloat(dist.quantity_liters),
              quantity_kg_transferred: tankKg, // Koristimo proporcionalni dio deklariranih KG
              transfer_datetime: new Date(intake_datetime),
              fuel_intake_record_id: newFuelIntakeRecord.id,
              notes: `Prijem goriva: ${delivery_note_number || 'Bez otpremnice'}${customs_declaration_number ? `, MRN: ${customs_declaration_number}` : ''}`,
            },
          });
          console.log(`Created transfer record for tank ID ${tankId}, quantity: ${dist.quantity_liters} L`);
          
          // Kreiraj ili ažuriraj zapis u TankFuelByCustoms tabeli za praćenje goriva po MRN
          const mrnNumber = customs_declaration_number || `UNTRACKED-INTAKE-${newFuelIntakeRecord.id}`;
          const quantityLiters = parseFloat(dist.quantity_liters);
          
          // Izračunaj proporcionalni dio KG za ovaj MRN na temelju distribucije litara
          const mrnDistributionPercentage = quantityLiters / parseFloat(quantity_liters_received);
          const quantityKg = parseFloat(quantity_kg_received) * mrnDistributionPercentage;
          
          // Izračunaj stvarnu gustoću na osnovu deklariranih litara i kilograma
          // Ovo je točnija reprezentacija prave gustoće goriva za ovaj unos
          const calculatedDensity = parseFloat(quantity_kg_received) / parseFloat(quantity_liters_received);
          
          const existingRecord = await tx.tankFuelByCustoms.findFirst({
            where: {
              fixed_tank_id: tankId,
              customs_declaration_number: mrnNumber
            }
          });

          if (existingRecord) {
            logger.info(`Ažuriranje postojećeg MRN zapisa: ${mrnNumber} za tank ID ${tankId}`);
            const updatedQuantityLiters = new Prisma.Decimal(existingRecord.quantity_liters.toString()).add(new Prisma.Decimal(quantityLiters.toString()));
            const updatedRemainingLiters = new Prisma.Decimal(existingRecord.remaining_quantity_liters.toString()).add(new Prisma.Decimal(quantityLiters.toString()));
            const updatedQuantityKg = new Prisma.Decimal(existingRecord.quantity_kg?.toString() ?? '0').add(new Prisma.Decimal(quantityKg.toString()));
            const updatedRemainingKg = new Prisma.Decimal(existingRecord.remaining_quantity_kg?.toString() ?? '0').add(new Prisma.Decimal(quantityKg.toString()));

            await tx.tankFuelByCustoms.update({
              where: {
                id: existingRecord.id
              },
              data: {
                quantity_liters: updatedQuantityLiters.toNumber(),
                remaining_quantity_liters: updatedRemainingLiters.toNumber(),
                quantity_kg: updatedQuantityKg.toNumber(),
                remaining_quantity_kg: updatedRemainingKg.toNumber(),
                updatedAt: new Date()
              }
            });
          } else {
            logger.info(`Kreiranje novog MRN zapisa: ${mrnNumber} za tank ID ${tankId}`);
            await tx.tankFuelByCustoms.create({
              data: {
                fixed_tank_id: tankId,
                customs_declaration_number: mrnNumber,
                quantity_liters: quantityLiters,
                remaining_quantity_liters: quantityLiters,
                quantity_kg: quantityKg,
                remaining_quantity_kg: quantityKg,
                density_at_intake: calculatedDensity, // Koristimo izračunatu gustoću iz deklariranih KG/L
                fuel_intake_record_id: newFuelIntakeRecord.id,
                date_added: new Date(intake_datetime),
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
          console.log(`Created customs tracking record for tank ID ${tankId}, MRN: ${mrnNumber}, quantity: ${dist.quantity_liters} L / ${quantityKg.toFixed(2)} KG, density: ${calculatedDensity.toFixed(4)}`);
          
          console.log(`Updating FixedStorageTanks current_quantity_liters for tank ID: ${tankId}.`);
          await tx.fixedStorageTanks.update({
            where: { id: tankId },
            data: { current_quantity_liters: newCurrentLiters }, 
          });
          console.log("FixedStorageTanks current_quantity_liters updated.");
        }
      }
      
      console.log("Fetching newly created record with relations.");
      const finalRecord = await tx.fuelIntakeRecords.findUnique({
          where: { id: newFuelIntakeRecord.id },
          include: {
              fixedTankTransfers: {
                include: {
                  affectedFixedTank: {
                    select: {
                      tank_name: true,
                      tank_identifier: true
                    }
                  }
                }
              },
              documents: true 
          }
      });
      logger.info("Transaction completed successfully.");
      return finalRecord;
    }, {
      tankIds,
      operationType: 'INTAKE',
      notes: `Prijem goriva: ${delivery_note_number || 'Bez otpremnice'}${customs_declaration_number ? `, MRN: ${customs_declaration_number}` : ''}`,
      userId: (req as AuthRequest).user?.id
    });

    logger.info("Sending 201 response with result.");
    res.status(201).json(result);
    return;

  } catch (error: any) {
    logger.error("Error in createFuelIntakeRecord transaction or final response:", error.message, error.stack);
    next(error);
    return;
  }
};

// GET /api/fuel/intake-records - Dobijanje liste svih zapisa o prijemu goriva
export const getAllFuelIntakeRecords: RequestHandler<unknown, unknown, unknown, any> = async (req, res, next): Promise<void> => {
  try {
    console.log('Query parameters received:', req.query);
    
    const { fuel_type, supplier_name, delivery_vehicle_plate, startDate, endDate, fuel_category, refinery_name, customs_declaration_number, currency, delivery_note_number } = req.query;
    const filters: any = {};

    if (fuel_type) filters.fuel_type = fuel_type as string;
    if (supplier_name) filters.supplier_name = supplier_name as string;
    if (delivery_vehicle_plate) filters.delivery_vehicle_plate = delivery_vehicle_plate as string;
    if (fuel_category) filters.fuel_category = fuel_category as string;
    // Debug customs_declaration_number filter
    if (customs_declaration_number) {
      console.log('Filtering by customs_declaration_number:', customs_declaration_number);
      filters.customs_declaration_number = {
        contains: customs_declaration_number as string,
        mode: 'insensitive' // Case-insensitive search
      };
    }
    
    // Debug currency filter
    if (currency) {
      console.log('Filtering by currency:', currency);
      filters.currency = {
        contains: currency as string,
        mode: 'insensitive' // Case-insensitive search
      };
    }
    if (delivery_note_number) filters.delivery_note_number = delivery_note_number as string;
    if (refinery_name) {
      filters.refinery_name = {
        contains: refinery_name as string,
        mode: 'insensitive' // Case-insensitive search
      };
    }
    if (startDate && endDate) {
      filters.intake_datetime = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
    
    console.log('Constructed filters for Prisma:', filters);

    const records = await prisma.fuelIntakeRecords.findMany({
      where: filters,
      orderBy: {
        intake_datetime: 'desc',
      },
      include: {
        documents: true,
        fixedTankTransfers: {
          include: {
            affectedFixedTank: {
              select: {
                tank_name: true,
                tank_identifier: true
              }
            }
          }
        }
      }
    });
    res.status(200).json(records);
    return;
  } catch (error: any) {
    next(error);
    return;
  }
};

// GET /api/fuel/intake-records/:id - Dobijanje detalja specifičnog zapisa
export const getFuelIntakeRecordById: RequestHandler<{ id: string }, unknown, unknown, unknown> = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`[API] getFuelIntakeRecordById: Primljen ID: ${id}`); 
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      console.log(`[API] getFuelIntakeRecordById: ID nije validan broj: ${id}`);
      res.status(400).json({ message: 'Invalid ID format' });
      return;
    }

    const record = await prisma.fuelIntakeRecords.findUnique({
      where: { id: parsedId }, 
      include: {
        documents: true,
        fixedTankTransfers: {
          include: {
            affectedFixedTank: {
              select: {
                tank_name: true,
                tank_identifier: true
              }
            }
          }
        }
      }
    });
    console.log(`[API] getFuelIntakeRecordById: Pronađen zapis:`, record);

    if (!record) {
      res.status(404).json({ message: 'Fuel intake record not found' });
      return;
    }
    res.status(200).json(record);
    return;
  } catch (error: any) {
    console.error(`[API] getFuelIntakeRecordById: Greška:`, error);
    next(error);
    return;
  }
};

// PUT /api/fuel/intake-records/:id - Ažuriranje zapisa o prijemu goriva
export const updateFuelIntakeRecord: RequestHandler<{ id: string }, unknown, any, unknown> = async (req, res, next): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: any = { ...req.body };
    
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: 'No fields provided for update.' });
      return;
    }
    
    if (updateData.quantity_liters_received !== undefined) {
      updateData.quantity_liters_received = parseFloat(updateData.quantity_liters_received);
    }
    if (updateData.quantity_kg_received !== undefined) {
      updateData.quantity_kg_received = parseFloat(updateData.quantity_kg_received);
    }
    if (updateData.specific_gravity !== undefined) {
      updateData.specific_gravity = parseFloat(updateData.specific_gravity);
    }
    if (updateData.intake_datetime !== undefined) {
        updateData.intake_datetime = new Date(updateData.intake_datetime);
    }
    // Handle fuel_category field
    if (updateData.fuel_category === undefined || updateData.fuel_category === null) {
        updateData.fuel_category = 'Domaće tržište';
    }

    const updatedRecord = await prisma.fuelIntakeRecords.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    res.status(200).json(updatedRecord);
    return;
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Fuel intake record not found for update.' });
      return;
    }
    next(error);
    return;
  }
};

// DELETE /api/fuel/intake-records/:id - Brisanje zapisa o prijemu goriva
// OPREZ: Ovo će obrisati i sve povezane FuelIntakeDocuments i FixedTankTransfers zbog `onDelete: CASCADE`
export const deleteFuelIntakeRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      res.status(400).json({ message: "Invalid ID format." });
      return;
    }
    
    const record = await prisma.fuelIntakeRecords.findUnique({
      where: { id: parsedId },
      include: { 
        fixedTankTransfers: {
          include: {
            affectedFixedTank: {
              select: {
                tank_name: true,
                tank_identifier: true
              }
            }
          }
        }, 
        documents: true 
      }
    });

    if (!record) {
      res.status(404).json({ message: 'Fuel intake record not found.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
        // First, reverse the fuel quantities in each affected fixed tank
        for (const transfer of record.fixedTankTransfers) {
            const tankId = transfer.affected_fixed_tank_id;
            const quantityToReverse = transfer.quantity_liters_transferred;
            
            console.log(`Reversing ${quantityToReverse} liters from tank ID: ${tankId}`);
            
            // Get current tank data
            const tank = await tx.fixedStorageTanks.findUnique({
                where: { id: tankId }
            });
            
            if (!tank) {
                throw new Error(`Tank with ID ${tankId} not found when trying to reverse fuel quantity.`);
            }
            
            // Eksplicitno konvertiraj sve vrijednosti u brojeve za precizne matematičke operacije
            const currentQuantityLiters = Number(tank.current_quantity_liters || 0);
            const reverseQuantity = Number(quantityToReverse || 0);
            
            // Calculate new quantity (ensuring it doesn't go below 0)
            const newQuantity = Math.max(0, currentQuantityLiters - reverseQuantity);
            
            console.log(`Tank ${tank.tank_name} (ID: ${tankId})`);
            console.log(`Trenutna količina: ${currentQuantityLiters.toFixed(3)} L`);
            console.log(`Oduzimam: ${reverseQuantity.toFixed(3)} L`); 
            console.log(`Nova količina: ${newQuantity.toFixed(3)} L`);
            
            // Update the tank's quantity
            await tx.fixedStorageTanks.update({
                where: { id: tankId },
                data: { current_quantity_liters: newQuantity }
            });
            
            console.log(`Updated tank ${tank.tank_name} (ID: ${tankId}) quantity from ${currentQuantityLiters.toFixed(3)} to ${newQuantity.toFixed(3)} liters`);
        }
        
        // Then delete the fixed tank transfers
        await tx.fixedTankTransfers.deleteMany({
            where: { fuel_intake_record_id: parsedId }
        });
        console.log(`Deleted FixedTankTransfers for record ID: ${parsedId}`);

        // Delete associated documents
        await tx.fuelIntakeDocuments.deleteMany({
            where: { fuel_intake_record_id: parsedId }
        });
        console.log(`Deleted FuelIntakeDocuments for record ID: ${parsedId}`);
        
        // Finally delete the intake record itself
        await tx.fuelIntakeRecords.delete({
            where: { id: parsedId },
        });
        console.log(`Deleted FuelIntakeRecord with ID: ${parsedId}`);
    });

    // Log the activity
    if (req.user) {
      try {
        // Create metadata for activity logging
        const metadata = {
          recordId: record.id,
          intake_datetime: record.intake_datetime,
          delivery_vehicle_plate: record.delivery_vehicle_plate,
          delivery_vehicle_driver_name: record.delivery_vehicle_driver_name,
          quantity_liters_received: record.quantity_liters_received,
          quantity_kg_received: record.quantity_kg_received,
          fuel_type: record.fuel_type,
          supplier_name: record.supplier_name,
          delivery_note_number: record.delivery_note_number,
          customs_declaration_number: record.customs_declaration_number,
          tankTransfers: record.fixedTankTransfers.map(transfer => ({
            tankName: transfer.affectedFixedTank?.tank_name || 'Nepoznat tank',
            tankIdentifier: transfer.affectedFixedTank?.tank_identifier || 'Nepoznat ID',
            quantity_liters: transfer.quantity_liters_transferred
          })),
          documentCount: record.documents.length
        };

        const description = `Korisnik ${req.user.username} je obrisao zapis o prijemu goriva ${record.quantity_liters_received.toFixed(2)} litara ${record.fuel_type} goriva od dobavljača ${record.supplier_name || 'Nepoznat dobavljač'} (Vozilo: ${record.delivery_vehicle_plate}).`;

        await logActivity(
          req.user.id,
          req.user.username,
          'DELETE_FUEL_INTAKE',
          'FuelIntakeRecord',
          record.id,
          description,
          metadata,
          req
        );
        
        console.log('Activity logged successfully for fuel intake deletion');
      } catch (activityError) {
        console.error('Error logging activity for fuel intake deletion:', activityError);
      }
    } else {
      console.error('Cannot log activity: req.user is undefined');
    }

    res.status(200).json({ message: 'Fuel intake record and associated data deleted successfully.' });
    return;
  } catch (error: any) {
    console.error(`Error deleting fuel intake record:`, error);
    if (error.code === 'P2025') {
        res.status(404).json({ message: 'Fuel intake record not found for deletion.' });
        return;
    }
    next(error);
    return;
  }
};