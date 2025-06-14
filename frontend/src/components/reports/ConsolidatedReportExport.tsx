'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';
import { fetchWithAuth } from '@/lib/apiService';

// Define interfaces for the report data types
interface User {
  id: number;
  username: string;
  role: string;
}

interface FixedTank {
  id: number;
  tank_identifier: string;
  tank_name?: string;
  location_description: string;
  fuel_type: string;
  capacity_liters?: number;
  current_liters?: number;
}

interface MobileTank {
  id: number;
  identifier: string;
  name?: string;
  vehicle_name?: string;
  registration_number?: string;
  current_location?: string;
  fuel_type?: string;
  capacity_liters?: number;
  current_liters?: number;
}

interface Aircraft {
  id: number;
  registration: string;
  type: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface FuelOperation {
  id: number;
  dateTime: string;
  operationType: string;
  sourceType: 'fixed' | 'mobile' | string;
  sourceFixedTankId?: number | null;
  sourceMobileTankId?: number | null;
  destinationType: 'fixed' | 'mobile' | 'aircraft' | string;
  destinationFixedTankId?: number | null;
  destinationMobileTankId?: number | null;
  aircraftId?: number | null;
  quantityLiters: number;
  notes?: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  sourceFixedTank?: FixedTank | null;
  sourceMobileTank?: MobileTank | null;
  destinationFixedTank?: FixedTank | null;
  destinationMobileTank?: MobileTank | null;
  aircraft?: Aircraft | null;
  
  // MRN tracking fields
  mrnBreakdown?: string;
  parsedMrnBreakdown?: Array<{ mrn: string; quantity_liters?: number; quantity_kg?: number; [key: string]: any }>;
  
  // Additional properties from individual FuelOperationsReport
  aircraft_registration?: string;
  airline?: { name: string };
  destination?: string;
  quantity_liters?: number;
  specific_density?: number;
  quantity_kg?: number;
  price_per_kg?: number;
  currency?: string;
  tank?: { identifier: string; name?: string; fuel_type?: string };
  flight_number?: string;
  operator_name?: string;
  tip_saobracaja?: string;
  
  // Camel case alternatives (for TypeScript compatibility)
  specificDensity?: number;
  quantityKg?: number;
  pricePerKg?: number;
  flightNumber?: string;
  operatorName?: string;
  tipSaobracaja?: string;
}

interface FuelIntakeRecord {
  id: number;
  dateTime: string; // Should map from intake_datetime
  tankId: number; // This might need mapping if backend sends tank object
  supplierId: number; // This might need mapping if backend sends supplier object
  invoiceNumber?: string; // Corresponds to delivery_note_number?
  quantity_liters_received: number; // from backend
  quantity_kg_received: string;    // from backend, needs parsing
  pricePerLiter?: number; // Potentially to be deprecated if price_per_kg is primary
  totalPrice?: number; // from backend
  notes?: string;
  userId: number; // This might need mapping if backend sends user object
  createdAt: string; // from backend
  updatedAt: string; // from backend
  customs_declaration_number?: string; // from backend
  specific_density?: number; // from backend (specific_gravity)
  // quantity_kg?: number; // Deprecated in favor of quantity_kg_received
  tank?: FixedTank; // For local joining/display, if applicable
  supplier?: Supplier; // For local joining/display, if applicable
  user?: User; // For local joining/display, if applicable

  // Direct properties from API response (snake_case)
  intake_datetime: string; // from backend
  fuel_category?: string; // from backend
  fuel_type?: string; // from backend
  // quantity_liters_received is now primary above
  refinery_name?: string; // from backend
  supplier_name?: string; // from backend
  delivery_note_number?: string; // from backend
  price_per_kg?: number; // from backend
  currency?: string; // from backend
  // fixedTankTransfers and documents can be added if needed for this component
  fixedTankTransfers?: any[]; // Or a more specific type
  documents?: any[]; // Or a more specific type
}

interface TankerTransaction {
  id: number;
  transaction_datetime: string;
  type: 'supplier_refill' | 'fixed_tank_transfer' | 'aircraft_fueling' | 'adjustment' | string;
  quantity_liters: number;
  source_name?: string;
  source_id?: number;
  destination_name?: string;
  tankName?: string;
  tankIdentifier?: string;
  destination_id?: number;
  supplier_name?: string;
  invoice_number?: string;
  price_per_liter?: number;
  notes?: string;
  user?: string;
}

interface FuelDrainData {
  id: number;
  dateTime: string;
  sourceType: 'fixed' | 'mobile' | string;
  sourceFixedTankId?: number | null;
  sourceMobileTankId?: number | null;
  quantityLiters: number;
  notes?: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user: User;
  sourceFixedTank?: FixedTank | null;
  sourceMobileTank?: MobileTank | null;
  sourceName?: string;
  userName?: string;
}

const FONT_NAME = 'NotoSans';

// Helper function to get first day of current month in YYYY-MM-DD format
const getFirstDayOfMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

// Helper function to get last day of current month in YYYY-MM-DD format
const getLastDayOfMonth = (): string => {
  const now = new Date();
  // Create a date for the first day of the next month, then subtract one day
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
};

// Helper function to format date as dd.mm.yyyy
const formatDateForDisplay = (dateInput?: string | Date): string => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}.`;
};

// Helper function to format date as dd.mm.yyyy HH:MM
const formatDateTimeForReport = (dateInput?: string | Date): string => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year}. ${hours}:${minutes}`;
};

// Register font for PDF export
const registerFont = (doc: jsPDF) => {
  const stripPrefix = (base64String: string) => {
    const prefix = 'data:font/ttf;base64,';
    if (base64String.startsWith(prefix)) {
      return base64String.substring(prefix.length);
    }
    return base64String;
  };

  if (notoSansRegularBase64) {
    const cleanedRegular = stripPrefix(notoSansRegularBase64);
    doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
    doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
  } else {
    console.error('Noto Sans Regular font data not loaded.');
  }

  if (notoSansBoldBase64) {
    const cleanedBold = stripPrefix(notoSansBoldBase64);
    doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
    doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
  } else {
    console.error('Noto Sans Bold font data not loaded.');
  }
};

const ConsolidatedReportExport: React.FC<{}> = () => {
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getLastDayOfMonth());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Function to fetch data for all reports
  const fetchAllReportsData = async () => {
    try {
      setIsGenerating(true);

      // Format dates for API requests - ensure we include the full day for both start and end dates
      // This follows the pattern from the memory about date range filtering
      const formattedStartDate = dayjs(startDate).format('YYYY-MM-DD');
      const formattedEndDate = dayjs(endDate).add(1, 'day').subtract(1, 'second').format('YYYY-MM-DD');

      // Use Promise.allSettled to handle cases where some API calls might fail
      const [
        fuelOperationsResult, 
        fuelIntakeResult, 
        tankerVehiclesResult, 
        fuelDrainResult
      ] = await Promise.allSettled([
        // 1. Fuel Operations
        fetchWithAuth(`/api/fuel/fueling-operations?startDate=${formattedStartDate}&endDate=${formattedEndDate}`)
          .catch(err => {
            console.error('Error fetching fuel operations:', err);
            return [];
          }),

        // 2. Fuel Intake Records
        fetchWithAuth(`/api/fuel/intake-records?startDate=${formattedStartDate}&endDate=${formattedEndDate}`)
          .catch(err => {
            console.error('Error fetching fuel intake records:', err);
            return [];
          }),

        // 3. Tanker Transactions - fetch all tanks first, then get transactions for each
        fetchWithAuth('/api/fuel/tanks')
          .then(async (tanks) => {
            if (!Array.isArray(tanks)) {
              console.warn('Tanks data is not an array, using empty array instead');
              return [];
            }
            const tanksData = await Promise.allSettled((tanks as any[]).map(tank => 
              fetchWithAuth(`/api/fuel/tanks/${tank.id}/transactions`)
                .then(data => {
                  // Add tank name and identifier to each transaction
                  if (!Array.isArray(data)) return [];
                  return (data as any[]).map(transaction => ({
                    ...transaction,
                    tankName: tank.name || 'Nepoznato',
                    tankIdentifier: tank.identifier || 'Nepoznato'
                  }));
                })
                .catch(() => [])
            ));
            // Filter out rejected promises and flatten the results
            return tanksData
              .filter(result => result.status === 'fulfilled')
              .map(result => (result as PromiseFulfilledResult<any[]>).value)
              .flat();
          })
          .catch(err => {
            console.error('Error fetching tanker vehicles data:', err);
            return [];
          }),
          
        // 4. Fuel Drain Records
        fetchWithAuth(`/api/fuel/drains/records?startDate=${formattedStartDate}&endDate=${formattedEndDate}`)
          .catch(err => {
            console.error('Error fetching fuel drain data:', err);
            return [];
          })
      ]);

      // Extract data from results, using empty arrays for failed requests
      const fuelOperationsData = fuelOperationsResult.status === 'fulfilled' ? 
        (fuelOperationsResult.value as FuelOperation[]) : [];
      
      const fuelIntakeData = fuelIntakeResult.status === 'fulfilled' ? 
        (fuelIntakeResult.value as FuelIntakeRecord[]) : [];
      
      const tankerVehiclesData = tankerVehiclesResult.status === 'fulfilled' ? 
        (tankerVehiclesResult.value as TankerTransaction[]) : [];
      
      const fuelDrainData = fuelDrainResult.status === 'fulfilled' ? 
        (fuelDrainResult.value as FuelDrainData[]) : [];

      // Parse MRN breakdown data for fuel operations
      const operationsWithParsedMrn = fuelOperationsData.map((operation: FuelOperation) => {
        if (operation.mrnBreakdown) {
          try {
            const parsedMrnBreakdown = JSON.parse(operation.mrnBreakdown);
            return {
              ...operation,
              parsedMrnBreakdown
            };
          } catch (e) {
            console.error(`Error parsing MRN breakdown for operation ${operation.id}:`, e);
            return operation;
          }
        }
        return operation;
      });

      // Check if we have at least some data to generate a report
      if (
        operationsWithParsedMrn.length === 0 && 
        fuelIntakeData.length === 0 && 
        tankerVehiclesData.length === 0 && 
        fuelDrainData.length === 0
      ) {
        toast.error('Nema podataka za odabrani period.');
        return;
      }

      // Generate the consolidated PDF with available data
      generateConsolidatedPdf(
        operationsWithParsedMrn, 
        fuelIntakeData, 
        tankerVehiclesData, 
        fuelDrainData
      );
      
      // Show notification if some data couldn't be fetched
      if (
        fuelOperationsResult.status === 'rejected' || 
        fuelIntakeResult.status === 'rejected' || 
        tankerVehiclesResult.status === 'rejected' || 
        fuelDrainResult.status === 'rejected'
      ) {
        toast('Neki podaci nisu uspješno dohvaćeni. Izvještaj može biti nepotpun.', {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Greška pri dohvatu podataka za izvještaj');
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to generate consolidated PDF
  const generateConsolidatedPdf = (
    fuelOperations: FuelOperation[],
    fuelIntake: FuelIntakeRecord[],
    tankerTransactions: TankerTransaction[],
    fuelDrain: FuelDrainData[]
  ) => {
    // Create PDF document with landscape orientation
    const doc = new jsPDF({ orientation: 'landscape' });
    registerFont(doc);

    // Set document properties
    doc.setProperties({
      title: 'Konsolidovani izvještaj goriva',
      subject: `Period: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`,
      author: 'Avio Servis',
      creator: 'Avio Servis Informacioni Sistem'
    });

    // Add title
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(18);
    doc.text('KONSOLIDOVANI IZVJEŠTAJ GORIVA', doc.internal.pageSize.width / 2, 20, { align: 'center' });

    // Add date range
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(12);
    doc.text(`Period: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`, 
      doc.internal.pageSize.width / 2, 28, { align: 'center' });

    // Add generation date
    doc.setFontSize(10);
    doc.text(`Izvještaj generisan: ${formatDateTimeForReport(new Date())}`, 
      doc.internal.pageSize.width / 2, 34, { align: 'center' });

    // Add page number function for all pages
    const addPageNumber = (pageNumber: number) => {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(7);
      doc.text(`Stranica ${pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    };

    // Set up auto page break for content that doesn't fit
    doc.setProperties({
      title: 'Konsolidovani izvještaj goriva',
      subject: `Period: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`,
      author: 'Avio Servis',
      creator: 'Avio Servis Informacioni Sistem'
    });

    // 1. FUEL OPERATIONS REPORT
    let currentY = 45;
    
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.text('1. IZVJEŠTAJ OPERACIJA GORIVA', 14, currentY);
    currentY += 8;

    if (fuelOperations.length === 0) {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(10);
      doc.text('Nema podataka o operacijama goriva za odabrani period.', 14, currentY);
      currentY += 10;
    } else {
      // Pomoćna funkcija za formatiranje MRN podataka
      const formatMrnData = (operation: FuelOperation) => {
        let mrnDataToDisplay: Array<{ mrn: string; quantity_liters?: number; quantity_kg?: number; [key: string]: any }> = [];
        
        try {
          // Prvo provjeri parsedMrnBreakdown koji dolazi direktno s backenda
          if (operation.parsedMrnBreakdown && Array.isArray(operation.parsedMrnBreakdown)) {
            mrnDataToDisplay = operation.parsedMrnBreakdown;
          }
          // Ako nema parsedMrnBreakdown, pokušaj parsirati mrnBreakdown string
          else if (typeof operation.mrnBreakdown === 'string') {
            const parsedData = JSON.parse(operation.mrnBreakdown);
            if (Array.isArray(parsedData)) {
              mrnDataToDisplay = parsedData;
            }
          }
        } catch (e) {
          console.error('Error parsing MRN data:', e);
          // Nastavi s praznim nizom ako je došlo do greške
        }
        
        // Formatiraj MRN podatke za prikaz
        if (mrnDataToDisplay.length === 0) {
          return 'N/A';
        }
        
        return mrnDataToDisplay.map(item => 
          `${item.mrn}: ${typeof item.quantity_kg === 'number' ? 
            item.quantity_kg.toLocaleString('bs-BA', { minimumFractionDigits: 2 }) + ' kg' : 
            'N/A kg'}`
        ).join('\n');
      };
      
      // Prepare table data for fuel operations - match format from FuelOperationsReport.tsx
      const fuelOperationsTableData = fuelOperations.map(operation => [
        formatDateTimeForReport(operation.dateTime || new Date()),
        operation.aircraft_registration || 'N/A',
        operation.airline?.name || 'N/A',
        operation.destination || 'N/A',
        (operation.quantity_liters !== undefined && operation.quantity_liters !== null) 
          ? operation.quantity_liters.toLocaleString('bs-BA', { minimumFractionDigits: 2 })
          : '0.00',
        (operation.specific_density !== undefined && operation.specific_density !== null) 
          ? operation.specific_density.toLocaleString('bs-BA', { minimumFractionDigits: 3 })
          : '0.000',
        (operation.quantity_kg !== undefined && operation.quantity_kg !== null) 
          ? operation.quantity_kg.toLocaleString('bs-BA', { minimumFractionDigits: 2 })
          : '0.00',
        (operation.price_per_kg !== undefined && operation.price_per_kg !== null) 
          ? operation.price_per_kg.toLocaleString('bs-BA', { minimumFractionDigits: 2 })
          : '0.00',
        operation.currency || 'BAM',
        operation.tank?.fuel_type || 'N/A',
        operation.tank ? `${operation.tank.identifier || 'N/A'} ${operation.tank.name ? `(${operation.tank.name})` : ''}`.trim() : 'N/A',
        operation.flight_number || 'N/A',
        operation.operator_name || 'N/A',
        operation.tip_saobracaja || 'N/A',
        formatMrnData(operation)
      ]);
      
      // Generate table for fuel operations - match headers from FuelOperationsReport.tsx
      autoTable(doc, {
        head: [[
          'Dat./Vrij.', 
          'Avion', 
          'Avio Komp.', 
          'Destinacija', 
          'Kol. (L)', 
          'Gust.', 
          'Kol. (kg)', 
          'Cijena/kg', 
          'Val.', 
          'Tip Gor.', 
          'Tank', 
          'Let', 
          'Oper.', 
          'Tip Saob.',
          'MRN'
        ]],
        body: fuelOperationsTableData,
        startY: currentY,
        styles: {
          font: FONT_NAME,
          fontSize: 8, // Reduced from 9
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [229, 62, 62] as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold' as const,
          fontSize: 9, // Reduced from 10
        },
        // Enable automatic page breaks for content that doesn't fit
        margin: { top: 40, bottom: 20 },
        columnStyles: {
          0: { cellWidth: 25 }, // Date/Time
          4: { halign: 'right' as const }, // Quantity L
          5: { halign: 'right' as const }, // Density
          6: { halign: 'right' as const }, // Quantity kg
          7: { halign: 'right' as const }, // Price per kg
        },
        didDrawPage: (data) => {
          addPageNumber(data.pageNumber);
        },
      });

      // Update current Y position after the table
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      // Calculate summary data for fuel operations
      // 1. Calculate totals (liters, kg, revenue by currency)
      const totalLiters = fuelOperations.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
      const totalKg = fuelOperations.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
      const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;
      
      // 2. Calculate revenue by currency
      const revenueByCurrency: {[key: string]: number} = {};
      fuelOperations.forEach(op => {
        const currency = op.currency || 'BAM';
        const revenue = (op.quantity_kg || 0) * (op.price_per_kg || 0);
        if (!revenueByCurrency[currency]) {
          revenueByCurrency[currency] = 0;
        }
        revenueByCurrency[currency] += revenue;
      });
      
      // 3. Calculate totals by traffic type
      const trafficTypeTotals: {[key: string]: {liters: number, kg: number}} = {};
      fuelOperations.forEach(op => {
        const trafficType = op.tip_saobracaja || 'Nepoznato';
        if (!trafficTypeTotals[trafficType]) {
          trafficTypeTotals[trafficType] = {liters: 0, kg: 0};
        }
        trafficTypeTotals[trafficType].liters += Number(op.quantity_liters || 0);
        trafficTypeTotals[trafficType].kg += Number(op.quantity_kg || 0);
      });
      
      // Check if we need a new page for the summary section
      if (currentY > doc.internal.pageSize.height - 100) {
        doc.addPage();
        currentY = 20;
      }
      
      // Add summary section
      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(12);
      doc.text('SAŽETAK IZVJEŠTAJA OPERACIJA GORIVA', 14, currentY);
      currentY += 8;
      
      // Display totals
      doc.setFontSize(9);
      doc.text(`Ukupno Litara: ${totalLiters.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} L`, 14, currentY);
      currentY += 5;
      doc.text(`Ukupno Kilograma: ${totalKg.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} kg`, 14, currentY);
      currentY += 5;
      doc.text(`Prosječna Gustoća: ${averageDensity.toLocaleString('bs-BA', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg/L`, 14, currentY);
      currentY += 8;
      
      // Display breakdown by traffic type
      doc.text('Ukupno po tipu saobraćaja:', 14, currentY);
      currentY += 5;
      
      const trafficTypes = Object.keys(trafficTypeTotals).sort();
      if (trafficTypes.length > 0) {
        trafficTypes.forEach(type => {
          const data = trafficTypeTotals[type];
          doc.text(`${type}: ${data.liters.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} L / ${data.kg.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} kg`, 14, currentY);
          currentY += 5;
        });
      } else {
        doc.text('Nema podataka o tipovima saobraćaja', 14, currentY);
        currentY += 5;
      }
      
      // Display revenue by currency
      currentY += 3;
      doc.text('Ukupan promet po valuti:', 14, currentY);
      currentY += 5;
      
      const currencyKeys = Object.keys(revenueByCurrency).sort();
      if (currencyKeys.length > 0) {
        currencyKeys.forEach(currency => {
          const amount = revenueByCurrency[currency];
          const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'KM';
          doc.text(`${currency}: ${currencySymbol} ${amount.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, currentY);
          currentY += 5;
        });
        
        // Add empty entries for missing currencies
        const missingCurrencies = ['USD', 'EUR', 'BAM'].filter(c => !currencyKeys.includes(c));
        missingCurrencies.forEach(currency => {
          const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'KM';
          doc.text(`${currency}: ${currencySymbol} 0.00`, 14, currentY);
          currentY += 5;
        });
      } else {
        // If no revenue data, show zeros for all currencies
        doc.text('USD: $ 0.00', 14, currentY);
        currentY += 5;
        doc.text('EUR: € 0.00', 14, currentY);
        currentY += 5;
        doc.text('BAM: KM 0.00', 14, currentY);
        currentY += 5;
      }
      
      currentY += 5; // Add some extra space after the summary
    }
    
    // 2. FUEL INTAKE REPORT
    // Always start on a new page
    doc.addPage();
    currentY = 20;

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.text('2. IZVJEŠTAJ PRIJEMA GORIVA', 14, currentY);
    currentY += 8;

    if (fuelIntake.length === 0) {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(10);
      doc.text('Nema podataka o prijemu goriva za odabrani period.', 14, currentY);
      currentY += 10;
    } else {
      // Prepare table data for fuel intake - match format from FuelIntakeReport.tsx
      const fuelIntakeTableData = fuelIntake.map((intake, index) => {
        console.log(`Intake Record ID: ${intake.id || 'index ' + index}, quantity_kg_received raw:`, intake.quantity_kg_received, `type: ${typeof intake.quantity_kg_received}`);
        const liters = intake.quantity_liters_received || 0; // quantity_liters_received is number
        let kgValue: number | undefined = undefined;

        // Strictly use quantity_kg_received, converting if necessary. No fallback calculation.
        if (intake.quantity_kg_received !== undefined && intake.quantity_kg_received !== null) {
          const parsedKg = parseFloat(intake.quantity_kg_received); // Parse string to float
          if (!isNaN(parsedKg)) {
            kgValue = parsedKg;
            console.log(`Intake Record ID: ${intake.id || 'index ' + index}, quantity_kg_received parsed:`, kgValue);
          } else {
            console.log(`Intake Record ID: ${intake.id || 'index ' + index}, quantity_kg_received parsing resulted in NaN for value:`, intake.quantity_kg_received);
          }
        } else {
          console.log(`Intake Record ID: ${intake.id || 'index ' + index}, quantity_kg_received is undefined or null.`);
        }

        const kgDisplay = (typeof kgValue === 'number')
          ? kgValue.toLocaleString('bs-BA', { minimumFractionDigits: 2 })
          : 'N/A';

        return [
          formatDateTimeForReport(intake.intake_datetime || intake.dateTime || new Date()),
          intake.fuel_type || intake.tank?.fuel_type || 'N/A',
          intake.fuel_category || 'Domaće tržište',
          liters.toLocaleString('bs-BA', { minimumFractionDigits: 2 }),
          kgDisplay,
          intake.refinery_name || 'N/A',
          intake.supplier_name || intake.supplier?.name || 'N/A',
          intake.delivery_note_number || intake.invoiceNumber || 'N/A',
          intake.customs_declaration_number || 'N/A' // Dodajemo MRN polje
        ];
      });

      // Generate table for fuel intake - match headers from FuelIntakeReport.tsx
      autoTable(doc, {
        startY: currentY,
        head: [['Dat./Vrij.', 'Tip Gor.', 'Kat.', 'Kol. (L)', 'Kol. (kg)', 'Rafin.', 'Dobav.', 'Br. Otpr.', 'MRN']],
        body: fuelIntakeTableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
        styles: { font: FONT_NAME, fontSize: 8 },
        margin: { top: 40, bottom: 20 },
        didDrawPage: (data) => {
          addPageNumber(data.pageNumber);
        },
      });

      // Update current Y position after the table
      currentY = (doc as any).lastAutoTable.finalY + 5; // Reduced spacing before summary

      // Calculate and display totals for fuel intake
      const totalIntakeLiters = fuelIntake.reduce((sum, intake) => sum + (intake.quantity_liters_received || 0), 0);
      const totalIntakeKg = fuelIntake.reduce((sum, intake) => {
        let kg = 0;
        if (intake.quantity_kg_received !== undefined && intake.quantity_kg_received !== null) {
          const parsed = parseFloat(intake.quantity_kg_received); // Parse string to float
          if (!isNaN(parsed)) {
            kg = parsed;
          }
        }
        return sum + kg;
      }, 0);

      if (currentY > doc.internal.pageSize.height - 30) { // Check if space for totals
        doc.addPage();
        currentY = 20;
      }

      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(9);
      doc.text(`Ukupan ulaz: ${totalIntakeLiters.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} L / ${totalIntakeKg.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} kg`, 14, currentY);
      currentY += 10;
    }

    // 3. TANKER VEHICLES REPORT
    // Always start on a new page
    doc.addPage();
    currentY = 20;

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.text('3. IZVJEŠTAJ TRANSAKCIJA AVIO CISTERNI', 14, currentY);
    currentY += 8;

    if (tankerTransactions.length === 0) {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(10);
      doc.text('Nema podataka o transakcijama avio cisterni za odabrani period.', 14, currentY);
      currentY += 10;
    } else {
      // Helper function to get transaction type badge color
      const getTransactionTypeBadgeColor = (type: string): [number, number, number] => {
        switch (type) {
          case 'supplier_refill': return [39, 174, 96]; // green
          case 'fixed_tank_transfer': return [41, 128, 185]; // blue
          case 'aircraft_fueling': return [231, 76, 60]; // red
          case 'adjustment': return [243, 156, 18]; // yellow
          default: return [149, 165, 166]; // gray
        }
      };

      // Helper function to get transaction type display
      const getTransactionTypeDisplay = (type: string): string => {
        switch (type) {
          case 'supplier_refill': return 'PRIJEM OD DOBAVLJAČA';
          case 'fixed_tank_transfer': return 'TRANSFER IZ FIKSNOG TANKA';
          case 'aircraft_fueling': return 'TOČENJE AVIONA';
          case 'adjustment': return 'KOREKCIJA';
          default: return type.toUpperCase();
        }
      };

      // Prepare table data for tanker transactions - match format from TankerVehiclesReport.tsx
      const tankerTransactionsTableData = tankerTransactions.map(transaction => {
        const transactionType = transaction.type || '';
        const badgeColor = getTransactionTypeBadgeColor(transactionType);
        
        return [
          formatDateTimeForReport(transaction.transaction_datetime || new Date()),
          transaction.tankIdentifier || 'N/A',
          {
            content: getTransactionTypeDisplay(transactionType),
            styles: { fillColor: badgeColor, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, halign: 'center' as const }
          },
          (transaction.quantity_liters !== undefined && transaction.quantity_liters !== null) 
            ? transaction.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 }) + ' L'
            : '0.00 L',
          transaction.notes || 'N/A'
        ];
      });

      // Generate table for tanker transactions - match headers from TankerVehiclesReport.tsx
      autoTable(doc, {
        startY: currentY,
        head: [['Dat./Vrij.', 'Cist.', 'Tip Trans.', 'Kol. (L)', 'Nap.']],
        body: tankerTransactionsTableData,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
        styles: { font: FONT_NAME, fontSize: 8 },
        margin: { top: 40, bottom: 20 },
        didDrawPage: (data) => {
          addPageNumber(data.pageNumber);
        }
      });

      // Update current Y position
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 4. FUEL DRAIN REPORT
    // Always start on a new page
    doc.addPage();
    currentY = 20;

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.text('4. IZVJEŠTAJ DRENIRANOG GORIVA', 14, currentY);
    currentY += 8;

    if (fuelDrain.length === 0) {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(10);
      doc.text('Nema podataka o dreniranom gorivu za odabrani period.', 14, currentY);
      currentY += 10;
    } else {
      // Prepare table data for fuel drain - match format from FuelDrainReport.tsx
      const fuelDrainTableData = fuelDrain.map(drain => {
        // Determine source type display
        let sourceTypeDisplay = 'Nepoznato';
        if (drain.sourceType === 'fixed') {
          sourceTypeDisplay = 'Fiksni tank';
        } else if (drain.sourceType === 'mobile') {
          sourceTypeDisplay = 'Mobilni tank';
        }
        
        // Get source name
        let sourceDisplay = 'N/A';
        if (drain.sourceFixedTank) {
          sourceDisplay = `${drain.sourceFixedTank.tank_identifier || 'N/A'} ${drain.sourceFixedTank.tank_name ? `(${drain.sourceFixedTank.tank_name})` : ''}`.trim();
        } else if (drain.sourceMobileTank) {
          sourceDisplay = `${drain.sourceMobileTank.identifier || drain.sourceMobileTank.registration_number || 'N/A'} ${drain.sourceMobileTank.name || drain.sourceMobileTank.vehicle_name ? `(${drain.sourceMobileTank.name || drain.sourceMobileTank.vehicle_name})` : ''}`.trim();
        }

        return [
          formatDateTimeForReport(drain.dateTime || new Date()),
          sourceTypeDisplay,
          sourceDisplay,
          (drain.quantityLiters !== undefined && drain.quantityLiters !== null) 
            ? drain.quantityLiters.toLocaleString('hr-HR', { minimumFractionDigits: 2 }) + ' L'
            : '0.00 L',
          drain.notes || 'N/A',
          drain.userName || (drain.user?.username || 'N/A')
        ];
      });

      // Generate table for fuel drain
      autoTable(doc, {
        startY: currentY,
        head: [['Dat./Vrij.', 'Izvor Tip', 'Izvor', 'Kol. (L)', 'Nap.', 'Koris.']],
        body: fuelDrainTableData,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
        styles: { font: FONT_NAME, fontSize: 8 },
        margin: { top: 40, bottom: 20 },
        didDrawPage: (data) => {
          addPageNumber(data.pageNumber);
        }
      });

      // Update current Y position after the table
      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Calculate total drained quantity
      const totalDrainedLiters = fuelDrain.reduce((total, drain) => {
        return total + Number(drain.quantityLiters || 0);
      }, 0);
      
      // Check if we need a new page for the summary
      if (currentY > doc.internal.pageSize.height - 30) {
        doc.addPage();
        currentY = 20;
        // If a new page is added, the page number is typically handled by didDrawPage of the next table or manually if it's the last content.
        // For a simple text summary, manually adding page number might be needed if no other autoTable follows.
        // However, the addPageNumber in the if block might be redundant if didDrawPage is consistently used.
        // Let's rely on didDrawPage from tables and manual addition if it's the absolute end of document and needed.
      }
      
      // Add total drained quantity summary
      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(9);
      doc.text(`Ukupno drenirano: ${totalDrainedLiters.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L`, 14, currentY);
      currentY += 10;
    }

    // Save the PDF
    const formattedDate = format(new Date(), 'yyyy-MM-dd');
    doc.save(`Konsolidovani_Izvjestaj_${formattedDate}.pdf`);
    toast.success('Konsolidovani izvještaj uspješno generisan.');
  };

  return (
    <Card className="w-full shadow-md bg-white/10 backdrop-blur-lg border border-white/20">
      <CardHeader className="bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] text-white rounded-t-lg border-b border-white/10 shadow-[0_4px_15px_rgba(229,62,62,0.3)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e53e3e]/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#e53e3e]/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
        <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-[#e53e3e] mr-2" />
            <CardTitle className="text-xl md:text-2xl font-bold">Eksport Svih Izvještaja</CardTitle>
          </div>
          <p className="text-sm text-gray-300 mt-1 md:mt-0">
            Generiši konsolidovani PDF izvještaj za odabrani period
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-lg border border-white/10 shadow-inner">
            <h3 className="text-lg font-semibold mb-4">Odaberite period za izvještaj</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Početni datum:</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Krajnji datum:</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={fetchAllReportsData}
              disabled={isGenerating || !startDate || !endDate}
              className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all rounded-xl px-6 py-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generisanje u toku...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generiši ukupni izvještaj
                </>
              )}
            </Button>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-lg border border-white/10">
            <h3 className="text-lg font-semibold mb-2">O konsolidovanom izvještaju</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Konsolidovani izvještaj objedinjuje podatke iz svih modula za upravljanje gorivom u jedan PDF dokument.
              Izvještaj će sadržavati sljedeće sekcije:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
              <li>Operacije goriva (točenje aviona, transferi)</li>
              <li>Prijem goriva (od dobavljača)</li>
              <li>Transakcije avio cisterni</li>
              <li>Drenirano gorivo</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsolidatedReportExport;
