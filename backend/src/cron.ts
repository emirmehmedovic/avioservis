#!/usr/bin/env node
/**
 * Cron Jobs Entry Point
 * 
 * This file is a separate entry point for running cron jobs independently
 * from the main API server. This architecture provides:
 * 
 * 1. **Isolation**: If cron jobs hang, they don't affect the API server
 * 2. **Independent Restart**: Can restart cron jobs without restarting API
 * 3. **Resource Monitoring**: Separate CPU/Memory monitoring for cron vs API
 * 4. **Easier Debugging**: Separate logs for cron vs API operations
 * 5. **Production Best Practice**: Standard pattern for Node.js applications
 * 
 * Usage:
 *   - Run with PM2: pm2 start src/cron.ts --name avioservis-cron
 *   - Run standalone: ts-node src/cron.ts
 */

import 'dotenv/config';
import { initAllCronJobs } from './cron/index';
import { disconnectPrisma, prisma } from './lib/prisma';
import { logger } from './utils/logger';

// Handle process shutdown gracefully
process.on('SIGINT', async () => {
  logger.info('SIGINT primljen, zaustavljanje cron poslova...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM primljen, zaustavljanje cron poslova...');
  await disconnectPrisma();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception u cron procesu:', error);
  // Don't exit - let PM2 handle restart if needed
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection u cron procesu:', reason);
  // Don't exit - let PM2 handle restart if needed
});

// Initialize cron jobs
const initCronProcess = async () => {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('HIFA Petrol - Pokretanje Cron Poslova...');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`Okruzenje: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Vremenska zona: ${process.env.TZ || 'Europe/Sarajevo'}`);
    console.log(`Baza podataka: ${process.env.DATABASE_URL ? 'Postavljena' : 'NIJE POSTAVLJENA!'}`);
    console.log('');

    // ✅ INICIJALIZUJ CRON JOBOVE PRVO - Bez čekanja na bazu!
    // Cron jobovi mogu raditi i bez baze (trebat će joj kasnije)
    console.log(`[${new Date().toISOString()}] Inicijalizacija CRON jobova (BEZ čekanja na bazu)...`);
    initAllCronJobs();
    console.log(`[${new Date().toISOString()}] ✅ CRON jobovi su inicijalizovani i zakazani!`);
    console.log('');

    // Sada se poveži na bazu (sa timeout)
    console.log(`[${new Date().toISOString()}] Pokušaj povezivanja na bazu podataka (timeout: 30s)...`);

    try {
      // Dodaj timeout - ako se ne povežee za 30s, nastavi bez baze
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout after 30s')), 30000)
        )
      ]);
      console.log(`[${new Date().toISOString()}] ✅ Konekcija na bazu uspostavljena`);
    } catch (dbError: any) {
      console.error(`[${new Date().toISOString()}] ⚠️ UPOZORENJE: Neuspješna konekcija na bazu - ${dbError.message}`);
      console.error(`[${new Date().toISOString()}] ⚠️ Cron jobovi će pokušavati da se povežu tokom izvršavanja`);
      console.error(`[${new Date().toISOString()}] ⚠️ Ako baza ostane nedostižna, CRON jobovi će failati!`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('Cron Poslovi - Uspjesno Pokrenuti');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('Zakazani poslovi (UTC vrijeme):');
    console.log('   - 00:00 UTC (01:00 Sarajevo) - Provjera konzistentnosti goriva');
    console.log('   - 04:00 UTC (05:00 Sarajevo) - Notifikacije isteka dokumenata');
    console.log('   - 05:00 UTC (06:00 Sarajevo) - Azuriranje statusa XML faktura');
    console.log('   - 05:30 UTC (06:30 Sarajevo) - Azuriranje statusa Email faktura');
    console.log('   - 05:35 UTC (06:35 Sarajevo) - Slanje email faktura');
    console.log('   - 05:40 UTC (06:40 Sarajevo) - Slanje XML faktura - Wizz Air');
    console.log('   - 06:00 UTC (07:00 Sarajevo) - Ponovno slanje neuspjelih email faktura');
    console.log('');
    console.log('NAPOMENA: Cronovi koriste UTC vrijeme (bez timezone opcije).');
    console.log('Ljeti (UTC+2) ce se pokretati sat ranije u lokalnom vremenu.');
    console.log('');
    console.log(`Process PID: ${process.pid}`);
    console.log('Za zaustavljanje: pm2 stop avioservis-cron');
    console.log('Za pregled logova: pm2 logs avioservis-cron');
    console.log('');

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ KRITIČNA GREŠKA pri inicijalizaciji cron poslova:`, error);
    console.error('Pokušaj se pokreće ponovo kroz 30 sekundi...');

    // Umjesto process.exit(), čekaj 30s pa pokušaj ponovno
    setTimeout(() => {
      console.log(`[${new Date().toISOString()}] Ponovni pokušaj inicijalizacije...`);
      initCronProcess();
    }, 30000);
  }
};

// Start the cron process
initCronProcess();

// ✅ HEARTBEAT MONITORING - Svaki sat logira da je proces živ
// Ovo pomaže u debugging-u ako se proces neočekivano zaustavi
setInterval(() => {
  const now = new Date();
  console.log(`[${now.toISOString()}] 💓 CRON PROCESS HEARTBEAT - Still running (uptime: ${process.uptime().toFixed(0)}s)`);
}, 60 * 60 * 1000); // Svaki sat (60 * 60 * 1000 ms)

// Log uptime svaki put kada se CRON job pokreće
process.on('beforeExit', () => {
  console.log(`[${new Date().toISOString()}] Process exiting after ${process.uptime().toFixed(0)}s uptime`);
});

