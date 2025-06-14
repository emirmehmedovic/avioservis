import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const createFixedStorageTankRules = [
  body('tank_name')
    .trim()
    .notEmpty()
    .withMessage('Tank name is required.')
    .isString()
    .withMessage('Tank name must be a string.'),
  body('tank_identifier')
    .trim()
    .notEmpty()
    .withMessage('Tank identifier is required.')
    .isString()
    .withMessage('Tank identifier must be a string.'),
  body('capacity_liters')
    .isFloat({ gt: 0 })
    .withMessage('Capacity in liters must be a positive number.'),
  body('current_liters')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current liters must be a non-negative number.')
    .custom((value, { req }) => {
      // Ensure capacity_liters is a number before comparison
      const capacity = parseFloat(req.body.capacity_liters);
      if (isNaN(capacity)) {
        // This case should ideally be caught by capacity_liters validation
        // but good to have a safeguard or log an issue.
        return true; // Or throw an error if capacity_liters is not yet validated/available
      }
      if (value > capacity) {
        throw new Error('Current liters cannot exceed capacity liters.');
      }
      return true;
    }),
  body('fuel_type')
    .trim()
    .notEmpty()
    .withMessage('Fuel type is required.')
    .isString()
    .withMessage('Fuel type must be a string.'),
  body('location_description').optional().trim().isString().withMessage('Location description must be a string.'),
  body('status')
    .optional()
    .trim()
    .isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'])
    .withMessage('Status must be one of: ACTIVE, INACTIVE, MAINTENANCE, OUT_OF_SERVICE.'),
];

export const updateFixedStorageTankRules = [
  body('tank_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tank name cannot be empty if provided.')
    .isString()
    .withMessage('Tank name must be a string if provided.'),
  body('tank_identifier')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tank identifier cannot be empty if provided.')
    .isString()
    .withMessage('Tank identifier must be a string if provided.'),
  body('capacity_liters')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Capacity in liters must be a positive number if provided.'),
  body('current_liters')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current liters must be a non-negative number if provided.'),
  body('fuel_type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Fuel type cannot be empty if provided.')
    .isString()
    .withMessage('Fuel type must be a string if provided.'),
  body('location_description').optional().trim().isString().withMessage('Location description must be a string if provided.'),
  body('status')
    .optional()
    .trim()
    .isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'])
    .withMessage('Status must be one of: ACTIVE, INACTIVE, MAINTENANCE, OUT_OF_SERVICE if provided.'),
];

export const transferFuelBetweenFixedTanksRules = [
  body('sourceTankId')
    .isInt({ gt: 0 })
    .withMessage('Source tank ID must be a positive integer.'),
  body('destinationTankId')
    .isInt({ gt: 0 })
    .withMessage('Destination tank ID must be a positive integer.')
    .custom((value, { req }) => {
      if (value === req.body.sourceTankId) {
        throw new Error('Destination tank ID cannot be the same as source tank ID.');
      }
      return true;
    }),
  body('quantityLiters')
    .isFloat({ gt: 0 })
    .withMessage('Quantity in liters must be a positive number.'),
];

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors: any[] = [];
  errors.array().map(err => extractedErrors.push({ [err.type === 'field' ? err.path : 'general']: err.msg }));

  res.status(422).json({
    errors: extractedErrors,
  });
  return;
};
