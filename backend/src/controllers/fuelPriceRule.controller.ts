import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client'; // Added Prisma for error handling
import { AuthRequest } from '../middleware/auth';
const prisma = new PrismaClient();

export const findFuelPriceRule = async (req: Request, res: Response): Promise<Response | void> => {
  const { airlineId, currency } = req.query;

  if (!airlineId || typeof airlineId !== 'string') {
    return res.status(400).json({ message: 'Airline ID je obavezan i mora biti string.' });
  }

  if (!currency || typeof currency !== 'string') {
    return res.status(400).json({ message: 'Valuta je obavezna i mora biti string.' });
  }

  try {
    const parsedAirlineId = parseInt(airlineId as string, 10);
    if (isNaN(parsedAirlineId)) {
      return res.status(400).json({ message: 'Neispravan format Airline ID-a.' });
    }

    // First try to find a specific rule for this airline
    let rule = await prisma.fuelPriceRule.findFirst({
      where: {
        airlineId: parsedAirlineId,
        currency: (currency as string).toUpperCase(), 
      },
      orderBy: {
        createdAt: 'desc', 
      },
    });

    // If no specific rule found, look for a general rule (airlineId: null)
    if (!rule) {
      rule = await prisma.fuelPriceRule.findFirst({
        where: {
          airlineId: null,
          currency: (currency as string).toUpperCase(), 
        },
        orderBy: {
          createdAt: 'desc', 
        },
      });
    }

    if (!rule) {
      return res.status(404).json({ message: 'Pravilo o cijeni nije pronađeno za datu avio-kompaniju i valutu.' });
    }

    return res.status(200).json(rule);
  } catch (error) {
    console.error('Greška pri dohvatanju pravila o cijeni goriva:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška.';
    return res.status(500).json({ message: 'Greška pri dohvatanju pravila o cijeni goriva', error: errorMessage });
  }
};

export const createFuelPriceRule = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const { airlineId, price, currency } = req.body;

  // airlineId can be null for general rules, or a valid number for specific rules
  if (airlineId !== null && (typeof airlineId !== 'number' || airlineId <= 0)) {
    return res.status(400).json({ message: 'Airline ID mora biti validan broj ili null za opća pravila.' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ message: 'Cijena je obavezna i mora biti pozitivan broj.' });
  }
  if (!currency || typeof currency !== 'string' || currency.trim() === '') {
    return res.status(400).json({ message: 'Valuta je obavezna.' });
  }

  try {
    // Check if airline exists only for specific rules (airlineId is not null)
    if (airlineId !== null) {
      const airlineExists = await prisma.airline.findUnique({ where: { id: airlineId } });
      if (!airlineExists) {
        return res.status(404).json({ message: `Avio-kompanija s ID ${airlineId} nije pronađena.` });
      }
    }

    const createData: Prisma.FuelPriceRuleCreateInput = {
      price: new Prisma.Decimal(price) as any,
      currency: currency.toUpperCase(),
    };

    // Add airline relation only if airlineId is not null
    if (airlineId !== null) {
      createData.airline = {
        connect: { id: airlineId },
      };
    }

    const newRule = await prisma.fuelPriceRule.create({
      data: createData,
      include: {
        airline: {
          select: {
            name: true,
          }
        }
      }
    });
    return res.status(201).json(newRule);
  } catch (error) {
    console.error('Greška pri kreiranju pravila o cijeni goriva:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { 
        const isGeneralRule = airlineId === null;
        const ruleType = isGeneralRule ? 'opće pravilo' : 'pravilo za odabranu avio-kompaniju';
        return res.status(409).json({ message: `${ruleType} o cijeni goriva za valutu ${currency.toUpperCase()} već postoji. Možete urediti postojeće pravilo.`, details: error.meta });
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška.';
    return res.status(500).json({ message: 'Greška pri kreiranju pravila o cijeni goriva', error: errorMessage });
  }
};

export const getAllFuelPriceRules = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const rules = await prisma.fuelPriceRule.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        airline: {
          select: {
            name: true,
          }
        }
      }
    });
    return res.status(200).json(rules);
  } catch (error) {
    console.error('Greška pri dohvatanju svih pravila o cijeni goriva:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška.';
    return res.status(500).json({ message: 'Greška pri dohvatanju svih pravila o cijeni goriva', error: errorMessage });
  }
};

export const updateFuelPriceRule = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const { id } = req.params;
  const { price, currency } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID pravila je obavezan.' });
  }

  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return res.status(400).json({ message: 'Neispravan format ID-a pravila.' });
  }

  // Validacija za price i currency (slično kao u createFuelPriceRule, ali opcionalno)
  if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
    return res.status(400).json({ message: 'Cijena mora biti pozitivan broj.' });
  }
  if (currency !== undefined && (typeof currency !== 'string' || currency.trim() === '')) {
    return res.status(400).json({ message: 'Valuta ne može biti prazna.' });
  }

  try {
    const existingRule = await prisma.fuelPriceRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return res.status(404).json({ message: `Pravilo o cijeni s ID ${ruleId} nije pronađeno.` });
    }

    // Kreiraj objekt s podacima za ažuriranje samo ako su vrijednosti poslane
    const dataToUpdate: { price?: number; currency?: string } = {};
    if (price !== undefined) {
      dataToUpdate.price = price;
    }
    if (currency !== undefined) {
      dataToUpdate.currency = currency.toUpperCase();
    }

    // Ako nema podataka za ažuriranje, vrati postojeće pravilo bez promjena (ili vrati grešku, ovisno o željenom ponašanju)
    if (Object.keys(dataToUpdate).length === 0) {
      // Vraćamo 200 OK s neizmijenjenim pravilom, jer nije bilo podataka za ažuriranje.
      // Alternativno, mogli bismo vratiti 304 Not Modified ili 400 Bad Request ako se očekuje da se bar nešto pošalje.
      return res.status(200).json(existingRule); 
    }

    const updatedRule = await prisma.fuelPriceRule.update({
      where: { id: ruleId },
      data: dataToUpdate,
      include: {
        airline: {
          select: {
            name: true,
          }
        }
      }
    });

    return res.status(200).json(updatedRule);
  } catch (error) {
    console.error('Greška pri ažuriranju pravila o cijeni goriva:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // 'Record to update not found.'
         return res.status(404).json({ message: `Pravilo o cijeni s ID ${ruleId} nije pronađeno za ažuriranje.` });
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška.';
    return res.status(500).json({ message: 'Greška pri ažuriranju pravila o cijeni goriva', error: errorMessage });
  }
};

export const deleteFuelPriceRule = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'ID pravila je obavezan.' });
  }

  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return res.status(400).json({ message: 'Neispravan format ID-a pravila.' });
  }

  try {
    const existingRule = await prisma.fuelPriceRule.findUnique({
      where: { id: ruleId },
      include: {
        airline: {
          select: {
            name: true,
          }
        }
      }
    });

    if (!existingRule) {
      return res.status(404).json({ message: `Pravilo o cijeni s ID ${ruleId} nije pronađeno.` });
    }

    await prisma.fuelPriceRule.delete({
      where: { id: ruleId },
    });

    const ruleDescription = existingRule.airlineId 
      ? `za ${existingRule.airline?.name || 'nepoznatu avio-kompaniju'}` 
      : 'opće pravilo';

    return res.status(200).json({ 
      message: `Pravilo o cijeni goriva ${ruleDescription} (${existingRule.currency}) uspješno obrisano.`,
      deletedRule: existingRule
    });
  } catch (error) {
    console.error('Greška pri brisanju pravila o cijeni goriva:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // 'Record to delete does not exist.'
         return res.status(404).json({ message: `Pravilo o cijeni s ID ${ruleId} nije pronađeno za brisanje.` });
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška.';
    return res.status(500).json({ message: 'Greška pri brisanju pravila o cijeni goriva', error: errorMessage });
  }
};

