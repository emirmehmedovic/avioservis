import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, FixedTankActivityType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { removeFuelFromMrnRecordsByKg } from '../utils/mrnUtils'; // KG-based FIFO
import * as densityUtils from '../utils/densityUtils'; // Import density utilities
import { executeFuelOperation } from '../utils/transactionUtils';
import { Decimal } from '@prisma/client/runtime/library'; // For Prisma Decimal type
import { ExtendedTransactionClient } from '../utils/fuelConsistencyUtils'; // Import ExtendedTransactionClient
import { processExcessFuelExchange } from '../utils/excessFuelExchangeService'; // Za automatsku zamjenu viška goriva

const prisma = new PrismaClient();

/**
 * Kreira zapis o transferu goriva iz fiksnog skladišnog tanka u mobilni tanker
 * Implementira FIFO logiku za praćenje MRN zapisa, PRIORITIZIRAJUĆI KILOGRAME (KG)
 */
// Pomoćna funkcija za pravilnu obradu decimalnih brojeva u cijelom controlleru
// VAŽNO: Osigurava da se decimalni brojevi pravilno interpretiraju kao decimale, a ne tisuće
// i zadržava maksimalnu preciznost bez zaokruživanja
const parseDecimalValue = (value: any): Decimal => {
  if (value === null || value === undefined) return new Decimal(0);
  
  // Ako je već broj, samo ga vraćamo kao Decimal s punom preciznošću
  if (typeof value === 'number') {
    // Koristimo string konverziju s dovoljno decimala za maksimalnu preciznost
    return new Decimal(value.toString());
  }
  
  // Ako je string i sadrži točku, interpretiramo je ispravno
  if (typeof value === 'string' && value.includes('.')) {
    return new Decimal(value);
  }
  
  // Ako je već Decimal, vratimo ga izravno
  if (value instanceof Decimal) {
    return value;
  }
  
  // U protivnom, standardna konverzija s maksimalnom preciznošću
  return new Decimal(value.toString());
};

export const createFuelTransferToTanker = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const {
    transfer_datetime,
    source_fixed_tank_id,
    target_mobile_tank_id,
    quantity_kg, // Primary quantity
    specific_gravity, // Density for KG <-> L conversion for this batch if not MRN specific
    // notes // original notes from req.body is accessed directly later if needed
  } = req.body;

  const userId = req.user!.id;

  // --- Parameter Parsing and Basic Validation ---
  const quantity_liters = req.body.quantity_liters;
  const input_specific_gravity = req.body.specific_gravity || null;
  
  // Omogućavamo korisnicima da pošalju ili kg+specifičnu težinu ili samo litru
  if (!transfer_datetime || !source_fixed_tank_id || !target_mobile_tank_id || 
      (quantity_kg == null && quantity_liters == null)) {
    res.status(400).json({ message: 'Missing required fields: transfer_datetime, source_fixed_tank_id, target_mobile_tank_id, and either quantity_kg or quantity_liters are required.' });
    return;
  }

  const parsedSourceFixedStorageTankId = parseInt(source_fixed_tank_id, 10);
  const parsedTargetMobileTankId = parseInt(target_mobile_tank_id, 10);
  const parsedTransferDatetime = new Date(transfer_datetime);

  let parsedQuantityKg: Decimal;
  let parsedQuantityLiters: Decimal;
  let parsedSpecificGravity = new Decimal('0.8'); // Default specific gravity for Jet A-1 fuel
  let prioritizeLiters = false; // Po defaultu prioritet je na kilogramima, osim ako nisu specificirani samo litri
  
  if (quantity_kg != null) {
    // If KG is provided, it is the primary input
    parsedQuantityKg = parseDecimalValue(quantity_kg);
    
    // Ako je specificirana gustoća pri unosu, koristimo nju umjesto dohvata iz baze
    if (specific_gravity != null) {
      parsedSpecificGravity = parseDecimalValue(specific_gravity);
      logger.info(`Koristimo unesenu gustoću: ${parsedSpecificGravity} za izračun kg iz litara`);
    } else {
      // Pokušamo dohvatiti specifičnu težinu iz MRN zapisa ako postoji
      try {
        const mrnRecords = await prisma.$queryRaw<any[]>`
          SELECT
            id,
            customs_declaration_number,
            remaining_quantity_kg,
            remaining_quantity_liters,
            density_at_intake
          FROM "TankFuelByCustoms"
          WHERE fixed_tank_id = ${parsedSourceFixedStorageTankId}
            AND remaining_quantity_kg > 0
          ORDER BY date_added ASC
          LIMIT 1
        `;
        
        if (mrnRecords.length > 0) {
          const record = mrnRecords[0];
          
          // Ensure density is available
          if (!record.density_at_intake) {
            // Ako nema gustoće, izračunamo je iz kg i litara
            try {
              record.density_at_intake = record.remaining_quantity_kg.div(record.remaining_quantity_liters);
              logger.info(`Izračunata gustoća za ${record.customs_declaration_number}: ${record.density_at_intake} (bez zaokruživanja)`);
            } catch (e: any) {
              logger.error(`Greška pri izračunu gustoće za MRN ${record.customs_declaration_number}: ${e?.message || 'Unknown error'}`);
            }
          }
          
          // Koristimo density_at_intake ako postoji
          if (record.density_at_intake) {
            try {
              parsedSpecificGravity = new Decimal(String(record.density_at_intake));
              logger.info(`Koristi se MRN gustoća: ${parsedSpecificGravity} iz MRN zapisa ${record.customs_declaration_number}`);
            } catch (e: any) {
              logger.error(`Greška pri parsiranju density_at_intake: ${e?.message || 'Unknown error'}`);
            }
          } else {
            logger.warn(`Nije pronađena informacija o gustoći u MRN zapisima za tank ${parsedSourceFixedStorageTankId}, koristi se default ${parsedSpecificGravity}`);
          }
        }
      } catch (error: any) {
        logger.error('Greška pri dohvatu MRN zapisa za informacije o gustoći:', error);
      }
    }
    
    // Izračunajmo litre za konzistenciju u bazi - bez zaokruživanja decimala
    // Koristimo punu preciznost tijekom podjele
    parsedQuantityLiters = parsedQuantityKg.div(parsedSpecificGravity);
    logger.info(`KG to L konverzija: ${parsedQuantityKg} KG / ${parsedSpecificGravity} = ${parsedQuantityLiters} L (bez zaokruživanja)`);
  } else {
    // Ako imamo samo litre, koristimo default gustoću za izračun kg
    parsedQuantityLiters = parseDecimalValue(quantity_liters);
    prioritizeLiters = true; // Kad korisnik unese samo litre, prioritiziramo očuvanje litara
    
    // Ako je specificirana gustoća pri unosu, koristimo nju umjesto dohvata iz baze
    if (specific_gravity != null) {
      parsedSpecificGravity = parseDecimalValue(specific_gravity);
      logger.info(`Koristimo unesenu gustoću: ${parsedSpecificGravity} za izračun kg iz litara`);
    } else {
      // Pokušamo dohvatiti specifičnu težinu iz MRN zapisa ako postoji
      try {
        const mrnRecords = await prisma.$queryRaw<any[]>`
          SELECT
            id,
            customs_declaration_number,
            remaining_quantity_kg,
            remaining_quantity_liters,
            density_at_intake
          FROM "TankFuelByCustoms"
          WHERE fixed_tank_id = ${parsedSourceFixedStorageTankId}
            AND remaining_quantity_kg > 0
          ORDER BY date_added ASC
          LIMIT 1
        `;
        
        if (mrnRecords.length > 0) {
          const record = mrnRecords[0];
          
          // Ensure density is available
          if (!record.density_at_intake) {
            // Ako nema gustoće, izračunamo je iz kg i litara
            try {
              record.density_at_intake = record.remaining_quantity_kg.div(record.remaining_quantity_liters);
              logger.info(`Izračunata gustoća za ${record.customs_declaration_number}: ${record.density_at_intake} (bez zaokruživanja)`);
            } catch (e: any) {
              logger.error(`Greška pri izračunu gustoće za MRN ${record.customs_declaration_number}: ${e?.message || 'Unknown error'}`);
            }
          }
          
          // Koristimo density_at_intake ako postoji
          if (record.density_at_intake) {
            try {
              parsedSpecificGravity = new Decimal(String(record.density_at_intake));
              logger.info(`Koristi se MRN gustoća: ${parsedSpecificGravity} iz MRN zapisa ${record.customs_declaration_number}`);
            } catch (e: any) {
              logger.error(`Greška pri parsiranju density_at_intake: ${e?.message || 'Unknown error'}`);
            }
          } else {
            logger.warn(`Nije pronađena informacija o gustoći u MRN zapisima za tank ${parsedSourceFixedStorageTankId}, koristi se default ${parsedSpecificGravity}`);
          }
        }
      } catch (error: any) {
        logger.error('Greška pri dohvatu MRN zapisa za informacije o gustoći:', error);
      }
    }
    
    // Izračunaj kg na temelju litara koristeći definiranu gustoću
    parsedQuantityKg = parsedQuantityLiters.times(parsedSpecificGravity);
    logger.info(`L to KG konverzija: ${parsedQuantityLiters} L * ${parsedSpecificGravity} = ${parsedQuantityKg} KG (bez zaokruživanja)`);
  }

  logger.info(`Initiating transfer of ${parsedQuantityKg.toFixed(3)} KG (${parsedQuantityLiters.toFixed(3)} L) from fixed tank ${parsedSourceFixedStorageTankId} to mobile tank ${parsedTargetMobileTankId}`);

  // Definiramo strukturu za podatke o aktivnosti fiksnog tanka
  interface TankActivityData {
    fixed_tank_id: number;
    activity_type: string;
    quantity_liters: number;
    description: string;
    user_id: number | null;
  }
  
  // Varijabla za podatke o aktivnosti fiksnog tanka - inicijalno prazna
  let tankActivityData: TankActivityData | null = null;
  
  try {
    // Varijabla za rezultat automatske zamjene viška goriva - inicijalno prazan objekt
    let excessFuelExchangeResult: any = null;
    
    const result = await executeFuelOperation(
      async (tx: ExtendedTransactionClient) => { // Use ExtendedTransactionClient
        // 1. Validate Source Fixed Tank (using KG primarily)
        const sourceTank = await tx.fixedStorageTanks.findUnique({
          where: { id: parsedSourceFixedStorageTankId },
        });

        if (!sourceTank) {
          throw new Error('Source fixed tank not found.');
        }
        // Logiramo informacije o izvornom fiksnom tanku
        logger.info(`Source fixed tank ${sourceTank.tank_name || 'Unknown'} (ID: ${parsedSourceFixedStorageTankId})`);
        logger.info(`Raw current_quantity_kg value: ${String(sourceTank.current_quantity_kg)}`);
        logger.info(`Raw current_quantity_liters value: ${String(sourceTank.current_quantity_liters)}`);
        
        // Ne računamo sourceCurrentKg ovdje jer ćemo koristiti MRN zapise kao izvor istine
        
        // Dohvati točno stanje u kilogramima iz svih MRN zapisa
        // Ovo je ključna promjena - UVIJEK koristimo MRN zapise kao izvor istine za dostupno gorivo
        const mrnRecords = await tx.tankFuelByCustoms.findMany({
          where: { 
            fixed_tank_id: parsedSourceFixedStorageTankId,
            remaining_quantity_kg: { gt: 0 } // Dohvaćamo samo zapise s preostalom količinom
          }
        });
        
        // Zbroji kilograme iz svih MRN zapisa - koristeći parseDecimalValue za sigurnu konverziju
        let sourceCurrentKg = mrnRecords.reduce((sum: Decimal, record: any) => {
          return sum.plus(parseDecimalValue(record.remaining_quantity_kg || 0));
        }, new Decimal(0));
        
        // Zbroji litre iz svih MRN zapisa (moramo zbrajati i njih zbog izvještavanja)
        let sourceCurrentLiters = mrnRecords.reduce((sum: Decimal, record: any) => {
          return sum.plus(parseDecimalValue(record.remaining_quantity_liters || 0));
        }, new Decimal(0));
        
        logger.info(`Computed from MRN records: ${sourceCurrentKg.toFixed(3)} KG, ${sourceCurrentLiters.toFixed(3)} L from ${mrnRecords.length} records.`);
        
        // Ispiši detalje o MRN zapisima
        mrnRecords.forEach((record: any) => {
          logger.debug(`MRN: ${record.customs_declaration_number || 'N/A'}, KG: ${record.remaining_quantity_kg}, L: ${record.remaining_quantity_liters}`);
        });
        
        // Proširi dijagnostiku ako postoji razlika
        const storedKg = new Decimal(sourceTank.current_quantity_kg || 0);
        if (!storedKg.equals(sourceCurrentKg) && storedKg.greaterThan(0)) {
          logger.warn(`Razlika između pohranjene vrijednosti (${storedKg.toFixed(3)} KG) i zbroja MRN zapisa (${sourceCurrentKg.toFixed(3)} KG) za tank ${sourceTank.tank_name}. Koristi se zbroj MRN zapisa kao točna vrijednost.`);
          
          // Ažuriramo vrijednost u bazi da odražava stvarno stanje
          await tx.fixedStorageTanks.update({
            where: { id: parsedSourceFixedStorageTankId },
            data: { current_quantity_kg: sourceCurrentKg.toNumber() },
          });
        }
        
        // Izračunaj toleranciju za provjeru dostupnosti goriva
        // Za vrlo male razlike (manje od 1 kg ili 0.5% ukupne količine) dozvoljavamo nastavak operacije
        const absoluteDifferenceKg = parsedQuantityKg.minus(sourceCurrentKg);
        const relativeErrorKg = absoluteDifferenceKg.div(parsedQuantityKg).mul(100); // postotak
        const isWithinToleranceKg = absoluteDifferenceKg.lessThan(1) || relativeErrorKg.lessThan(0.5);
        
        // Provjeri ima li dovoljno goriva u kg prema zbroju MRN zapisa, uz toleranciju za mala odstupanja
        if (sourceCurrentKg.lessThan(parsedQuantityKg) && !isWithinToleranceKg) {
          throw new Error(`Nema dovoljno goriva u tanku ${sourceTank.tank_name}. Potrebno: ${parsedQuantityKg.toFixed(3)} KG (${parsedQuantityLiters.toFixed(3)} L), Dostupno: ${sourceCurrentKg.toFixed(3)} KG prema ${mrnRecords.length} MRN zapisa (${sourceCurrentLiters.toFixed(3)} L).`);
        } else if (sourceCurrentKg.lessThan(parsedQuantityKg)) {
          // Ako je unutar tolerancije, nastavimo uz upozorenje
          logger.warn(`Mala razlika u količini goriva u tanku ${sourceTank.tank_name}: Traženo ${parsedQuantityKg.toFixed(3)} KG, dostupno ${sourceCurrentKg.toFixed(3)} KG, razlika ${absoluteDifferenceKg.toFixed(3)} KG (${relativeErrorKg.toFixed(2)}%). Operacija se nastavlja jer je razlika unutar dopuštene tolerancije.`);
          
          // Koristimo stvarno dostupnu količinu za daljnje izračune
          parsedQuantityKg = sourceCurrentKg;
          // Proporcionalno prilagođavamo i litarsku vrijednost s maksimalnom preciznošću
          parsedQuantityLiters = parsedQuantityKg.div(parsedSpecificGravity);
          logger.info(`Prilagođena KG to L konverzija: ${parsedQuantityKg} KG / ${parsedSpecificGravity} = ${parsedQuantityLiters} L (bez zaokruživanja)`);
        }
        // Optional: Check for liter consistency, but KG is authoritative
        if (sourceCurrentLiters.lessThan(parsedQuantityLiters)) {
             logger.warn(`Moguća nekonzistentnost litara: Potrebno ${parsedQuantityLiters.toFixed(3)} L, Dostupno ${sourceCurrentLiters.toFixed(3)} L u izvornom tanku ${sourceTank.tank_name}. Nastavljam na temelju KG vrijednosti.`);
        }

        // 2. Validate Target Mobile Tank
        const targetMobileTank = await tx.fuelTank.findUnique({
          where: { id: parsedTargetMobileTankId },
        });

        if (!targetMobileTank) {
          throw new Error('Target mobile tanker not found.');
        }
        
        // Koristimo funkciju za pravilnu obradu decimalnih vrijednosti
        const targetCurrentLiters = parseDecimalValue(targetMobileTank.current_liters);
        const targetCapacityLiters = parseDecimalValue(targetMobileTank.capacity_liters);
        
        logger.info(`Target mobile tank ${targetMobileTank.name || 'Unknown'} (ID: ${targetMobileTank.id})`);
        logger.info(`Raw current_liters value: ${String(targetMobileTank.current_liters)}`);
        logger.info(`Raw capacity_liters value: ${String(targetMobileTank.capacity_liters)}`);
        logger.info(`Parsed current_liters: ${targetCurrentLiters.toString()} L`);
        logger.info(`Parsed capacity_liters: ${targetCapacityLiters.toString()} L`);
        
        logger.info(`Mobile tank capacity check: Current: ${targetCurrentLiters.toString()} L, Capacity: ${targetCapacityLiters.toString()} L, Transferring: ${parsedQuantityLiters.toString()} L`);
        
        // Provjera jesu li kapaciteti razumni brojevi
        if (targetCapacityLiters.lessThan(1) || targetCapacityLiters.greaterThan(1000000)) {
          logger.error(`Unrealistic tanker capacity detected: ${targetCapacityLiters.toString()} L. Using default 24500 L`);
          // Korigiraj na standardni kapacitet
          await tx.fuelTank.update({
            where: { id: parsedTargetMobileTankId },
            data: { capacity_liters: 24500 }
          });
          
          const availableCapacity = new Decimal(24500).minus(targetCurrentLiters);
          
          // Provjeri je li dostupni kapacitet negativan (nekonzistentni podaci)
          if (availableCapacity.lessThan(0)) {
            logger.error(`Detected negative available capacity: ${availableCapacity.toFixed(2)} L. Current: ${targetCurrentLiters.toFixed(2)} L, Capacity: 24500 L`);
            throw new Error(`Detektirana nekonzistentnost u podacima tanka. Trenutna količina (${targetCurrentLiters.toFixed(2)} L) premašuje definirani kapacitet (24500 L). Molimo kontaktirajte administratora.`);
          }
          
          if (targetCurrentLiters.plus(parsedQuantityLiters).greaterThan(24500)) {
            throw new Error(`Transfer bi premašio korigirani kapacitet mobilnog tankera (24500 L). Dostupno: ${availableCapacity.toFixed(3)} L, Prebacuje se: ${parsedQuantityLiters.toFixed(3)} L.`);
          }
        } else {
          // Računaj dostupni kapacitet
          const availableCapacity = targetCapacityLiters.minus(targetCurrentLiters);
          
          // Provjeri je li dostupni kapacitet negativan (nekonzistentni podaci)
          if (availableCapacity.lessThan(0)) {
            logger.error(`Detected negative available capacity: ${availableCapacity.toFixed(2)} L. Current: ${targetCurrentLiters.toFixed(2)} L, Capacity: ${targetCapacityLiters.toFixed(2)} L`);
            throw new Error(`Detektirana nekonzistentnost u podacima tanka. Trenutna količina (${targetCurrentLiters.toFixed(2)} L) premašuje definirani kapacitet (${targetCapacityLiters.toFixed(2)} L). Molimo kontaktirajte administratora.`);
          }
          
          if (targetCurrentLiters.plus(parsedQuantityLiters).greaterThan(targetCapacityLiters)) {
            throw new Error(`Transfer bi premašio kapacitet mobilnog tankera. Dostupno: ${availableCapacity.toFixed(3)} L, Prebacuje se: ${parsedQuantityLiters.toFixed(3)} L.`);
          }
        }
        // Add KG capacity check if targetMobileTank.capacity_kg and targetMobileTank.current_kg exist in schema
        // const targetCurrentKg = new Decimal(targetMobileTank.current_kg || 0); // Assuming current_kg exists
        // const targetCapacityKg = new Decimal(targetMobileTank.capacity_kg || 0); // Assuming capacity_kg exists
        // if (targetCapacityKg.greaterThan(0) && targetCurrentKg.plus(parsedQuantityKg).greaterThan(targetCapacityKg)) {
        //   throw new Error(`Transfer would exceed KG capacity of target mobile tanker. Available: ${targetCapacityKg.minus(targetCurrentKg).toFixed(3)} KG, Transferring: ${parsedQuantityKg.toFixed(3)} KG.`);
        // }

        // 3. FIFO MRN Deduction (KG-based)
        logger.info(`Deducting ${parsedQuantityKg.toFixed(3)} KG of fuel from fixed tank ID: ${parsedSourceFixedStorageTankId} by MRN records (KG-FIFO).`);
        const { deductionDetails } = await removeFuelFromMrnRecordsByKg(
          tx,
          parsedSourceFixedStorageTankId,
          parsedQuantityKg.toNumber(), // removeFuelFromMrnRecordsByKg expects number
          false // false = fiksni tank (nije mobilni)
        );

        // 4. Prepare MRN Breakdown for transfer
        const mrnBreakdownForMobileTank: Array<{
          mrn: string;
          quantityKg: Decimal;
          quantityLiters: Decimal;
          densityAtIntake: Decimal; // Specific density for this MRN batch
          sourceMrnRecordId: number;
        }> = [];

        let totalDeductedKgFromMrns = new Decimal(0);
        let totalDeductedLitersFromMrns = new Decimal(0);

        for (const detail of deductionDetails) {
          // Dohvati originalni TankFuelByCustoms zapis da bismo dobili točnu gustoću za taj MRN
          const originalMrnRecord = await tx.tankFuelByCustoms.findUnique({
            where: { id: detail.id },
            select: { density_at_intake: true } // Assuming density_at_intake is stored per MRN
          });

          let itemDensity: Decimal;
          if (!originalMrnRecord || !originalMrnRecord.density_at_intake) {
            // Ako gustoća nije pronađena u MRN zapisu, koristimo onu koja je prosljeđena u zahtjevu ili početnu
            logger.warn(`Gustoća nije pronađena za MRN zapis ID ${detail.id}. Koristimo ukupnu gustoću transfera ${parsedSpecificGravity.toFixed(4)} kao rezervnu vrijednost.`);
            itemDensity = parsedSpecificGravity;
          } else {
            // Koristimo stvarnu gustoću zapisanu pri unosu tog MRN-a
            itemDensity = new Decimal(String(originalMrnRecord.density_at_intake));
            logger.info(`Koristi se stvarna gustoća: ${itemDensity.toFixed(4)} za MRN: ${detail.mrn}. Originalna vrijednost iz baze: ${originalMrnRecord.density_at_intake}`);
          }
          
          // Dodatna provjera valjanosti gustoće
          if (itemDensity.equals(0) || itemDensity.lessThan(0.7) || itemDensity.greaterThan(1.0)) {
            logger.warn(`Nevalida gustoća ${itemDensity.toFixed(4)} detektirana za MRN ${detail.mrn}. Koristimo defaultnu gustoću 0.8`);
            itemDensity = new Decimal("0.8"); // Univerzalna defaultna vrijednost ako je gustoća nerazumna
          }

          // Deducted KG je ono što smo oduzeli iz baze (FIFO)
          const deductedKg = new Decimal(detail.quantityDeductedKg);
          
          let deductedLiters: Decimal;
          
          if (prioritizeLiters) {
            // Ako prioritiziramo litre, koristimo originalnu gustoću transfera za izračun
            // a ne gustoću iz MRN zapisa, kako bismo dobili točno unešenu količinu litara
            // Izračunavamo litre proporcionalno udjelu ovog MRN-a u ukupnim KG
            const proportion = deductedKg.div(parsedQuantityKg);
            deductedLiters = parsedQuantityLiters.mul(proportion).toDecimalPlaces(3);
            logger.debug(`Prioritet LITRE: Korištenje proporcionalnog izračuna litara iz ${deductedKg} kg / ${parsedQuantityKg} kg = ${proportion.toFixed(4)}. Rezultat: ${parsedQuantityLiters} L * ${proportion.toFixed(4)} = ${deductedLiters} L`);
          } else {
            // Standardni izračun litara korištenjem specifične gustoće MRN zapisa
            deductedLiters = deductedKg.div(itemDensity).toDecimalPlaces(3);
            logger.debug(`Standardni izračun: ${deductedKg} kg / ${itemDensity} = ${deductedLiters} L`);
          }

          mrnBreakdownForMobileTank.push({
            mrn: detail.mrn,
            quantityKg: deductedKg,
            quantityLiters: deductedLiters,
            densityAtIntake: itemDensity, // Store the specific density for this MRN batch
            sourceMrnRecordId: detail.id,
          });
          totalDeductedKgFromMrns = totalDeductedKgFromMrns.plus(deductedKg);
          totalDeductedLitersFromMrns = totalDeductedLitersFromMrns.plus(deductedLiters);
        }
        
        logger.debug(`MRN breakdown for mobile tank: ${JSON.stringify(mrnBreakdownForMobileTank.map(item => ({...item, quantityKg: item.quantityKg.toFixed(3), quantityLiters: item.quantityLiters.toFixed(3), densityAtIntake: item.densityAtIntake.toFixed(4)})))}`);
        logger.debug(`Total KG deducted from MRNs: ${totalDeductedKgFromMrns.toFixed(3)} KG, Total Liters: ${totalDeductedLitersFromMrns.toFixed(3)} L`);

        // Ensure the total deducted KG matches the requested KG
        if (parsedQuantityKg.minus(totalDeductedKgFromMrns).abs().greaterThan(new Decimal(0.001))) {
          throw new Error(`Mismatch in KG deduction. Requested: ${parsedQuantityKg.toFixed(3)} KG, Deducted from MRNs: ${totalDeductedKgFromMrns.toFixed(3)} KG.`);
        }

        // 5. Create FixedTankTransfers record
        const fuelTransferRecord = await tx.fixedTankTransfers.create({
          data: {
            activity_type: FixedTankActivityType.TANKER_TRANSFER_OUT,
            affected_fixed_tank_id: parsedSourceFixedStorageTankId,
            quantity_liters_transferred: totalDeductedLitersFromMrns.toNumber(), // Use actual deducted liters
            quantity_kg_transferred: totalDeductedKgFromMrns.toNumber(), // Schema should have this field, convert Decimal to number
            transfer_datetime: parsedTransferDatetime,
            notes: `Transfer to mobile tanker ID: ${parsedTargetMobileTankId}${req.body.notes ? ` - ${req.body.notes}` : ''}`,
            // specific_gravity: parsedSpecificGravity, // If schema supports storing overall transfer density
          },
        });

        // 6. Update Source Fixed Tank
        const updatedSourceTank = await tx.fixedStorageTanks.update({
          where: { id: parsedSourceFixedStorageTankId },
          data: {
            current_quantity_liters: { decrement: totalDeductedLitersFromMrns.toNumber() },
            current_quantity_kg: { decrement: totalDeductedKgFromMrns.toNumber() }, // Koristimo novo polje u bazi podataka
          },
        });

        // 7. Update Target Mobile Tank
        // Osvježi mobilni tanker s povećanom količinom goriva - bez gubitka preciznosti
        // Koristimo toString() umjesto toNumber() kako bismo sačuvali sve decimale
        const newTotalLiters = targetCurrentLiters.plus(parsedQuantityLiters);
        
        // Usporedba sa kapacitetom - provjera za potencijalni višak
        if (newTotalLiters.greaterThan(targetCapacityLiters)) {
          logger.warn(`Precizno izračunata količina goriva (${newTotalLiters.toString()} L) premašuje kapacitet (${targetCapacityLiters.toString()} L) za ${newTotalLiters.minus(targetCapacityLiters).toString()} L`);
        }
        
        const updatedTargetMobileTank = await tx.fuelTank.update({
          where: { id: parsedTargetMobileTankId },
          data: {
            current_liters: newTotalLiters,
            // Ako imamo i kg vrijednost, također ju ažuriraj s punom preciznošću
            current_kg: targetMobileTank.current_kg ? parseDecimalValue(targetMobileTank.current_kg).plus(parsedQuantityKg) : parsedQuantityKg,
          },
        });

        // 8. Create/Update MobileTankCustoms records
        for (const item of mrnBreakdownForMobileTank) {
          const existingMobileTankCustoms = await tx.mobileTankCustoms.findFirst({
            where: {
              customs_declaration_number: item.mrn,
              mobile_tank_id: parsedTargetMobileTankId,
              // Optionally, match by density if MRNs can be split with different densities in the same mobile tank
              // density_at_intake: item.densityAtIntake 
            },
          });

          if (existingMobileTankCustoms) {
            // If MRN with same density exists, update it
            await tx.mobileTankCustoms.update({
              where: { id: existingMobileTankCustoms.id },
              data: {
                remaining_quantity_liters: { increment: item.quantityLiters.toNumber() },
                remaining_quantity_kg: { increment: item.quantityKg.toNumber() }, // Shema već ima ovo polje
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new record for this MRN batch in the mobile tank
            await tx.mobileTankCustoms.create({
              data: {
                mobile_tank_id: parsedTargetMobileTankId,
                customs_declaration_number: item.mrn,
                remaining_quantity_liters: item.quantityLiters.toNumber(),
                remaining_quantity_kg: item.quantityKg.toNumber(),
                quantity_kg: item.quantityKg.toNumber(), // Dodano obavezno polje quantity_kg
                quantity_liters: item.quantityLiters.toNumber(), // Dodano obavezno polje quantity_liters
                density_at_intake: prioritizeLiters ? parsedSpecificGravity.toNumber() : item.densityAtIntake.toNumber(), // Ako prioritiziramo litre, koristimo gustoću iz transfera
                // Uklonjena polja koja ne postoje u Prisma shemi:
                // source_fixed_tank_id: parsedSourceFixedStorageTankId,
                // source_mrn_record_id: item.sourceMrnRecordId,
                date_added: new Date(),
              },
            });
          }
        }
        
        // Bilježimo informacije za kasnije logiranje aktivnosti tanka
        // Spremamo podatke u vanjsku varijablu da bude dostupna izvan transakcije
        tankActivityData = {
          fixed_tank_id: parsedSourceFixedStorageTankId,
          activity_type: 'FUEL_TRANSFER_TO_MOBILE' as FixedTankActivityType,
          quantity_liters: parsedQuantityLiters.toNumber(),
          description: `Transfer ${parsedQuantityLiters.toFixed(2)}L / ${parsedQuantityKg.toFixed(2)}kg u mobilni tank ${targetMobileTank.name}`,
          user_id: req.user?.id || null
        };
        
        // 9. Return results
        return {
          fuelTransferRecord,
          updatedSourceTank,
          updatedTargetMobileTank,
          mrnBreakdown: mrnBreakdownForMobileTank.map(item => ({
            mrn: item.mrn,
            // Uklanjamo zaokruživanje za maksimalnu preciznost podataka
            quantityKg: item.quantityKg,
            quantityLiters: item.quantityLiters,
            density: item.densityAtIntake
          })),
        };
      },
      {
        tankIds: [parsedSourceFixedStorageTankId],
        operationType: 'TRANSFER_TO_TANKER_KG', // Updated operation type for clarity
        userId: userId,
        notes: `Transfer ${parsedQuantityKg.toFixed(3)} KG (${parsedQuantityLiters.toFixed(3)} L) from fixed tank ID: ${parsedSourceFixedStorageTankId} to mobile tanker ID: ${parsedTargetMobileTankId}${req.body.notes ? ` - ${req.body.notes}` : ''}`,
        maxRetries: 3,
        requestedQuantity: parsedQuantityKg.toNumber(), // For consistency checks in executeFuelOperation
        // skipConsistencyCheck: false // Default is false, so it will run
      }
    );
    
    // Logiramo aktivnost fiksnog tanka za potrebe povijesti nakon što je transakcija završena
    // Umjesto direktnog pristupa modelu, koristimo logger za evidenciju aktivnosti
    if (tankActivityData) {
      // U stvarnoj implementaciji biste ovdje trebali koristiti pravilno definiran Prisma model, npr.
      // await prisma.fixedStorageTankActivity.create({ data: tankActivityData });
      // ili drugi odgovarajući model koji postoji u vašoj bazi podataka
      
      // Koristimo destrukturiranje za sigurniji pristup svojstvima
      const { fixed_tank_id, description } = tankActivityData;
      
      // Za sad samo logiramo aktivnost kao informaciju
      logger.info(`Aktivnost fiksnog tanka ID=${fixed_tank_id}: ${description}`, 
        { activity: JSON.stringify(tankActivityData) });
    }
    
    // Za demonstraciju, simuliramo detekciju viška goriva u mobilnom tanku nakon transfera
    // U stvarnosti, ovaj dio treba biti integriran s removeFuelFromMrnRecordsByKg za mobilni tank
    // i trebao bi se pozivati iz fuelingOperation.controller.ts, ne iz ovog kontrolera
    try {
      // Simuliramo detekciju viška litara u mobilnom tanku
      // U proizvodnom okruženju, ovo bi došlo iz MRN operacije kada se detektira višak
      const mobileId = parsedTargetMobileTankId;
      const excessLiters = 0; // Za simulaciju stavite npr. 20, ovdje je 0 pa se neće izvršiti zamjena
      
      // Postavljamo 0 da se zamjena ne dogodi automatski, za stvarno testiranje postavite npr. 20
      if (excessLiters > 0) {
        logger.info(`[DEMO] Iniciranje automatske zamjene viška goriva nakon transfera: ${excessLiters.toFixed(3)}L iz mobilnog tanka ID=${mobileId}`);
        
        // Simulirani podaci o izvoru viška - u stvarnosti bi došli iz MRN operacije
        const exchangeResult = await processExcessFuelExchange(
          mobileId,
          excessLiters,
          1, // ID MRN zapisa (demo)
          "123456", // MRN broj (demo)
          0.8 // Gustoća (demo)
        );
        
        if (exchangeResult.success) {
          logger.info(`[DEMO] Uspješna automatska zamjena viška goriva: ${exchangeResult.transferredLiters.toFixed(3)}L iz MRN ${exchangeResult.sourceMrn} u MRN ${exchangeResult.targetMrn} fiksnog tanka ID=${exchangeResult.targetFixedTankId}`);
          // Spremamo rezultat za response
          excessFuelExchangeResult = exchangeResult;
        } else {
          logger.warn(`[DEMO] Neuspješna automatska zamjena viška goriva: ${exchangeResult.error}`);
        }
      }
    } catch (exchangeError: any) {
      // Ne želimo da greška u automatskoj zamjeni utječe na osnovnu operaciju koja je već završena
      logger.error(`Greška prilikom automatske zamjene viška goriva: ${exchangeError.message}`, { stack: exchangeError.stack });
    }

    // Dodajemo rezultat automatske zamjene u response ako postoji
    const responseData: any = {
      message: 'Fuel transfer (KG-based) completed successfully.',
      data: result
    };
    
    // Ako postoji rezultat automatske zamjene viška goriva, dodajemo ga u response
    if (excessFuelExchangeResult) {
      responseData.excessFuelExchange = excessFuelExchangeResult;
    }
    
    res.status(200).json(responseData);

  } catch (error: any) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error('Error during KG-based fuel transfer to tanker:', { error: e.message, stack: e.stack });
    // Send a more generic message to the client for unexpected errors
    res.status(400).json({ message: e.message || 'An unexpected error occurred during the fuel transfer.' });
  }
};