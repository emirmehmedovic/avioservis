import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ status: 'error', message: 'Validation failed', errors: errorMessages });
      } else {
        // Forward other errors
        next(error);
      }
    }
};
