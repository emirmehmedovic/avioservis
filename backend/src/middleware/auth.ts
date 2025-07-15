import { Request, Response, NextFunction } from 'express';
import jwt, { VerifyErrors } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    res.status(401).json({ message: 'Token nije priložen.' });
    return;
  }

  try {
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decodedToken: object | string | undefined) => {
        if (err) {
          return reject(err);
        }
        resolve(decodedToken);
      });
    });

    req.user = decoded as { id: number; username: string; role: string; iat?: number; exp?: number }; 
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token je istekao.' }); // Using 401 for expired token
    } else if (error.name === 'JsonWebTokenError') {
      res.status(403).json({ message: 'Token nije validan (malformed/invalid signature).' });
    } else {
      res.status(403).json({ message: 'Greška prilikom validacije tokena.' });
    }
  }
};

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ message: 'Nedozvoljen pristup.' });
      return;
    }
    next();
  };
}

// Nova funkcija: provjera više uloga
export function checkRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Nedozvoljen pristup.' });
      return;
    }
    next();
  };
}
