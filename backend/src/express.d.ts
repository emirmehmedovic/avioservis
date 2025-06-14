// /Users/emir_mw/data-avioservis/backend/src/express.d.ts

declare namespace Express {
  export interface Request {
    user?: {
      id: number; // Assuming ID from auth is always a number
      username: string;
      role: string;
      // Add other user properties if needed, e.g., email
    };
  }
}
