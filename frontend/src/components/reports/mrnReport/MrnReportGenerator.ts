import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import { FuelOperation, MrnReportBalance } from '../../../types/mrnReport';
import { FuelIntakeRecord } from '../../../types/fuel';
import { 
  FONT_NAME, 
  formatDateForReport, 
  formatDateTimeForReport, 
  getTrafficTypeDisplay,
  registerFont 
} from '../../../utils/pdfUtils';

/**
 * Main function to generate the MRN report PDF
 */
export const generateMrnReportPdf = (
  intake: FuelIntakeRecord, 
  transactions: FuelOperation[], 
  drainedFuel: any[], 
  balance: MrnReportBalance
) => {
  // Ensure transactions is always an array, even if it comes as null or undefined
  const safeTransactions = transactions || [];
  
  // Initialize the PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  registerFont(doc);

  // Initial Y position for content
  let yPos = 20;

  // Draw each section of the report, updating yPos as we go
  yPos = drawReportHeader(doc, intake, yPos);
  yPos = drawIntakeDetails(doc, intake, yPos);
  yPos = drawTransactionsTable(doc, intake, safeTransactions, yPos);
  yPos = drawDrainedFuelTable(doc, intake, drainedFuel, yPos);
  yPos = drawReportSummary(doc, intake, balance, yPos);
  
  // Add footer to all pages
  addFooter(doc);

  // Download the PDF
  const fileName = `MRN_Izvjestaj_${intake.customs_declaration_number}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  toast.success('MRN izvještaj uspješno generisan.');
};

// Placeholder implementations of helper functions
// These will be replaced with the actual implementations in subsequent files

/**
 * Draws the report header
 */
const drawReportHeader = (doc: jsPDF, intake: FuelIntakeRecord, yPos: number): number => {
  // Title
  doc.setFontSize(16);
  doc.setFont(FONT_NAME, 'bold');
  doc.text(`MRN Izvještaj: ${intake.customs_declaration_number}`, 14, yPos);
  
  return yPos + 10; // Return updated yPos
};

/**
 * Draws the intake details section
 */
const drawIntakeDetails = (doc: jsPDF, intake: FuelIntakeRecord, yPos: number): number => {
  // Intake details
  doc.setFontSize(12);
  doc.text('Podaci o ulazu goriva:', 14, yPos);
  doc.setFontSize(10);
  doc.setFont(FONT_NAME, 'normal');
  
  // Calculate quantity in kg if specific gravity is available
  let quantityKg = 'N/A';
  if (intake.quantity_kg_received) {
    quantityKg = parseFloat(intake.quantity_kg_received).toLocaleString('bs-BA', { maximumFractionDigits: 2 });
  } else if (intake.quantity_liters_received && intake.specific_gravity) {
    const kgValue = intake.quantity_liters_received * intake.specific_gravity;
    quantityKg = kgValue.toLocaleString('bs-BA', { maximumFractionDigits: 2 });
  }
  
  const intakeDetails = [
    ['Datum ulaza', formatDateForReport(intake.intake_datetime)],
    ['MRN broj', intake.customs_declaration_number || 'N/A'],
    ['Tip goriva', intake.fuel_type],
    ['Količina (L)', intake.quantity_liters_received ? intake.quantity_liters_received.toLocaleString('bs-BA') : 'N/A'],
    ['Količina (kg)', quantityKg],
    ['Dobavljač', intake.supplier_name || 'N/A'],
    ['Otpremnica', intake.delivery_note_number || 'N/A']
  ];
  
  let updatedYPos = yPos + 5;
  
  autoTable(doc, {
    startY: updatedYPos,
    head: [],
    body: intakeDetails,
    theme: 'plain',
    styles: { font: FONT_NAME, fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' }
    },
    didDrawPage: (data: any) => {
      updatedYPos = data.cursor.y + 10; // Add some space after the table
    }
  });
  
  return updatedYPos;
};

/**
 * Helper function to map transaction data for the table
 */
const mapTransactionData = (op: FuelOperation, intake: FuelIntakeRecord) => {
  // Retrieve values with fallbacks according to our field priority
  // Using prioritized fields with fallbacks for compatibility
  let mrnQuantity = op.litersTransacted ?? op.litersTransactedActual ?? op.quantity_liters;
  let kgValue = op.kgTransacted ?? op.quantity_kg;
  let densityValue = op.operationalDensityUsed ?? op.density ?? op.specific_density;
  
  // Parse mrnBreakdown for more detailed information if available
  if (op.mrnBreakdown) {
    try {
      const mrnData = JSON.parse(op.mrnBreakdown);
      const mrnEntry = mrnData.find((entry: { mrn: string, quantity: number }) => 
        entry.mrn === intake.customs_declaration_number
      );
      
      if (mrnEntry) {
        mrnQuantity = mrnEntry.quantity;
        // Use kg value from entry if available
        if (typeof mrnEntry.kg === 'number') {
          kgValue = mrnEntry.kg;
        }
      }
    } catch (error) {
      console.error('Greška pri parsiranju mrnBreakdown podataka:', error);
    }
  }
  
  // Return formatted row for the table
  return [
    formatDateTimeForReport(op.date ?? op.dateTime),
    op.aircraft_registration || op.aircraftRegistration || 'N/A',
    (op.airline?.name || op.airlineName || 'N/A'),
    getTrafficTypeDisplay(op),
    op.delivery_note_number || op.deliveryNoteNumber || 'N/A',
    typeof mrnQuantity === 'number' ? mrnQuantity.toLocaleString('bs-BA') : 'N/A',
    typeof kgValue === 'number' ? kgValue.toLocaleString('bs-BA') : 'N/A',
    typeof densityValue === 'number' ? densityValue.toLocaleString('bs-BA', { maximumFractionDigits: 4 }) : 'N/A',
    (() => {
      const currentDensity = op.density ?? op.specific_density;
      if (typeof currentDensity === 'number') {
        return currentDensity.toLocaleString('bs-BA', { maximumFractionDigits: 4 });
      } else if (typeof mrnQuantity === 'number' && typeof kgValue === 'number') {
        return (kgValue / mrnQuantity).toLocaleString('bs-BA', { maximumFractionDigits: 4 });
      }
      return 'N/A';
    })(),
    op.destination || 'N/A',
    op.operator_name || 'N/A'
  ];
};

/**
 * Draws the transactions table section
 */
const drawTransactionsTable = (
  doc: jsPDF, 
  intake: FuelIntakeRecord, 
  safeTransactions: FuelOperation[], 
  yPos: number
): number => {
  // Add header for fueling operations
  doc.setFontSize(12);
  doc.setFont(FONT_NAME, 'bold');
  doc.text('Operacije točenja goriva:', 14, yPos + 10);
  
  // Update yPos
  let updatedYPos = yPos + 10;
  
  // Check if we have any transactions to display
  if (safeTransactions.length > 0) {
    // Map transaction data for the table
    const fuelingOpsData = safeTransactions.map(op => mapTransactionData(op, intake));
    
    // Draw the table with transaction data
    autoTable(doc, {
      startY: updatedYPos + 5,
      head: [['Datum', 'Registracija', 'Aviokompanija', 'Tip saobraćaja', 'Dostavnica', 'Količina (L)', 'Količina (kg)', 'Spec. gustoća', 'Cijena po kg', 'Destinacija', 'Operator']],
      body: fuelingOpsData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
      styles: { font: FONT_NAME, fontSize: 8 },
      didDrawPage: (data: any) => {
        updatedYPos = data.cursor.y;
      }
    });
    
    // Add some space after the table
    updatedYPos += 10;
  } else {
    // No transactions to display
    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'normal');
    doc.text('Nema operacija točenja goriva za ovaj MRN.', 14, updatedYPos + 5);
    updatedYPos += 20;
  }
  
  return updatedYPos;
};

/**
 * Draws the drained fuel table section
 */
const drawDrainedFuelTable = (
  doc: jsPDF, 
  intake: FuelIntakeRecord, 
  drainedFuel: any[], 
  yPos: number
): number => {
  // Add header for drained fuel
  doc.setFontSize(12);
  doc.setFont(FONT_NAME, 'bold');
  doc.text('Drenirano gorivo:', 14, yPos + 10);
  
  // Update yPos
  let updatedYPos = yPos + 10;
  
  // Check if we have any drained fuel to display
  if (drainedFuel && drainedFuel.length > 0) {
    // Map drained fuel data for the table
    const drainedFuelTableData = drainedFuel.map((df: any) => {
      // Try to get exact quantity for this MRN from mrnBreakdown data
      let mrnQuantity = df.quantityLiters || df.quantity_liters;
      
      if (df.mrnBreakdown) {
        try {
          const mrnData = JSON.parse(df.mrnBreakdown);
          const mrnEntry = mrnData.find((entry: { mrn: string, quantity: number }) => 
            entry.mrn === intake.customs_declaration_number
          );
          
          if (mrnEntry) {
            mrnQuantity = mrnEntry.quantity;
          }
        } catch (error) {
          console.error('Greška pri parsiranju mrnBreakdown podataka za drenirano gorivo:', error);
        }
      }
      
      return [
        formatDateTimeForReport(df.dateTime || df.date_drained),
        mrnQuantity.toLocaleString('bs-BA'),
        df.reason || 'N/A',
        df.operator_name || (df.user ? df.user.username : 'N/A')
      ];
    });
    
    // Draw the table with drained fuel data
    autoTable(doc, {
      startY: updatedYPos + 5,
      head: [['Datum', 'Količina (L)', 'Razlog', 'Operator']],
      body: drainedFuelTableData,
      theme: 'grid',
      headStyles: { fillColor: [192, 57, 43], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
      styles: { font: FONT_NAME, fontSize: 9 },
      didDrawPage: (hookData: any) => {
        updatedYPos = hookData.cursor.y;
      }
    });
    
    // Add some space after the table
    updatedYPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // No drained fuel to display
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(10);
    doc.text('Nema podataka o dreniranom gorivu za ovaj MRN.', 14, updatedYPos + 5);
    updatedYPos += 15;
  }
  
  return updatedYPos;
};

/**
 * Draws the report summary section
 */
const drawReportSummary = (
  doc: jsPDF, 
  intake: FuelIntakeRecord,
  balance: MrnReportBalance, 
  yPos: number
): number => {
  // Add a new page for summary if necessary
  if (yPos > doc.internal.pageSize.height - 80) { 
    doc.addPage();
    yPos = 20; 
  } else {
    yPos += 10; 
  }
  
  // Title for summary page
  doc.setFontSize(14);
  doc.setFont(FONT_NAME, 'bold');
  doc.text('Sažetak MRN izvještaja', 14, yPos);
  yPos += 10;
  
  // Summary data using the balance object
  const summaryData = [
    ['Ukupno primljeno (L)', intake.quantity_liters_received.toLocaleString('bs-BA')],
    ['Ukupno izdano (L)', (balance.totalOutflowLiters ?? 0).toLocaleString('bs-BA')],
    ['Ukupno drenirano (L)', (balance.totalDrainedLiters ?? 0).toLocaleString('bs-BA')],
    ['Preostalo (L)', (balance.remainingLiters ?? 0).toLocaleString('bs-BA')],
    ['', ''], // Spacer
    ['Ukupno primljeno (kg)', parseFloat(intake.quantity_kg_received).toLocaleString('bs-BA', { maximumFractionDigits: 2 })],
    ['Ukupno izdano (kg)', (balance.totalOutflowKg ?? 0).toLocaleString('bs-BA', { maximumFractionDigits: 2 })],
    ['Preostalo (kg)', (balance.remainingKg ?? 0).toLocaleString('bs-BA', { maximumFractionDigits: 2 })],
    ['', ''], // Spacer
    ['Akumulirana varijansa (L)', `${(balance.accumulatedLiterVariance ?? 0).toFixed(2)} L`],
    ['Prosječna gustoća operacija', `${(balance.averageDensity ?? 0).toFixed(4)} kg/L`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { font: FONT_NAME, fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto', halign: 'right' }
    },
    didDrawPage: (data: any) => {
      yPos = data.cursor.y;
    }
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

/**
 * Adds a footer to all pages of the document
 */
const addFooter = (doc: jsPDF): void => {
  // Footer is added to all pages
  // Using 'as any' to bypass TypeScript error with getNumberOfPages
  const totalPages = (doc.internal as any).getNumberOfPages();
  
  // Loop through each page to add footer
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    
    // Add generation date and time on the left
    doc.text(`Izvještaj generisan: ${formatDateTimeForReport(new Date())}`, 14, footerY);
    
    // Add page number on the right
    doc.text(`Stranica ${i} od ${totalPages}`, doc.internal.pageSize.width - 20, footerY, { align: 'right' });
  }
};
