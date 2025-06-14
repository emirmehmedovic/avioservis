import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle validation results
const validate = (req: Request, res: Response, next: NextFunction) => {
  console.log('[validate middleware] Entered for a drain record request.');
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    console.log('[validate middleware] No validation errors, calling next().');
    return next();
  }
  const extractedErrors: Record<string, string>[] = [];
  errors.array().map(err => extractedErrors.push({ [err.type === 'field' ? err.path : 'general']: err.msg }));
  console.log('[validate middleware] Validation errors found:', extractedErrors);
  return res.status(400).json({
    message: 'Greška prilikom validacije ulaznih podataka.',
    errors: extractedErrors,
  });
};

// Create validation rules array
const validationRules = [
  // Validate drain_datetime
  body('drain_datetime')
    .notEmpty().withMessage('Datum i vrijeme istakanja su obavezni')
    .isISO8601().withMessage('Datum i vrijeme moraju biti u ISO formatu')
    .toDate(),
  
  // Validate source_type
  body('source_type')
    .notEmpty().withMessage('Tip izvora je obavezan')
    .isIn(['fixed', 'mobile']).withMessage('Tip izvora mora biti "fixed" ili "mobile"'),
  
  // Validate source_id
  body('source_id')
    .notEmpty().withMessage('ID izvora je obavezan')
    .isInt({ min: 1 }).withMessage('ID izvora mora biti pozitivan broj')
    .toInt(),
  
  // Validate quantity_liters
  body('quantity_liters')
    .notEmpty().withMessage('Količina je obavezna')
    .isFloat({ gt: 0 }).withMessage('Količina mora biti pozitivan broj')
    .toFloat(),
  
  // Validate notes (optional)
  body('notes')
    .optional()
    .isString().withMessage('Napomena mora biti tekst')
];

// Create a middleware function that applies validation rules and then validates
export const validateDrainRecord = (req: Request, res: Response, next: NextFunction) => {
  console.log('[validateDrainRecord] Applying validation rules');
  
  // Apply all validation rules
  Promise.all(validationRules.map(validation => validation.run(req)))
    .then(() => {
      // Check for validation errors
      const errors = validationResult(req);
      if (errors.isEmpty()) {
        console.log('[validateDrainRecord] No validation errors, proceeding');
        return next();
      }
      
      // Handle validation errors
      const extractedErrors: Record<string, string>[] = [];
      errors.array().map(err => extractedErrors.push({ [err.type === 'field' ? err.path : 'general']: err.msg }));
      console.log('[validateDrainRecord] Validation errors found:', extractedErrors);
      return res.status(400).json({
        message: 'Greška prilikom validacije ulaznih podataka.',
        errors: extractedErrors,
      });
    })
    .catch(error => {
      console.error('[validateDrainRecord] Error during validation:', error);
      return res.status(500).json({ message: 'Interna greška prilikom validacije.' });
    });
};

console.log('[fuelDrain.validator.ts] validateDrainRecord chain defined.');
