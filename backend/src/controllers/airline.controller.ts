import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/airlines - Fetch all airlines
export const getAllAirlines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const airlines = await prisma.airline.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    res.status(200).json(airlines);
  } catch (error) {
    next(error);
  }
};
