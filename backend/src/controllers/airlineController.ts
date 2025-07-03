import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as z from 'zod';

const prisma = new PrismaClient();

// Validation schema for creating/updating an airline
const airlineSchema = z.object({
  name: z.string().min(1, 'Naziv avio kompanije je obavezan'),
  contact_details: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  isForeign: z.boolean().optional().default(false),
  operatingDestinations: z.array(z.string()).optional().default([]),
});

export const getAllAirlines = async (req: Request, res: Response): Promise<void> => {
  try {
    const airlines = await (prisma as any).airline.findMany({
      orderBy: { name: 'asc' },
    });
    
    res.status(200).json(airlines);
  } catch (error) {
    console.error('Error fetching airlines:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju avio kompanija' });
  }
};

export const getAirlineById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const airline = await (prisma as any).airline.findUnique({
      where: { id: Number(id) },
    });
    
    if (!airline) {
      res.status(404).json({ message: 'Avio kompanija nije pronađena' });
      return;
    }
    
    res.status(200).json(airline);
  } catch (error) {
    console.error('Error fetching airline:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju avio kompanije' });
  }
};

export const createAirline = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = airlineSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    const { name, contact_details, taxId, address, isForeign, operatingDestinations } = validationResult.data;
    
    // Check if airline name already exists
    const existingAirline = await (prisma as any).airline.findFirst({
      where: { name },
    });
    
    if (existingAirline) {
      res.status(400).json({ message: 'Avio kompanija s ovim nazivom već postoji' });
      return;
    }
    
    const newAirline = await (prisma as any).airline.create({
      data: {
        name,
        contact_details,
        taxId,
        address,
        isForeign,
        operatingDestinations,
      },
    });
    
    res.status(201).json(newAirline);
  } catch (error) {
    console.error('Error creating airline:', error);
    res.status(500).json({ message: 'Greška pri kreiranju avio kompanije' });
  }
};

export const updateAirline = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const validationResult = airlineSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        message: 'Validacijska greška',
        errors: validationResult.error.errors,
      });
      return;
    }
    
    const { name, contact_details, taxId, address, isForeign, operatingDestinations } = validationResult.data;
    
    // Check if the airline exists
    const existingAirline = await (prisma as any).airline.findUnique({
      where: { id: Number(id) },
    });
    
    if (!existingAirline) {
      res.status(404).json({ message: 'Avio kompanija nije pronađena' });
      return;
    }
    
    // Check if the name already exists for a different airline
    const nameExists = await (prisma as any).airline.findFirst({
      where: {
        name,
        id: { not: Number(id) },
      },
    });
    
    if (nameExists) {
      res.status(400).json({ message: 'Avio kompanija s ovim nazivom već postoji' });
      return;
    }
    
    const updatedAirline = await (prisma as any).airline.update({
      where: { id: Number(id) },
      data: {
        name,
        contact_details,
        taxId,
        address,
        isForeign,
        operatingDestinations,
      },
    });
    
    res.status(200).json(updatedAirline);
  } catch (error) {
    console.error('Error updating airline:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju avio kompanije' });
  }
};

export const deleteAirline = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Check if the airline exists
    const existingAirline = await (prisma as any).airline.findUnique({
      where: { id: Number(id) },
    });
    
    if (!existingAirline) {
      res.status(404).json({ message: 'Avio kompanija nije pronađena' });
      return;
    }
    
    // Check if the airline is referenced by any fueling operations (excluding deleted ones)
    const referencedOperations = await (prisma as any).fuelingOperation.findFirst({
      where: { 
        airlineId: Number(id),
        is_deleted: false // Ne uključujemo obrisane operacije
      },
    });
    
    if (referencedOperations) {
      res.status(400).json({ 
        message: 'Ne možete obrisati avio kompaniju koja se koristi u operacijama točenja goriva'
      });
      return;
    }
    
    await (prisma as any).airline.delete({
      where: { id: Number(id) },
    });
    
    res.status(200).json({ message: 'Avio kompanija uspješno obrisana' });
  } catch (error) {
    console.error('Error deleting airline:', error);
    res.status(500).json({ message: 'Greška pri brisanju avio kompanije' });
  }
}; 