import { body } from 'express-validator';
import { validate } from './validate';

export const createFuelTransferToTankerRules = [
  body('transfer_datetime')
    .isISO8601().withMessage('Datum i vrijeme transfera moraju biti u ISO8601 formatu.')
    .toDate(),
  body('source_fixed_tank_id')
    .isInt({ gt: 0 }).withMessage('ID izvornog fiksnog tanka mora biti pozitivan cijeli broj.')
    .toInt(),
  body('target_mobile_tank_id')
    .isInt({ gt: 0 }).withMessage('ID ciljnog mobilnog tankera mora biti pozitivan cijeli broj.')
    .toInt(),
  body('quantity_liters')
    .isFloat({ gt: 0 }).withMessage('Količina mora biti pozitivan broj.')
    .toFloat(),
  body('notes')
    .optional()
    .isString().withMessage('Napomene moraju biti tekst.'),
  // Validacija za fajl će biti implicitno obrađena kroz multer i provjeru u kontroleru
  validate,
];
