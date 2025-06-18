import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import * as z from 'zod';

const prisma = new PrismaClient();

/**
 * Pomoćna funkcija za pravilnu obradu decimalnih brojeva
 * VAŽNO: Osigurava da se decimalni brojevi pravilno interpretiraju kao decimale, a ne tisuće
 */
const parseDecimalValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  
  // Ako je već broj, samo ga vraćamo
  if (typeof value === 'number') return value;
  
  // Ako je string, pretvaramo ga u broj
  return Number(value);
};

// Validation schema for creating a tank refill
const tankRefillSchema = z.object({
  date: z.string().refine((val: string) => !isNaN(Date.parse(val)), {
    message: 'Datum mora biti validan',
  }),
  quantity_liters: z.number().positive('Količina mora biti pozitivan broj'),
  quantity_kg: z.number().positive('Količina u kilogramima mora biti pozitivan broj'),
  operational_density: z.number().positive('Operacijska gustoća mora biti pozitivan broj'),
  supplier: z.string().min(1, 'Dobavljač je obavezan'),
  invoice_number: z.string().optional(),
  price_per_liter: z.number().optional(),
  notes: z.string().optional(),
});

export const getTankRefills = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Check if the tank exists
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!tank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    // Get all refills for the tank
    const refills = await (prisma as any).fuelTankRefill.findMany({
      where: { tankId: Number(id) },
      orderBy: { date: 'desc' },
    });
    
    res.status(200).json(refills);
  } catch (error) {
    console.error('Error fetching tank refills:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju dopuna tankera' });
  }
};

export const createTankRefill = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const validationResult = tankRefillSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    const { date, quantity_liters, quantity_kg, operational_density, supplier, invoice_number, price_per_liter, notes } = validationResult.data;
    
    // Check if the tank exists
    const tank = await (prisma as any).fuelTank.findUnique({
      where: { id: Number(id) },
    });
    
    if (!tank) {
      res.status(404).json({ message: 'Tanker nije pronađen' });
      return;
    }
    
    // Check if the refill would exceed the tank's capacity
    // Koristimo sigurnu funkciju za obradu decimalnih vrijednosti
    const currentLiters = parseDecimalValue(tank.current_liters);
    const currentKg = parseDecimalValue(tank.current_kg);
    const capacityLiters = parseDecimalValue(tank.capacity_liters);
    const addedLiters = parseDecimalValue(quantity_liters);
    const addedKg = parseDecimalValue(quantity_kg);
    
    // Detaljno logiranje za debug
    logger.info(`Provjera kapaciteta tanka ID ${id}:`);
    logger.info(`Raw current_liters value: ${String(tank.current_liters)}`);
    logger.info(`Raw current_kg value: ${String(tank.current_kg)}`);
    logger.info(`Raw capacity_liters value: ${String(tank.capacity_liters)}`);
    logger.info(`Raw quantity_liters value: ${String(quantity_liters)}`);
    logger.info(`Raw quantity_kg value: ${String(quantity_kg)}`);
    logger.info(`Parsed currentLiters: ${currentLiters.toFixed(3)} L`);
    logger.info(`Parsed currentKg: ${currentKg.toFixed(3)} kg`);
    logger.info(`Parsed capacityLiters: ${capacityLiters.toFixed(3)} L`);
    logger.info(`Parsed addedLiters: ${addedLiters.toFixed(3)} L`);
    logger.info(`Parsed addedKg: ${addedKg.toFixed(3)} kg`);
    
    const newAmount = currentLiters + addedLiters;
    const newKgAmount = currentKg + addedKg;
    logger.info(`Novo stanje: ${newAmount.toFixed(3)} L, ${newKgAmount.toFixed(3)} kg`);
    
    // Provjeri nekonzistentnost - trenutno stanje veće od kapaciteta
    if (currentLiters > capacityLiters) {
      logger.error(`Detektirana nekonzistentnost podataka tanka ID ${id}: Trenutno stanje (${currentLiters.toFixed(3)} L) veće od kapaciteta (${capacityLiters.toFixed(3)} L)`);
    }
    
    // Ako je kapacitet nerazumno mali ili velik, koristimo standardni kapacitet mobilnog tankera
    if (capacityLiters < 1 || capacityLiters > 1000000) {
      const standardCapacity = 24500;
      logger.warn(`Neispravan kapacitet tanka ID ${id}: ${capacityLiters.toFixed(3)} L. Koristim standardnu vrijednost: ${standardCapacity} L`);
      
      // Provjera s korigiranim kapacitetom
      if (newAmount > standardCapacity) {
        const excessAmount = newAmount - standardCapacity;
        logger.info(`Prekoračenje korigiranog kapaciteta: ${excessAmount.toFixed(3)} L`);
        
        res.status(400).json({ 
          message: `Dopuna bi prekoračila kapacitet tankera (${standardCapacity} L) za ${excessAmount.toFixed(2)} litara` 
        });
        return;
      }
    } else if (newAmount > capacityLiters) {
      // Standardna provjera ako je kapacitet ispravan
      const excessAmount = newAmount - capacityLiters;
      logger.info(`Prekoračenje kapaciteta: ${excessAmount.toFixed(3)} L`);
      
      // Posebna obrada za slučaj negativnog "prekoračenja"
      if (excessAmount < 0) {
        logger.error(`Detektirano negativno prekoračenje kapaciteta: ${excessAmount.toFixed(3)} L. Ovo je vjerojatno greška u podacima.`);
        res.status(400).json({ 
          message: `Detektirana nekonzistentnost u podacima. Molimo kontaktirajte administratora sistema. (Kod greške: NPC-${Math.abs(Math.round(excessAmount))})` 
        });
      } else {
        res.status(400).json({ 
          message: `Dopuna bi prekoračila kapacitet tankera za ${excessAmount.toFixed(2)} litara` 
        });
      }
      return;
    }
    
    // Use a transaction to ensure both operations succeed or fail together
    const [refill, _] = await (prisma as any).$transaction([
      // Create the refill record
      (prisma as any).fuelTankRefill.create({
        data: {
          tankId: Number(id),
          date: new Date(date),
          quantity_liters,
          quantity_kg,
          operational_density,
          supplier,
          invoice_number,
          price_per_liter,
          notes,
        },
      }),
      
      // Update the tank's current level - izbjegavamo increment i koristimo direktnu vrijednost
      // za sprječavanje problema s konverzijom tipova
      (prisma as any).fuelTank.update({
        where: { id: Number(id) },
        data: {
          current_liters: newAmount, // Koristimo već izračunatu vrijednost koja je sigurno broj
          current_kg: newKgAmount, // Ažuriraj current_kg polje
        },
      }),
    ]);
    
    res.status(201).json(refill);
  } catch (error) {
    console.error('Error creating tank refill:', error);
    res.status(500).json({ message: 'Greška pri evidentiranju dopune tankera' });
  }
}; 