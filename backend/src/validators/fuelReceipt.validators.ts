import { body } from 'express-validator';
import { validate } from './validate'; // Pretpostavka da validate.ts postoji i izvozi validate funkciju

export const createFuelReceiptRules = [
  body('dateTime')
    .isISO8601().withMessage('Date and time must be a valid ISO 8601 date.')
    .toDate(), // Sanitizacija u Date objekt
  body('fixedStorageTankId')
    .isInt({ gt: 0 }).withMessage('Fixed storage tank ID must be a positive integer.')
    .toInt(), // Sanitizacija u integer
  body('supplier')
    .optional()
    .isString().withMessage('Supplier must be a string.')
    .trim()
    .customSanitizer(value => value === '' ? null : value), // Prazan string u null
  body('quantityLiters')
    .isFloat({ gt: 0 }).withMessage('Quantity in liters must be a positive number.')
    .toFloat(), // Sanitizacija u float
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.')
    .trim()
    .customSanitizer(value => value === '' ? null : value), // Prazan string u null
];

export { validate };
