import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { verifyMultipleTanksConsistency, verifyTankConsistency, TankConsistencyResult } from '../utils/fuelConsistencyUtils';
import { executeFuelOperation } from '../utils/transactionUtils';

// Proširujemo Express Request tip s user svojstvom
// Koristimo as umjesto tipova da izbjegnemo TypeScript greške


// Deklaracija za globalnu varijablu za override tokene
declare global {
  var overrideTokens: {
    [key: string]: {
      token: string;
      timestamp: string;
      userId: number | null;
      operationType: string;
      tankId: number;
      notes?: string;
      expires: Date;
    };
  };
}

const prisma = new PrismaClient();

/**
 * Dohvaća rezultate provjere konzistentnosti za jedan tank
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getTankConsistencyCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id, 10))) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Potreban je validan ID tanka'
      });
      return;
    }

    const tankId = parseInt(id, 10);
    const result = await verifyTankConsistency(tankId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Greška prilikom provjere konzistentnosti tanka ${req.params.id}:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom provjere konzistentnosti tanka',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Dohvaća rezultate provjere konzistentnosti za sve tankove u sustavu
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getAllTanksConsistencyCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Dohvati sve aktivne tankove
    const tanks = await prisma.fixedStorageTanks.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true
      }
    });

    const tankIds = tanks.map(tank => tank.id);
    const results = await verifyMultipleTanksConsistency(tankIds);

    // Filtriraj samo one tankove koji imaju nekonzistencije
    const inconsistentTanks = results.filter(result => !result.isConsistent);
    const consistentTanks = results.filter(result => result.isConsistent);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        all: results,
        inconsistent: inconsistentTanks,
        consistent: consistentTanks,
        summary: {
          totalTanks: results.length,
          consistentCount: consistentTanks.length,
          inconsistentCount: inconsistentTanks.length
        }
      }
    });
  } catch (error) {
    logger.error('Greška prilikom masovne provjere konzistentnosti tankova:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom masovne provjere konzistentnosti tankova',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Korigira nekonzistentnosti u tanku tako što prilagođava MRN zapise
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const correctTankInconsistency = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, adjustments, notes } = req.body;
    
    if (!id || isNaN(parseInt(id, 10))) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Potreban je validan ID tanka'
      });
      return;
    }

    const tankId = parseInt(id, 10);
    
    // Provjeri trenutnu konzistentnost
    const consistency = await verifyTankConsistency(tankId);
    
    if (consistency.isConsistent) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Tank je već konzistentan, korekcija nije potrebna'
      });
      return;
    }

    // Započni transakciju da osiguramo atomičnost operacija
    await executeFuelOperation(async (tx) => {
      if (action === 'adjustMrn' && Array.isArray(adjustments)) {
        // Podešavanje MRN zapisa prema korisničkim uputama
        for (const adjustment of adjustments) {
          if (!adjustment.mrnId || !adjustment.newQuantity) continue;
          
          await tx.tankFuelByCustoms.update({
            where: { id: adjustment.mrnId },
            data: { remaining_quantity_liters: adjustment.newQuantity }
          });
        }
      } 
      else if (action === 'adjustTank') {
        // Podešavanje količine goriva u tanku
        // Konvertirati sumMrnQuantities iz stringa u broj za Prisma update
        const targetQuantity = parseFloat(String(consistency.sumMrnQuantities));
        
        logger.info(`Ažuriranje količine goriva u tanku ID ${tankId} na ${targetQuantity} L (konvertirano iz "${consistency.sumMrnQuantities}")`);
        
        await tx.fixedStorageTanks.update({
          where: { id: tankId },
          data: { current_quantity_liters: targetQuantity }
        });
      }
      else if (action === 'createBalancingMrn') {
        // Kreiraj novi MRN zapis za balansiranje razlike
        const difference = consistency.difference;
        const direction = consistency.currentQuantityLiters > consistency.sumMrnQuantities ? 'positive' : 'negative';
        // Koristimo .abs() metodu Decimal objekta umjesto Math.abs koji radi samo s number tipom
        const quantityToAdd = difference.abs();
        
        // Kreiraj novi MRN balansni zapis
        await tx.tankFuelByCustoms.create({
          data: {
            fixed_tank_id: tankId,
            customs_declaration_number: `BAL-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 10000)}`,
            quantity_liters: quantityToAdd,
            remaining_quantity_liters: quantityToAdd,
            date_added: new Date(),
            fuel_intake_record_id: 1, // Mora biti postavljen na postojeći Fuel Intake Record ID
          }
        });
      }
      
      // Dodaj bilješku o korekciji - korištenjem Prisma API umjesto $executeRaw
      await (tx as any).systemLog.create({
        data: {
          action: 'CONSISTENCY_CORRECTION',
          details: JSON.stringify({
            tankId,
            tankName: consistency.tankName,
            action,
            beforeCorrection: {
              tankQuantity: consistency.currentQuantityLiters,
              mrnSum: consistency.sumMrnQuantities,
              difference: consistency.difference
            },
            notes
          }),
          severity: 'INFO',
          userId: (req as any).user?.id || null
        }
      });
      
      return { success: true, tankId };
    }, {
      tankIds: [tankId],
      operationType: 'SYNC',
      userId: (req as any).user?.id,
      notes: `Korekcija nekonzistentnosti: ${notes || 'Admin korekcija'}`,
      skipConsistencyCheck: true // Preskačemo provjeru konzistentnosti jer upravo to popravljamo
    });

    // Dohvati ažurirano stanje konzistentnosti
    const updatedConsistency = await verifyTankConsistency(tankId);
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Korekcija nekonzistentnosti uspješno izvršena',
      data: {
        before: consistency,
        after: updatedConsistency
      }
    });
  } catch (error) {
    logger.error(`Greška prilikom korekcije nekonzistentnosti tanka ${req.params.id}:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom korekcije nekonzistentnosti tanka',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Dozvoljava izvršavanje operacije s gorivom i pored nekonzistentnosti
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const overrideInconsistencyCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tankId: tankIdParam } = req.params;
    const { overrideToken, operationType, notes } = req.body;
    
    if (!tankIdParam || isNaN(parseInt(tankIdParam, 10))) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Potreban je validan ID tanka'
      });
      return;
    }
    
    const tankId = parseInt(tankIdParam, 10);

    // U pravoj implementaciji, ovdje bi trebalo provjeriti valjanost override tokena
    // i da li korisnik ima administratorske privilegije
    
    // Kreiranje override tokena koji će biti korišten u sesiji
    // Ovo je pojednostavljeno za potrebe primjera - u produkcijskom sustavu
    // ovo bi trebalo biti sigurnije implementirano
    const sessionOverrideToken = Math.random().toString(36).substring(2, 15);
    
    // Spremamo override token u varijablu sustava
    // U pravoj implementaciji, ovo bi trebalo koristiti pravilnu tablicu u bazi podataka
    // ili Redis za čuvanje tokena sa istekom
    const overrideData = {
      token: sessionOverrideToken,
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id || null,
      operationType,
      tankId,
      notes,
      expires: new Date(Date.now() + 300000) // 5 minuta od trenutnog vremena
    };
    
    // U ovom primjeru koristimo globalnu varijablu koja se čuva u memoriji
    // samo za demonstraciju, u produkciji bi trebalo koristiti bazu ili Redis
    global.overrideTokens = global.overrideTokens || {};
    global.overrideTokens[`tank_inconsistency_override_${tankId}`] = overrideData;
    
    // Logiraj ovu akciju koristeći raw SQL zbog TypeScript kompatibilnosti
    await prisma.$executeRaw`INSERT INTO "SystemLog" ("timestamp", "action", "details", "severity", "userId") VALUES (NOW(), 'CONSISTENCY_OVERRIDE', ${JSON.stringify({
      tankId,
      userId: (req as any).user?.id,
      operationType,
      notes,
      timestamp: new Date().toISOString()
    })}, 'WARNING', ${(req as any).user?.id || null})`;
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Override token generiran',
      data: {
        overrideToken: sessionOverrideToken,
        expiresIn: 300 // 5 minuta
      }
    });
  } catch (error) {
    logger.error(`Greška prilikom generiranja override tokena za tank ${req.params.tankId}:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom generiranja override tokena',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};
