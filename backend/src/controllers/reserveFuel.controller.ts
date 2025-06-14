import { Response } from 'express';
import { AuthRequest } from '../types/auth';
import { parseDecimalValue } from '../utils/numberUtils';
import prismaClient from '../utils/prisma';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { ExcessFuelExchangeResult } from '../utils/excessFuelExchangeService';

// Proširena definicija tipa za Prisma klijent koji uključuje tankReserveFuel
type ExtendedPrismaClient = PrismaClient & {
  tankReserveFuel: any
};

// Primijeni prošireni tip na postojeći Prisma klijent
const prisma = prismaClient as ExtendedPrismaClient;

/**
 * Dohvaća listu rezervnog goriva za određeni tank
 */
export const getReserveFuelByTank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tankId, tankType = 'fixed' } = req.params;
    
    if (!tankId) {
      res.status(400).json({ 
        success: false, 
        message: "ID tanka je obavezan parametar" 
      });
      return;  // Dodajemo return kako bi zaustavili izvršavanje funkcije
    }

    const tankIdNum = parseInt(tankId, 10);
    
    if (isNaN(tankIdNum)) {
      res.status(400).json({ 
        success: false, 
        message: "ID tanka mora biti broj" 
      });
      return;  // Dodajemo return kako bi zaustavili izvršavanje funkcije
    }

    const reserveFuel = await prisma.tankReserveFuel.findMany({
      where: {
        tank_id: tankIdNum,
        tank_type: tankType
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Izračunaj ukupno raspoloživo gorivo (koje nije još iskorišteno)
    const availableReserveFuel = reserveFuel
      .filter((item: any) => !item.is_dispensed)
      .reduce((sum: number, item: any) => sum + Number(item.quantity_liters), 0);

    // Uklanjamo 'return' s response poziva
    res.status(200).json({
      success: true,
      data: reserveFuel,
      summary: {
        totalAvailableLiters: availableReserveFuel,
        recordCount: reserveFuel.length,
        availableRecordCount: reserveFuel.filter((item: any) => !item.is_dispensed).length
      }
    });
  } catch (error) {
    logger.error(`Greška prilikom dohvaćanja rezervnog goriva: ${error instanceof Error ? error.message : String(error)}`);
    // Uklanjamo 'return' s response poziva
    res.status(500).json({ 
      success: false, 
      message: "Došlo je do greške prilikom dohvaćanja podataka o rezervnom gorivu" 
    });
  }
}

/**
 * Istoči (koristi) rezervno gorivo iz tanka
 */
export const dispenseReserveFuel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tankId, tankType = 'fixed' } = req.params;
    const { quantityLiters, notes, referenceOperationId = null } = req.body;
    
    if (!tankId || !quantityLiters) {
      res.status(400).json({ 
        success: false, 
        message: "ID tanka i količina litara su obavezni parametri" 
      });
      return;  // Dodajemo return kako bi zaustavili izvršavanje funkcije
    }

    const tankIdNum = parseInt(tankId, 10);
    const parsedQuantityLiters = parseDecimalValue(quantityLiters);
    
    if (isNaN(tankIdNum) || isNaN(parsedQuantityLiters)) {
      res.status(400).json({ 
        success: false, 
        message: "ID tanka mora biti broj i količina litara mora biti validan broj" 
      });
      return;  // Dodajemo return kako bi zaustavili izvršavanje funkcije
    }
    
    if (parsedQuantityLiters <= 0) {
      res.status(400).json({ 
        success: false, 
        message: "Količina za istočenje mora biti pozitivan broj" 
      });
      return;  // Dodajemo return kako bi zaustavili izvršavanje funkcije
    }

    // Dohvati dostupno rezervno gorivo
    const availableReserveFuel = await prisma.tankReserveFuel.findMany({
      where: {
        tank_id: tankIdNum,
        tank_type: tankType,
        is_dispensed: false
      },
      orderBy: {
        created_at: 'asc' // FIFO pristup
      }
    });

    // Provjeri da li ima dovoljno goriva za istočenje
    const totalAvailableLiters = availableReserveFuel.reduce(
      (sum: number, item: any) => sum + Number(item.quantity_liters), 0
    );

    if (totalAvailableLiters < parsedQuantityLiters) {
      res.status(400).json({
        success: false,
        message: `Nema dovoljno raspoloživog rezervnog goriva. Zatraženo: ${parsedQuantityLiters.toFixed(2)} L, raspoloživo: ${totalAvailableLiters.toFixed(2)} L`
      });
      return;  // Dodajemo return kako bi zaustavili izvršavanje funkcije
    }

    // Uzmi gorivo iz rezervnih zapisa po FIFO principu
    let remainingToDispense = parsedQuantityLiters;
    const dispensedRecords: any[] = [];
    
    // Započni transakciju
    const result = await prisma.$transaction(async (tx: any) => {
      for (const record of availableReserveFuel) {
        if (remainingToDispense <= 0) break;

        const recordLiters = Number(record.quantity_liters);
        let amountToDispense = 0;

        if (remainingToDispense >= recordLiters) {
          // Iskoristi cijeli zapis
          amountToDispense = recordLiters;
          const updatedRecord = await tx.tankReserveFuel.update({
            where: { id: record.id },
            data: {
              is_dispensed: true,
              dispensed_at: new Date(),
              dispensed_by: req.user?.username || 'system',
              reference_operation_id: referenceOperationId ? parseInt(referenceOperationId, 10) : null,
              notes: notes ? `${record.notes || ''}\nIstočenje: ${notes}` : record.notes
            }
          });
          
          dispensedRecords.push(updatedRecord);
        } else {
          // Iskoristi dio zapisa i kreiraj novi s ostatkom
          amountToDispense = remainingToDispense;
          
          // Ažuriraj postojeći zapis kao djelomično istočen
          const updatedRecord = await tx.tankReserveFuel.update({
            where: { id: record.id },
            data: {
              quantity_liters: recordLiters - remainingToDispense,
              notes: `${record.notes || ''}\nAžurirano: Izdvojeno ${remainingToDispense.toFixed(2)} L za istočenje.`
            }
          });
          
          // Kreiraj novi zapis za istočeni dio
          const dispensedPortion = await tx.tankReserveFuel.create({
            data: {
              tank_id: record.tank_id,
              tank_type: record.tank_type,
              source_mrn: record.source_mrn,
              source_mrn_id: record.source_mrn_id,
              quantity_liters: remainingToDispense,
              is_excess: record.is_excess,
              is_dispensed: true,
              dispensed_at: new Date(),
              dispensed_by: req.user?.username || 'system',
              reference_operation_id: referenceOperationId ? parseInt(referenceOperationId, 10) : null,
              notes: `Dio rezervnog goriva iz zapisa ID ${record.id}. ${notes || ''}`
            }
          });
          
          dispensedRecords.push(dispensedPortion);
        }
        
        remainingToDispense -= amountToDispense;
        
        // Smanjujemo trenutnu količinu litara u tanku za količinu koju istočimo
        if (tankType === 'fixed') {
          const tank = await tx.fixedStorageTanks.findUnique({
            where: { id: tankIdNum }
          });
          
          if (tank) {
            await tx.fixedStorageTanks.update({
              where: { id: tankIdNum },
              data: {
                current_liters: { decrement: amountToDispense }
              }
            });
            
            // Bilježimo aktivnost tanka
            await tx.fixedTankActivity.create({
              data: {
                fixed_tank_id: tankIdNum,
                activity_type: 'FUEL_DRAIN', // Koristimo FUEL_DRAIN za istočenje rezervnog goriva
                quantity_liters: amountToDispense,
                description: `Istočenje rezervnog goriva: ${amountToDispense.toFixed(2)} L`,
                user_id: req.user?.id || null,
                notes: notes || 'Istočenje rezervnog goriva'
              }
            });
          }
        } else if (tankType === 'mobile') {
          const tank = await tx.fuelTank.findUnique({
            where: { id: tankIdNum }
          });
          
          if (tank) {
            await tx.fuelTank.update({
              where: { id: tankIdNum },
              data: {
                current_liters: { decrement: amountToDispense }
              }
            });
          }
        }
      }
      
      // Logirati operaciju
      await tx.fuelOperationLog.create({
        data: {
          operationType: 'DRAIN', // Koristimo DRAIN jer ovo je istočenje goriva
          description: `Istočenje rezervnog goriva: ${parsedQuantityLiters.toFixed(2)} L`,
          details: JSON.stringify({
            tankId: tankIdNum,
            tankType,
            quantityLiters: parsedQuantityLiters,
            dispensedRecords: dispensedRecords.map(r => r.id)
          }),
          stateBefore: JSON.stringify({ totalAvailableLiters }),
          stateAfter: JSON.stringify({ totalAvailableLiters: totalAvailableLiters - parsedQuantityLiters }),
          sourceEntityType: tankType === 'fixed' ? 'FixedStorageTank' : 'FuelTank',
          sourceEntityId: tankIdNum,
          quantityLiters: parsedQuantityLiters,
          fuelType: 'JET-A1',
          userId: req.user?.id || null
        }
      });
      
      return dispensedRecords;
    });

    // Uklanjamo 'return' s response poziva
    res.status(200).json({
      success: true,
      message: `Uspješno istočeno ${parsedQuantityLiters.toFixed(2)} L rezervnog goriva`,
      data: {
        dispensedRecords: result,
        quantityDispensed: parsedQuantityLiters
      }
    });
    
  } catch (error) {
    logger.error(`Greška prilikom istočenja rezervnog goriva: ${error instanceof Error ? error.message : String(error)}`);
    // Uklanjamo 'return' s response poziva
    res.status(500).json({ 
      success: false, 
      message: "Došlo je do greške prilikom istočenja rezervnog goriva" 
    });
  }
}

/**
 * Dobiva ukupni sažetak rezervnog goriva za sve tankove
 */
export const getReserveFuelSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Dohvaća sve zapise rezervnog goriva koji nisu istočeni
    const reserveFuel = await prisma.tankReserveFuel.findMany({
      where: {
        is_dispensed: false
      }
    });

    // Grupiranje po tipu tanka i ID-u tanka
    const tankGroups: Record<string, {
      tankId: number,
      tankType: string,
      totalLiters: number,
      recordCount: number
    }> = {};

    for (const record of reserveFuel) {
      const key = `${record.tank_type}_${record.tank_id}`;
      
      if (!tankGroups[key]) {
        tankGroups[key] = {
          tankId: record.tank_id,
          tankType: record.tank_type,
          totalLiters: 0,
          recordCount: 0
        };
      }
      
      tankGroups[key].totalLiters += Number(record.quantity_liters);
      tankGroups[key].recordCount += 1;
    }

    // Ukupna količina litara za sve tankove
    const totalLiters = reserveFuel.reduce((sum: number, record: any) => sum + Number(record.quantity_liters), 0);

    // Uklanjamo 'return' s response poziva
    res.status(200).json({
      success: true,
      data: {
        tanks: Object.values(tankGroups),
        total: {
          liters: totalLiters,
          recordCount: reserveFuel.length
        }
      }
    });
    
  } catch (error) {
    logger.error(`Greška prilikom dohvaćanja sažetka rezervnog goriva: ${error instanceof Error ? error.message : String(error)}`);
    // Uklanjamo 'return' s response poziva
    res.status(500).json({ 
      success: false, 
      message: "Došlo je do greške prilikom dohvaćanja sažetka rezervnog goriva" 
    });
  }
}
/**
 * Dohvaća historiju automatskih zamjena viška goriva za određeni tank
 */
export const getExchangeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tankId, tankType = 'all' } = req.params;
    const { page = '1', pageSize = '10' } = req.query;
    
    // Transformacija parametara u brojeve
    const tankIdNum = tankId ? parseInt(tankId, 10) : undefined;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10))); // Ograničenje od 1-100
    
    // Izračunavanje offseta za paginaciju
    const skip = (pageNum - 1) * pageSizeNum;
    
    // Kreiranje filtera prema parametrima
    const filters: any = {
      is_excess_transfer: true // Ovo filtrira samo automatske zamjene
    };
    
    // Dodaj filter za specifični tank ako je naveden
    if (tankIdNum) {
      if (tankType === 'mobile') {
        filters.mobile_tank_id = tankIdNum;
      } else if (tankType === 'fixed') {
        filters.fixed_tank_id = tankIdNum;
      } else {
        // Ako je 'all', tražimo bilo koji od ova dva tipa
        filters.OR = [
          { mobile_tank_id: tankIdNum },
          { fixed_tank_id: tankIdNum }
        ];
      }
    }
    
    // Koristimo type assertion za pristup modelu fuelTransactions
    const prismaAny = prisma as any;
    
    // Dohvat podataka o zamjenama iz transakcija
    const exchangeHistory = await prismaAny.fuelTransactions.findMany({
      where: filters,
      orderBy: {
        transaction_date: 'desc'
      },
      skip,
      take: pageSizeNum,
      include: {
        mobileTank: {
          select: {
            registration_number: true,
            capacity: true
          }
        },
        fixedTank: {
          select: {
            tank_name: true,
            location_description: true
          }
        }
      }
    });
    
    // Brojanje ukupnih rezultata za paginaciju
    const totalCount = await prismaAny.fuelTransactions.count({
      where: filters
    });
    
    // Izračunavanje ukupnog broja stranica
    const totalPages = Math.ceil(totalCount / pageSizeNum);
    
    res.status(200).json({
      success: true,
      data: exchangeHistory,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalCount,
        totalPages
      }
    });
    
  } catch (error) {
    logger.error(`Greška prilikom dohvaćanja historije zamjena: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      success: false,
      message: "Došlo je do greške prilikom dohvaćanja historije automatskih zamjena viška goriva"
    });
  }
}

/**
 * Dohvaća detaljne informacije o specifičnoj zamjeni viška goriva
 */
export const getExchangeDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { exchangeId } = req.params;
    
    if (!exchangeId) {
      res.status(400).json({
        success: false,
        message: "ID zamjene je obavezan parametar"
      });
      return;
    }
    
    const exchangeIdNum = parseInt(exchangeId, 10);
    
    if (isNaN(exchangeIdNum)) {
      res.status(400).json({
        success: false,
        message: "ID zamjene mora biti broj"
      });
      return;
    }
    
    // Koristimo type assertion za pristup modelu fuelTransactions
    const prismaAny = prisma as any;
    
    // Dohvati transakciju zamjene i sve povezane transakcije (par može imati 2 zapisa)
    const mainTransaction = await prismaAny.fuelTransactions.findUnique({
      where: {
        id: exchangeIdNum,
        is_excess_transfer: true // Osigurava da se radi o zamjeni viška
      },
      include: {
        mobileTank: {
          select: {
            id: true,
            registration_number: true,
            capacity: true,
            current_quantity_liters: true,
            current_quantity_kg: true
          }
        },
        fixedTank: {
          select: {
            id: true,
            tank_name: true,
            location_description: true,
            current_quantity_liters: true,
            current_quantity_kg: true
          }
        }
      }
    });
    
    if (!mainTransaction) {
      res.status(404).json({
        success: false,
        message: "Zamjena s navedenim ID-em nije pronađena"
      });
      return;
    }
    
    // Dohvati povezanu transakciju (ako postoji)
    // Ako je glavna transakcija MOBILE_TO_FIXED, tražimo FIXED_TO_MOBILE i obrnuto
    const relatedTransactions = await prismaAny.fuelTransactions.findMany({
      where: {
        is_excess_transfer: true,
        id: { not: exchangeIdNum },
        OR: [
          // Traži povezanu transakciju koja dijeli isti vremenski okvir (unutar 10 sekundi)
          {
            transaction_date: {
              gte: new Date(mainTransaction.transaction_date.getTime() - 10000),
              lte: new Date(mainTransaction.transaction_date.getTime() + 10000)
            },
            mobile_tank_id: mainTransaction.mobile_tank_id,
            fixed_tank_id: mainTransaction.fixed_tank_id
          }
        ]
      }
    });
    
    // Format za odgovor koji uključuje glavnu transakciju i povezane transakcije
    const exchangeDetails: any = {
      mainTransaction,
      relatedTransactions,
      summary: {
        totalTransactions: 1 + relatedTransactions.length,
        exchangeDate: mainTransaction.transaction_date,
        mobileTankInfo: mainTransaction.mobileTank,
        fixedTankInfo: mainTransaction.fixedTank,
        sourceMrn: mainTransaction.source_mrn
      }
    };
    
    // Izračunaj ukupno litara i kg koji su bili predmet zamjene
    const totalLiters = [mainTransaction, ...relatedTransactions].reduce(
      (sum, tx) => sum + parseFloat(tx.quantity_liters.toString()), 
      0
    );
    
    const totalKg = [mainTransaction, ...relatedTransactions].reduce(
      (sum, tx) => sum + parseFloat(tx.quantity_kg.toString()), 
      0
    );
    
    exchangeDetails.summary.totalLiters = totalLiters;
    exchangeDetails.summary.totalKg = totalKg;
    
    res.status(200).json({
      success: true,
      data: exchangeDetails
    });
    
  } catch (error) {
    logger.error(`Greška prilikom dohvaćanja detalja zamjene: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      success: false,
      message: "Došlo je do greške prilikom dohvaćanja detalja automatske zamjene"
    });
  }
}
