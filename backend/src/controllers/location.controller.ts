import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import * as LocationService from '../services/location.service';

// GET /locations
export async function getAllLocations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const locations = await LocationService.findAllLocations();
    res.json(locations);
  } catch (error) {
    console.error('Error getting all locations:', error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja lokacija.' });
  }
}

// GET /locations/:id
export async function getLocationById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID lokacije.' });
      return;
    }
    const location = await LocationService.findLocationById(id);
    if (!location) {
      res.status(404).json({ message: 'Lokacija nije pronađena.' });
      return;
    }
    res.json(location);
  } catch (error) {
    console.error(`Error getting location by id ${req.params.id}:`, error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja lokacije.' });
  }
}

// POST /locations (ADMIN only)
export async function createLocation(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const { name, address, companyTaxId } = req.body;
    const locationData: { name: string; address: string; companyTaxId?: string } = { name, address };
    if (companyTaxId !== undefined && companyTaxId !== null && companyTaxId !== '') { 
      locationData.companyTaxId = companyTaxId;
    }
    const location = await LocationService.createNewLocation(locationData);
    res.status(201).json(location);
  } catch (error: any) {
    console.error('Error creating location:', error);
    if (error.code === 'P2003' && error.meta?.field_name?.includes('companyTaxId')) {
        res.status(400).json({ message: 'Navedena firma (companyTaxId) ne postoji.' });
    } else {
        res.status(500).json({ message: 'Greška na serveru prilikom kreiranja lokacije.' });
    }
  }
}

// PUT /locations/:id (ADMIN only)
export async function updateLocation(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID lokacije.' });
      return;
    }
    const { name, address, companyTaxId } = req.body;
    const dataToUpdate: { name?: string; address?: string; companyTaxId?: string } = {};

    if (name !== undefined) dataToUpdate.name = name;
    if (address !== undefined) dataToUpdate.address = address;
    if (companyTaxId !== undefined) dataToUpdate.companyTaxId = companyTaxId === '' ? null : companyTaxId; 

    if (Object.keys(dataToUpdate).length === 0) {
      res.status(400).json({ message: 'Potrebno je navesti barem jedno polje za ažuriranje.' });
      return;
    }

    const location = await LocationService.updateLocationById(id, dataToUpdate);
    res.json(location);
  } catch (error: any) {
    console.error(`Error updating location ${req.params.id}:`, error);
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Lokacija nije pronađena za ažuriranje.' });
    } else if (error.code === 'P2003' && error.meta?.field_name?.includes('companyTaxId')){
      res.status(400).json({ message: 'Navedena firma (companyTaxId) ne postoji za ažuriranje.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom ažuriranja lokacije.' });
    }
  }
}

// DELETE /locations/:id (ADMIN only)
export async function deleteLocation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID lokacije.' });
      return;
    }
    await LocationService.deleteLocationById(id);
    res.status(200).json({ message: 'Lokacija uspješno obrisana.' });
  } catch (error: any) {
    console.error(`Error deleting location ${req.params.id}:`, error);
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Lokacija nije pronađena za brisanje.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom brisanja lokacije.' });
    }
  }
}
