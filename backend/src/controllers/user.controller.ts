import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import * as UserService from '../services/user.service';
import { Role } from '@prisma/client';

// GET /users (ADMIN only)
export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await UserService.findAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja korisnika.' });
  }
}

// GET /users/:id (ADMIN only)
export async function getUserById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID korisnika.' });
      return;
    }
    const user = await UserService.findUserById(id);
    if (!user) {
      res.status(404).json({ message: 'Korisnik nije pronađen.' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error(`Error getting user by id ${req.params.id}:`, error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja korisnika.' });
  }
}

// PUT /users/:id (ADMIN only)
export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID korisnika.' });
      return;
    }
    const { username, role } = req.body as { username?: string; role?: Role };

    if (username === undefined && role === undefined) {
      res.status(400).json({ message: 'Potrebno je navesti barem jedno polje za ažuriranje (username ili role).' });
      return;
    }

    const dataToUpdate: { username?: string; role?: Role } = {};
    if (username !== undefined) dataToUpdate.username = username;
    if (role !== undefined) dataToUpdate.role = role;

    const user = await UserService.updateUserById(id, dataToUpdate);
    res.json(user);
  } catch (err: any) {
    console.error(`Error updating user ${req.params.id}:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Korisnik nije pronađen za ažuriranje.' });
    } else if (err.code === 'P2002' && err.meta?.target?.includes('username')) {
        res.status(409).json({ message: 'Korisničko ime već postoji.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom ažuriranja korisnika.' });
    }
  }
}

// POST /users (ADMIN only)
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { username, password, role } = req.body as { username: string; password?: string; role: Role };

    if (!password) {
      // Password is required for new users
      res.status(400).json({ message: 'Lozinka je obavezna prilikom kreiranja novog korisnika.' });
      return;
    }

    const newUser = await UserService.createUser({ username, password, role });
    // Omit passwordHash from the response
    const { passwordHash: _, ...userWithoutPasswordHash } = newUser;
    res.status(201).json(userWithoutPasswordHash);
  } catch (err: any) {
    console.error('Error creating user:', err);
    if (err.code === 'P2002' && err.meta?.target?.includes('username')) {
      res.status(409).json({ message: 'Korisničko ime već postoji.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom kreiranja korisnika.' });
    }
  }
}

// DELETE /users/:id (ADMIN only)
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID korisnika.' });
      return;
    }

    if (req.user && req.user.id === id) {
        res.status(403).json({ message: 'Nije dozvoljeno brisanje sopstvenog naloga.' });
        return;
    }

    await UserService.deleteUserById(id);
    res.status(200).json({ message: 'Korisnik uspješno obrisan.' });
  } catch (err: any) {
    console.error(`Error deleting user ${req.params.id}:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Korisnik nije pronađen za brisanje.' });
    } else {
      res.status(500).json({ message: 'Greška na serveru prilikom brisanja korisnika.' });
    }
  }
}
