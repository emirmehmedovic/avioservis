import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import * as AuthService from '../services/auth.service';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const { username, password, role } = req.body;
    const existing = await AuthService.findUserByUsername(username);
    if (existing) {
      res.status(409).json({ message: 'Korisničko ime već postoji.' });
      return;
    }
    const user = await AuthService.createUser(username, password, role);
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Greška na serveru prilikom registracije.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  
  const clientIP = req.ip || 'unknown';
  
  try {
    const { username, password } = req.body;
    const user: User | null = await AuthService.findUserByUsername(username);
    
    // If user doesn't exist, log the attempt and return generic error
    if (!user) {
      console.warn(`Failed login attempt for non-existent user "${username}" from IP ${clientIP}`);
      res.status(401).json({ message: 'Pogrešan username ili password.' });
      return;
    }
    
    // Using type assertion to fix TypeScript errors
    const userWithLock = user as User & { lockUntil?: Date, failedLoginAttempts: number };
    
    // Check if account is locked
    if (userWithLock.lockUntil && userWithLock.lockUntil > new Date()) {
      const remainingTimeMs = userWithLock.lockUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingTimeMs / 1000 / 60);
      
      console.warn(`Login attempt for locked account: ${username} from IP ${clientIP}`);
      res.status(401).json({ 
        message: `Račun je privremeno zaključan zbog previše neuspjelih pokušaja. Pokušajte ponovo za ${remainingMinutes} minuta.`,
        locked: true,
        remainingMinutes
      });
      return;
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userWithLock.passwordHash);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      const updatedUser = await AuthService.incrementFailedLoginAttempts(userWithLock.id);
      const updatedUserWithLock = updatedUser as User & { failedLoginAttempts: number, lockUntil?: Date };
      
      // If too many failed attempts, lock the account
      if (updatedUserWithLock.failedLoginAttempts >= 5) {
        // Lock account for 15 minutes
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await AuthService.lockUser(userWithLock.id, lockUntil);
        
        console.warn(`Account locked: ${username} from IP ${clientIP} after ${updatedUserWithLock.failedLoginAttempts} failed attempts`);
        res.status(401).json({ 
          message: 'Pogrešan username ili password. Nalog je privremeno zaključan zbog previše pokušaja. Pokušajte kasnije.'
        });
        return;
      }
      
      console.warn(`Failed login attempt: ${username} from IP ${clientIP} (attempt ${updatedUserWithLock.failedLoginAttempts})`);
      res.status(401).json({ message: 'Pogrešan username ili password.' });
      return;
    }
    
    // Successful login - reset failed attempts counter
    await AuthService.resetFailedLoginAttempts(userWithLock.id);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userWithLock.id, username: userWithLock.username, role: userWithLock.role }, 
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRY } as any
    );
    
    // Remove sensitive data from response
    const { passwordHash, ...userData } = userWithLock;
    
    console.info(`Successful login: ${username} from IP ${clientIP}`);
    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Greška na serveru prilikom prijave.' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Niste autentifikovani.' });
    return;
  }
  try {
    const userFromDb = await AuthService.findUserById(req.user.id);
    if (!userFromDb) {
        res.status(404).json({ message: 'Korisnik nije pronađen.' });
        return;
    }
    res.json(userFromDb);
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Greška na serveru prilikom dohvatanja podataka o korisniku.' });
  }
}
