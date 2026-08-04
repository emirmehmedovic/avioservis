import { Request, Response } from 'express';
import {
  sendFuelPriceToAirline,
  sendFuelPriceToAllAirlines,
  sendFuelPriceSummary,
  getAirlinesWithPriceRules,
  updateAirlinePriceEmail,
  getAirlinesWithoutSpecificRules,
  getGeneralRules,
  sendFuelPriceWithGeneralRule,
  updateAirlinePriceCurrency,
  updateAirlinePriceActive,
} from '../services/fuelPriceNotification.service';

/**
 * Get all airlines with their fuel price rules
 */
export async function getAirlinesForPriceNotification(req: Request, res: Response): Promise<void> {
  try {
    const airlines = await getAirlinesWithPriceRules();
    res.json(airlines);
  } catch (error: any) {
    console.error('Error getting airlines for price notification:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Update airline's price notification email
 */
export async function updatePriceNotificationEmail(req: Request, res: Response): Promise<void> {
  try {
    const { airlineId } = req.params;
    const { email } = req.body;

    if (!airlineId) {
      res.status(400).json({ message: 'Airline ID is required' });
      return;
    }

    const result = await updateAirlinePriceEmail(parseInt(airlineId), email || null);

    if (result.success) {
      res.json({ message: 'Email updated successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to update email' });
    }
  } catch (error: any) {
    console.error('Error updating price notification email:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Send fuel price notification to a single airline
 */
export async function sendPriceToSingleAirline(req: Request, res: Response): Promise<void> {
  try {
    const { airlineId } = req.params;

    if (!airlineId) {
      res.status(400).json({ message: 'Airline ID is required' });
      return;
    }

    const result = await sendFuelPriceToAirline(parseInt(airlineId));

    if (result.success) {
      res.json({ message: 'Fuel price notification sent successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to send notification' });
    }
  } catch (error: any) {
    console.error('Error sending price notification to airline:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Send fuel price notifications to all airlines
 */
export async function sendPriceToAllAirlines(req: Request, res: Response): Promise<void> {
  try {
    const result = await sendFuelPriceToAllAirlines();

    res.json({
      message: `Sent ${result.sent} notifications, ${result.failed} failed`,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error('Error sending price notifications to all airlines:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Send summary email with all fuel prices
 */
export async function sendPriceSummary(req: Request, res: Response): Promise<void> {
  try {
    const result = await sendFuelPriceSummary();

    if (result.success) {
      res.json({ message: 'Fuel price summary sent successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to send summary' });
    }
  } catch (error: any) {
    console.error('Error sending price summary:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Get all airlines WITHOUT specific fuel price rules (they use general "Ostalo" rules)
 */
export async function getAirlinesWithoutRules(req: Request, res: Response): Promise<void> {
  try {
    const airlines = await getAirlinesWithoutSpecificRules();
    res.json(airlines);
  } catch (error: any) {
    console.error('Error getting airlines without rules:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Get all general rules (available currencies for "Ostalo")
 */
export async function getGeneralPriceRules(req: Request, res: Response): Promise<void> {
  try {
    const rules = await getGeneralRules();
    res.json(rules);
  } catch (error: any) {
    console.error('Error getting general rules:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Send fuel price notification to an airline using a general rule
 */
export async function sendPriceWithGeneralRule(req: Request, res: Response): Promise<void> {
  try {
    const { airlineId } = req.params;
    const { currency } = req.body;

    if (!airlineId) {
      res.status(400).json({ message: 'Airline ID is required' });
      return;
    }

    if (!currency) {
      res.status(400).json({ message: 'Currency is required' });
      return;
    }

    const result = await sendFuelPriceWithGeneralRule(parseInt(airlineId), currency);

    if (result.success) {
      res.json({ message: 'Fuel price notification sent successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to send notification' });
    }
  } catch (error: any) {
    console.error('Error sending price notification with general rule:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Update airline's preferred currency for price notifications
 */
export async function updatePriceNotificationCurrency(req: Request, res: Response): Promise<void> {
  try {
    const { airlineId } = req.params;
    const { currency } = req.body;

    if (!airlineId) {
      res.status(400).json({ message: 'Airline ID is required' });
      return;
    }

    const result = await updateAirlinePriceCurrency(parseInt(airlineId), currency || null);

    if (result.success) {
      res.json({ message: 'Currency updated successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to update currency' });
    }
  } catch (error: any) {
    console.error('Error updating price notification currency:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

/**
 * Update airline's active state for price notifications
 */
export async function updatePriceNotificationActive(req: Request, res: Response): Promise<void> {
  try {
    const { airlineId } = req.params;
    const { active } = req.body;

    if (!airlineId) {
      res.status(400).json({ message: 'Airline ID is required' });
      return;
    }

    if (typeof active !== 'boolean') {
      res.status(400).json({ message: 'Active must be a boolean' });
      return;
    }

    const result = await updateAirlinePriceActive(parseInt(airlineId), active);

    if (result.success) {
      res.json({ message: 'Active state updated successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to update active state' });
    }
  } catch (error: any) {
    console.error('Error updating price notification active state:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
