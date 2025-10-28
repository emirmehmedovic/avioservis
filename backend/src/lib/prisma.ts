import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client instance
 * 
 * Ova instanca se dijeli kroz cijelu aplikaciju kako bi se izbjegle višestruke
 * konekcije ka bazi i connection pool exhaustion.
 * 
 * Umjesto da svaki servis/cron kreira svoj PrismaClient (što stvara 10+ konekcija svaki),
 * svi koriste ovaj zajednički instance (1 connection pool sa ~10 konekcija ukupno).
 * 
 * VAŽNO: Ovo NE mijenja funkcionalnost - svi Prisma API pozivi ostaju identični.
 * Prisma će i dalje generisati iste SQL upite i vraćati iste rezultate.
 */

// Prevent multiple instances in development (hot reload)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Graceful shutdown helper
 * Poziva se kada se aplikacija gasi kako bi se zatvorile sve database konekcije
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

