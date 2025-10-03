import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface CSVRow {
  Datum: string;
  'Tip leta': string;
  IATA: string;
  Destinacija: string;
  Vrijeme: string;
  'Avio kompanija': string;
  'IATA kod aviokompanije': string;
}

// POST /api/flight-schedules/import - Import schedules from CSV
export const importSchedulesFromCSV = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { csvContent, importType = 'departure' } = req.body;

    if (!csvContent) {
      res.status(400).json({ error: 'CSV content is required' });
      return;
    }

    // Parse CSV
    let records: CSVRow[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      res.status(400).json({ error: `CSV parsing error: ${parseError.message}` });
      return;
    }

    // Get all airlines to map names to IDs
    const airlines = await prisma.airline.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const airlineMap = new Map<string, number>();
    airlines.forEach((airline) => {
      airlineMap.set(airline.name.toLowerCase(), airline.id);
    });

    const results = {
      total: 0,
      imported: 0,
      skipped: 0,
      skippedReasons: {
        wrongType: 0,
        alreadyExists: 0,
        airlineNotFound: 0,
        other: 0,
      },
      errors: [] as string[],
      created: [] as any[],
    };

    // Process each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      results.total++;

      try {
        // Skip arrivals if importType is 'departure' only
        if (importType === 'departure' && row['Tip leta'] === 'Arrival') {
          results.skipped++;
          results.skippedReasons.wrongType++;
          continue;
        }

        // Skip departures if importType is 'arrival' only
        if (importType === 'arrival' && row['Tip leta'] === 'Departure') {
          results.skipped++;
          results.skippedReasons.wrongType++;
          continue;
        }

        // Find airline ID
        const airlineName = row['Avio kompanija']?.trim();
        const airlineId = airlineMap.get(airlineName.toLowerCase());

        if (!airlineId) {
          results.errors.push(
            `Row ${i + 2}: Airline "${airlineName}" not found in database. Please add it first.`
          );
          results.skipped++;
          results.skippedReasons.airlineNotFound++;
          continue;
        }

        // Parse date and time
        const dateStr = row['Datum']?.trim();
        const timeStr = row['Vrijeme']?.trim();
        
        if (!dateStr || !timeStr) {
          results.errors.push(`Row ${i + 2}: Missing date or time`);
          results.skipped++;
          continue;
        }

        // Combine date and time - parse as local time without timezone conversion
        // Split date parts
        const dateParts = dateStr.split('-');
        const timeParts = timeStr.split(':');
        
        if (dateParts.length !== 3 || timeParts.length !== 2) {
          results.errors.push(
            `Row ${i + 2}: Invalid date/time format. Date: "${dateStr}", Time: "${timeStr}"`
          );
          results.skipped++;
          continue;
        }
        
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        
        // Validate parsed values
        if (
          isNaN(year) || isNaN(month) || isNaN(day) || 
          isNaN(hours) || isNaN(minutes) ||
          year < 2000 || year > 2100 ||
          month < 1 || month > 12 ||
          day < 1 || day > 31 ||
          hours < 0 || hours > 23 ||
          minutes < 0 || minutes > 59
        ) {
          results.errors.push(
            `Row ${i + 2}: Invalid date/time values. Date: "${dateStr}", Time: "${timeStr}"`
          );
          results.skipped++;
          continue;
        }
        
        // Create ISO string without timezone conversion
        // This keeps the date "as is" without UTC conversion
        const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
        const scheduledDate = new Date(isoString);
        
        if (isNaN(scheduledDate.getTime())) {
          results.errors.push(`Row ${i + 2}: Invalid date/time format`);
          results.skipped++;
          continue;
        }

        // Don't auto-generate flight number - leave it null so matching works by airline and destination only
        // Users will enter actual flight numbers (like W44279) when creating fueling operations
        const flightNumber = null;

        // Check if schedule already exists
        const existingSchedule = await prisma.flightSchedule.findFirst({
          where: {
            airlineId,
            destination: row['Destinacija'],
            scheduled_date: scheduledDate,
            is_deleted: false,
          },
        });

        if (existingSchedule) {
          results.skipped++;
          results.skippedReasons.alreadyExists++;
          continue;
        }

        // Create schedule
        const schedule = await prisma.flightSchedule.create({
          data: {
            airlineId,
            destination: row['Destinacija'],
            flight_number: flightNumber,
            scheduled_date: scheduledDate,
            expected_operations: 1, // Default to 1 operation per flight
            notes: `Imported from CSV - ${row['Tip leta']} flight`,
            created_by: req.user?.id,
          },
          include: {
            airline: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        results.created.push(schedule);
        results.imported++;
      } catch (error: any) {
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.skipped++;
        results.skippedReasons.other++;
      }
    }

    res.status(200).json({
      message: 'Import completed',
      results: {
        total: results.total,
        imported: results.imported,
        skipped: results.skipped,
        skippedReasons: results.skippedReasons,
        errorCount: results.errors.length,
        errors: results.errors.slice(0, 10), // Return first 10 errors
      },
      schedules: results.created.slice(0, 20), // Return first 20 created schedules
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/flight-schedules/import/template - Download CSV template
export const downloadCSVTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = `Datum,Tip leta,IATA,Destinacija,Vrijeme,Avio kompanija,IATA kod aviokompanije
2025-10-01,Departure,FMM,Memmingen,09:55,Wizz Air,W6
2025-10-01,Departure,DTM,Dortmund,11:40,Wizz Air,W6`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flight_schedule_template.csv"');
    res.status(200).send(template);
  } catch (error) {
    next(error);
  }
};

// POST /api/flight-schedules/import/preview - Preview CSV import without saving
export const previewCSVImport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { csvContent, importType = 'departure' } = req.body;

    if (!csvContent) {
      res.status(400).json({ error: 'CSV content is required' });
      return;
    }

    // Parse CSV
    let records: CSVRow[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      res.status(400).json({ error: `CSV parsing error: ${parseError.message}` });
      return;
    }

    // Get all airlines
    const airlines = await prisma.airline.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const airlineMap = new Map<string, number>();
    airlines.forEach((airline) => {
      airlineMap.set(airline.name.toLowerCase(), airline.id);
    });

    const preview = {
      totalRows: records.length,
      validRows: 0,
      invalidRows: 0,
      willBeSkipped: 0,
      samples: [] as any[],
      errors: [] as string[],
      missingAirlines: new Set<string>(),
    };

    // Analyze first 50 rows for preview
    const previewLimit = Math.min(50, records.length);
    
    for (let i = 0; i < previewLimit; i++) {
      const row = records[i];

      // Check if will be skipped
      if (importType === 'departure' && row['Tip leta'] === 'Arrival') {
        preview.willBeSkipped++;
        continue;
      }
      if (importType === 'arrival' && row['Tip leta'] === 'Departure') {
        preview.willBeSkipped++;
        continue;
      }

      const airlineName = row['Avio kompanija']?.trim();
      const airlineId = airlineMap.get(airlineName.toLowerCase());

      if (!airlineId) {
        preview.missingAirlines.add(airlineName);
        preview.invalidRows++;
        if (preview.errors.length < 10) {
          preview.errors.push(`Row ${i + 2}: Airline "${airlineName}" not found`);
        }
        continue;
      }

      const dateStr = row['Datum']?.trim();
      const timeStr = row['Vrijeme']?.trim();
      
      if (!dateStr || !timeStr) {
        preview.invalidRows++;
        if (preview.errors.length < 10) {
          preview.errors.push(`Row ${i + 2}: Missing date or time`);
        }
        continue;
      }

      // Parse date and time in local timezone
      const dateParts = dateStr.split('-');
      const timeParts = timeStr.split(':');
      
      if (dateParts.length !== 3 || timeParts.length !== 2) {
        preview.invalidRows++;
        if (preview.errors.length < 10) {
          preview.errors.push(
            `Row ${i + 2}: Invalid date/time format. Date: "${dateStr}", Time: "${timeStr}"`
          );
        }
        continue;
      }
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      if (
        isNaN(year) || isNaN(month) || isNaN(day) || 
        isNaN(hours) || isNaN(minutes) ||
        year < 2000 || year > 2100 ||
        month < 1 || month > 12 ||
        day < 1 || day > 31 ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59
      ) {
        preview.invalidRows++;
        if (preview.errors.length < 10) {
          preview.errors.push(
            `Row ${i + 2}: Invalid date/time values. Date: "${dateStr}", Time: "${timeStr}"`
          );
        }
        continue;
      }
      
      // Create ISO string without timezone conversion
      const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
      const scheduledDate = new Date(isoString);
      
      if (isNaN(scheduledDate.getTime())) {
        preview.invalidRows++;
        if (preview.errors.length < 10) {
          preview.errors.push(`Row ${i + 2}: Invalid date/time format`);
        }
        continue;
      }

      preview.validRows++;
      
      if (preview.samples.length < 10) {
        preview.samples.push({
          airline: airlineName,
          destination: row['Destinacija'],
          date: scheduledDate,
          flightType: row['Tip leta'],
          iataCode: row['IATA'],
        });
      }
    }

    // Calculate full stats
    for (let i = previewLimit; i < records.length; i++) {
      const row = records[i];
      
      if (importType === 'departure' && row['Tip leta'] === 'Arrival') {
        preview.willBeSkipped++;
        continue;
      }
      if (importType === 'arrival' && row['Tip leta'] === 'Departure') {
        preview.willBeSkipped++;
        continue;
      }

      const airlineName = row['Avio kompanija']?.trim();
      if (!airlineMap.get(airlineName.toLowerCase())) {
        preview.missingAirlines.add(airlineName);
        preview.invalidRows++;
      } else {
        preview.validRows++;
      }
    }

    res.status(200).json({
      preview: {
        ...preview,
        missingAirlines: Array.from(preview.missingAirlines),
      },
    });
  } catch (error) {
    next(error);
  }
};
