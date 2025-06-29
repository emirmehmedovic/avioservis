/**
 * fuelReportsTrends.controller.ts
 * Kontroler za trend analizu i prognozu potrošnje goriva
 */

import { Request, Response } from 'express';
import {
  generateWeeklyTrendData,
  generateMonthlyTrendData,
  generateYearOverYearData,
  generateSeasonalPatterns
} from '../services/trendAnalysisService';
import {
  generateMonthlyComparison,
  generateYearlyComparison,
  generateDestinationTrendingAnalysis,
  generateMarketShareAnalysis,
  generateAirlineTrendingAnalysis
} from '../services/comparativeAnalysisService';
import {
  generateLinearTrendForecast,
  generateMovingAverageForecast,
  generateExponentialSmoothingForecast,
  generateDestinationForecasts
} from '../services/forecastingService';

/**
 * Dohvata trend analizu podatke
 */
export async function getTrendAnalysisData(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, year } = req.query;
    const endpoint = req.path;

    if (endpoint.includes('weekly')) {
      // Sedmični trend podaci
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate i endDate su obavezni za sedmične podatke'
        });
        return;
      }

      const filter = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const weeklyData = await generateWeeklyTrendData(filter);
      res.json({
        success: true,
        data: weeklyData
      });

    } else if (endpoint.includes('monthly')) {
      // Mjesečni trend podaci
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate i endDate su obavezni za mjesečne podatke'
        });
        return;
      }

      const filter = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const monthlyData = await generateMonthlyTrendData(filter);
      res.json({
        success: true,
        data: monthlyData
      });

    } else if (endpoint.includes('year-over-year')) {
      // Year-over-year poredba
      if (!year) {
        res.status(400).json({
          success: false,
          message: 'year je obavezan za year-over-year poredbu'
        });
        return;
      }

      const yearData = await generateYearOverYearData(parseInt(year as string));
      res.json({
        success: true,
        data: yearData
      });

    } else {
      res.status(404).json({
        success: false,
        message: 'Nepoznat endpoint za trend analizu'
      });
    }

  } catch (error) {
    console.error('Greška u getTrendAnalysisData:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju trend analize',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * Dohvata sezonske uzorke
 */
export async function getSeasonalPatternsData(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate i endDate su obavezni'
      });
      return;
    }

    const filter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const seasonalData = await generateSeasonalPatterns(filter);
    res.json({
      success: true,
      data: seasonalData
    });

  } catch (error) {
    console.error('Greška u getSeasonalPatternsData:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju sezonskih uzoraka',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * Dohvata komparativnu analizu podatke
 */
export async function getComparativeAnalysisData(req: Request, res: Response): Promise<void> {
  try {
    const { currentMonth, currentYear } = req.query;
    const endpoint = req.path;

    if (endpoint.includes('monthly')) {
      // Mjesečna komparativna analiza
      if (!currentMonth) {
        res.status(400).json({
          success: false,
          message: 'currentMonth je obavezan (format: YYYY-MM)'
        });
        return;
      }

      const [year, month] = (currentMonth as string).split('-');
      const currentMonthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      const comparisonData = await generateMonthlyComparison(currentMonthDate);
      res.json({
        success: true,
        data: comparisonData
      });

    } else if (endpoint.includes('yearly')) {
      // Godišnja komparativna analiza
      if (!currentYear) {
        res.status(400).json({
          success: false,
          message: 'currentYear je obavezan'
        });
        return;
      }

      const comparisonData = await generateYearlyComparison(parseInt(currentYear as string));
      res.json({
        success: true,
        data: comparisonData
      });

    } else {
      res.status(404).json({
        success: false,
        message: 'Nepoznat endpoint za komparativnu analizu'
      });
    }

  } catch (error) {
    console.error('Greška u getComparativeAnalysisData:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju komparativne analize',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * Dohvata trending destinacije
 */
export async function getDestinationTrendingData(req: Request, res: Response): Promise<void> {
  try {
    const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = req.query;

    if (!currentStartDate || !currentEndDate || !previousStartDate || !previousEndDate) {
      res.status(400).json({
        success: false,
        message: 'Svi datumi su obavezni: currentStartDate, currentEndDate, previousStartDate, previousEndDate'
      });
      return;
    }

    const currentPeriod = {
      startDate: new Date(currentStartDate as string),
      endDate: new Date(currentEndDate as string)
    };

    const previousPeriod = {
      startDate: new Date(previousStartDate as string),
      endDate: new Date(previousEndDate as string)
    };

    const trendingData = await generateDestinationTrendingAnalysis(currentPeriod, previousPeriod);
    res.json({
      success: true,
      data: trendingData
    });

  } catch (error) {
    console.error('Greška u getDestinationTrendingData:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju trending destinacija',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * Dohvata market share analizu
 */
export async function getMarketShareAnalysisData(req: Request, res: Response): Promise<void> {
  try {
    const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = req.query;

    if (!currentStartDate || !currentEndDate || !previousStartDate || !previousEndDate) {
      res.status(400).json({
        success: false,
        message: 'Svi datumi su obavezni: currentStartDate, currentEndDate, previousStartDate, previousEndDate'
      });
      return;
    }

    const currentPeriod = {
      startDate: new Date(currentStartDate as string),
      endDate: new Date(currentEndDate as string)
    };

    const previousPeriod = {
      startDate: new Date(previousStartDate as string),
      endDate: new Date(previousEndDate as string)
    };

    const marketShareData = await generateMarketShareAnalysis(currentPeriod, previousPeriod);
    res.json({
      success: true,
      data: marketShareData
    });

  } catch (error) {
    console.error('Greška u getMarketShareAnalysisData:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju market share analize',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}

/**
 * Dohvata forecasting podatke
 */
export async function getForecastingData(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, forecastMonths = '6', windowSize = '3', alpha = '0.3' } = req.query;
    const endpoint = req.path;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate i endDate su obavezni'
      });
      return;
    }

    const filter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };

    const forecastMonthsNum = parseInt(forecastMonths as string);

    if (endpoint.includes('linear')) {
      // Linearna trend prognoza
      const forecastData = await generateLinearTrendForecast(filter, forecastMonthsNum);
      res.json({
        success: true,
        data: forecastData
      });

    } else if (endpoint.includes('moving-average')) {
      // Moving average prognoza
      const windowSizeNum = parseInt(windowSize as string);
      const forecastData = await generateMovingAverageForecast(filter, forecastMonthsNum, windowSizeNum);
      res.json({
        success: true,
        data: forecastData
      });

    } else if (endpoint.includes('exponential')) {
      // Exponential smoothing prognoza
      const alphaNum = parseFloat(alpha as string);
      const forecastData = await generateExponentialSmoothingForecast(filter, forecastMonthsNum, alphaNum);
      res.json({
        success: true,
        data: forecastData
      });

    } else if (endpoint.includes('destinations')) {
      // Prognoza po destinacijama
      const forecastData = await generateDestinationForecasts(filter, forecastMonthsNum);
      res.json({
        success: true,
        data: forecastData
      });

    } else {
      res.status(404).json({
        success: false,
        message: 'Nepoznat endpoint za forecasting'
      });
    }

  } catch (error) {
    console.error('Greška u getForecastingData:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju forecasting podataka',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
} 