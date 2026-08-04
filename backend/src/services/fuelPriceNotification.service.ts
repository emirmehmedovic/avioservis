import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { prisma } from '../lib/prisma';
import { EmailService, buildEmailConfigFromEnv, buildImapConfigFromEnv } from './emailService';

dayjs.extend(isoWeek);

// Hardcoded email addresses
// TODO: Vratiti na produkcijske adrese nakon testiranja
const SUMMARY_EMAIL_TO = 'emir.m@live.com'; // PRODUKCIJA: 'tzl.fuelservices@hifapetrol.ba'
const CC_EMAIL = 'mensur.alibasic@hifapetrol.ba';

interface FuelPriceForEmail {
  airlineId: number | null;
  airlineName: string;
  price: number;
  pricePerTonne: number;
  currency: string;
  email?: string;
}

/**
 * Get current week validity period (Monday 00:00 - Sunday 23:59)
 */
function getWeekValidityPeriod(): { start: string; end: string; displayStart: string; displayEnd: string } {
  const now = dayjs();
  const monday = now.isoWeekday(1).startOf('day');
  const sunday = now.isoWeekday(7).endOf('day');

  return {
    start: monday.format('YYYY-MM-DD'),
    end: sunday.format('YYYY-MM-DD'),
    displayStart: monday.format('DD.MM.YYYY'),
    displayEnd: sunday.format('DD.MM.YYYY'),
  };
}

/**
 * Build HTML email template for individual airline
 */
function buildIndividualEmailHtml(
  airlineName: string,
  price: number,
  pricePerTonne: number,
  currency: string,
  validityPeriod: { displayStart: string; displayEnd: string }
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fuel Price Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #1a1a2e; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HIFA-PETROL d.o.o.</h1>
    <p style="color: #cccccc; margin: 5px 0 0 0; font-size: 14px;">Tuzla International Airport - Fuel Services</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Fuel Price Notification</h2>

    <p>Dear ${airlineName} Team,</p>

    <p>Please find below the current JET A-1 fuel price for your company:</p>

    <div style="background: #f8f9fa; border-left: 4px solid #F08080; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #666;">Price per kg:</td>
          <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #1a1a2e;">${price.toFixed(5)} ${currency}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #666;">Price per tonne:</td>
          <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #1a1a2e;">${pricePerTonne.toFixed(2)} ${currency}</td>
        </tr>
      </table>
    </div>

    <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #0066cc;">
        <strong>Validity Period:</strong><br>
        ${validityPeriod.displayStart} (Monday 00:00) - ${validityPeriod.displayEnd} (Sunday 23:59)
      </p>
    </div>

    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>HIFA-PETROL Fuel Services Team</strong><br>
      Tuzla International Airport
    </p>

    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px;">
      <p style="margin: 0; color: #856404; font-size: 13px;">
        <strong>⚠️ Note:</strong> This is an automated email. This inbox is not monitored.
        For any questions or inquiries, please contact:
        <a href="mailto:mensur.alibasic@hifapetrol.ba" style="color: #0066cc;">mensur.alibasic@hifapetrol.ba</a>
      </p>
    </div>
  </div>

  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px; color: #666;">
    <p style="margin: 0;">HIFA-PETROL d.o.o. Sarajevo | Tuzla International Airport</p>
    <p style="margin: 5px 0 0 0;">Email: tzl.fuelservices@hifapetrol.ba</p>
  </div>
</body>
</html>
`;
}

/**
 * Get general rule label based on currency
 */
function getGeneralRuleLabel(currency: string): string {
  switch (currency) {
    case 'BAM':
      return 'Cijena za domaće aviokompanije (ostali)';
    case 'USD':
      return 'Cijena u dolarima za ostale aviokompanije';
    case 'EUR':
      return 'Cijena za ostale aviokompanije u EUR';
    default:
      return `Opća cijena (${currency})`;
  }
}

/**
 * Build HTML email template for summary (all airlines) - BOSANSKI JEZIK
 */
function buildSummaryEmailHtml(
  prices: FuelPriceForEmail[],
  validityPeriod: { displayStart: string; displayEnd: string }
): string {
  const specificPrices = prices.filter(p => p.airlineId !== null);
  const generalPrices = prices.filter(p => p.airlineId === null);

  const tableRows = specificPrices.map(p => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${p.airlineName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-family: monospace;">${p.price.toFixed(5)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-family: monospace;">${p.pricePerTonne.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${p.currency}</td>
    </tr>
  `).join('');

  const generalRows = generalPrices.map(p => `
    <tr style="background: #f0f0ff;">
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;"><em>${getGeneralRuleLabel(p.currency)}</em></td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-family: monospace;">${p.price.toFixed(5)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-family: monospace;">${p.pricePerTonne.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${p.currency}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="bs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sedmični Pregled Cijena Goriva</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #1a1a2e; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HIFA-PETROL d.o.o.</h1>
    <p style="color: #cccccc; margin: 5px 0 0 0; font-size: 14px;">Međunarodni Aerodrom Tuzla - Usluge Goriva</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Sedmični Pregled Cijena Goriva</h2>

    <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; color: #0066cc;">
        <strong>Period Važenja:</strong> ${validityPeriod.displayStart} (Ponedjeljak 00:00) - ${validityPeriod.displayEnd} (Nedjelja 23:59)
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #333;">
      <thead>
        <tr style="background-color: #2d2d2d;">
          <th style="padding: 15px; text-align: left; color: #ffffff; font-weight: 600; border: 1px solid #333;">Aviokompanija</th>
          <th style="padding: 15px; text-align: right; color: #ffffff; font-weight: 600; border: 1px solid #333;">Cijena po kg</th>
          <th style="padding: 15px; text-align: right; color: #ffffff; font-weight: 600; border: 1px solid #333;">Cijena po toni</th>
          <th style="padding: 15px; text-align: center; color: #ffffff; font-weight: 600; border: 1px solid #333;">Valuta</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${generalRows}
      </tbody>
    </table>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Ovo je automatski generisan pregled svih trenutnih cijena goriva. Cijene važe za sedmicu navedenu iznad.
    </p>

    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px;">
      <p style="margin: 0; color: #856404; font-size: 13px;">
        <strong>⚠️ Napomena:</strong> Ovo je automatski generisan email. Ovaj inbox se ne nadgleda.
        Za sva pitanja ili nejasnoće, molimo kontaktirajte:
        <a href="mailto:mensur.alibasic@hifapetrol.ba" style="color: #0066cc;">mensur.alibasic@hifapetrol.ba</a>
      </p>
    </div>
  </div>

  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px; color: #666;">
    <p style="margin: 0;">HIFA-PETROL d.o.o. Sarajevo | Međunarodni Aerodrom Tuzla</p>
    <p style="margin: 5px 0 0 0;">Generisano: ${dayjs().format('DD.MM.YYYY HH:mm')}</p>
  </div>
</body>
</html>
`;
}

/**
 * Send fuel price notification to a single airline
 */
export async function sendFuelPriceToAirline(airlineId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the fuel price rule for this airline
    const rule = await prisma.fuelPriceRule.findFirst({
      where: { airlineId },
      include: { airline: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!rule || !rule.airline) {
      return { success: false, error: 'No fuel price rule found for this airline' };
    }

    const email = rule.airline.price_notification_email;
    if (!email) {
      return { success: false, error: 'Airline does not have a price notification email configured' };
    }

    const validityPeriod = getWeekValidityPeriod();
    const price = Number(rule.price);
    const pricePerTonne = price * 1000;

    const emailConfig = buildEmailConfigFromEnv();
    const imapConfig = buildImapConfigFromEnv();
    const emailService = new EmailService(emailConfig, imapConfig);

    const html = buildIndividualEmailHtml(
      rule.airline.name,
      price,
      pricePerTonne,
      rule.currency,
      validityPeriod
    );

    const result = await emailService.sendEmail({
      to: email,
      cc: CC_EMAIL,
      subject: `JET A-1 Fuel Price - ${validityPeriod.displayStart} to ${validityPeriod.displayEnd} - HIFA-PETROL`,
      html,
    });

    if (result.success) {
      console.log(`Fuel price notification sent to ${rule.airline.name} (${email})`);
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error: any) {
    console.error('Error sending fuel price notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send fuel price notifications to all airlines with configured emails
 */
export async function sendFuelPriceToAllAirlines(): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  results: Array<{ airlineId: number; airlineName: string; success: boolean; error?: string }>
}> {
  const results: Array<{ airlineId: number; airlineName: string; success: boolean; error?: string }> = [];

  try {
    // Get all fuel price rules with airlines that have notification emails
    const rules = await prisma.fuelPriceRule.findMany({
      where: {
        airlineId: { not: null },
        airline: {
          price_notification_email: { not: null },
        },
      },
      include: { airline: true },
      orderBy: { createdAt: 'desc' },
    });

    // Group by airline to get only the latest rule per airline
    const latestRulesByAirline = new Map<number, typeof rules[0]>();
    for (const rule of rules) {
      if (rule.airlineId && !latestRulesByAirline.has(rule.airlineId)) {
        latestRulesByAirline.set(rule.airlineId, rule);
      }
    }

    for (const [airlineId, rule] of latestRulesByAirline) {
      const result = await sendFuelPriceToAirline(airlineId);
      results.push({
        airlineId,
        airlineName: rule.airline?.name || 'Unknown',
        success: result.success,
        error: result.error,
      });

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return { success: true, sent, failed, results };
  } catch (error: any) {
    console.error('Error sending fuel price notifications to all airlines:', error);
    return { success: false, sent: 0, failed: 0, results };
  }
}

/**
 * Send summary email with all fuel prices to hardcoded address
 */
export async function sendFuelPriceSummary(): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all fuel price rules
    const rules = await prisma.fuelPriceRule.findMany({
      include: { airline: true },
      orderBy: [
        { airlineId: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Group by airline+currency to get only the latest rule per airline per currency
    // For general rules (airlineId=null), we want one rule per currency
    const latestRules = new Map<string, typeof rules[0]>();
    for (const rule of rules) {
      const key = rule.airlineId !== null
        ? `airline-${rule.airlineId}-${rule.currency}`
        : `general-${rule.currency}`;
      if (!latestRules.has(key)) {
        latestRules.set(key, rule);
      }
    }

    const prices: FuelPriceForEmail[] = [];
    for (const [key, rule] of latestRules) {
      const price = Number(rule.price);
      prices.push({
        airlineId: rule.airlineId,
        airlineName: rule.airline?.name || `Default Rule (${rule.currency})`,
        price,
        pricePerTonne: price * 1000,
        currency: rule.currency,
      });
    }

    // Sort: specific airlines first (alphabetically), then general rules
    prices.sort((a, b) => {
      if (a.airlineId === null && b.airlineId !== null) return 1;
      if (a.airlineId !== null && b.airlineId === null) return -1;
      return a.airlineName.localeCompare(b.airlineName);
    });

    const validityPeriod = getWeekValidityPeriod();

    const emailConfig = buildEmailConfigFromEnv();
    const imapConfig = buildImapConfigFromEnv();
    const emailService = new EmailService(emailConfig, imapConfig);

    const html = buildSummaryEmailHtml(prices, validityPeriod);

    const result = await emailService.sendEmail({
      to: SUMMARY_EMAIL_TO,
      cc: CC_EMAIL,
      subject: `Sedmični Pregled Cijena Goriva - ${validityPeriod.displayStart} do ${validityPeriod.displayEnd} - HIFA-PETROL`,
      html,
    });

    if (result.success) {
      console.log(`Fuel price summary sent to ${SUMMARY_EMAIL_TO}`);
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error: any) {
    console.error('Error sending fuel price summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all airlines with their fuel price rules for the UI
 */
export async function getAirlinesWithPriceRules(): Promise<Array<{
  airlineId: number;
  airlineName: string;
  email: string | null;
  price: number | null;
  pricePerTonne: number | null;
  currency: string | null;
}>> {
  const rules = await prisma.fuelPriceRule.findMany({
    where: { airlineId: { not: null } },
    include: { airline: true },
    orderBy: { createdAt: 'desc' },
  });

  // Group by airline to get only the latest rule per airline
  const latestRulesByAirline = new Map<number, typeof rules[0]>();
  for (const rule of rules) {
    if (rule.airlineId && !latestRulesByAirline.has(rule.airlineId)) {
      latestRulesByAirline.set(rule.airlineId, rule);
    }
  }

  const result = [];
  for (const [airlineId, rule] of latestRulesByAirline) {
    const price = Number(rule.price);
    result.push({
      airlineId,
      airlineName: rule.airline?.name || 'Unknown',
      email: rule.airline?.price_notification_email || null,
      price,
      pricePerTonne: price * 1000,
      currency: rule.currency,
    });
  }

  // Sort alphabetically
  result.sort((a, b) => a.airlineName.localeCompare(b.airlineName));

  return result;
}

/**
 * Update airline's price notification email
 */
export async function updateAirlinePriceEmail(airlineId: number, email: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.airline.update({
      where: { id: airlineId },
      data: { price_notification_email: email },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating airline price email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all airlines WITHOUT specific fuel price rules (they use general rules)
 */
export async function getAirlinesWithoutSpecificRules(): Promise<Array<{
  airlineId: number;
  airlineName: string;
  email: string | null;
  currency: string | null;
  active: boolean;
}>> {
  // Get all airline IDs that have specific rules
  const rulesWithAirlines = await prisma.fuelPriceRule.findMany({
    where: { airlineId: { not: null } },
    select: { airlineId: true },
  });

  const airlineIdsWithRules = new Set(rulesWithAirlines.map(r => r.airlineId).filter(Boolean));

  // Get all airlines that don't have specific rules
  const allAirlines = await prisma.airline.findMany({
    orderBy: { name: 'asc' },
  });

  return allAirlines
    .filter(a => !airlineIdsWithRules.has(a.id))
    .map(a => ({
      airlineId: a.id,
      airlineName: a.name,
      email: a.price_notification_email,
      currency: a.price_notification_currency,
      active: a.price_notification_active,
    }));
}

/**
 * Update airline's price notification currency preference
 */
export async function updateAirlinePriceCurrency(airlineId: number, currency: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.airline.update({
      where: { id: airlineId },
      data: { price_notification_currency: currency },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating airline price currency:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle airline's price notification active state
 */
export async function updateAirlinePriceActive(airlineId: number, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.airline.update({
      where: { id: airlineId },
      data: { price_notification_active: active },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating airline price active state:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all general rules (rules without specific airline)
 */
export async function getGeneralRules(): Promise<Array<{
  currency: string;
  price: number;
  pricePerTonne: number;
}>> {
  const rules = await prisma.fuelPriceRule.findMany({
    where: { airlineId: null },
    orderBy: { createdAt: 'desc' },
  });

  // Group by currency to get only the latest rule per currency
  const latestRulesByCurrency = new Map<string, typeof rules[0]>();
  for (const rule of rules) {
    if (!latestRulesByCurrency.has(rule.currency)) {
      latestRulesByCurrency.set(rule.currency, rule);
    }
  }

  return Array.from(latestRulesByCurrency.values()).map(rule => {
    const price = Number(rule.price);
    return {
      currency: rule.currency,
      price,
      pricePerTonne: price * 1000,
    };
  });
}

/**
 * Send fuel price to an airline using a general rule (for airlines without specific rules)
 */
export async function sendFuelPriceWithGeneralRule(
  airlineId: number,
  currency: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the airline
    const airline = await prisma.airline.findUnique({
      where: { id: airlineId },
    });

    if (!airline) {
      return { success: false, error: 'Airline not found' };
    }

    const email = airline.price_notification_email;
    if (!email) {
      return { success: false, error: 'Airline does not have a price notification email configured' };
    }

    // Get the general rule for this currency
    const generalRule = await prisma.fuelPriceRule.findFirst({
      where: { airlineId: null, currency },
      orderBy: { createdAt: 'desc' },
    });

    if (!generalRule) {
      return { success: false, error: `No general rule found for currency ${currency}` };
    }

    const validityPeriod = getWeekValidityPeriod();
    const price = Number(generalRule.price);
    const pricePerTonne = price * 1000;

    const emailConfig = buildEmailConfigFromEnv();
    const imapConfig = buildImapConfigFromEnv();
    const emailService = new EmailService(emailConfig, imapConfig);

    const html = buildIndividualEmailHtml(
      airline.name,
      price,
      pricePerTonne,
      currency,
      validityPeriod
    );

    const result = await emailService.sendEmail({
      to: email,
      cc: CC_EMAIL,
      subject: `JET A-1 Fuel Price - ${validityPeriod.displayStart} to ${validityPeriod.displayEnd} - HIFA-PETROL`,
      html,
    });

    if (result.success) {
      console.log(`Fuel price notification (general rule ${currency}) sent to ${airline.name} (${email})`);
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error: any) {
    console.error('Error sending fuel price notification with general rule:', error);
    return { success: false, error: error.message };
  }
}
