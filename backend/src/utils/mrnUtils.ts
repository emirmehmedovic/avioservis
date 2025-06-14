/**
 * Utility funkcije za rad s MRN zapisima (TankFuelByCustoms)
 * Implementira sigurne operacije za dodavanje i ažuriranje MRN zapisa
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { processExcessFuelExchange } from './excessFuelExchangeService';

const prisma = new PrismaClient();

/**
 * Interfejs za podatke potrebne za upsert MRN zapisa
 */
interface MrnRecordData {
  tankId: number;
  mrnNumber: string;
  quantityLiters: number;
  quantityKg: number;
  specificGravity: number;  // Dodano polje za specifičnu gustoću
  fuelIntakeRecordId?: number;
  dateAdded?: Date;
}

/**
 * Upsert MRN zapisa - dodaje novi ili ažurira postojeći zapis
 * Koristi transakcijski klijent za izvršavanje unutar postojeće transakcije
 * 
 * @param tx - Prisma transakcijski klijent
 * @param data - Podaci za MRN zapis
 * @returns Promise koji se razrješava s kreiranim ili ažuriranim zapisom
 */
export async function upsertMrnRecord(
  tx: any,
  data: MrnRecordData
): Promise<any> {
  const { tankId, mrnNumber, quantityLiters, quantityKg, specificGravity, fuelIntakeRecordId, dateAdded = new Date() } = data;
  
  // Log specificGravity vrijednost za debugging
  logger.debug(`upsertMrnRecord: MRN=${mrnNumber}, specificGravity=${specificGravity}`);
  
  try {
    // Provjeri postoji li već zapis s istim MRN brojem i tank ID-em
    const existingRecord = await tx.tankFuelByCustoms.findFirst({
      where: {
        fixed_tank_id: tankId,
        customs_declaration_number: mrnNumber
      }
    });
    
    if (existingRecord) {
      logger.info(`Ažuriranje postojećeg MRN zapisa: ${mrnNumber} za tank ID ${tankId}`);
      
      // Ažuriraj postojeći zapis
      return await tx.tankFuelByCustoms.update({
        where: {
          id: existingRecord.id
        },
        data: {
          quantity_liters: existingRecord.quantity_liters + quantityLiters,
          remaining_quantity_liters: existingRecord.remaining_quantity_liters + quantityLiters,
          quantity_kg: existingRecord.quantity_kg + quantityKg,
          remaining_quantity_kg: existingRecord.remaining_quantity_kg + quantityKg,
          updatedAt: new Date()
        }
      });
    } else {
      logger.info(`Kreiranje novog MRN zapisa: ${mrnNumber} za tank ID ${tankId}`);
      
      // Kreiraj novi zapis
      return await tx.tankFuelByCustoms.create({
        data: {
          fixed_tank_id: tankId,
          customs_declaration_number: mrnNumber,
          quantity_liters: quantityLiters,
          remaining_quantity_liters: quantityLiters,
          quantity_kg: quantityKg,
          remaining_quantity_kg: quantityKg,
          density_at_intake: specificGravity, // Dodano polje za specifičnu gustoću
          fuel_intake_record_id: fuelIntakeRecordId,
          date_added: dateAdded,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    logger.error(`Greška prilikom upsert MRN zapisa: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Sigurno smanjenje količine goriva u MRN zapisima po FIFO principu
 * 
 * @param tx - Prisma transakcijski klijent
 * @param tankId - ID tanka iz kojeg se uzima gorivo
 * @param quantityToRemoveKg - Količina goriva koja se uzima (u kilogramima)
 * @returns Promise koji se razrješava s objektom koji sadrži ažurirane MRN zapise, podatke o oduzimanju i informacije o evidentiranom rezervnom gorivu
 */
export async function removeFuelFromMrnRecordsByKg(
  tx: any,
  tankId: number,
  quantityToRemoveKg: number,
  isMobileTank: boolean = false, // Dodani parametar za označavanje tipa tanka
  mobileId?: number // ID mobilnog tanka za slučaj automatske zamjene
): Promise<{ 
  updatedRecords: any[], 
  deductionDetails: Array<{ 
    id: number, 
    mrn: string, 
    originalQuantityKg: number, 
    newQuantityKg: number, 
    quantityDeductedKg: number, 
    quantityDeductedLiters: number,
    excessLitersToReserve?: number // Višak litara koji je prebačen u rezervu
  }>,
  reserveFuel?: { // Informacije o kreiranom rezervnom gorivu, ako postoji
    totalExcessLiters: number, // Ukupna količina viška litara prebačena u rezervu
    recordCount: number, // Broj kreiranih zapisa rezervnog goriva
    exchangeResults?: Array<any> // Rezultati automatskih zamjena viška goriva
  }
}> {
  try {
    const mrnRecords = await tx.tankFuelByCustoms.findMany({
      where: {
        fixed_tank_id: tankId,
        remaining_quantity_kg: {
          gt: 0
        }
      },
      orderBy: {
        date_added: 'asc'
      },
      include: {
        fuelIntakeRecord: true // Uključujemo da bismo dobili gustinu
      }
    });

    let remainingQuantityToRemoveKg = quantityToRemoveKg;
    const updatedRecords: any[] = [];
    let totalExcessLiters = 0;
    let reserveFuelRecordCount = 0;
    
    const deductionDetails: Array<{ 
      id: number, 
      mrn: string, 
      originalQuantityKg: number, 
      newQuantityKg: number, 
      quantityDeductedKg: number, 
      quantityDeductedLiters: number,
      excessLitersToReserve?: number // Višak litara koji je prebačen u rezervu
    }> = [];

    for (const record of mrnRecords) {
      if (remainingQuantityToRemoveKg <= 0.001) break; // Tolerancija za izbjegavanje problema sa zaokruživanjem

      // Eksplicitna konverzija u brojeve za sve vrijednosti
      const originalQuantityKg = Number(record.remaining_quantity_kg);
      const originalQuantityLiters = Number(record.remaining_quantity_liters);
      
      // Dodajemo poseban slučaj: ako je preostalo manje od 0.1 kg, a potrebno nam je više,
      // jednostavno uzimamo cijeli ostatak u zapisu
      let quantityToRemoveFromRecordKg;
      if (remainingQuantityToRemoveKg >= originalQuantityKg || 
          (originalQuantityKg < 0.1 && remainingQuantityToRemoveKg > 0)) {
        // Ako oduzimamo cijeli zapis ili ako je u zapisu ostalo vrlo malo (manje od 0.1 kg)
        quantityToRemoveFromRecordKg = originalQuantityKg;
        console.log(`Oduzimam CIJELI MRN zapis ID ${record.id}, ostatak: ${originalQuantityKg.toFixed(3)} kg`);
      } else {
        quantityToRemoveFromRecordKg = Math.min(originalQuantityKg, remainingQuantityToRemoveKg);
        console.log(`Oduzimam DIO MRN zapisa ID ${record.id}: ${quantityToRemoveFromRecordKg.toFixed(3)} od ${originalQuantityKg.toFixed(3)} kg`);
      }

      const density = Number(record.fuelIntakeRecord?.specific_gravity || 0.8);
      if (!density || density === 0) {
        throw new Error(`Gustina za MRN zapis ID ${record.id} nije pronađena ili je nula.`);
      }

      // Računamo litre proporcionalno, koristeći omjer umjesto direktnog dijeljenja
      // Ovo osigurava konzistentnost između kg i litara
      const quantityToRemoveFromRecordLiters = 
        (quantityToRemoveFromRecordKg / originalQuantityKg) * originalQuantityLiters;
      
      console.log(`MRN ${record.customs_declaration_number || record.id}`);
      console.log(`Početno stanje: ${originalQuantityKg.toFixed(3)} kg / ${originalQuantityLiters.toFixed(3)} L`);
      console.log(`Oduzimam: ${quantityToRemoveFromRecordKg.toFixed(3)} kg / ${quantityToRemoveFromRecordLiters.toFixed(3)} L`);
      
      // Ako oduzimamo sve ili gotovo sve, postavimo na 0 umjesto da imamo vrlo male ostatke
      const newKg = quantityToRemoveFromRecordKg >= originalQuantityKg * 0.9999 ? 
        0 : originalQuantityKg - quantityToRemoveFromRecordKg;
      
      // Ova varijabla će biti korištena za stvarno smanjenje litara u MRN zapisu
      let newLiters = quantityToRemoveFromRecordKg >= originalQuantityKg * 0.9999 ?
        0 : originalQuantityLiters - quantityToRemoveFromRecordLiters;
      
      // Ovo je mjesto za detekciju viška/manjka litara
      // Kad se kg smanjuju na nulu, no litre nisu nula zbog gustoće goriva
      let excessLiters = 0;
      
      if (newKg === 0 && originalQuantityLiters > quantityToRemoveFromRecordLiters) {
        // Imamo višak litara koji bi normalno ostao u MRN zapisu, ali želimo ga prebaciti u rezervu
        excessLiters = originalQuantityLiters - quantityToRemoveFromRecordLiters;
        console.log(`Detektiran višak ${excessLiters.toFixed(3)} L nakon što su kg dostigli 0. Prebacujem u rezervu.`);
        
        // Potpuno praznim litre u MRN zapisu jer ćemo višak prebaciti u rezervu
        newLiters = 0;
        
        // Za mobilne tankove - automatska zamjena viška s fiksnim tankom
        if (isMobileTank && mobileId) {
          logger.info(`Detektiran višak u mobilnom tanku ID=${mobileId}. Iniciram automatsku zamjenu ${excessLiters.toFixed(3)}L.`);
          // Ovdje ne kreiramo zapis o rezervnom gorivu jer će to biti odrađeno u procesu zamjene
          // Bilježimo samo informaciju o višku za kasnije procesiranje izvan transakcije
        } else {
          // Standardni slučaj - višak u fiksnom tanku samo bilježimo kao rezervu
          // Kreiraj zapis o rezervnom gorivu
          await tx.tankReserveFuel.create({
            data: {
              tank_id: tankId,
              tank_type: isMobileTank ? 'mobile' : 'fixed',
              source_mrn: record.customs_declaration_number || 'unknown',
              source_mrn_id: record.id,
              quantity_liters: excessLiters,
              is_excess: true, // true znači višak litara
              notes: `Automatski detektiran višak litara nakon što su kg dostigli 0 u MRN zapisu ${record.customs_declaration_number || record.id}`
            }
          });
          
          logger.info(`Kreiran zapis rezervnog goriva: ${excessLiters.toFixed(3)} L za tank ID ${tankId} (${isMobileTank ? 'mobilni' : 'fiksni'}) iz MRN ${record.customs_declaration_number || record.id}.`);
        }
      }
      
      console.log(`Novo stanje: ${newKg.toFixed(3)} kg / ${newLiters.toFixed(3)} L${excessLiters > 0 ? ` (${excessLiters.toFixed(3)} L prebačeno u rezervu)` : ''}`);

      const updatedRecord = await tx.tankFuelByCustoms.update({
        where: {
          id: record.id
        },
        data: {
          remaining_quantity_kg: newKg,
          remaining_quantity_liters: newLiters,
          updatedAt: new Date()
        }
      });

      // Dodajemo informaciju o eventualnom višku litara
      const detailObj: {
        id: number,
        mrn: string,
        originalQuantityKg: number,
        newQuantityKg: number,
        quantityDeductedKg: number,
        quantityDeductedLiters: number,
        excessLitersToReserve?: number
      } = {
        id: record.id,
        mrn: record.customs_declaration_number,
        originalQuantityKg: originalQuantityKg,
        newQuantityKg: updatedRecord.remaining_quantity_kg,
        quantityDeductedKg: quantityToRemoveFromRecordKg,
        quantityDeductedLiters: quantityToRemoveFromRecordLiters
      };
      
      if (excessLiters > 0) {
        detailObj.excessLitersToReserve = excessLiters;
        totalExcessLiters += excessLiters;
        reserveFuelRecordCount++;
      }
      
      deductionDetails.push(detailObj);

      updatedRecords.push(updatedRecord);
      remainingQuantityToRemoveKg -= quantityToRemoveFromRecordKg;
    }

    if (remainingQuantityToRemoveKg > 0) {
        logger.warn(`Nije bilo dovoljno goriva u MRN zapisima za tank ID ${tankId}. Preostalo za oduzimanje: ${remainingQuantityToRemoveKg.toFixed(2)} kg`);
        // Ovdje možete odlučiti hoćete li baciti grešku ili ne, ovisno o poslovnoj logici
        // throw new Error(`Nije bilo dovoljno goriva u MRN zapisima. Nedostaje ${remainingQuantityToRemoveKg.toFixed(2)} kg.`);
    }

    // Dodajemo informacije o rezervnom gorivu u odgovor ako postoji
    const result: {
      updatedRecords: any[],
      deductionDetails: Array<any>,
      reserveFuel?: {
        totalExcessLiters: number,
        recordCount: number,
        exchangeResults?: Array<any>
      }
    } = { updatedRecords, deductionDetails };
    
    if (totalExcessLiters > 0) {
      result.reserveFuel = {
        totalExcessLiters,
        recordCount: reserveFuelRecordCount
      };
      
      // Ako imamo višak u mobilnom tanku, inicirati automatsku zamjenu izvan transakcije
      // Napomena: ovo radimo izvan transakcije jer želimo izvršiti zamjenu samo ako je oduzimanje
      // goriva uspješno dovršeno. Ovi procesi su logički odvojeni i ne moraju biti atomski
      if (isMobileTank && mobileId && totalExcessLiters > 0) {
        // Detalji koji će biti obrađeni nakon završetka ove transakcije
        logger.info(`Završena transakcija oduzimanja, iniciram automatsku zamjenu ${totalExcessLiters.toFixed(3)}L viška iz mobilnog tanka ID=${mobileId}`);
        
        // Pripremamo polje za spremanje rezultata zamjene
        result.reserveFuel.exchangeResults = [];
        
        // Za svaki MRN zapis koji ima višak, iniciraj proces zamjene
        for (const detail of deductionDetails.filter(d => d.excessLitersToReserve && d.excessLitersToReserve > 0)) {
          // Dohvatimo specifičnu gustoću za izvorni MRN
          const sourceMrnRecord = await tx.tankFuelByCustoms.findUnique({
            where: { id: detail.id }
          });
          
          const density = sourceMrnRecord?.density_at_intake || 0.8; // Default ako nije dostupno
          
          // Pripremamo podatke za automatsku zamjenu nakon završetka trenutne transakcije
          result.reserveFuel.exchangeResults.push({
            mobileId,
            excessLiters: detail.excessLitersToReserve,
            sourceMrnId: detail.id,
            sourceMrn: detail.mrn,
            density
          });
        }
      }
      
      logger.info(`Ukupno prebačeno u rezervu: ${totalExcessLiters.toFixed(3)} L za tank ID ${tankId} iz ${reserveFuelRecordCount} MRN zapisa.`);
    }
    
    return result;

  } catch (error) {
    logger.error(`Greška prilikom FIFO oduzimanja KG goriva iz MRN zapisa: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Stara funkcija ostaje za sada, radi kompatibilnosti, ali se može preimenovati ili obrisati kasnije
export async function removeFuelFromMrnRecords(
  tx: any,
  tankId: number,
  quantityToRemove: number
): Promise<{ 
  updatedRecords: any[], 
  deductionDetails: Array<{ 
    id: number, 
    mrn: string, 
    originalQuantity: number, 
    newQuantity: number, 
    quantityDeducted: number 
  }> 
}>  {
  try {
    // Prvo dohvatimo sve MRN zapise za tank radi debugginga
    const allMrnRecords = await tx.tankFuelByCustoms.findMany({
      where: {
        fixed_tank_id: tankId
      },
      orderBy: {
        date_added: 'asc'
      }
    });
    
    logger.debug(`MRN stanje za tank ID ${tankId} prije FIFO oduzimanja: ${JSON.stringify(allMrnRecords.map((r: any) => ({ 
      id: r.id, 
      mrn: r.customs_declaration_number, 
      preostalo: r.remaining_quantity_liters 
    })))}`);
    
    // Dohvati MRN zapise sortirane po datumu (FIFO) koji imaju preostalu količinu
    const mrnRecords = await tx.tankFuelByCustoms.findMany({
      where: {
        fixed_tank_id: tankId,
        remaining_quantity_liters: {
          gt: 0
        }
      },
      orderBy: {
        date_added: 'asc'
      }
    });
    
    logger.debug(`Pronađeno ${mrnRecords.length} MRN zapisa s preostalom količinom > 0 za tank ID ${tankId}: ${JSON.stringify(mrnRecords.map((r: any) => ({ 
      id: r.id, 
      mrn: r.customs_declaration_number, 
      preostalo: r.remaining_quantity_liters,
      typeOfPreostalo: typeof r.remaining_quantity_liters 
    })))}`);
    
    // Dodajmo još jedan upit za MRN zapise bez filtriranja po remaining_quantity_liters samo da provjerimo
    const mrnRecordsByDateOnly = await tx.tankFuelByCustoms.findMany({
      where: {
        fixed_tank_id: tankId
      },
      orderBy: {
        date_added: 'asc'
      },
      select: {
        id: true,
        customs_declaration_number: true,
        remaining_quantity_liters: true
      }
    });
    
    logger.debug(`ID 14 zapis detaljnije: ${JSON.stringify(mrnRecordsByDateOnly.filter((r: any) => r.id === 14))}`);
    logger.debug(`ID 15 zapis detaljnije: ${JSON.stringify(mrnRecordsByDateOnly.filter((r: any) => r.id === 15))}`);
    
    let remainingQuantityToRemove = quantityToRemove;
    const updatedRecords: any[] = [];
    const deductionDetails: Array<{ 
      id: number, 
      mrn: string, 
      originalQuantity: number, 
      newQuantity: number, 
      quantityDeducted: number 
    }> = [];
    
    // Prolazi kroz MRN zapise i smanjuj količinu dok ne dođeš do tražene količine
    logger.debug(`Početak obrade ${mrnRecords.length} MRN zapisa za oduzimanje ${quantityToRemove} L goriva`);
    
    for (const record of mrnRecords) {
      if (remainingQuantityToRemove <= 0) break;
      
      logger.debug(`Obrada MRN zapisa ID ${record.id} - preostalo: ${record.remaining_quantity_liters} L`);
      logger.debug(`Tip remaining_quantity_liters: ${typeof record.remaining_quantity_liters}`);
      
      // Pohrani originalnu količinu prije oduzimanja
      const originalQuantity = record.remaining_quantity_liters;
      
      const quantityToRemoveFromRecord = Math.min(originalQuantity, remainingQuantityToRemove);
      logger.debug(`Oduzimam ${quantityToRemoveFromRecord} L od MRN zapisa ID ${record.id}`);
      
      const updatedRecord = await tx.tankFuelByCustoms.update({
        where: {
          id: record.id
        },
        data: {
          remaining_quantity_liters: originalQuantity - quantityToRemoveFromRecord,
          updatedAt: new Date()
        }
      });
      
      logger.debug(`Ažuriran MRN zapis ID ${record.id} - nova preostala količina: ${updatedRecord.remaining_quantity_liters} L`);
      
      // Dodaj detalje o oduzimanju
      deductionDetails.push({
        id: record.id,
        mrn: record.customs_declaration_number,
        originalQuantity: originalQuantity, 
        newQuantity: updatedRecord.remaining_quantity_liters,
        quantityDeducted: quantityToRemoveFromRecord
      });
      
      updatedRecords.push(updatedRecord);
      remainingQuantityToRemove -= quantityToRemoveFromRecord;
      logger.debug(`Preostalo za oduzeti: ${remainingQuantityToRemove} L`);
    }
    
    // Provjeri je li sva količina uspješno raspoređena
    if (remainingQuantityToRemove > 0.001) {
      logger.warn(`Nije bilo dovoljno goriva u MRN zapisima za tank ID ${tankId}. Nedostaje ${remainingQuantityToRemove.toFixed(3)} L`);
    }
    
    const totalDeducted = deductionDetails.reduce((sum, item) => sum + item.quantityDeducted, 0);
    logger.debug(`Ukupno oduzeto goriva: ${totalDeducted} L od traženih ${quantityToRemove} L`);
    
    return { 
      updatedRecords,
      deductionDetails 
    };
  } catch (error) {
    logger.error(`Greška prilikom smanjenja količine goriva u MRN zapisima: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
