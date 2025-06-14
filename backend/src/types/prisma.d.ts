import { PrismaClient } from '@prisma/client';
import { ValveTestType } from '@prisma/client';

// Extend the PrismaClient type to include the valveTestRecord model and SystemLog model
declare global {
  namespace PrismaClient {
    interface PrismaClient {
      valveTestRecord: {
        findMany: (args?: any) => Promise<any[]>;
        findUnique: (args?: any) => Promise<any | null>;
        create: (args?: any) => Promise<any>;
        update: (args?: any) => Promise<any>;
        delete: (args?: any) => Promise<any>;
      };
      SystemLog: {
        findMany: (args?: any) => Promise<any[]>;
        findUnique: (args?: any) => Promise<any | null>;
        create: (args?: any) => Promise<any>;
        update: (args?: any) => Promise<any>;
        delete: (args?: any) => Promise<any>;
      };
    }
  }
}

// Extend the FuelTransferToTanker model to include mrnBreakdown field
declare module '@prisma/client' {
  interface FuelTransferToTanker {
    mrnBreakdown?: string | null; // JSON string sa MRN podacima
  }
  
  // Extend the FuelingOperation model to include mrnBreakdown field
  interface FuelingOperation {
    mrnBreakdown?: string | null; // JSON string sa MRN podacima
    parsedMrnBreakdown?: { mrn: string, quantity: number }[]; // Parsirani MRN podaci za frontend
  }
}

// Export ValveTestType enum for use in the controller
export { ValveTestType };
