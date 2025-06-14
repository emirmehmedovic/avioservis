import { Request, Response, NextFunction } from 'express';
import { validationResult, Result, ValidationError } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors: Result<ValidationError> = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  // Formatiranje grešaka da budu čitljivije
  const extractedErrors: Array<{ [key: string]: string }> = [];
  errors.array().map(err => {
    if (err.type === 'field') {
        extractedErrors.push({ [err.path]: err.msg });
    }
  });

  res.status(400).json({
    message: 'Validation failed.',
    errors: extractedErrors,
  });
};
