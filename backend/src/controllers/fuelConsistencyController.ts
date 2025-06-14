import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { runConsistencyCheck } from '../utils/fuelConsistencyCheck';
import { logger } from '../utils/logger';

/**
 * Kontroler za provjeru konzistentnosti podataka o gorivu
 * Provjerava nekonzistentnosti između ukupne količine goriva u fiksnim tankovima
 * i sume količina po MRN zapisima u TankFuelByCustoms tabeli
 * 
 * @param req - Zahtjev koji može sadržavati tankId i toleranciju
 * @param res - Odgovor
 * @param next - Funkcija za prosljeđivanje greške
 */
export const checkFuelConsistency = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Dohvati parametre iz query stringa
    const tankId = req.query.tankId ? parseInt(req.query.tankId as string, 10) : undefined;
    const tolerance = req.query.tolerance ? parseFloat(req.query.tolerance as string) : 0.01;
    
    logger.info(`Pokrenuta provjera konzistentnosti goriva${tankId ? ` za tank ID: ${tankId}` : ' za sve tankove'} s tolerancijom ${tolerance}L`);
    
    // Pokreni provjeru konzistentnosti
    const result = await runConsistencyCheck(tankId, tolerance);
    
    // Pripremi odgovor
    const response = {
      timestamp: result.timestamp,
      totalTanksChecked: result.totalTanksChecked,
      consistentTanks: result.consistentTanks,
      inconsistentTanks: result.inconsistentTanks,
      totalDifference: result.totalDifference,
      inconsistentTankDetails: result.inconsistentTankDetails.map(tank => ({
        tankId: tank.tankId,
        tankName: tank.tankName,
        fuelType: tank.fuelType,
        currentQuantityInTank: tank.currentQuantityInTank,
        sumOfMRNQuantities: tank.sumOfMRNQuantities,
        difference: tank.difference,
        mrnBreakdown: tank.mrnBreakdown || []
      }))
    };
    
    res.status(200).json({
      message: result.inconsistentTanks > 0 
        ? `Detektirano ${result.inconsistentTanks} nekonzistentnih tankova s ukupnom razlikom od ${result.totalDifference.toFixed(2)}L` 
        : 'Svi tankovi su konzistentni',
      data: response
    });
  } catch (error) {
    logger.error('Greška prilikom provjere konzistentnosti:', error);
    next(error);
  }
};
