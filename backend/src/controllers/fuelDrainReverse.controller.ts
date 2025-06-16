import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient, Prisma, FixedTankActivityType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // Za precizne decimalne kalkulacije

const prisma = new PrismaClient();

// Definirajmo proširene tipove za FuelDrainRecord koji uključuju mrnBreakdown polje
type ExtendedFuelDrainRecordInput = Prisma.FuelDrainRecordUncheckedCreateInput & {
  mrnBreakdown?: string | null;
};

// Prošireni tip za FuelDrainRecord model
type ExtendedFuelDrainRecord = {
  id: number;
  dateTime: Date;
  sourceType: string;
  sourceFixedTankId: number | null;
  sourceMobileTankId: number | null;
  quantityLiters: number;
  notes: string | null;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  mrnBreakdown?: string | null;
};

/**
 * Process a reverse transaction for drained fuel
 * This allows filtered fuel to be returned to a fixed tank or mobile tanker
 */
export const reverseFuelDrainTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { dateTime, destinationType, destinationId, quantityLiters, notes, originalDrainId } = req.body;
  console.log('[reverseFuelDrainTransaction] Received request body:', req.body);

  if (!dateTime || !destinationType || !destinationId || quantityLiters === undefined || !originalDrainId) {
    res.status(400).json({ 
      message: 'Sva obavezna polja moraju biti proslijeđena (datum, tip odredišta, ID odredišta, količina, ID originalne drenaže).' 
    });
    return;
  }

  const parsedDateTime = new Date(dateTime);
  const parsedDestinationId = parseInt(destinationId, 10);
  const parsedOriginalDrainId = parseInt(originalDrainId, 10);
  const numericQuantity = parseFloat(quantityLiters);
  
  if (isNaN(parsedDestinationId) || isNaN(numericQuantity) || numericQuantity <= 0 || isNaN(parsedOriginalDrainId)) {
    res.status(400).json({ 
      message: 'Neispravan ID odredišta, ID originalne drenaže ili količina. Količina mora biti pozitivan broj.' 
    });
    return;
  }

  if (parsedDateTime > new Date()) {
    res.status(400).json({ message: 'Datum i vrijeme povrata ne mogu biti u budućnosti.' });
    return;
  }

  if (!['fixed', 'mobile'].includes(destinationType)) {
    res.status(400).json({ 
      message: 'Nepoznat tip odredišta. Dozvoljeni tipovi su: fixed, mobile' 
    });
    return;
  }

  const userIdAuth = req.user!.id;

  try {
    // Fetch the original drain record to verify it exists and check quantities
    const originalDrainRecord = await prisma.fuelDrainRecord.findUnique({
      where: { id: parsedOriginalDrainId }
    }) as unknown as ExtendedFuelDrainRecord | null;
    
    // Dohvati MRN podatke iz originalnog zapisa o istakanju
    console.log(`[reverseFuelDrainTransaction] Dohvaćam MRN podatke iz originalnog zapisa ID: ${parsedOriginalDrainId}`);
    let originalMrnBreakdown: { mrn: string, quantity: number }[] = [];
    
    // Sada koristimo prošireni tip pa možemo direktno pristupiti mrnBreakdown polju
    if (originalDrainRecord?.mrnBreakdown) {
      try {
        originalMrnBreakdown = JSON.parse(originalDrainRecord.mrnBreakdown);
        console.log(`[reverseFuelDrainTransaction] Pronađeni MRN podaci u originalnom zapisu:`, JSON.stringify(originalMrnBreakdown));
      } catch (e) {
        console.error(`[reverseFuelDrainTransaction] Greška pri parsiranju MRN podataka:`, e);
      }
    } else {
      console.log(`[reverseFuelDrainTransaction] Originalni zapis nema MRN podatke`);
    }

    if (!originalDrainRecord) {
      res.status(404).json({ message: 'Originalni zapis drenaže nije pronađen.' });
      return;
    }

    // Verify the quantity to return doesn't exceed the original drained amount
    if (numericQuantity > originalDrainRecord.quantityLiters) {
      res.status(400).json({ 
        message: `Količina za povrat ne može biti veća od originalno drenirane količine (${originalDrainRecord.quantityLiters} L).` 
      });
      return;
    }

    // Pre-transaction checks for destination capacity
    if (destinationType === 'fixed') {
      const tank = await prisma.fixedStorageTanks.findUnique({
        where: { id: parsedDestinationId },
      });
      
      if (!tank) {
        res.status(404).json({ message: 'Odredišni fiksni tank nije pronađen.' });
        return;
      }
      
      const availableCapacity = tank.capacity_liters - tank.current_quantity_liters;
      if (availableCapacity < numericQuantity) {
        res.status(400).json({ 
          message: `Nedovoljno kapaciteta u fiksnom tanku ${tank.location_description || tank.tank_identifier}. Dostupno: ${availableCapacity.toFixed(2)} L.` 
        });
        return;
      }
    } else if (destinationType === 'mobile') {
      const mobileTank = await prisma.fuelTank.findFirst({
        where: { 
          id: parsedDestinationId,
          is_deleted: false // Ne dohvaćamo obrisane cisterne 
        } as any, // Type assertion da izbjegnemo TS grešku
      });
      
      if (!mobileTank) {
        res.status(404).json({ message: 'Odredišni mobilni tank nije pronađen.' });
        return;
      }
      
      const availableCapacity = Number(mobileTank.capacity_liters) - Number(mobileTank.current_liters);
      if (availableCapacity < numericQuantity) {
        res.status(400).json({ 
          message: `Nedovoljno kapaciteta u mobilnom tanku ${mobileTank.name}. Dostupno: ${availableCapacity.toFixed(2)} L.` 
        });
        return;
      }
    }

    // Process the reverse transaction in a database transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update the destination tank quantity
      if (destinationType === 'fixed') {
        // Dohvati odredišni tank da bismo mogli izračunati količinu u kg
        const destinationTank = await tx.fixedStorageTanks.findUnique({
          where: { id: parsedDestinationId },
          select: { id: true, current_quantity_liters: true, current_quantity_kg: true }
        });
        
        // Izračunaj specifičnu gustoću iz trenutnog stanja tanka
        const DEFAULT_SPECIFIC_DENSITY = new Decimal('0.8'); // Defaultna gustoća za Jet A1 gorivo
        let specificGravity = DEFAULT_SPECIFIC_DENSITY;
        
        if (destinationTank && destinationTank.current_quantity_kg && 
            new Decimal(destinationTank.current_quantity_liters.toString()).greaterThan(0)) {
          specificGravity = new Decimal(destinationTank.current_quantity_kg.toString())
            .div(new Decimal(destinationTank.current_quantity_liters.toString()));
        }
        
        // Izračunaj količinu u kilogramima na osnovu litara i specifične gustoće
        const quantityKgToAdd = new Decimal(numericQuantity.toString())
          .mul(specificGravity)
          .toDecimalPlaces(3);
        
        // Ažuriraj trenutnu količinu goriva u tanku (i litre i kilograme)
        await tx.fixedStorageTanks.update({
          where: { id: parsedDestinationId },
          data: { 
            current_quantity_liters: { increment: numericQuantity },
            current_quantity_kg: { increment: quantityKgToAdd.toNumber() }
          },
        });
        
        // Ako se gorivo vraća u fiksni tank, trebamo ažurirati i zapise o carinskim prijavama
        // Prvo provjerimo da li originalna drenaža ima povezane zapise o carinskim prijavama
        // Ako nema, vraćamo gorivo u najnoviji MRN zapis ili kreiramo novi ako ne postoji nijedan
        
        // Dohvati najnoviji MRN zapis za odredišni tank
        const latestMRNRecord = await tx.$queryRaw<{
          id: number, 
          customs_declaration_number: string, 
          remaining_quantity_liters: number
        }[]>`
          SELECT id, customs_declaration_number, remaining_quantity_liters 
          FROM "TankFuelByCustoms" 
          WHERE fixed_tank_id = ${parsedDestinationId} 
          ORDER BY date_added DESC 
          LIMIT 1
        `;
        
        if (latestMRNRecord.length > 0) {
          // Ako postoji MRN zapis, ažuriraj ga
          const recordId = latestMRNRecord[0].id;
          console.log(`[reverseFuelDrainTransaction] Adding ${numericQuantity} L and ${quantityKgToAdd} KG back to customs record ID ${recordId} (MRN: ${latestMRNRecord[0].customs_declaration_number})`);
          
          // Dohvati trenutno stanje MRN zapisa
          const currentMrnRecord = await tx.tankFuelByCustoms.findUnique({
            where: { id: recordId },
            select: { remaining_quantity_liters: true, remaining_quantity_kg: true }
          });
          
          if (currentMrnRecord) {
            // Eksplicitna konverzija u brojeve za sigurno računanje
            const currentLiters = Number(currentMrnRecord.remaining_quantity_liters || 0);
            const currentKg = Number(currentMrnRecord.remaining_quantity_kg || 0);
            const addedLiters = Number(numericQuantity);
            const addedKg = Number(quantityKgToAdd.toNumber());
            
            // Izračunaj nove vrijednosti
            const newLiters = currentLiters + addedLiters;
            const newKg = currentKg + addedKg;
            
            console.log(`MRN ${latestMRNRecord[0].customs_declaration_number} - povrat goriva:`);
            console.log(`Trenuno stanje: ${currentLiters.toFixed(3)} L / ${currentKg.toFixed(3)} KG`);
            console.log(`Dodajem: ${addedLiters.toFixed(3)} L / ${addedKg.toFixed(3)} KG`);
            console.log(`Novo stanje: ${newLiters.toFixed(3)} L / ${newKg.toFixed(3)} KG`);
            
            // Ažuriramo i litre i kilograme, koristeći Prisma API umjesto raw SQL
            await tx.tankFuelByCustoms.update({
              where: { id: recordId },
              data: {
                remaining_quantity_liters: newLiters,
                remaining_quantity_kg: newKg
              }
            });
          } else {
            // Fallback na raw SQL ako zapis nije pronađen (ne bi se trebalo dogoditi, ali za svaki slučaj)
            console.warn(`MRN zapis ID ${recordId} nije pronađen pri dohvaćanju trenutnih vrijednosti. Koristim raw SQL.`);
            
            await tx.$executeRaw`
              UPDATE "TankFuelByCustoms" 
              SET 
                remaining_quantity_liters = remaining_quantity_liters + ${numericQuantity},
                remaining_quantity_kg = remaining_quantity_kg + ${quantityKgToAdd.toNumber()}
              WHERE id = ${recordId}
            `;
          }
        } else {
          // Ako ne postoji MRN zapis, kreiraj novi sa oznakom "POVRAT"
          console.log(`[reverseFuelDrainTransaction] Creating new customs record for returned fuel: ${numericQuantity} L`);
          
          await tx.$executeRaw`
            INSERT INTO "TankFuelByCustoms" (
              fixed_tank_id, 
              fuel_intake_record_id, 
              customs_declaration_number, 
              original_quantity_liters, 
              remaining_quantity_liters, 
              date_added
            ) VALUES (
              ${parsedDestinationId}, 
              NULL, 
              'POVRAT-${parsedOriginalDrainId}', 
              ${numericQuantity}, 
              ${numericQuantity}, 
              NOW()
            )
          `;
        }
        
        // Kreiraj zapis o aktivnosti u fiksnom tanku za povrat goriva
        await tx.fixedTankTransfers.create({
          data: {
            // Privremeno koristimo 'FUEL_DRAIN' kao tip aktivnosti dok se ne riješi problem s enum vrijednosti
            // U budućnosti će se koristiti FixedTankActivityType.FUEL_RETURN kad bude dostupan
            activity_type: 'FUEL_DRAIN' as any, // Koristimo 'as any' da izbjegnemo TypeScript greške
            affected_fixed_tank_id: parsedDestinationId,
            quantity_liters_transferred: numericQuantity,
            quantity_kg_transferred: quantityKgToAdd.toNumber(), // Ažurirano s izračunatom vrijednosti u kg
            transfer_datetime: parsedDateTime,
            notes: notes || `Povrat filtriranog goriva iz drenaže ID: ${parsedOriginalDrainId}`
          }
        });
      } else if (destinationType === 'mobile') {
        // Dohvati odredišni mobilni tank da bismo mogli izračunati količinu u kg
        const destinationTank = await tx.fuelTank.findFirst({
          where: { 
            id: parsedDestinationId, 
            is_deleted: false // Ne dohvaćamo obrisane cisterne
          } as any, // Type assertion da izbjegnemo TS grešku
          select: { id: true, current_kg: true, current_liters: true }
        });
        
        // Izračunaj specifičnu gustoću iz trenutnog stanja tanka
        const DEFAULT_SPECIFIC_DENSITY = new Decimal('0.8'); // Defaultna gustoća za Jet A1 gorivo
        let specificGravity = DEFAULT_SPECIFIC_DENSITY;
        
        if (destinationTank && destinationTank.current_kg && 
            new Decimal(destinationTank.current_liters.toString()).greaterThan(0)) {
          specificGravity = new Decimal(destinationTank.current_kg.toString())
            .div(new Decimal(destinationTank.current_liters.toString()));
        }
        
        // Izračunaj količinu u kilogramima na osnovu litara i specifične gustoće
        const quantityKgToAdd = new Decimal(numericQuantity.toString())
          .mul(specificGravity)
          .toDecimalPlaces(3);
        
        await tx.fuelTank.update({
          where: { id: parsedDestinationId },
          data: { 
            current_liters: { increment: numericQuantity },
            current_kg: { increment: quantityKgToAdd.toNumber() }
          },
        });
      }

      // Pripremi MRN breakdown podatke za povrat goriva
      let mrnBreakdownJson = null;
      
      // Ako imamo MRN podatke iz originalnog zapisa, kopirat ćemo ih u zapis o povratu
      // ali s negativnim količinama jer se radi o povratu goriva
      if (originalMrnBreakdown && originalMrnBreakdown.length > 0) {
        // Prilagodimo količine prema omjeru povrata
        const ratio = numericQuantity / originalDrainRecord!.quantityLiters;
        
        // Kreiraj kopiju MRN podataka s prilagođenim količinama
        const reverseMrnBreakdown = originalMrnBreakdown.map(item => ({
          mrn: item.mrn,
          // Negativna količina jer se radi o povratu goriva, skalirana prema omjeru povrata
          quantity: -1 * item.quantity * ratio
        }));
        
        mrnBreakdownJson = JSON.stringify(reverseMrnBreakdown);
        console.log(`[reverseFuelDrainTransaction] MRN breakdown za povrat goriva: ${mrnBreakdownJson}`);
      } else {
        console.log(`[reverseFuelDrainTransaction] Nema MRN podataka za kopiranje u zapis o povratu`);
      }
      
      // Create a record of this reverse transaction
      // We'll create a new model for tracking reverse transactions
      // For now, we'll use a simple structure with notes to track the relationship
      // Koristimo prošireni tip koji uključuje mrnBreakdown polje
      const createData: ExtendedFuelDrainRecordInput = {
        dateTime: parsedDateTime,
        // For reverse transactions, we're creating a "negative" drain record
        // The source becomes the destination, and we're adding fuel instead of removing it
        sourceType: destinationType,
        sourceFixedTankId: destinationType === 'fixed' ? parsedDestinationId : null,
        sourceMobileTankId: destinationType === 'mobile' ? parsedDestinationId : null,
        // Store as negative quantity to indicate it's a reverse transaction
        quantityLiters: -numericQuantity,
        notes: notes || `Povrat filtriranog goriva iz drenaže ID: ${parsedOriginalDrainId}`,
        userId: userIdAuth,
        // Dodajemo MRN breakdown podatke
        mrnBreakdown: mrnBreakdownJson,
      };
      
      const reverseRecord = await tx.fuelDrainRecord.create({
        data: createData,
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

      return reverseRecord;
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
      isReverseTransaction: true,
      originalDrainId: parsedOriginalDrainId
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('[reverseFuelDrainTransaction] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Odredišni tank ili originalna drenaža nisu pronađeni.' });
      } else {
        res.status(500).json({ message: `Greška baze podataka: ${error.message}` });
      }
    } else {
      next(error);
    }
  }
};
