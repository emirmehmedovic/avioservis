import { Request, Response, NextFunction } from 'express';
import jwt, { VerifyErrors } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  console.log('DEBUG AUTH - Autentikacija za putanju:', req.originalUrl);
  console.log('DEBUG AUTH - Authorization header:', req.headers['authorization']);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('DEBUG AUTH - Ekstrahirani token:', token ? `${token.substring(0, 10)}...` : 'null');
  console.log('DEBUG AUTH - JWT_SECRET length:', JWT_SECRET.length);

  if (token == null) {
    console.log('DEBUG AUTH - Greška: Token nije priložen');
    res.status(401).json({ message: 'Token nije priložen.' });
    return;
  }

  try {
    console.log('DEBUG AUTH - Verifikacija tokena u toku...');
    
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decodedToken: object | string | undefined) => {
        if (err) {
          console.log('DEBUG AUTH - Greška pri verifikaciji:', err.name, err.message);
          return reject(err);
        }
        console.log('DEBUG AUTH - Uspješna verifikacija tokena');
        resolve(decodedToken);
      });
    });

    req.user = decoded as { id: number; username: string; role: string; iat?: number; exp?: number }; 
    console.log('DEBUG AUTH - Dekodiran korisnik:', { id: req.user.id, username: req.user.username, role: req.user.role });
    next();
  } catch (error: any) {
    console.log('DEBUG AUTH - Greška pri autentikaciji:', error.name, error.message);
    
    if (error.name === 'TokenExpiredError') {
      console.log('DEBUG AUTH - Token je istekao');
      res.status(401).json({ message: 'Token je istekao.' }); // Using 401 for expired token
    } else if (error.name === 'JsonWebTokenError') {
      console.log('DEBUG AUTH - Neispravan token format ili potpis');
      res.status(403).json({ message: 'Token nije validan (malformed/invalid signature).' });
    } else {
      console.log('DEBUG AUTH - Ostale greške pri validaciji');
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
