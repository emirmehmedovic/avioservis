import * as cron from 'node-cron';
import { SyncStrategy, syncAllTanksFuelData } from '../utils/fuelSyncUtils';
import { logger } from '../utils/logger';

/**
 * Konfiguracija za cron poslove sinhronizacije goriva
 */
export interface FuelSyncCronConfig {
  enableDailyCheck: boolean;
  enableWeeklySync: boolean;
  dailyCheckTime: string; // Format: "HH:MM" (24-satni format)
  weeklyFullSyncDay: number; // 0-6 (nedjelja-subota)
  weeklyFullSyncTime: string; // Format: "HH:MM" (24-satni format)
}

// Zadana konfiguracija
const DEFAULT_CONFIG: FuelSyncCronConfig = {
  enableDailyCheck: true,
  enableWeeklySync: true,
  dailyCheckTime: "01:00", // 1:00 AM
  weeklyFullSyncDay: 0,    // nedjelja
  weeklyFullSyncTime: "03:00" // 3:00 AM
};

// Trenutna konfiguracija (može se dinamički mijenjati)
let currentConfig: FuelSyncCronConfig = { ...DEFAULT_CONFIG };

// Reference na cron zadatke
interface ScheduledTask {
  stop: () => void;
}

let dailyCheckJob: ScheduledTask | null = null;
let weeklyFullSyncJob: ScheduledTask | null = null;

/**
 * Izvršava dnevnu provjeru konzistentnosti podataka o gorivu
 * bez automatske korekcije - samo reportira nekonzistentnosti
 */
async function runDailyConsistencyCheck() {
  logger.info("Pokretanje dnevne provjere konzistentnosti podataka o gorivu...");
  
  try {
    // Koristi REPORT_ONLY strategiju - samo detektira probleme bez automatske korekcije
    const results = await syncAllTanksFuelData(SyncStrategy.REPORT_ONLY);
    
    // Prebrojavanje tenkova s nekonzistentnim podacima
    const inconsistentTanks = results.filter(result => !result.wasConsistent);
    
    if (inconsistentTanks.length > 0) {
      logger.warn(`Dnevna provjera konzistentnosti: Pronađeno ${inconsistentTanks.length} tenkova s nekonzistentnim podacima.`);
      
      // Detaljno logiranje svakog nekonzistentnog tenka
      inconsistentTanks.forEach(tank => {
        logger.warn(`Tank ${tank.tankName} (ID: ${tank.tankId}) - neusklađenost: ${tank.initialState.difference.toFixed(3)} L`);
      });
    } else {
      logger.info("Dnevna provjera konzistentnosti: Svi tenkovi imaju konzistentne podatke.");
    }
    
  } catch (error) {
    logger.error("Greška prilikom izvršavanja dnevne provjere konzistentnosti:", error);
  }
}

/**
 * Izvršava tjednu punu sinhronizaciju podataka o gorivu
 * s automatskom korekcijom nekonzistentnosti
 */
async function runWeeklyFullSync() {
  logger.info("Pokretanje sedmične pune sinhronizacije podataka o gorivu...");
  
  try {
    // Koristi ADJUST_MRN_RECORDS strategiju za automatsku korekciju
    // Prilagođava MRN zapise da odgovaraju stanju tanka, jer je to češći izvor problema
    const results = await syncAllTanksFuelData(SyncStrategy.ADJUST_MRN_RECORDS);
    
    // Analiza rezultata
    const totalTanks = results.length;
    const syncedTanks = results.filter(result => !result.wasConsistent).length;
    
    if (syncedTanks > 0) {
      logger.info(`Sedmična sinhronizacija: Uspješno sinhronizovano ${syncedTanks}/${totalTanks} tenkova.`);
      
      // Detaljno logiranje svakog sinhronizovanog tenka
      results.filter(result => !result.wasConsistent).forEach(tank => {
        logger.info(`Tank ${tank.tankName} (ID: ${tank.tankId}) - prethodna neusklađenost: ${tank.initialState.difference.toFixed(3)} L, sada sinhronizovano.`);
      });
    } else {
      logger.info("Sedmična sinhronizacija: Svi tankovi već imaju konzistentne podatke.");
    }
    
  } catch (error) {
    logger.error("Greška prilikom izvršavanja sedmične pune sinhronizacije:", error);
  }
}

/**
 * Kreira cron expression string na osnovu vremena i dana
 * 
 * @param time String u formatu "HH:MM"
 * @param dayOfWeek Opcionalni dan u sedmici (0-6, nedjelja-subota)
 * @returns Cron expression string
 */
function createCronExpression(time: string, dayOfWeek?: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  
  // Format: minute hour * * dayOfWeek
  // Ako je dayOfWeek undefined, izvršava se svaki dan
  return `${minutes} ${hours} * * ${dayOfWeek !== undefined ? dayOfWeek : '*'}`;
}

/**
 * Inicijalizira cron poslove za provjeru i sinhronizaciju goriva
 * 
 * @param config Opciona konfiguracija
 */
export function initFuelSyncCronJobs(config?: Partial<FuelSyncCronConfig>): void {
  // Ažuriraj konfiguraciju ako je proslijeđena
  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }
  
  // Zaustavi postojeće poslove ako postoje
  stopFuelSyncCronJobs();
  
  // Kreiraj dnevni posao za provjeru konzistentnosti
  if (currentConfig.enableDailyCheck) {
    const dailyCronExpression = createCronExpression(currentConfig.dailyCheckTime);
    
    logger.info(`Zakazivanje dnevne provjere konzistentnosti goriva: ${dailyCronExpression}`);
    
    dailyCheckJob = cron.schedule(dailyCronExpression, () => {
      runDailyConsistencyCheck().catch(error => {
        logger.error("Greška u dnevnom cron poslu za provjeru konzistentnosti:", error);
      });
    });
  }
  
  // Kreiraj tjedni posao za punu sinhronizaciju
  if (currentConfig.enableWeeklySync) {
    const weeklyCronExpression = createCronExpression(
      currentConfig.weeklyFullSyncTime,
      currentConfig.weeklyFullSyncDay
    );
    
    logger.info(`Zakazivanje sedmične pune sinhronizacije goriva: ${weeklyCronExpression}`);
    
    weeklyFullSyncJob = cron.schedule(weeklyCronExpression, () => {
      runWeeklyFullSync().catch(error => {
        logger.error("Greška u sedmičnom cron poslu za punu sinhronizaciju:", error);
      });
    });
  }
}

/**
 * Zaustavlja sve cron poslove za provjeru i sinhronizaciju goriva
 */
export function stopFuelSyncCronJobs(): void {
  if (dailyCheckJob) {
    dailyCheckJob.stop();
    dailyCheckJob = null;
    logger.info("Dnevni posao provjere konzistentnosti goriva zaustavljen.");
  }
  
  if (weeklyFullSyncJob) {
    weeklyFullSyncJob.stop();
    weeklyFullSyncJob = null;
    logger.info("Tjedni posao pune sinhronizacije goriva zaustavljen.");
  }
}

/**
 * Ažurira konfiguraciju cron poslova
 * 
 * @param config Nova konfiguracija
 */
export function updateFuelSyncCronConfig(config: Partial<FuelSyncCronConfig>): void {
  // Zaustavi postojeće poslove
  stopFuelSyncCronJobs();
  
  // Ažuriraj konfiguraciju
  currentConfig = { ...currentConfig, ...config };
  
  // Ponovno inicijaliziraj poslove s novom konfiguracijom
  initFuelSyncCronJobs();
}

/**
 * Ručno pokreće provjeru konzistentnosti odmah
 */
export async function triggerManualConsistencyCheck(): Promise<ReturnType<typeof syncAllTanksFuelData>> {
  logger.info("Ručno pokretanje provjere konzistentnosti podataka o gorivu...");
  return await syncAllTanksFuelData(SyncStrategy.REPORT_ONLY);
}

/**
 * Ručno pokreće punu sinhronizaciju odmah
 * 
 * @param strategy Strategija sinhronizacije
 */
export async function triggerManualSync(strategy: SyncStrategy): Promise<ReturnType<typeof syncAllTanksFuelData>> {
  logger.info(`Ručno pokretanje sinhronizacije podataka o gorivu (strategija: ${strategy})...`);
  return await syncAllTanksFuelData(strategy);
}
