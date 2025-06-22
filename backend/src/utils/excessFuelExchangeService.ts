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
  // Poboljšano logiranje za lakše praćenje i dijagnosticiranje problema
  logger.info(`Započinjem zamjenu viška goriva: ${excessLiters.toFixed(3)}L iz mobilnog tanka ID=${mobileId}, MRN=${sourceMrn}, MRN_ID=${sourceMrnId}`);

  // Provjeri jesu li parametri validni
  if (!mobileId || !sourceMrnId || excessLiters <= 0) {
    logger.warn(`Nevaljani parametri za zamjenu viška goriva: mobileId=${mobileId}, excessLiters=${excessLiters}, sourceMrnId=${sourceMrnId}`);
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

  // Provjeri imamo li gustoću goriva
  let density = sourceMrnDensity;
  
  // Ako gustoća nije proslijeđena, pokušaj je dohvatiti iz MRN zapisa
  if (!density) {
    logger.warn('Nedostaje podatak o gustoći goriva za MRN ' + sourceMrn + ', pokušavam dohvatiti iz baze');
    try {
      const mrnRecord = await prisma.mobileTankCustoms.findUnique({
        where: { id: sourceMrnId }
      });
      
      if (mrnRecord && mrnRecord.density_at_intake) {
        density = parseFloat(mrnRecord.density_at_intake.toString());
        logger.info(`Uspješno dohvaćena gustoća iz baze: ${density} za MRN ${sourceMrn}`);
      } else {
        // Ako ne možemo dohvatiti gustoću, koristimo defaultnu vrijednost
        density = 0.785; // Standardna gustoća za JET A-1
        logger.warn(`Nije moguće dohvatiti gustoću za MRN ${sourceMrn}, koristim standardnu vrijednost ${density}`);
      }
    } catch (err) {
      logger.error(`Greška prilikom dohvata gustoće za MRN ${sourceMrn}:`, err);
      density = 0.785; // Fallback na standardnu gustoću
    }
  }
  
  try {
    // Prvo provjeravamo stanje mobilnog tanka prije bilo kakvih promjena
    const mobileTankInitialState = await prisma.mobileTankCustoms.findUnique({
      where: { id: sourceMrnId }
    });
    
    if (!mobileTankInitialState) {
      throw new Error(`MRN zapis s ID=${sourceMrnId} ne postoji u bazi`);
    }
    
    const initialRemainingLiters = mobileTankInitialState.remaining_quantity_liters;
    
    // Validacija: ima li dovoljno litara za transfer
    if (initialRemainingLiters.lessThan(excessLiters)) {
      logger.warn(`Nedovoljno litara u mobilnom tanku za transfer viška: tankId=${mobileId}, mrnId=${sourceMrnId}, available=${initialRemainingLiters.toString()}, requested=${excessLiters}`);
      
      return {
        success: false,
        transferredLiters: 0,
        transferredKg: 0,
        sourceMrn,
        targetMrn: "",
        targetFixedTankId: 0,
        error: `Nedovoljno goriva u mobilnom tanku (dostupno: ${initialRemainingLiters.toString()}L, potrebno: ${excessLiters}L).`
      };
    }
    
    // Korak 1: Dobavi fiksirani spremnik s najmanje iskorištenim gorivom (FIFO princip)
    const fifoFixedTank = await getFixedTankWithOldestFuel(excessLiters);

    if (!fifoFixedTank || !fifoFixedTank.tankId || !fifoFixedTank.mrnId) {
      logger.error(`Nije pronađen odgovarajući fiksni tank za zamjenu viška.`);
      return {
        success: false,
        transferredLiters: 0,
        transferredKg: 0,
        sourceMrn,
        targetMrn: "", 
        targetFixedTankId: 0,
        error: "Nije pronađen odgovarajući fiksni tank za zamjenu viška."
      };
    }

    logger.info(`Pronađen odgovarajući fiksni tank ID=${fifoFixedTank.tankId} s MRN=${fifoFixedTank.mrnNumber}`);
    
    // Koristimo transakciju da osiguramo atomičnost operacija
    return await prisma.$transaction(async (tx) => {
      // KORAK 1: Smanjiti količinu u mobilnom tanku MRN zapisu (višak koji se uklanja)
      // Prvo eksplicitno dohvatiti trenutno stanje
      const currentMobileTank = await tx.mobileTankCustoms.findUnique({
        where: { id: sourceMrnId }
      });
      
      if (!currentMobileTank) {
        throw new Error(`MRN zapis s ID=${sourceMrnId} ne postoji u transakciji`);
      }
      
      const currentRemainingLiters = currentMobileTank.remaining_quantity_liters;
      const newRemainingLiters = currentRemainingLiters.sub(new Decimal(excessLiters.toString()));
      
      if (newRemainingLiters.isNegative()) {
        throw new Error(`Operacija bi rezultirala negativnim stanjem litara u MRN zapisu`);
      }
      
      // Umjesto dekrementa koristimo apsolutnu vrijednost što je sigurnije
      const updatedMobileTank = await tx.mobileTankCustoms.update({
        where: { id: sourceMrnId },
        data: {
          remaining_quantity_liters: newRemainingLiters
          // ne mijenjamo kg jer je već 0
        }
      });
      
      // Detaljno logiranje za dijagnostiku
      logger.info(`Smanjeno stanje litara u mobilnom tanku MRN: tankId=${mobileId}, mrnId=${sourceMrnId}, before=${currentRemainingLiters.toString()}, after=${updatedMobileTank.remaining_quantity_liters.toString()}, difference=${excessLiters}`);

      // KORAK 2: Transfer viška litara u fiksni tank i kreiranje zapisa o rezervnom gorivu
      // Dohvati izvorni MRN zapis kako bismo dobili gustoću
      const sourceMrnRecord = await tx.mobileTankCustoms.findUnique({
        where: { id: sourceMrnId }
      });
      
      if (!sourceMrnRecord || !sourceMrnRecord.density_at_intake) {
        throw new Error(`Nije moguće dohvatiti gustoću iz MRN zapisa ID=${sourceMrnId}`);
      }
      
      const sourceDensity = parseFloat(sourceMrnRecord.density_at_intake.toString());
      const excessKg = excessLiters * sourceDensity;
      
      // Kreiraj zapis o višku goriva u TankReserveFuel modelu
      const reserveFuelRecord = await tx.tankReserveFuel.create({
        data: {
          tank_id: fifoFixedTank.tankId,
          tank_type: 'fixed',
          source_mrn: sourceMrn,
          source_mrn_id: sourceMrnId,
          quantity_liters: new Decimal(excessLiters.toString()),
          is_excess: true,
          notes: `Automatski transfer viška goriva iz mobilnog tanka ID=${mobileId} s MRN=${sourceMrn}, ekvivalent: ${excessKg.toFixed(3)}kg.`
        }
      });
      logger.info(`Kreiran zapis o višku goriva: ID=${reserveFuelRecord.id}, ${excessLiters}L / ${excessKg}kg u fiksnom tanku ${fifoFixedTank.tankId}`);

      // BEZ ažuriranja stanja fiksnog tanka - samo radimo zamjenu, neto stanje ostaje isto
      // Logika je sledeća: Premještamo litre iz mobilnog u fiksni, ali zatim istu količinu litara vraćamo
      // u mobilni tank s pravilnim kg ekvivalentom. Nema neto promjene ukupne količine u fiksnom tanku.

      // KORAK 3: Prenesi istu količinu litara s ispravnim kg iz fiksnog u mobilni tank
      const substitutionLiters = excessLiters;
      const substitutionKg = substitutionLiters * fifoFixedTank.density;
      logger.info(`Izračunata zamjenska količina: ${substitutionLiters}L / ${substitutionKg}kg (gustoća: ${fifoFixedTank.density})`);
      
      // 3.1 Dohvatiti i provjeriti trenutno stanje MRN zapisa fiksnog tanka
      const currentFixedTankMrn = await tx.tankFuelByCustoms.findUnique({
        where: { id: fifoFixedTank.mrnId }
      });
      
      if (!currentFixedTankMrn) {
        throw new Error(`Nije pronađen MRN zapis u fiksnom tanku s ID=${fifoFixedTank.mrnId}`);
      }
      
      // Validacija: ima li dovoljno litara i kg za transfer
      if (currentFixedTankMrn.remaining_quantity_liters.lessThan(substitutionLiters) || 
          !currentFixedTankMrn.remaining_quantity_kg || 
          currentFixedTankMrn.remaining_quantity_kg.lessThan(substitutionKg)) {
        
        const availableKg = currentFixedTankMrn.remaining_quantity_kg ? 
          currentFixedTankMrn.remaining_quantity_kg.toString() : 
          '0';
          
        throw new Error(`Nedovoljno goriva u fiksnom tanku za transfer: potrebno ${substitutionLiters}L/${substitutionKg}kg, dostupno ${currentFixedTankMrn.remaining_quantity_liters}L/${availableKg}kg`);
      }
      
      // Izračunaj nove vrijednosti količine i umanjenje koristeći apsolutne vrijednosti
      const newFixedTankLiters = currentFixedTankMrn.remaining_quantity_liters.sub(new Decimal(substitutionLiters.toString()));
      
      // Sigurno rukovanje s remaining_quantity_kg koji može biti null
      const currentKg = currentFixedTankMrn.remaining_quantity_kg ?? new Decimal(0);
      const newFixedTankKg = currentKg.sub(new Decimal(substitutionKg.toString()));
      
      // Ažurirati MRN zapis fiksnog tanka
      const updatedFixedTankMrn = await tx.tankFuelByCustoms.update({
        where: { id: fifoFixedTank.mrnId },
        data: {
          remaining_quantity_liters: newFixedTankLiters,
          remaining_quantity_kg: newFixedTankKg
        }
      });
      
      logger.info(`Umanjeno stanje u fiksnom tanku MRN ID=${fifoFixedTank.mrnId}: ${currentFixedTankMrn.remaining_quantity_liters}L -> ${updatedFixedTankMrn.remaining_quantity_liters}L, ${currentFixedTankMrn.remaining_quantity_kg}kg -> ${updatedFixedTankMrn.remaining_quantity_kg}kg`);

      // 3.2 Dodati novi MRN zapis u mobilni tank
      const mobileTankMrn = await tx.mobileTankCustoms.create({
        data: {
          mobile_tank_id: mobileId,
          customs_declaration_number: fifoFixedTank.mrnNumber,
          quantity_liters: new Decimal(substitutionLiters.toString()),
          remaining_quantity_liters: new Decimal(substitutionLiters.toString()),
          quantity_kg: new Decimal(substitutionKg.toString()),
          remaining_quantity_kg: new Decimal(substitutionKg.toString()),
          date_added: new Date(),
          supplier_name: `Automatska zamjena - fiksni tank ${fifoFixedTank.tankId}`,
          density_at_intake: new Decimal((substitutionKg / substitutionLiters).toFixed(4))
        }
      });
      logger.debug(`Kreiran novi MRN u mobilnom tanku: ID=${mobileTankMrn.id}`);

      // 3.3 Kreiraj zapis o transferu iz fiksnog u mobilni tank
      const transferRecord = await tx.fuelTransferToTanker.create({
        data: {
          sourceFixedStorageTankId: fifoFixedTank.tankId,
          targetFuelTankId: mobileId,
          quantityLiters: new Decimal(substitutionLiters.toString()),
          dateTime: new Date(),
          notes: `Automatska zamjena goriva kao nadoknada za višak (MRN=${fifoFixedTank.mrnNumber}).`,
          userId: 1, // Admin korisnik
          mrnBreakdown: JSON.stringify({
            sourceMrnId: fifoFixedTank.mrnId, 
            sourceMrnNumber: fifoFixedTank.mrnNumber, 
            kg: substitutionKg,
            excessMrnId: sourceMrnId,
            excessMrn: sourceMrn
          })
        }
      });
      logger.info(`Kreiran zapis o transferu goriva u mobilni tank: ID=${transferRecord.id}, ${substitutionLiters}L / ${substitutionKg}kg`);

      // 3.4 Ažuriraj stanje fiksnog tanka - dohvati prvo trenutno stanje
      const currentFixedTank = await tx.fixedStorageTanks.findUnique({
        where: { id: fifoFixedTank.tankId }
      });
      
      if (!currentFixedTank) {
        throw new Error(`Nije pronađen fiksni tank s ID=${fifoFixedTank.tankId}`);
      }
      
      // Izračunaj nove vrijednosti
      const newTankLiters = currentFixedTank.current_quantity_liters - substitutionLiters;
      const newTankKg = currentFixedTank.current_quantity_kg - substitutionKg;
      
      // Validacija da ne idemo u negativu
      if (newTankLiters < 0 || newTankKg < 0) {
        throw new Error(`Ažuriranje fiksnog tanka bi rezultiralo negativnim stanjem: L=${newTankLiters}, kg=${newTankKg}`);
      }
      
      // Ažurirati fiksni tank s apsolutnim vrijednostima
      const updatedFixedTank = await tx.fixedStorageTanks.update({
        where: { id: fifoFixedTank.tankId },
        data: {
          current_quantity_liters: newTankLiters,
          current_quantity_kg: newTankKg
        }
      });
      
      logger.info(`Ažuriran fiksni tank ID=${fifoFixedTank.tankId}: ${currentFixedTank.current_quantity_liters}L/${currentFixedTank.current_quantity_kg}kg -> ${updatedFixedTank.current_quantity_liters}L/${updatedFixedTank.current_quantity_kg}kg`);

      // 3.5 Ažuriraj stanje mobilnog tanka - prvo izračunajmo točno stanje na temelju MRN zapisa
      // Dohvati sve aktivne MRN zapise za ovaj mobilni tank NAKON promjena
      const activeMrnRecords = await tx.mobileTankCustoms.findMany({
        where: {
          mobile_tank_id: mobileId,
          remaining_quantity_liters: { gt: 0 }
        }
      });
      
      // Zbroji ukupne količine iz svih aktivnih MRN zapisa
      const totalLiters = activeMrnRecords.reduce(
        (sum: number, record: any) => sum + parseFloat(record.remaining_quantity_liters.toString()), 
        0
      );
      
      const totalKg = activeMrnRecords.reduce(
        (sum: number, record: any) => {
          // Sigurna obrada za moguće null vrijednosti
          const kg = record.remaining_quantity_kg ? 
            parseFloat(record.remaining_quantity_kg.toString()) : 
            0;
          return sum + kg;
        }, 
        0
      );

      // Dohvati trenutno stanje mobilnog tanka za usporedbu
      const currentMobileTankState = await tx.fuelTank.findUnique({
        where: { id: mobileId }
      });
      
      if (!currentMobileTankState) {
        throw new Error(`Nije pronađen mobilni tank s ID=${mobileId}`);
      }
      
      // Postavi točno stanje u mobilnom tanku umjesto inkrementiranja
      const updatedMobileState = await tx.fuelTank.update({
        where: { id: mobileId },
        data: {
          current_liters: totalLiters,
          current_kg: totalKg,
        }
      });
      
      logger.info(`Ažuriran mobilni tank ID=${mobileId} prema MRN zapisima: ${currentMobileTankState.current_liters}L/${currentMobileTankState.current_kg}kg -> ${updatedMobileState.current_liters}L/${updatedMobileState.current_kg}kg`);

      logger.info(`Uspješna zamjena viška: ${substitutionLiters.toFixed(3)}L / ${substitutionKg.toFixed(3)}kg iz fiksnog tanka ${fifoFixedTank.tankId} u mobilni tank ${mobileId}`);
      
      // Vrati sve podatke o uspješnoj zamjeni
      return {
        success: true,
        transferredLiters: substitutionLiters,
        transferredKg: substitutionKg,
        sourceMrn: sourceMrn,
        targetMrn: fifoFixedTank.mrnNumber,
        targetFixedTankId: fifoFixedTank.tankId,
        recordId: transferRecord.id
      };
    });
  } catch (error) {
    logger.error(`[processExcessFuelExchange] Greška prilikom obrade zamjene: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      transferredLiters: 0,
      transferredKg: 0,
      sourceMrn,
      targetMrn: "",
      targetFixedTankId: 0,
      error: `Tehnička greška: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Definiramo tip koji sadrži informacije o fiksnom tanku s MRN zapisom
 */
interface FixedTankWithMrn {
  tankId: number;
  mrnId: number;
  mrnNumber: string;
  density: number;
}

/**
 * Dohvaća fiksni tank s najstarijim MRN zapisom koji ima dovoljno goriva za zamjenu
 * 
 * @param requiredLiters - Količina litara potrebna za zamjenu
 * @returns Promise s informacijama o fiksnom tanku ili null ako nije pronađen
 */
async function getFixedTankWithOldestFuel(requiredLiters: number): Promise<FixedTankWithMrn | null> {
  try {
    // Dohvati najstariji MRN zapis s dovoljno goriva
    const oldestMrn = await findOldestSuitableMrn(requiredLiters);
    
    if (!oldestMrn) {
      logger.error(`Nije pronađen fiksni tank s dovoljno goriva za ${requiredLiters}L.`);
      return null;
    }
    
    const density = oldestMrn.density_at_intake ? 
      parseFloat(oldestMrn.density_at_intake.toString()) : 0.8; // Defaultna gustoća ako nema podatka
      
    return {
      tankId: oldestMrn.fixed_tank_id,
      mrnId: oldestMrn.id,
      mrnNumber: oldestMrn.customs_declaration_number,
      density: density
    };
  } catch (error) {
    logger.error(`Greška pri dohvatu fiksnog tanka s najstarijim gorivom: ${error instanceof Error ? error.message : String(error)}`);
    return null;
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
/**
 * Transferira višak goriva iz mobilnog u fiksni tank i bilježi kao rezervno gorivo
 * 
 * @param tx - Prisma transakcijski klijent (nije više u upotrebi)
 * @param mobileId - ID mobilnog tanka
 * @param fixedTankId - ID fiksnog tanka
 * @param liters - Količina litara za transfer
 * @param sourceMrnId - ID izvornog MRN zapisa
 * @param sourceMrn - Broj MRN-a izvora
 * @param density - Gustoća goriva (za izračun kg)
 * @returns Promise sa stvorenim zapisom o transferu
 */
async function transferExcessToFixedTank(
  tx: any, // Nije više u upotrebi
  mobileId: number,
  fixedTankId: number,
  liters: number,
  sourceMrnId: number,
  sourceMrn: string,
  density: number
) {
  // Izračunaj kg ekvivalent na temelju gustoće
  const kg = liters * density;
  logger.debug(`[transferExcessToFixedTank] Počinjem transfer ${liters}L / ${kg}kg iz mobilnog tanka ${mobileId} u fiksni tank ${fixedTankId}`);
  
  try {
    // 1. Kreiraj zapis o višku goriva u TankReserveFuel modelu
    const reserveFuelRecord = await prisma.tankReserveFuel.create({
      data: {
        tank_id: fixedTankId,
        tank_type: 'fixed',
        source_mrn: sourceMrn,
        source_mrn_id: sourceMrnId,
        quantity_liters: new Decimal(liters.toString()),
        is_excess: true,
        notes: `Automatski transfer viška goriva iz mobilnog tanka ID=${mobileId} s MRN=${sourceMrn}.`
      }
    });
    
    logger.info(`Kreiran zapis o višku goriva: ID=${reserveFuelRecord.id}, ${liters}L u fiksnom tanku ${fixedTankId}`);

    // 2. Ažuriraj stanje fiksnog tanka - dodaj litre i kg
    await prisma.fixedStorageTanks.update({
      where: { id: fixedTankId },
      data: {
        current_quantity_liters: { increment: liters },
        current_quantity_kg: { increment: kg },
      }
    });
    logger.debug(`Ažuriran fiksni tank ${fixedTankId}: dodano ${liters}L / ${kg}kg`);

    return reserveFuelRecord;
  } catch (error) {
    logger.error(`[transferExcessToFixedTank] Greška: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
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
/**
 * Uzima odgovarajuću količinu goriva iz fiksnog tanka po MRN i dodaje ga mobilnom tanku
 * kao zamjenu za višak koji je prethodno transferiran
 * 
 * @param tx - Prisma transakcijski klijent (nije više u upotrebi)
 * @param mobileId - ID mobilnog tanka u koji ide gorivo
 * @param fixedTankId - ID fiksnog tanka iz kojeg ide gorivo
 * @param fixedTankMrnId - ID MRN zapisa u fiksnom tanku
 * @param liters - Količina litara za transfer
 * @param kg - Količina kg za transfer
 * @param mrnNumber - Broj MRN-a za transfer
 * @returns Promise s rezultatom operacije
 */
async function substituteFuelFromFixedToMobile(
  tx: any, // Nije više u upotrebi
  mobileId: number,
  fixedTankId: number,
  fixedTankMrnId: number,
  liters: number,
  kg: number,
  mrnNumber: string
) {
  logger.debug(`[substituteFuelFromFixedToMobile] Počinjem transfer ${liters}L / ${kg}kg iz fiksnog tanka ${fixedTankId} u mobilni tank ${mobileId}`);
  
  try {
    // 1. Umanjiti količinu goriva u MRN zapisu fiksnog tanka
    await prisma.tankFuelByCustoms.update({
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
    logger.debug(`Umanjeno: ${liters}L / ${kg}kg u fiksnom tanku MRN ID=${fixedTankMrnId}`);

    // 2. Dodati novi MRN zapis u mobilni tank
    const mobileTankMrn = await prisma.mobileTankCustoms.create({
      data: {
        mobile_tank_id: mobileId,
        customs_declaration_number: mrnNumber,
        quantity_liters: new Decimal(liters.toString()),
        remaining_quantity_liters: new Decimal(liters.toString()),
        quantity_kg: new Decimal(kg.toString()),
        remaining_quantity_kg: new Decimal(kg.toString()),
        date_added: new Date(),
        supplier_name: `Automatska zamjena - fiksni tank ${fixedTankId}`,
        density_at_intake: new Decimal((kg / liters).toFixed(4)) // Izračun gustoće iz kg i litara
      }
    });
    logger.debug(`Kreiran novi MRN u mobilnom tanku: ID=${mobileTankMrn.id}`);

    // 3. Kreiraj zapis o transferu iz fiksnog u mobilni tank
    // Koristimo FuelTransferToTanker model umjesto MobileTankRefills jer radi s FuelTank (ne Vehicle)
    const transferRecord = await prisma.fuelTransferToTanker.create({
      data: {
        sourceFixedStorageTankId: fixedTankId,
        targetFuelTankId: mobileId,
        quantityLiters: new Decimal(liters.toString()),
        dateTime: new Date(),
        notes: `Automatska zamjena goriva kao nadoknada za višak (MRN=${mrnNumber}).`,
        userId: 1, // Admin korisnik
        mrnBreakdown: JSON.stringify({ sourceMrnId: fixedTankMrnId, sourceMrnNumber: mrnNumber, kg: kg })
      }
    });
    logger.info(`Kreiran zapis o transferu goriva u mobilni tank: ID=${transferRecord.id}, ${liters}L / ${kg}kg`);

    // 4. Ažuriraj stanje fiksnog tanka
    await prisma.fixedStorageTanks.update({
      where: { id: fixedTankId },
      data: {
        current_quantity_liters: { decrement: liters },
        current_quantity_kg: { decrement: kg },
      }
    });
    logger.debug(`Ažuriran fiksni tank ID=${fixedTankId}: umanjeno ${liters}L / ${kg}kg`);

    // 5. Ažuriraj stanje mobilnog tanka
    await prisma.fuelTank.update({
      where: { id: mobileId },
      data: {
        current_liters: { increment: liters },
        current_kg: { increment: kg },
      }
    });
    logger.debug(`Ažuriran mobilni tank ID=${mobileId}: dodano ${liters}L / ${kg}kg`);

    logger.info(`Uspješna zamjena goriva: ${liters.toFixed(3)}L / ${kg.toFixed(3)}kg iz fiksnog tanka ${fixedTankId} u mobilni tank ${mobileId}`);
    
    return transferRecord;
  } catch (error) {
    logger.error(`[substituteFuelFromFixedToMobile] Greška: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
