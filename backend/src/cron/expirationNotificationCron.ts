import cron from 'node-cron';
import { checkExpirationDatesJob } from './expirationNotification.cron';
import { logger } from '../utils/logger';

/**
 * Inicijalizacija cron posla za provjeru datuma isteka
 * Pokreće se svakog dana u 05:00
 */
export function initExpirationNotificationCron(): void {
  console.log("Inicijalizacija cron posla za provjeru datuma isteka...");

  // Pokretanje svakog dana u 05:00
  cron.schedule('0 5 * * *', async () => {
    const timeoutId = setTimeout(() => {
      console.error("❌ Expiration notification cron job timed out after 10 minutes");
      process.exit(1); // Force restart if stuck
    }, 10 * 60 * 1000); // 10 minutes timeout
    
    console.log("🔔 Pokretanje cron posla za provjeru datuma isteka...");
    try {
      await checkExpirationDatesJob();
      console.log("✅ Cron posao za provjeru datuma isteka usjpešno završen");
    } catch (error) {
      console.error("❌ Greška u cron poslu za provjeru datuma isteka:", error);
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    timezone: "Europe/Sarajevo"
  });

  // Opciono: pokretanje svakog sata za testiranje (može se ukloniti u produkciji)
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('0 * * * *', async () => {
      const timeoutId = setTimeout(() => {
        console.error("❌ [DEV] Expiration notification test cron job timed out after 10 minutes");
        process.exit(1);
      }, 10 * 60 * 1000);
      
      console.log("🔔 [DEV] Pokretanje test cron posla za provjeru datuma isteka...");
      try {
        await checkExpirationDatesJob();
        console.log("✅ [DEV] Test cron posao za provjeru datuma isteka uspješno završen");
      } catch (error) {
        console.error("❌ [DEV] Greška u test cron poslu za provjeru datuma isteka:", error);
      } finally {
        clearTimeout(timeoutId);
      }
    }, {
      timezone: "Europe/Sarajevo"
    });
  }

  console.log("✅ Cron posao za provjeru datuma isteka uspješno inicijalizovan");
}
