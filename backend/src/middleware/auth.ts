import { Request, Response, NextFunction } from 'express';
import jwt, { VerifyErrors } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  console.log('[authenticateToken] Entered');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    console.log('[authenticateToken] No token provided, sending 401');
    // Ensure response is sent and function exits
    res.status(401).json({ message: 'Token nije priložen.' });
    return;
  }

  try {
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decodedToken: object | string | undefined) => {
        if (err) {
          console.log('[authenticateToken] jwt.verify callback error. Error:', err.message);
          return reject(err);
        }
        resolve(decodedToken);
      });
    });

    // Assuming 'decoded' is the user payload from the token
    // Adjust if your AuthRequest['user'] type is different or needs specific properties from 'decoded'
    req.user = decoded as { id: number; username: string; role: string; iat?: number; exp?: number }; 
    console.log('[authenticateToken] Authentication successful, user:', req.user, 'Calling next()');
    next();
  } catch (error: any) {
    console.log('[authenticateToken] Token verification failed (catch block). Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token je istekao.' }); // Using 401 for expired token
    } else if (error.name === 'JsonWebTokenError') {
      res.status(403).json({ message: 'Token nije validan (malformed/invalid signature).' });
    } else {
      res.status(403).json({ message: 'Greška prilikom validacije tokena.' });
    }
    // No explicit return needed here as res.status().json() handles the response termination.
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
