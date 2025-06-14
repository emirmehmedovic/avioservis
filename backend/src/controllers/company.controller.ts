import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import * as CompanyService from '../services/company.service';

// GET /companies
export async function getAllCompanies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companies = await CompanyService.findAllCompanies();
    res.json(companies);
  } catch (error) {
    console.error('Error getting all companies:', error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja firmi.' });
  }
}

// GET /companies/:id
export async function getCompanyById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID firme.' });
      return;
    }
    const company = await CompanyService.findCompanyById(id);
    if (!company) {
      res.status(404).json({ message: 'Firma nije pronađena.' });
      return;
    }
    res.json(company);
  } catch (error) {
    console.error(`Error getting company by id ${req.params.id}:`, error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja firme.' });
  }
}

// POST /companies (ADMIN only)
export async function createCompany(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const { name, taxId, city, address, contactPersonName, contactPersonPhone } = req.body;
    const existingCompany = await CompanyService.findCompanyByName(name);
    if (existingCompany) {
      res.status(409).json({ message: 'Firma sa tim imenom već postoji.' });
      return;
    }
    const companyData = {
      name,
      taxId,
      city,
      address,
      contactPersonName,
      contactPersonPhone
    };
    const company = await CompanyService.createNewCompany(companyData);
    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Greška na serveru prilikom kreiranja firme.' });
  }
}

// PUT /companies/:id (ADMIN only)
export async function updateCompany(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID firme.' });
      return;
    }
    const { name, taxId, city, address, contactPersonName, contactPersonPhone } = req.body;

    // Provjeravamo da li je barem jedno polje poslano za ažuriranje
    if (Object.keys(req.body).length === 0) {
      res.status(400).json({ message: 'Potrebno je poslati barem jedno polje za ažuriranje.' });
      return;
    }

    const companyData = {
      name,
      taxId,
      city,
      address,
      contactPersonName,
      contactPersonPhone
    };

    // Uklanjamo undefined polja kako ne bismo slali null vrijednosti za polja koja nisu namjerno postavljena na null
    Object.keys(companyData).forEach(key => companyData[key as keyof typeof companyData] === undefined && delete companyData[key as keyof typeof companyData]);

    const company = await CompanyService.updateCompanyById(id, companyData);
    res.json(company);
  } catch (error: any) {
    console.error(`Error updating company ${req.params.id}:`, error);
    if (error.code === 'P2025') { 
      res.status(404).json({ message: 'Firma nije pronađena za ažuriranje.' });
    } else if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      res.status(409).json({ message: 'Firma sa tim imenom već postoji.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom ažuriranja firme.' });
    }
  }
}

// DELETE /companies/:id (ADMIN only)
export async function deleteCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID firme.' });
      return;
    }
    await CompanyService.deleteCompanyById(id);
    res.status(200).json({ message: 'Firma uspješno obrisana.' });
  } catch (error: any) {
    console.error(`Error deleting company ${req.params.id}:`, error);
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Firma nije pronađena za brisanje.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom brisanja firme.' });
    }
  }
}
