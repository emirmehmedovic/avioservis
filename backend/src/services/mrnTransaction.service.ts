import { Prisma, PrismaClient, MrnTransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

export { MrnTransactionType }; // Re-export for use in other services/controllers

const prisma = new PrismaClient();

// Tip za Prisma transakcijskog klijenta
type PrismaTransactionClient = Prisma.TransactionClient;

// Interface matching what the controllers expect
export interface MrnTransactionData {
  tankFuelByCustomsId?: number;
  mobileTankCustomsId?: number;
  transactionType: MrnTransactionType;
  quantity_kg_transferred: Decimal;
  mrn_customs_number?: string;
  related_mrn_transaction_id?: string;
  notes?: string;
}

/**
 * Creates a record of an MRN transaction leg.
 * Must be called within an existing Prisma transaction.
 * @param tx - Prisma transaction client.
 * @param data - Data for the new MRN transaction.
 */
export const createMrnTransaction = async (tx: PrismaTransactionClient, data: MrnTransactionData) => {
  // Detaljno logiranje podataka koji se koriste za kreiranje MrnTransactionLeg zapisa
  logger.info(`📝 Creating MrnTransactionLeg with data:`, {
    transactionType: data.transactionType,
    tankFuelByCustomsId: data.tankFuelByCustomsId,
    mobileTankCustomsId: data.mobileTankCustomsId,
    quantity_kg_transferred: data.quantity_kg_transferred.toString(),
    related_mrn_transaction_id: data.related_mrn_transaction_id,
    mrn_customs_number: data.mrn_customs_number
  });
  
  // Posebno logiranje relatedTransactionId jer je to ključno za povezivanje
  logger.info(`🔑 relatedTransactionId value: '${data.related_mrn_transaction_id}', type: ${typeof data.related_mrn_transaction_id}`);
  
  // Note: we're adapting the MrnTransactionData interface to match what the MrnTransactionLeg model expects
  const result = await tx.mrnTransactionLeg.create({
    data: {
      tankFuelByCustomsId: data.tankFuelByCustomsId,
      mobileTankCustomsId: data.mobileTankCustomsId,
      transactionType: data.transactionType,
      // Map the fields to what the schema expects
      kgTransacted: data.quantity_kg_transferred,
      litersTransactedActual: new Decimal(0), // Will be calculated based on density if needed
      operationalDensityUsed: new Decimal(0), // Will be set correctly if supplied
      literVarianceForThisLeg: new Decimal(0), // Will be calculated if relevant
      relatedTransactionId: data.related_mrn_transaction_id || undefined
    },
  });
  
  // Logiranje kreiranog zapisa
  logger.info(`✅ Created MrnTransactionLeg ID: ${result.id}, relatedTransactionId: '${result.relatedTransactionId}'`);
  
  return result;
};

/**
 * Oduzima gorivo po KG s MRN zapisa (FIFO), ažurira stanja i kreira transakcijske zapise.
 * @param tx - Prisma transakcijski klijent.
 * @param sourceId - ID fiksnog ili mobilnog tanka.
 * @param quantityToRemoveKg - Količina u KG za oduzimanje.
 * @param operationalDensity - Operativna gustoća u trenutku transakcije.
 * @param isMobileSource - Zastavica koja označava da li je izvor mobilni tank.
 * @param transactionType - Tip transakcije.
 * @param related_mrn_transaction_id - ID povezane transakcije (npr. FuelingOperation ID).
 */
export const processMrnDeduction = async (
  tx: PrismaTransactionClient,
  sourceId: number,
  quantityToRemoveKg: number,
  operationalDensity: number,
  isMobileSource: boolean,
  transactionType: MrnTransactionType,
  related_mrn_transaction_id: string
) => {
  const whereClause = isMobileSource
    ? { mobile_tank_id: sourceId, remaining_quantity_kg: { gt: 0 } }
    : { fixed_tank_id: sourceId, remaining_quantity_kg: { gt: 0 } };

  const model: any = isMobileSource ? tx.mobileTankCustoms : tx.tankFuelByCustoms;

  const mrnRecords = await model.findMany({
    where: whereClause,
    orderBy: { date_added: 'asc' },
  });

  let remainingKgToDeduct = new Decimal(quantityToRemoveKg);
  const deductionDetails = [];

  for (const record of mrnRecords) {
    if (remainingKgToDeduct.isZero() || remainingKgToDeduct.isNegative()) break;

    const recordKg = new Decimal(record.remaining_quantity_kg);
    const kgToDeductFromThisRecord = Decimal.min(recordKg, remainingKgToDeduct);

    const litersToDeductFromThisRecord = kgToDeductFromThisRecord.div(operationalDensity);

    const newRemainingKg = recordKg.sub(kgToDeductFromThisRecord);
    const newRemainingLiters = new Decimal(record.remaining_quantity_liters).sub(litersToDeductFromThisRecord);

    await model.update({
      where: { id: record.id },
      data: {
        remaining_quantity_kg: newRemainingKg,
        remaining_quantity_liters: newRemainingLiters,
      },
    });

    const legData: MrnTransactionData = {
      tankFuelByCustomsId: isMobileSource ? undefined : record.id,
      mobileTankCustomsId: isMobileSource ? record.id : undefined,
      transactionType,
      quantity_kg_transferred: kgToDeductFromThisRecord.negated(),
      related_mrn_transaction_id: related_mrn_transaction_id,
      // Za stari interface dodajemo obavezno polje
      mrn_customs_number: record.customs_declaration_number
    };

    await createMrnTransaction(tx, legData);
    await closeMrnIfDepleted(tx, record.id, isMobileSource);

    deductionDetails.push({ mrn: record.customs_declaration_number, deductedKg: kgToDeductFromThisRecord });
    remainingKgToDeduct = remainingKgToDeduct.sub(kgToDeductFromThisRecord);
  }

  if (remainingKgToDeduct.greaterThan(0.001)) {
    throw new Error(`Nedovoljno goriva sa MRN porijeklom. Potrebno: ${quantityToRemoveKg} kg, dostupno: ${new Decimal(quantityToRemoveKg).sub(remainingKgToDeduct).toFixed(2)} kg.`);
  }

  return deductionDetails;
};

/**
 * Provjerava da li je MRN zapis ispražnjen i ako jest, kreira zapis o zatvaranju.
 * @param tx - Prisma transakcijski klijent.
 * @param recordId - ID MRN zapisa (TankFuelByCustoms ili MobileTankCustoms).
 * @param isMobileSource - Da li je zapis iz mobilnog tanka.
 */
export const closeMrnIfDepleted = async (tx: PrismaTransactionClient, recordId: number, isMobileSource: boolean) => {
  const model: any = isMobileSource ? tx.mobileTankCustoms : tx.tankFuelByCustoms;
  const record = await model.findUnique({ 
    where: { id: recordId },
    include: isMobileSource ? undefined : { fuelIntakeRecord: true }
  });

  if (record && new Decimal(record.remaining_quantity_kg).lessThanOrEqualTo(0.1)) {
    logger.info(`MRN zapis ${record.customs_declaration_number} (ID: ${record.id}) je ispražnjen. Kreiranje zapisa o zatvaranju.`);

    // Za mobilni tank, `quantity_kg` je ukupan iznos. Za fiksni, to je `quantity_kg_received` na ulaznom zapisu.
    const totalKgProcessed = isMobileSource
      ? record.quantity_kg
      : record.fuelIntakeRecord.quantity_kg_received;

    // Provjeri postoji li već zapis za ovaj MRN
    const existingVariance = await tx.mrnClosedVariance.findUnique({
      where: { customsDeclarationNumber: record.customs_declaration_number }
    });

    if (!existingVariance) {
      // Samo kreiraj ako ne postoji
      await tx.mrnClosedVariance.create({
        data: {
          customsDeclarationNumber: record.customs_declaration_number,
          totalKgProcessed: totalKgProcessed,
          netLiterVariance: record.accumulatedLiterVariance,
        },
      });
    } else {
      logger.info(`MRN zapis ${record.customs_declaration_number} već ima zapis o zatvaranju. Preskačem kreiranje.`);
    }

    // Check for excess liters that need to be transferred to holding tank
    const remainingLiters = new Decimal(record.remaining_quantity_liters || 0);
    if (remainingLiters.greaterThan(0.1)) { // Only transfer if > 0.1L to avoid tiny amounts
      const holdingTankId = process.env.EXCESS_FUEL_HOLDING_TANK_ID;
      if (!holdingTankId) {
        logger.warn(`EXCESS_FUEL_HOLDING_TANK_ID not configured. Cannot transfer ${remainingLiters}L excess fuel from MRN ${record.customs_declaration_number}`);
      } else {
        logger.info(`Transferring ${remainingLiters}L excess fuel from MRN ${record.customs_declaration_number} to holding tank ${holdingTankId}`);
        
        try {
          // Update source tank/record - set remaining liters to 0
          await model.update({
            where: { id: recordId },
            data: { remaining_quantity_liters: 0 }
          });

          // Update holding tank - add the excess liters
          await tx.fixedStorageTanks.update({
            where: { id: parseInt(holdingTankId) },
            data: {
              current_quantity_liters: {
                increment: remainingLiters.toNumber()
              }
            }
          });

          // Create transaction record for the transfer
          await tx.mrnTransactionLeg.create({
            data: {
              tankFuelByCustomsId: isMobileSource ? null : recordId,
              mobileTankCustomsId: isMobileSource ? recordId : null,
              transactionType: 'EXCESS_TRANSFER_OUT',
              kgTransacted: new Decimal(0), // No KG transferred, only liters
              litersTransactedActual: remainingLiters,
              operationalDensityUsed: new Decimal(0.8), // Default density for calculation
              literVarianceForThisLeg: remainingLiters, // All remaining liters are variance
              timestamp: new Date(),
              relatedTransactionId: null
            }
          });

          logger.info(`Successfully transferred ${remainingLiters}L excess fuel to holding tank ${holdingTankId} from MRN ${record.customs_declaration_number}`);
        } catch (transferError) {
          logger.error(`Failed to transfer excess fuel to holding tank: ${transferError}`);
          // Don't re-throw - the MRN closing should still succeed even if transfer fails
        }
      }
    }

    // Opcionalno: Arhivirati zapis (npr. postaviti status na INACTIVE)
    // await model.update({ where: { id: recordId }, data: { status: 'INACTIVE' } });
  }
};
