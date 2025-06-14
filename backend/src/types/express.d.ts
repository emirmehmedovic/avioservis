import 'express';
import { Response } from 'express';

/**
 * Proširenje Express tipova za bolju integraciju s TypeScript-om
 */
declare global {
  namespace Express {
    // Proširuje Express Request s korisničkim svojstvima
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
      };
    }
  }
}

// Proširenje funkcionalnosti Response da se može koristiti s Promise<void>
declare module 'express-serve-static-core' {
  interface Response {
    // Dopušta lanac metoda koje se mogu koristiti s Promise<void>
    status(code: number): this & Promise<void>;
    json(body: any): this & Promise<void>;
    send(body: any): this & Promise<void>;
  }
}
