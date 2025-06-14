import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Define validation schema for fuel drain sale
const fuelDrainSaleSchema = z.object({
  dateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Datum i vrijeme moraju biti u validnom formatu',
  }),
  quantityLiters: z.number().positive({
    message: 'Količina mora biti pozitivan broj',
  }),
  notes: z.string().optional().nullable(),
  originalDrainId: z.number().int().positive({
    message: 'ID originalne drenaže mora biti pozitivan cijeli broj',
  }),
  buyerName: z.string().min(1, {
    message: 'Naziv kupca je obavezan',
  }),
});

// Middleware to validate the request body
export const validateDrainSaleTransaction = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Parse and validate the request body
    const validatedData = fuelDrainSaleSchema.parse({
      ...req.body,
      quantityLiters: parseFloat(req.body.quantityLiters),
      originalDrainId: parseInt(req.body.originalDrainId, 10),
    });
    
    // If validation passes, continue to the next middleware/controller
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract validation error messages
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      res.status(400).json({ message: `Validacija nije uspjela: ${errorMessages}` });
    } else {
      // Handle unexpected errors
      res.status(500).json({ message: 'Neočekivana greška pri validaciji' });
    }
  }
};
