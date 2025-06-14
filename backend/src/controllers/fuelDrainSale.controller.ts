import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Process a fuel sale transaction for drained fuel
 * This allows drained fuel to be sold to external parties
 */
export const processFuelDrainSale = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { dateTime, quantityLiters, notes, originalDrainId, buyerName } = req.body;
  console.log('[processFuelDrainSale] Received request body:', req.body);

  if (!dateTime || quantityLiters === undefined || !originalDrainId || !buyerName) {
    res.status(400).json({ 
      message: 'Sva obavezna polja moraju biti proslijeđena (datum, količina, ID originalne drenaže, naziv kupca).' 
    });
    return;
  }

  const parsedDateTime = new Date(dateTime);
  const parsedOriginalDrainId = parseInt(originalDrainId, 10);
  const numericQuantity = parseFloat(quantityLiters);
  
  if (isNaN(numericQuantity) || numericQuantity <= 0 || isNaN(parsedOriginalDrainId)) {
    res.status(400).json({ 
      message: 'Neispravan ID originalne drenaže ili količina. Količina mora biti pozitivan broj.' 
    });
    return;
  }

  if (parsedDateTime > new Date()) {
    res.status(400).json({ message: 'Datum i vrijeme prodaje ne mogu biti u budućnosti.' });
    return;
  }

  const userIdAuth = req.user!.id;

  try {
    // Fetch the original drain record to verify it exists and check quantities
    const originalDrainRecord = await prisma.fuelDrainRecord.findUnique({
      where: { id: parsedOriginalDrainId }
    });

    if (!originalDrainRecord) {
      res.status(404).json({ message: 'Originalni zapis drenaže nije pronađen.' });
      return;
    }

    // Calculate how much fuel has already been returned or sold from this drain
    const existingReverseTransactions = await prisma.fuelDrainRecord.findMany({
      where: {
        notes: {
          contains: `ID: ${parsedOriginalDrainId}`
        },
        quantityLiters: {
          lt: 0 // Negative quantities indicate reverse transactions or sales
        }
      }
    });

    const alreadyProcessedQuantity = existingReverseTransactions.reduce(
      (total, record) => total + Math.abs(Number(record.quantityLiters)), 
      0
    );

    const availableQuantity = Number(originalDrainRecord.quantityLiters) - alreadyProcessedQuantity;

    // Verify the quantity to sell doesn't exceed the available drained amount
    if (numericQuantity > availableQuantity) {
      res.status(400).json({ 
        message: `Količina za prodaju ne može biti veća od dostupne drenirane količine (${availableQuantity.toFixed(2)} L).` 
      });
      return;
    }

    // Process the sale transaction
    const result = await prisma.fuelDrainRecord.create({
      data: {
        dateTime: parsedDateTime,
        // For sale transactions, we're creating a "negative" drain record with special notes
        sourceType: originalDrainRecord.sourceType,
        sourceFixedTankId: originalDrainRecord.sourceFixedTankId,
        sourceMobileTankId: originalDrainRecord.sourceMobileTankId,
        // Store as negative quantity to indicate it's a sale transaction
        quantityLiters: -numericQuantity,
        notes: `Prodaja goriva kupcu: ${buyerName}. Iz drenaže ID: ${parsedOriginalDrainId}`,
        userId: userIdAuth,
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        sourceFixedTank: {
          select: { id: true, tank_identifier: true, location_description: true, fuel_type: true },
        },
        sourceMobileTank: {
          select: { id: true, name: true, identifier: true, fuel_type: true, location: true },
        },
      },
    });

    // Format the response
    let sourceName = 'Nepoznato';
    if (result.sourceType === 'fixed' && result.sourceFixedTank) {
      sourceName = result.sourceFixedTank.location_description
        ? `${result.sourceFixedTank.location_description} (${result.sourceFixedTank.tank_identifier})`
        : result.sourceFixedTank.tank_identifier || 'N/A';
    } else if (result.sourceType === 'mobile' && result.sourceMobileTank) {
      sourceName = `${result.sourceMobileTank.name} (${result.sourceMobileTank.identifier})`;
      if (result.sourceMobileTank.location) {
        sourceName += ` - ${result.sourceMobileTank.location}`;
      }
    }

    const response = {
      ...result,
      sourceName,
      userName: result.user?.username || 'Sistem',
      // Negate the quantity for display since we stored it as negative
      quantityLiters: Math.abs(Number(result.quantityLiters)),
      isSaleTransaction: true,
      originalDrainId: parsedOriginalDrainId,
      buyerName
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('[processFuelDrainSale] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Originalna drenaža nije pronađena.' });
      } else {
        res.status(500).json({ message: `Greška baze podataka: ${error.message}` });
      }
    } else {
      next(error);
    }
  }
};
