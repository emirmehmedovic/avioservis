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
import { initAllCronJobs } from './cron';
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
    logger.info('');
    logger.info('═══════════════════════════════════════════════════');
    logger.info('HIFA Petrol - Pokretanje Cron Poslova...');
    logger.info('═══════════════════════════════════════════════════');
    logger.info('');
    logger.info(`Okruzenje: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Vremenska zona: ${process.env.TZ || 'Europe/Sarajevo'}`);
    logger.info(`Baza podataka: ${process.env.DATABASE_URL ? 'Povezana' : 'Nije konfigurisana'}`);
    logger.info('');
    
    // Test database connection
    await prisma.$connect();
    logger.info('Konekcija na bazu uspostavljena');
    
    // Initialize all cron jobs
    initAllCronJobs();
    
    logger.info('');
    logger.info('═══════════════════════════════════════════════════');
    logger.info('Cron Poslovi - Uspjesno Pokrenuti');
    logger.info('═══════════════════════════════════════════════════');
    logger.info('');
    logger.info('Zakazani poslovi:');
    logger.info('   - 01:00 - Provjera konzistentnosti goriva');
    logger.info('   - 05:00 - Notifikacije isteka dokumenata');
    logger.info('   - 06:00 - Azuriranje statusa XML faktura');
    logger.info('   - 06:30 - Azuriranje statusa Email faktura');
    logger.info('   - 23:50 - Slanje email faktura');
    logger.info('   - 23:55 - Slanje XML faktura (Wizz Air)');
    logger.info('   - 23:57 - Ponovno slanje neuspjelih email faktura');
    logger.info('');
    logger.info('Process PID:', process.pid);
    logger.info('Za zaustavljanje: pm2 stop avioservis-cron');
    logger.info('Za pregled logova: pm2 logs avioservis-cron');
    logger.info('');
    
  } catch (error) {
    logger.error('Greska pri inicijalizaciji cron poslova:', error);
    process.exit(1);
  }
};

// Start the cron process
initCronProcess();

