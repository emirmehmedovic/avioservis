import cron from 'node-cron';
import { checkExpirationDatesJob } from './expirationNotification.cron';
import { logger } from '../utils/logger';

/**
 * Inicijalizacija cron posla za provjeru datuma isteka
 * Pokreće se svakog dana u 05:00
 */
export function initExpirationNotificationCron(): void {
  const tz = process.env.TZ || 'Europe/Sarajevo';

  console.log(`[${new Date().toISOString()}] Inicijalizacija cron posla za provjeru datuma isteka: 0 4 * * * UTC (05:00 Sarajevo zimi)...`);

  // Pokretanje svakog dana u 04:00 UTC = 05:00 Sarajevo (zimi)
  cron.schedule('0 4 * * *', async () => {
    let isProcessing = true;
    const timeoutId = setTimeout(() => {
      if (isProcessing) {
        console.error(`[${new Date().toISOString()}] ❌ Expiration notification cron job timed out after 10 minutes - still processing`);
      }
    }, 10 * 60 * 1000); // 10 minutes timeout

    console.log(`[${new Date().toISOString()}] 🔔 Pokretanje cron posla za provjeru datuma isteka...`);
    try {
      await checkExpirationDatesJob();
      console.log(`[${new Date().toISOString()}] ✅ Cron posao za provjeru datuma isteka uspješno završen`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Greška u cron poslu za provjeru datuma isteka:`, error);
    } finally {
      isProcessing = false;
      clearTimeout(timeoutId);
    }
  });

  // Opciono: pokretanje svakog sata za testiranje (može se ukloniti u produkciji)
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('0 * * * *', async () => {
      let isDevProcessing = true;
      const timeoutId = setTimeout(() => {
        if (isDevProcessing) {
          console.error(`[${new Date().toISOString()}] ❌ [DEV] Expiration notification test cron job timed out after 10 minutes - still processing`);
        }
      }, 10 * 60 * 1000);

      console.log(`[${new Date().toISOString()}] 🔔 [DEV] Pokretanje test cron posla za provjeru datuma isteka...`);
      try {
        await checkExpirationDatesJob();
        console.log(`[${new Date().toISOString()}] ✅ [DEV] Test cron posao za provjeru datuma isteka uspješno završen`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ [DEV] Greška u test cron poslu za provjeru datuma isteka:`, error);
      } finally {
        isDevProcessing = false;
        clearTimeout(timeoutId);
      }
    });
  }

  console.log(`[${new Date().toISOString()}] ✅ Cron posao za provjeru datuma isteka uspješno inicijalizovan (UTC mode)`);
}
