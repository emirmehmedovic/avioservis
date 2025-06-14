import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import * as CompanyController from '../controllers/company.controller';
import { validateRequest } from '../middleware/validateRequest';
import { createCompanySchema, updateCompanySchema, companyIdSchema } from '../schemas/company.schema';

const router = Router();

// Get all companies
router.get('/', authenticateToken, CompanyController.getAllCompanies);

// Get company by id
router.get('/:id', authenticateToken, validateRequest(companyIdSchema), CompanyController.getCompanyById);

// Create company (ADMIN only)
router.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(createCompanySchema),
  CompanyController.createCompany
);

// Update company (ADMIN only)
router.put(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(updateCompanySchema),
  CompanyController.updateCompany
);

// Delete company (ADMIN only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(companyIdSchema),
  CompanyController.deleteCompany
);

export default router;
