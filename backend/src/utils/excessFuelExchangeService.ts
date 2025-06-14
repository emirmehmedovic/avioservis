/**
 *  excessFuelExchangeService.ts
 *  Servis za automatsku zamjenu viška goriva između mobilnih i fiksnih tankova
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // Za precizne decimalne kalkulacije
import { logger } from './logger';

const prisma = new PrismaClient();

// Definiramo tipove za jasnoću i tip safety
export interface ExcessFuelExchangeResult {
  success: boolean;
  transferredLiters: number;
  transferredKg: number;
  sourceMrn: string;
  targetMrn: string;
  targetFixedTankId: number;
  recordId?: number;
  error?: string;
}

interface TankFuelCustomsRecord {
  id: number;
  fixed_tank_id: number;
  customs_declaration_number: string;
  remaining_quantity_liters: Decimal;
  remaining_quantity_kg: Decimal | null;
  density_at_intake: Decimal | null;
  fixedTank?: {
    tank_name?: string;
    location_description?: string | null;
  };
  [key: string]: any; // Za ostala polja koja ne definiramo eksplicitno
}

/**
 * Procesuira automatsku zamjenu viška litara goriva između mobilnih i fiksnih tankova
 * 
 * @param mobileId - ID mobilnog tanka iz kojeg dolazi višak
 * @param excessLiters - Količina viška litara za transfer
 * @param sourceMrnId - ID izvornog MRN zapisa u mobilnom tanku
 * @param sourceMrn - Broj MRN-a iz mobilnog tanka
 * @param sourceMrnDensity - Gustoća goriva u izvornom MRN zapisu
 * @returns Promise s detaljima izvršenog transfera ili greškom
 */
export async function processExcessFuelExchange(
  mobileId: number, 
  excessLiters: number, 
  sourceMrnId: number, 
  sourceMrn: string, 
  sourceMrnDensity: number | null
): Promise<ExcessFuelExchangeResult> {
  logger.info(`Započinjem zamjenu viška goriva: ${excessLiters.toFixed(3)}L iz mobilnog tanka ID=${mobileId}, MRN=${sourceMrn}`);

  // Provjeri jesu li parametri validni
  if (!mobileId || !sourceMrnId || excessLiters <= 0) {
    logger.warn(`Nevaljani parametri za zamjenu viška: mobileId=${mobileId}, excessLiters=${excessLiters}, sourceMrnId=${sourceMrnId}`);
    return {
      success: false,
      transferredLiters: 0,
      transferredKg: 0,
      error: 'Nevaljani parametri za zamjenu viška goriva',
      sourceMrn,
      targetMrn: '',
      targetFixedTankId: 0
    };
  }

  // Provjeri ima li dovoljno goriva za transfer
  if (!sourceMrnDensity) {
    logger.warn(`Nedostaje podatak o gustoći goriva za MRN ${sourceMrn}`);
    return {
      success: false,
      transferredLiters: 0,
      transferredKg: 0,
      error: 'Nedostaje podatak o gustoći goriva',
      sourceMrn,
      targetMrn: '',
      targetFixedTankId: 0
    };
  }

  try {
    // Pronađi najstariji MRN zapis u fiksnim tankovima s dovoljno goriva
    const targetFixedTankMrn = await findOldestSuitableMrn(excessLiters);
    
    if (!targetFixedTankMrn) {
      logger.warn(`Nije pronađen odgovarajući MRN s dovoljnom količinom goriva za zamjenu ${excessLiters.toFixed(3)}L.`);
      return {
        success: false,
        transferredLiters: 0,
        transferredKg: 0,
        sourceMrn,
        targetMrn: '',
        targetFixedTankId: 0,
        error: `Nije pronađen odgovarajući MRN s dovoljnom količinom goriva za zamjenu ${excessLiters.toFixed(3)}L.`
      };
    }
    
    // Izvršiti transfer između tankova (moramo koristiti transakciju)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Transfer viška u fiksni tank kao rezervno gorivo
      const reserveRecord = await transferExcessToFixedTank(
        tx,
        mobileId,
        targetFixedTankMrn.fixed_tank_id,
        excessLiters,
        sourceMrnId,
        sourceMrn,
        sourceMrnDensity
      );
      
      // 2. Zamjena s novim MRN - uklanjanje odgovarajuće količine iz fiksnog tanka i dodavanje u mobilni
      // Pretvorimo null u default vrijednost ako je potrebno
      const density = targetFixedTankMrn.density_at_intake ? 
        parseFloat(targetFixedTankMrn.density_at_intake.toString()) : 
        sourceMrnDensity;
      
      const kgEquivalent = excessLiters * density;
      
      await substituteFuelFromFixedToMobile(
        tx,
        mobileId,
        targetFixedTankMrn.fixed_tank_id,
        targetFixedTankMrn.id,
        excessLiters,
        kgEquivalent,
        targetFixedTankMrn.customs_declaration_number
      );
      
      return {
        success: true,
        transferredLiters: excessLiters,
        transferredKg: kgEquivalent,
        sourceMrn,
        targetMrn: targetFixedTankMrn.customs_declaration_number,
        targetFixedTankId: targetFixedTankMrn.fixed_tank_id,
        recordId: reserveRecord.id
      };
    });
    
    logger.info(`Uspješna zamjena viška goriva: ${excessLiters.toFixed(3)}L iz mobilnog tanka ID=${mobileId} u fiksni tank ID=${result.targetFixedTankId}, MRN=${result.targetMrn}`);
    
    return result;
  } catch (error) {
    logger.error(`Greška prilikom procesiranja zamjene viška goriva: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      transferredLiters: 0,
      transferredKg: 0,
      sourceMrn,
      targetMrn: '',
      targetFixedTankId: 0,
      error: `Tehnička greška: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Pronalazi najstariji odgovarajući MRN zapis u fiksnim tankovima koji ima dovoljnu količinu
 * i kg i litara za transfer
 * 
 * @param requiredLiters - Količina litara viška koju trebamo transferirati
 * @returns Promise s pronađenim MRN zapisom ili null ako nema odgovarajućeg
 */
async function findOldestSuitableMrn(requiredLiters: number): Promise<TankFuelCustomsRecord | null> {
  try {
    // Koristimo Decimal iz Prisma runtime-a za kompatibilnost s Prisma Decimal tipovima
    const decimalRequiredLiters = new Decimal(requiredLiters.toString());
    const zeroDecimal = new Decimal('0');
    
    // Dohvatanje MRN zapisa iz fiksnih tankova koji imaju dovoljno kg i litara
    const fixedTankMRNs = await prisma.tankFuelByCustoms.findMany({
      where: {
        // Filtriramo samo zapise koji imaju dovoljno kg i litara
        // Prisma automatski konvertira number u Decimal gdje je potrebno
        remaining_quantity_kg: { gt: zeroDecimal }, // Mora imati pozitivan broj kg
        remaining_quantity_liters: { gte: decimalRequiredLiters }, // Mora imati dovoljno litara
      },
      include: {
        fixedTank: true, // Uključujemo podatke o fiksnom tanku
      },
      orderBy: {
        date_added: 'asc', // Sortiranje po datumu dodavanja (najstariji prvo)
      },
    });

    logger.info(`Pronalazim najstariji MRN u fiksnim tankovima s najmanje ${requiredLiters.toFixed(3)}L`);
    
    if (fixedTankMRNs.length === 0) {
      logger.warn(`Nije pronađen nijedan MRN zapis u fiksnim tankovima s dovoljno kg i litara za transfer`);
      return null;
    }
    
    // Uzimamo najstariji zapis (već je sortiran po datumu ascending)
    const oldestMrn = fixedTankMRNs[0];
    
    // Dodatna provjera za kg - za svaki slučaj, koristeći Decimal.gt() za usporedbu s nulom
    if (!oldestMrn.remaining_quantity_kg || !oldestMrn.remaining_quantity_kg.gt(0)) {
      logger.warn(`Najstariji MRN ${oldestMrn.customs_declaration_number || oldestMrn.id} nema dovoljno kg.`);
      return null;
    }

    // Dohvati podatke o fiksnom tanku za logiranje - koristimo tank_name ili location_description
    const fixedTankName = oldestMrn.fixedTank?.tank_name || oldestMrn.fixedTank?.location_description || 'Nepoznat tank';
    const fixedTankId = oldestMrn.fixed_tank_id;
    
    logger.info(
      `Pronađen najstariji odgovarajući MRN: ${oldestMrn.customs_declaration_number} ` +
      `u fiksnom tanku ${fixedTankName} (ID=${fixedTankId}) ` +
      `s ${oldestMrn.remaining_quantity_kg.toString() || '0'} kg i ` +
      `${oldestMrn.remaining_quantity_liters.toString() || '0'} L`
    );
    
    return oldestMrn;
  } catch (error) {
    logger.error(`Greška prilikom traženja najstarijeg MRN zapisa: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Transferira višak goriva iz mobilnog u fiksni tank
 * 
 * @param tx - Prisma transakcijski klijent
 * @param mobileId - ID mobilnog tanka
 * @param fixedTankId - ID fiksnog tanka
 * @param liters - Količina litara za transfer
 * @param sourceMrnId - ID izvornog MRN zapisa
 * @param sourceMrn - Broj MRN-a izvora
 * @param density - Gustoća goriva (za izračun kg)
 * @returns Promise sa stvorenim zapisom o transferu
 */
async function transferExcessToFixedTank(
  tx: any,
  mobileId: number,
  fixedTankId: number,
  liters: number,
  sourceMrnId: number,
  sourceMrn: string,
  density: number
) {
  // Izračunaj kg ekvivalent na temelju gustoće
  const kg = liters * density;
  
  // Stvori zapis o transferu kao rezervno gorivo
  const record = await tx.fuelTransactions.create({
    data: {
      transaction_type: 'MOBILE_TO_FIXED',
      mobile_tank_id: mobileId,
      fixed_tank_id: fixedTankId,
      quantity_liters: new Decimal(liters.toString()),
      quantity_kg: new Decimal(kg.toString()),
      transaction_date: new Date(),
      source_mrn_record_id: sourceMrnId,
      source_mrn: sourceMrn,
      notes: `Automatski transfer viška goriva iz mobilnog tanka ID=${mobileId} s MRN=${sourceMrn}.`,
      transaction_status: 'COMPLETED',
      is_excess_transfer: true, // Označavamo da je ovo automatska zamjena viška
    }
  });
  
  logger.info(`Stvorena transakcija transfera viška: ID=${record.id}, liters=${liters.toFixed(3)}, kg=${kg.toFixed(3)}`);

  // Ažuriraj stanje fiksnog tanka
  await tx.fixedStorageTanks.update({
    where: { id: fixedTankId },
    data: {
      current_quantity_liters: { increment: liters },
      current_quantity_kg: { increment: kg },
    }
  });

  return record;
}

/**
 * Uzima odgovarajuću količinu goriva iz fiksnog tanka po MRN i dodaje ga mobilnom tanku
 * kao zamjenu za višak koji je prethodno transferiran
 * 
 * @param tx - Prisma transakcijski klijent
 * @param mobileId - ID mobilnog tanka u koji ide gorivo
 * @param fixedTankId - ID fiksnog tanka iz kojeg ide gorivo
 * @param fixedTankMrnId - ID MRN zapisa u fiksnom tanku
 * @param liters - Količina litara za transfer
 * @param kg - Količina kg za transfer
 * @param mrnNumber - Broj MRN-a za transfer
 * @returns Promise s rezultatom operacije
 */
async function substituteFuelFromFixedToMobile(
  tx: any,
  mobileId: number,
  fixedTankId: number,
  fixedTankMrnId: number,
  liters: number,
  kg: number,
  mrnNumber: string
) {
  // 1. Umanjiti količinu goriva u MRN zapisu fiksnog tanka
  await tx.tankFuelByCustoms.update({
    where: { id: fixedTankMrnId },
    data: {
      remaining_quantity_liters: {
        decrement: new Decimal(liters.toString())
      },
      remaining_quantity_kg: {
        decrement: new Decimal(kg.toString())
      }
    }
  });

  // 2. Dodati MRN zapis u mobilni tank
  await tx.mobileTankCustoms.create({
    data: {
      mobile_tank_id: mobileId,
      customs_declaration_number: mrnNumber,
      quantity_liters: new Decimal(liters.toString()),
      remaining_quantity_liters: new Decimal(liters.toString()),
      quantity_kg: new Decimal(kg.toString()),
      remaining_quantity_kg: new Decimal(kg.toString()),
      date_added: new Date(),
      note: `Automatska zamjena goriva kao nadoknada za višak (fiksni tank ID=${fixedTankId})`
    }
  });

  // 3. Stvori transakcijski zapis FIXED_TO_MOBILE
  const record = await tx.fuelTransactions.create({
    data: {
      transaction_type: 'FIXED_TO_MOBILE',
      mobile_tank_id: mobileId,
      fixed_tank_id: fixedTankId,
      quantity_liters: new Decimal(liters.toString()),
      quantity_kg: new Decimal(kg.toString()),
      transaction_date: new Date(),
      source_mrn_record_id: fixedTankMrnId,
      source_mrn: mrnNumber,
      notes: `Automatska zamjena goriva kao nadoknada za višak (MRN=${mrnNumber}).`,
      transaction_status: 'COMPLETED',
      is_excess_transfer: true, // Označavamo da je ovo automatska zamjena viška
    }
  });

  // 4. Ažuriraj stanje fiksnog tanka
  await tx.fixedStorageTanks.update({
    where: { id: fixedTankId },
    data: {
      current_quantity_liters: { decrement: liters },
      current_quantity_kg: { decrement: kg },
    }
  });

  // 5. Ažuriraj stanje mobilnog tanka
  await tx.mobileTanks.update({
    where: { id: mobileId },
    data: {
      current_quantity_liters: { increment: liters },
      current_quantity_kg: { increment: kg },
    }
  });

  logger.info(`Stvorena transakcija zamjene: ID=${record.id}, liters=${liters.toFixed(3)}, kg=${kg.toFixed(3)}, MRN=${mrnNumber}`);
  
  return record;
}
