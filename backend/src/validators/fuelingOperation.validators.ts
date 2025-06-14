import { body, oneOf, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const createFuelingOperationRules = [
  body('dateTime')
    .isISO8601()
    .withMessage('Date and time must be a valid ISO 8601 date.')
    .toDate(), // Sanitizer to convert to Date object
  oneOf([
    body('aircraftId').exists().isInt({ gt: 0 }).withMessage('Aircraft ID must be a positive integer.'),
    body('aircraft_registration').exists().trim().notEmpty().withMessage('Aircraft registration cannot be empty.')
  ], { message: 'Either Aircraft ID or Aircraft Registration must be provided and valid.' }),
  // Individual validations for format if fields are present (works alongside oneOf)
  body('aircraftId')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('Aircraft ID must be a positive integer if provided.'),
 body('aircraft_registration')
    .optional()
    .trim()
    .isString()
    .withMessage('Aircraft registration must be a string if provided.'),
  body('airlineId')
    .isInt({ gt: 0 })
    .withMessage('Airline ID must be a positive integer.'),
  body('destination').optional().trim().isString().withMessage('Destination must be a string if provided.'),
  body('quantity_liters')
    .isFloat({ gt: 0 })
    .withMessage('Quantity in liters must be a positive number.'),
  body('specific_density')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Specific density must be a positive number.')
    .default(0.8),
  body('quantity_kg')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Quantity in kilograms must be a positive number.'),
  body('price_per_kg')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Price per kilogram must be a positive number.'),
  body('currency')
    .optional()
    .isIn(['BAM', 'EUR', 'USD'])
    .withMessage('Currency must be one of: BAM, EUR, USD'),
  body('usd_exchange_rate')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('USD exchange rate must be a positive number if provided.'),
  body('total_amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Total amount must be a positive number.'),
  body('tankId')
    .isInt({ gt: 0 })
    .withMessage('Tank ID must be a positive integer.'),
  body('flight_number').optional().trim().isString().withMessage('Flight number must be a string if provided.'),
  body('operator_name')
    .trim()
    .notEmpty()
    .withMessage('Operator name is required.')
    .isString()
    .withMessage('Operator name must be a string.'),
  body('notes').optional().trim().isString().withMessage('Notes must be a string if provided.'),
  body('tip_saobracaja').optional().trim().isString().withMessage('Tip saobraćaja must be a string if provided.'),
  body('delivery_note_number').optional().trim().isString().withMessage('Broj dostavnice must be a string if provided.'),
];

export const updateFuelingOperationRules = [
  body('dateTime')
    .optional()
    .isISO8601()
    .withMessage('Date and time must be a valid ISO 8601 date if provided.')
    .toDate(),
  body('aircraftId')
    .optional({ values: 'null' }) // Allows explicit null or empty string to signify removal
    .customSanitizer(value => (value === '' || value === null) ? null : value) // Convert empty string to null
    .if(value => value !== null) // Only validate if not explicitly set to null
    .isInt({ gt: 0 })
    .withMessage('Aircraft ID must be a positive integer if provided.'),
  body('aircraft_registration')
    .optional({ values: 'null' })
    .customSanitizer(value => (value === '' || value === null) ? null : value)
    .if(value => value !== null)
    .trim()
    .isString()
    .withMessage('Aircraft registration must be a string if provided and not empty.')
    .notEmpty()
    .withMessage('Aircraft registration cannot be an empty string if provided.'),
  body('airlineId')
    .optional()
    .isInt({ gt: 0 })
    .withMessage('Airline ID must be a positive integer if provided.'),
  body('destination')
    .optional({ values: 'null' })
    .customSanitizer(value => (value === '' || value === null) ? null : value)
    .if(value => value !== null)
    .trim()
    .isString()
    .withMessage('Destination must be a string if provided.'),
  body('flight_number')
    .optional({ values: 'null' })
    .customSanitizer(value => (value === '' || value === null) ? null : value)
    .if(value => value !== null)
    .trim()
    .isString()
    .withMessage('Flight number must be a string if provided.'),
  body('operator_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Operator name cannot be empty if provided.')
    .isString()
    .withMessage('Operator name must be a string if provided.'),
  body('notes')
    .optional({ values: 'null' })
    .customSanitizer(value => (value === '' || value === null) ? null : value)
    .if(value => value !== null)
    .trim()
    .isString()
    .withMessage('Notes must be a string if provided.'),
  body('delivery_note_number')
    .optional({ values: 'null' })
    .customSanitizer(value => (value === '' || value === null) ? null : value)
    .if(value => value !== null)
    .trim()
    .isString()
    .withMessage('Broj dostavnice must be a string if provided.'),
  body('currency')
    .optional()
    .isIn(['BAM', 'EUR', 'USD'])
    .withMessage('Currency must be one of: BAM, EUR, USD if provided.'),
  body('usd_exchange_rate')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('USD exchange rate must be a positive number if provided.'),
  body('total_amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Total amount must be a positive number if provided.'),
  // Ensure that tankId and quantity_liters are not part of the update request
  body('tankId').not().exists().withMessage('tankId cannot be updated.'),
  body('quantity_liters').not().exists().withMessage('quantity_liters cannot be updated.'),
];

// Re-use the validate function from fixedStorageTank.validators.ts or define a similar one if needed.
// For now, let's assume 'validate' will be imported from a shared validators utility file or defined here.
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors: any[] = [];
  // Handle oneOf errors specifically if needed, or they'll appear under _error
  errors.array({ onlyFirstError: true }).forEach(err => {
    if (err.type === 'alternative_grouped') { // This is how oneOf errors might appear
        extractedErrors.push({ general: err.msg, nested_errors: err.nestedErrors.map((e: any) => e.msg) });
    } else if (err.type === 'field'){
        extractedErrors.push({ [err.path]: err.msg });
    } else {
        extractedErrors.push({ general: err.msg });
    }
  });

  res.status(422).json({
    errors: extractedErrors,
  });
  return; // Ensure void return for RequestHandler type after sending response
};
