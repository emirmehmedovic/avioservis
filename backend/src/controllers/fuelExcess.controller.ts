import { Response } from 'express';
import { AuthRequest } from '../middleware/auth'; // Importiranje AuthRequest koji sadrži 'user'
import { PrismaClient, MrnTransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Endpoint za ručnu obradu viška litara goriva iz mobilnog tankera
 * Ova funkcija omogućuje operaterima da registriraju korištenje viška litara
 * koji nisu povezani s MRN brojem, npr. za službene ili interne potrebe.
 */
export const processExcessFuel = async (req: AuthRequest, res: Response): Promise<void> => {
  const { mobileTankId, litersQuantity, notes } = req.body;

  if (!mobileTankId || !litersQuantity) {
    res.status(400).json({ message: 'Potreban je ID tanka i količina u litrama.' });
    return;
  }

  try {
    // Dohvati podatke o mobilnom tanku
    const mobileTank = await prisma.fuelTank.findUnique({
      where: { id: mobileTankId },
      select: {
        id: true,
        current_liters: true,
        current_kg: true,
        // Mobilni tankeri nemaju current_operational_density u modelu,
        // koristimo prosječnu gustoću iz stanja
      }
    });

    if (!mobileTank) {
      res.status(404).json({ message: `Mobilni tank s ID ${mobileTankId} nije pronađen.` });
      return;
    }

    // Provjeri da li tank ima dovoljno goriva
    const requestedLiters = new Decimal(litersQuantity);
    const availableLiters = new Decimal(mobileTank.current_liters);
    
    // Dozvoljavamo malu toleranciju za floating-point preciznost (0.00001 = 0.01 mL)
    const TOLERANCE = new Decimal('0.00001');
    
    // Ako je razlika minimalna (unutar tolerancije), tretiramo ih kao jednake
    if (requestedLiters.greaterThan(availableLiters) && 
        requestedLiters.sub(availableLiters).greaterThan(TOLERANCE)) {
      res.status(400).json({ 
        message: `Nedovoljno goriva u tanku. Traženo: ${requestedLiters} litara, dostupno: ${availableLiters} litara.` 
      });
      return;
    }

    // Izračunaj odgovarajuću količinu u kilogramima
    // Izračun gustoće na temelju trenutnog stanja (kg/litar)
    const currentKg = new Decimal(mobileTank.current_kg);
    const currentLiters = new Decimal(mobileTank.current_liters);
    const currentDensity = currentKg.div(currentLiters);
    const kgToRemove = requestedLiters.mul(currentDensity);

    // Izvrši transakciju u bazi
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ažuriraj stanje mobilnog tanka
      const updatedTank = await tx.fuelTank.update({
        where: { id: mobileTankId },
        data: {
          current_liters: {
            decrement: requestedLiters
          },
          current_kg: {
            decrement: kgToRemove
          }
        }
      });

      // 2. Kreiraj MrnTransactionLeg zapis kao evidenciju
      const transactionRecord = await tx.mrnTransactionLeg.create({
        data: {
          mobileTankCustomsId: null, // Nije povezano s MRN-om
          transactionType: MrnTransactionType.MANUAL_EXCESS_FUEL_SALE,
          kgTransacted: kgToRemove.negated(), // Negativna vrijednost jer je odljev
          litersTransactedActual: requestedLiters.negated(), // Negativna vrijednost jer je odljev
          operationalDensityUsed: currentDensity,
          literVarianceForThisLeg: new Decimal(0), // Nema varijance jer nije MRN transakcija
        }
      });
      
      // 3. Dodaj gorivo u holding tank za višak goriva
      const holdingTankId = process.env.EXCESS_FUEL_HOLDING_TANK_ID;
      if (!holdingTankId) {
        logger.warn(`EXCESS_FUEL_HOLDING_TANK_ID nije konfiguriran. Ne može se prebaciti ${requestedLiters} litara viška goriva`);
      } else {
        logger.info(`Prebacivanje ${requestedLiters} litara viška goriva u holding tank ${holdingTankId}`);
        
        await tx.fixedStorageTanks.update({
          where: { id: parseInt(holdingTankId) },
          data: {
            current_quantity_liters: {
              increment: requestedLiters.toNumber()
            },
            current_quantity_kg: {
              increment: kgToRemove.toNumber()
            }
          }
        });
      }

      // 3. Kreiraj zapis o aktivnosti
      await tx.activity.create({
        data: {
          username: req.user?.username || 'system',
          actionType: 'MANUAL_EXCESS_FUEL_SALE',
          resourceType: 'FUEL_TANK',
          resourceId: mobileTankId,
          description: 'Ručna obrada viška goriva',
          metadata: {
            tankId: mobileTankId,
            liters: requestedLiters.toString(),
            kg: kgToRemove.toString(),
            density: currentDensity.toString(),
            notes: notes || 'Ručna obrada viška goriva'
          },
          ipAddress: req.ip
        }
      });

      return {
        tankUpdate: updatedTank,
        transaction: transactionRecord
      };
    });

    res.status(200).json({
      message: 'Višak goriva uspješno obrađen.',
      details: {
        tankId: mobileTankId,
        litersProcessed: requestedLiters.toString(),
        kgProcessed: kgToRemove.toString(),
        remainingLiters: new Decimal(result.tankUpdate.current_liters).toString(),
        remainingKg: new Decimal(result.tankUpdate.current_kg).toString(),
        transactionId: result.transaction.id
      }
    });

  } catch (error) {
    logger.error('Greška pri obradi viška goriva:', error);
    res.status(500).json({ 
      message: 'Došlo je do greške pri obradi viška goriva.',
      error: String(error)
    });
  }
};

/**
 * Dohvaća povijest ručne obrade viška goriva
 */
export const getExcessFuelHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const history = await prisma.mrnTransactionLeg.findMany({
      where: {
        transactionType: MrnTransactionType.MANUAL_EXCESS_FUEL_SALE
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100 // Limit rezultata na najnovijih 100 zapisa
    });

    res.status(200).json(history);
  } catch (error) {
    logger.error('Greška pri dohvaćanju povijesti obrade viška goriva:', error);
    res.status(500).json({ 
      message: 'Došlo je do greške pri dohvaćanju povijesti.',
      error: String(error)
    });
  }
};
