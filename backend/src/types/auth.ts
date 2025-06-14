import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Eksplicitno prošireni tip za Request koji uključuje korisničke podatke
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  } & JwtPayload;
}
