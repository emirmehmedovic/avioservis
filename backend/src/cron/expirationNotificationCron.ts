import cron from 'node-cron';
import { checkExpirationDatesJob } from './expirationNotification.cron';
import { logger } from '../utils/logger';

/**
 * Inicijalizacija cron posla za provjeru datuma isteka
 * Pokreće se svakog dana u 05:00
 */
export function initExpirationNotificationCron(): void {
  logger.info("Inicijalizacija cron posla za provjeru datuma isteka...");

  // Pokretanje svakog dana u 05:00
  cron.schedule('0 5 * * *', async () => {
    logger.info("🔔 Pokretanje cron posla za provjeru datuma isteka...");
    try {
      await checkExpirationDatesJob();
      logger.info("✅ Cron posao za provjeru datuma isteka usjpešno završen");
    } catch (error) {
      logger.error("❌ Greška u cron poslu za provjeru datuma isteka:", error);
    }
  }, {
    timezone: "Europe/Sarajevo"
  });

  // Opciono: pokretanje svakog sata za testiranje (može se ukloniti u produkciji)
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('0 * * * *', async () => {
      logger.info("🔔 [DEV] Pokretanje test cron posla za provjeru datuma isteka...");
      try {
        await checkExpirationDatesJob();
        logger.info("✅ [DEV] Test cron posao za provjeru datuma isteka uspješno završen");
      } catch (error) {
        logger.error("❌ [DEV] Greška u test cron poslu za provjeru datuma isteka:", error);
      }
    }, {
      timezone: "Europe/Sarajevo"
    });
  }

  logger.info("✅ Cron posao za provjeru datuma isteka uspješno inicijalizovan");
}
