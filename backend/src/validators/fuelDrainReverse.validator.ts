import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle validation results
const validate = (req: Request, res: Response, next: NextFunction) => {
  console.log('[validate middleware] Entered for a drain reverse transaction request.');
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
  // Validate dateTime
  body('dateTime')
    .notEmpty().withMessage('Datum i vrijeme povrata su obavezni')
    .isISO8601().withMessage('Datum i vrijeme moraju biti u ISO formatu')
    .toDate(),
  
  // Validate destinationType
  body('destinationType')
    .notEmpty().withMessage('Tip odredišta je obavezan')
    .isIn(['fixed', 'mobile']).withMessage('Tip odredišta mora biti "fixed" ili "mobile"'),
  
  // Validate destinationId
  body('destinationId')
    .notEmpty().withMessage('ID odredišta je obavezan')
    .isInt({ min: 1 }).withMessage('ID odredišta mora biti pozitivan broj')
    .toInt(),
  
  // Validate quantityLiters
  body('quantityLiters')
    .notEmpty().withMessage('Količina je obavezna')
    .isFloat({ gt: 0 }).withMessage('Količina mora biti pozitivan broj')
    .toFloat(),
  
  // Validate originalDrainId
  body('originalDrainId')
    .notEmpty().withMessage('ID originalne drenaže je obavezan')
    .isInt({ min: 1 }).withMessage('ID originalne drenaže mora biti pozitivan broj')
    .toInt(),
  
  // Validate notes (optional)
  body('notes')
    .optional()
    .isString().withMessage('Napomena mora biti tekst')
];

// Create a middleware function that applies validation rules and then validates
export const validateDrainReverseTransaction = (req: Request, res: Response, next: NextFunction) => {
  console.log('[validateDrainReverseTransaction] Applying validation rules');
  
  // Apply all validation rules
  Promise.all(validationRules.map(validation => validation.run(req)))
    .then(() => {
      // Check for validation errors
      const errors = validationResult(req);
      if (errors.isEmpty()) {
        console.log('[validateDrainReverseTransaction] No validation errors, proceeding');
        return next();
      }
      
      // Handle validation errors
      const extractedErrors: Record<string, string>[] = [];
      errors.array().map(err => extractedErrors.push({ [err.type === 'field' ? err.path : 'general']: err.msg }));
      console.log('[validateDrainReverseTransaction] Validation errors found:', extractedErrors);
      return res.status(400).json({
        message: 'Greška prilikom validacije ulaznih podataka.',
        errors: extractedErrors,
      });
    })
    .catch(error => {
      console.error('[validateDrainReverseTransaction] Error during validation:', error);
      return res.status(500).json({ message: 'Interna greška prilikom validacije.' });
    });
};

console.log('[fuelDrainReverse.validator.ts] validateDrainReverseTransaction chain defined.');
