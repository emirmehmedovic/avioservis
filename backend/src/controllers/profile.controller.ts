import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import * as UserService from '../services/user.service';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// PUT /profile/password - Update current user's password
export async function updateUserPassword(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Niste autentificirani.' });
      return;
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, passwordHash: true }
    });

    if (!user) {
      res.status(404).json({ message: 'Korisnik nije pronađen.' });
      return;
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Trenutna lozinka nije ispravna.' });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.status(200).json({ message: 'Lozinka uspješno ažurirana.' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Greška na serveru prilikom ažuriranja lozinke.' });
  }
}
