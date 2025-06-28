import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { notoSansRegularBase64 } from '../fonts/fonts';
import { notoSansBoldBase64 } from '../fonts/notoSansBoldBase64';

const prisma = new PrismaClient();

// Font configuration
const FONT_NAME = 'NotoSans';

// Interface za OstalaOprema
interface OstalaOprema {
  id: number;
  naziv: string;
  mesto_koristenja: string | null;
  vlasnik: string | null;
  standard_opreme: string | null;
  snaga: string | null;
  protok_kapacitet: string | null;
  sigurnosne_sklopke: string | null;
  prinudno_zaustavljanje: string | null;
  napomena: string | null;
  dokument_url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get all OstalaOprema
export const getAllOstalaOprema = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Osnovni query
    let whereClause: any = {};

    // Search po nazivu, vlasniku ili mjestu korištenja
    if (search) {
      whereClause.OR = [
        { naziv: { contains: search as string, mode: 'insensitive' } },
        { vlasnik: { contains: search as string, mode: 'insensitive' } },
        { mesto_koristenja: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const oprema = await prisma.ostalaOprema.findMany({
      where: whereClause,
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: Number(limit),
    });

    const total = await prisma.ostalaOprema.count({ where: whereClause });

    res.json({
      oprema,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      summary: {
        ukupno: total
      }
    });
  } catch (error) {
    console.error('Greška pri dohvaćanju ostale opreme:', error);
    res.status(500).json({ error: 'Greška pri dohvaćanju ostale opreme' });
  }
};

// Get OstalaOprema by ID
export const getOstalaOpremaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const oprema = await prisma.ostalaOprema.findUnique({
      where: { id: parseInt(id) }
    });

    if (!oprema) {
      res.status(404).json({ error: 'Oprema nije pronađena' });
      return;
    }

    res.json(oprema);
  } catch (error) {
    console.error('Greška pri dohvaćanju opreme:', error);
    res.status(500).json({ error: 'Greška pri dohvaćanju opreme' });
  }
};

// Create new OstalaOprema
export const createOstalaOprema = async (req: Request, res: Response) => {
  try {
    const {
      naziv,
      mesto_koristenja,
      vlasnik,
      standard_opreme,
      snaga,
      protok_kapacitet,
      sigurnosne_sklopke,
      prinudno_zaustavljanje,
      napomena,
      dokument_url
    } = req.body;

    // Validacija - naziv je obavezan
    if (!naziv || naziv.trim() === '') {
      res.status(400).json({ error: 'Naziv opreme je obavezan' });
      return;
    }

    const novaOprema = await prisma.ostalaOprema.create({
      data: {
        naziv: naziv.trim(),
        mesto_koristenja: mesto_koristenja || undefined,
        vlasnik: vlasnik || undefined,
        standard_opreme: standard_opreme || undefined,
        snaga: snaga || undefined,
        protok_kapacitet: protok_kapacitet || undefined,
        sigurnosne_sklopke: sigurnosne_sklopke || undefined,
        prinudno_zaustavljanje: prinudno_zaustavljanje || undefined,
        napomena: napomena || undefined,
        dokument_url: dokument_url || undefined,
      }
    });

    res.status(201).json(novaOprema);
  } catch (error) {
    console.error('Greška pri kreiranju opreme:', error);
    res.status(500).json({ error: 'Greška pri kreiranju opreme' });
  }
};

// Update OstalaOprema
export const updateOstalaOprema = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      naziv,
      mesto_koristenja,
      vlasnik,
      standard_opreme,
      snaga,
      protok_kapacitet,
      sigurnosne_sklopke,
      prinudno_zaustavljanje,
      napomena,
      dokument_url
    } = req.body;

    // Provjeri da li oprema postoji
    const postojecaOprema = await prisma.ostalaOprema.findUnique({
      where: { id: parseInt(id) }
    });

    if (!postojecaOprema) {
      res.status(404).json({ error: 'Oprema nije pronađena' });
      return;
    }

    // Validacija - naziv je obavezan
    if (!naziv || naziv.trim() === '') {
      res.status(400).json({ error: 'Naziv opreme je obavezan' });
      return;
    }

    const azuriranaOprema = await prisma.ostalaOprema.update({
      where: { id: parseInt(id) },
      data: {
        naziv: naziv.trim(),
        mesto_koristenja: mesto_koristenja || undefined,
        vlasnik: vlasnik || undefined,
        standard_opreme: standard_opreme || undefined,
        snaga: snaga || undefined,
        protok_kapacitet: protok_kapacitet || undefined,
        sigurnosne_sklopke: sigurnosne_sklopke || undefined,
        prinudno_zaustavljanje: prinudno_zaustavljanje || undefined,
        napomena: napomena || undefined,
        dokument_url: dokument_url || undefined,
      }
    });

    res.json(azuriranaOprema);
  } catch (error) {
    console.error('Greška pri ažuriranju opreme:', error);
    res.status(500).json({ error: 'Greška pri ažuriranju opreme' });
  }
};

// Delete OstalaOprema
export const deleteOstalaOprema = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Provjeri da li oprema postoji
    const postojecaOprema = await prisma.ostalaOprema.findUnique({
      where: { id: parseInt(id) }
    });

    if (!postojecaOprema) {
      res.status(404).json({ error: 'Oprema nije pronađena' });
      return;
    }

    // Ukloni dokument ako postoji
    if (postojecaOprema.dokument_url) {
      const fullPath = path.join(__dirname, '../../uploads', path.basename(postojecaOprema.dokument_url));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await prisma.ostalaOprema.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Greška pri brisanju opreme:', error);
    res.status(500).json({ error: 'Greška pri brisanju opreme' });
  }
};

// Upload document for OstalaOprema
export const uploadOstalaOpremaDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      res.status(400).json({ error: 'Nijedan fajl nije poslat' });
      return;
    }

    // Provjeri da li oprema postoji
    const oprema = await prisma.ostalaOprema.findUnique({
      where: { id: parseInt(id) }
    });

    if (!oprema) {
      res.status(404).json({ error: 'Oprema nije pronađena' });
      return;
    }

    // Ukloni stari dokument ako postoji
    if (oprema.dokument_url) {
      const oldPath = path.join(__dirname, '../../uploads', path.basename(oprema.dokument_url));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Generiraj URL za novi dokument
    const dokument_url = `/uploads/${req.file.filename}`;

    // Ažuriraj opremu sa novim dokumentom
    const azuriranaOprema = await prisma.ostalaOprema.update({
      where: { id: parseInt(id) },
      data: { dokument_url }
    });

    res.json({
      message: 'Dokument je uspješno uploadovan',
      dokument_url,
      oprema: azuriranaOprema
    });
  } catch (error) {
    console.error('Greška pri uploadu dokumenta:', error);
    res.status(500).json({ error: 'Greška pri uploadu dokumenta' });
  }
};

// Generate PDF for specific OstalaOprema
export const generateOstalaOpremaPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const oprema = await prisma.ostalaOprema.findUnique({
      where: { id: parseInt(id) }
    });

    if (!oprema) {
      res.status(404).json({ error: 'Oprema nije pronađena' });
      return;
    }

    const doc = new jsPDF();

    /**
     * Register custom font for proper special character support (č, ć, ž, đ, š)
     */
    const registerFont = (doc: any): void => {
      const stripPrefix = (base64String: string): string => {
        const prefix = 'data:font/ttf;base64,';
        if (base64String.startsWith(prefix)) {
          return base64String.substring(prefix.length);
        }
        return base64String;
      };

      try {
        if (notoSansRegularBase64) {
          const cleanedRegular = stripPrefix(notoSansRegularBase64);
          doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
          doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
        } else {
          console.warn('Noto Sans Regular font data not loaded, using helvetica.');
        }

        if (notoSansBoldBase64) {
          const cleanedBold = stripPrefix(notoSansBoldBase64);
          doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
          doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
        } else {
          console.warn('Noto Sans Bold font data not loaded, using helvetica.');
        }
      } catch (error) {
        console.error('Error registering fonts:', error);
      }
      
      // Set default font
      try {
        doc.setFont(FONT_NAME, 'normal');
      } catch (error) {
        console.warn('NotoSans font not available, falling back to helvetica');
        doc.setFont('helvetica', 'normal');
      }
      
      doc.setLanguage('hr');
      doc.setFontSize(10);
    };
    
    // Register custom font
    registerFont(doc);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Helper function to check if we need a new page
    const checkNewPage = (currentY: number, requiredHeight: number = 20, addTableHeader?: { left: string, right: string }): number => {
      const footerSpace = 35; // Space reserved for footer
      if (currentY + requiredHeight > pageHeight - footerSpace) {
        addFooter(doc, pageWidth, pageHeight);
        doc.addPage();
        registerFont(doc); // Re-register font for new page
        let newY = 60; // Starting Y position for new page
        
        // Add table header if specified
        if (addTableHeader) {
          newY = drawTableHeader(newY, addTableHeader.left, addTableHeader.right);
        }
        
        return newY;
      }
      return currentY;
    };
    
    // Helper function to draw table header
    const drawTableHeader = (yPos: number, leftHeader: string, rightHeader: string): number => {
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.3);
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPos, 170, 8, 'FD');
      
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(leftHeader, 25, yPos + 5);
      doc.text(rightHeader, 100, yPos + 5);
      return yPos + 8;
    };
    
    // Helper function to add footer
    const addFooter = (doc: any, pageWidth: number, pageHeight: number): void => {
      const reportDate = new Date().toLocaleDateString('bs-BA');
      const reportTime = new Date().toLocaleTimeString('bs-BA');
      
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      doc.setFontSize(8);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('HIFA-PETROL d.o.o. Sarajevo - Sistem za upravljanje opremom', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Generiran: ${reportDate} u ${reportTime}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    };
    
    // Header with company info
    doc.setFillColor(240, 240, 250);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setFontSize(18);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('HIFA-PETROL d.o.o. Sarajevo', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Međunarodni aerodrom Tuzla', 20, 28);
    doc.text('Ostala oprema - Tehnički izvještaj', 20, 35);
    
    // Report metadata
    const reportDate = new Date().toLocaleDateString('bs-BA');
    const reportTime = new Date().toLocaleTimeString('bs-BA');
    doc.text(`Datum izvještaja: ${reportDate}`, pageWidth - 20, 25, { align: 'right' });
    doc.text(`Vrijeme: ${reportTime}`, pageWidth - 20, 32, { align: 'right' });
    
    // Report title
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(20, 50, pageWidth - 20, 50);
    
    doc.setFontSize(16);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('IZVJEŠTAJ O OPREMI', pageWidth / 2, 60, { align: 'center' });
    
    // Basic information section
    let yPosition = 80;
    yPosition = checkNewPage(yPosition, 30); // Check if we need new page for this section
    
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('OSNOVNI PODACI OPREME', 20, yPosition);
    yPosition += 10;
    
    // Draw table header
    yPosition = drawTableHeader(yPosition, 'OPIS', 'VRIJEDNOST');
    
    // Basic info data
    const basicInfoData = [
      ['Naziv opreme', oprema.naziv],
      ['Mjesto korištenja', oprema.mesto_koristenja || 'N/A'],
      ['Vlasnik', oprema.vlasnik || 'N/A'],
      ['Standard opreme', oprema.standard_opreme || 'N/A'],
      ['Datum kreiranja', oprema.createdAt.toLocaleDateString('bs-BA')],
      ['Zadnje ažuriran', oprema.updatedAt.toLocaleDateString('bs-BA')]
    ];
    
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(9);
    
    basicInfoData.forEach((row, index) => {
      yPosition = checkNewPage(yPosition, 10, { left: 'OPIS', right: 'VRIJEDNOST' }); // Check before each row with table header
      
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.setFillColor(252, 252, 252);
        doc.rect(20, yPosition, 170, 8, 'F');
      }
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(row[0], 25, yPosition + 5);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(row[1], 100, yPosition + 5);
      
      // Draw border
      doc.setDrawColor(230, 230, 230);
      doc.rect(20, yPosition, 170, 8, 'D');
      doc.line(95, yPosition, 95, yPosition + 8);
      
      yPosition += 8;
    });
    
    // Technical specifications section
    yPosition += 15;
    yPosition = checkNewPage(yPosition, 40); // Check if we need new page for technical section
    
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('TEHNIČKI PODACI', 20, yPosition);
    yPosition += 10;
    
    // Draw tech table header
    yPosition = drawTableHeader(yPosition, 'PARAMETAR', 'VRIJEDNOST');
    
    const technicalData = [
      ['Snaga', oprema.snaga || 'N/A'],
      ['Protok/kapacitet', oprema.protok_kapacitet || 'N/A'],
      ['Sigurnosne sklopke', oprema.sigurnosne_sklopke || 'N/A'],
      ['Prinudno zaustavljanje', oprema.prinudno_zaustavljanje || 'N/A']
    ];
    
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(9);
    
    technicalData.forEach((row, index) => {
      yPosition = checkNewPage(yPosition, 10, { left: 'PARAMETAR', right: 'VRIJEDNOST' }); // Check before each row with table header
      
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.setFillColor(252, 252, 252);
        doc.rect(20, yPosition, 170, 8, 'F');
      }
      
      doc.setFont(FONT_NAME, 'bold');
      doc.text(row[0], 25, yPosition + 5);
      doc.setFont(FONT_NAME, 'normal');
      doc.text(row[1], 100, yPosition + 5);
      
      // Draw border
      doc.setDrawColor(230, 230, 230);
      doc.rect(20, yPosition, 170, 8, 'D');
      doc.line(95, yPosition, 95, yPosition + 8);
      
      yPosition += 8;
    });
    
    // Notes section if exists
    if (oprema.napomena) {
      yPosition += 15;
      const noteText = doc.splitTextToSize(oprema.napomena, pageWidth - 50);
      const notesHeight = 25 + (noteText.length * 4);
      yPosition = checkNewPage(yPosition, notesHeight); // Check space for notes section
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('NAPOMENE', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(0, 0, 0);
      
      doc.text(noteText, 20, yPosition);
      yPosition += noteText.length * 4;
    }
    
    // Document information if exists
    if (oprema.dokument_url) {
      yPosition += 15;
      yPosition = checkNewPage(yPosition, 25); // Check space for document section
      
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('PRILOŽENI DOKUMENT', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('✓ Dokument je priložen u digitalnom formatu', 20, yPosition);
    }
    
    // Add footer to the last page
    addFooter(doc, pageWidth, pageHeight);
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="oprema-izvjestaj-${oprema.naziv.replace(/[^a-zA-Z0-9]/g, '_')}-${reportDate.replace(/\./g, '')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Greška pri generiranju PDF-a' });
  }
};

// Generate full report PDF for all OstalaOprema
export const generateFullReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { opremaIds } = req.body;
    
    if (!Array.isArray(opremaIds) || opremaIds.length === 0) {
      res.status(400).json({ message: 'Lista ID-jeva opreme je obavezna' });
      return;
    }

    // Fetch all oprema
    const opremaList = await prisma.ostalaOprema.findMany({
      where: {
        id: { in: opremaIds }
      },
      orderBy: { naziv: 'asc' }
    });

    if (opremaList.length === 0) {
      res.status(404).json({ message: 'Oprema nije pronađena' });
      return;
    }

    const doc = new jsPDF();

    // Use the same helper functions as individual PDF
    const registerFont = (doc: any): void => {
      const stripPrefix = (base64String: string): string => {
        const prefix = 'data:font/ttf;base64,';
        if (base64String.startsWith(prefix)) {
          return base64String.substring(prefix.length);
        }
        return base64String;
      };

      try {
        if (notoSansRegularBase64) {
          const cleanedRegular = stripPrefix(notoSansRegularBase64);
          doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
          doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
        } else {
          console.warn('Noto Sans Regular font data not loaded, using helvetica.');
        }

        if (notoSansBoldBase64) {
          const cleanedBold = stripPrefix(notoSansBoldBase64);
          doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
          doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
        } else {
          console.warn('Noto Sans Bold font data not loaded, using helvetica.');
        }
      } catch (error) {
        console.error('Error registering fonts:', error);
      }
      
      // Set default font
      try {
        doc.setFont(FONT_NAME, 'normal');
      } catch (error) {
        console.warn('NotoSans font not available, falling back to helvetica');
        doc.setFont('helvetica', 'normal');
      }
      
      doc.setLanguage('hr');
      doc.setFontSize(10);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const checkNewPage = (currentY: number, requiredHeight: number = 20, addTableHeader?: { left: string, right: string }): number => {
      const footerSpace = 35; // Space reserved for footer
      if (currentY + requiredHeight > pageHeight - footerSpace) {
        addFooter();
        doc.addPage();
        registerFont(doc); // Re-register font for new page
        let newY = 60; // Starting Y position for new page
        
        // Add table header if specified
        if (addTableHeader) {
          newY = drawTableHeader(newY, addTableHeader.left, addTableHeader.right);
        }
        
        return newY;
      }
      return currentY;
    };

    const drawTableHeader = (yPos: number, leftHeader: string, rightHeader: string): number => {
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.3);
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPos, 170, 8, 'FD');
      
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(leftHeader, 25, yPos + 5);
      doc.text(rightHeader, 100, yPos + 5);
      return yPos + 8;
    };

    const addReportHeader = (): number => {
      // Header with company info
      doc.setFillColor(240, 240, 250);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setFontSize(18);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('HIFA-PETROL d.o.o. Sarajevo', 20, 20);
      
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Međunarodni aerodrom Tuzla', 20, 28);
      doc.text('Ostala oprema - Ukupni izvještaj', 20, 35);
      
      // Report metadata
      const reportDate = new Date().toLocaleDateString('bs-BA');
      const reportTime = new Date().toLocaleTimeString('bs-BA');
      doc.text(`Datum izvještaja: ${reportDate}`, pageWidth - 20, 25, { align: 'right' });
      doc.text(`Vrijeme: ${reportTime}`, pageWidth - 20, 32, { align: 'right' });
      doc.text(`Ukupno opreme: ${opremaList.length}`, pageWidth - 20, 39, { align: 'right' });
      
      // Report title
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.line(20, 50, pageWidth - 20, 50);
      
      doc.setFontSize(16);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('UKUPNI IZVJEŠTAJ - OSTALA OPREMA', pageWidth / 2, 60, { align: 'center' });
      
      return 80;
    };

    const addFooter = (): void => {
      const reportDate = new Date().toLocaleDateString('bs-BA');
      const reportTime = new Date().toLocaleTimeString('bs-BA');
      
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      doc.setFontSize(8);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('HIFA-PETROL d.o.o. Sarajevo - Sistem za upravljanje opremom', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Generiran: ${reportDate} u ${reportTime}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    };

    // Register fonts and add header
    registerFont(doc);
    let yPosition = addReportHeader();

    // Generate report for each oprema
    opremaList.forEach((oprema, opremaIndex) => {
      // Check if we need a new page for new oprema
      if (opremaIndex > 0) {
        yPosition = checkNewPage(yPosition, 60);
        
        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 10;
      }

      // Highlight naziv opreme
      yPosition = checkNewPage(yPosition, 12);
      doc.setFillColor(230, 240, 250);
      doc.rect(20, yPosition - 5, 170, 12, 'F');
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text(`${oprema.naziv}`, 25, yPosition + 2);
      yPosition += 20;

      // Basic data section
      yPosition = checkNewPage(yPosition, 30);
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('OSNOVNI PODACI', 20, yPosition);
      yPosition += 10;

      // Basic data table header
      yPosition = drawTableHeader(yPosition, 'OPIS', 'VRIJEDNOST');

      const basicData = [
        { label: 'Naziv opreme', value: oprema.naziv },
        { label: 'Mjesto korištenja', value: oprema.mesto_koristenja || 'N/A' },
        { label: 'Vlasnik', value: oprema.vlasnik || 'N/A' },
        { label: 'Standard opreme', value: oprema.standard_opreme || 'N/A' }
      ];

      basicData.forEach((item, index) => {
        yPosition = checkNewPage(yPosition, 8, { left: 'OPIS', right: 'VRIJEDNOST' });

        const isEven = index % 2 === 0;
        if (isEven) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, yPosition, 170, 8, 'F');
        }

        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(9);
        doc.text(item.label, 25, yPosition + 5);

        doc.setFont(FONT_NAME, 'normal');
        doc.text(item.value, 100, yPosition + 5);

        doc.setDrawColor(230, 230, 230);
        doc.rect(20, yPosition, 170, 8, 'D');
        doc.line(95, yPosition, 95, yPosition + 8);

        yPosition += 8;
      });

      // Technical data section
      yPosition += 15;
      yPosition = checkNewPage(yPosition, 40);
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('TEHNIČKI PODACI', 20, yPosition);
      yPosition += 10;

      yPosition = drawTableHeader(yPosition, 'PARAMETAR', 'VRIJEDNOST');

      const technicalData = [
        { label: 'Snaga', value: oprema.snaga || 'N/A' },
        { label: 'Protok/kapacitet', value: oprema.protok_kapacitet || 'N/A' },
        { label: 'Sigurnosne sklopke', value: oprema.sigurnosne_sklopke || 'N/A' },
        { label: 'Prinudno zaustavljanje', value: oprema.prinudno_zaustavljanje || 'N/A' }
      ];

      technicalData.forEach((item, index) => {
        yPosition = checkNewPage(yPosition, 8, { left: 'PARAMETAR', right: 'VRIJEDNOST' });

        const isEven = index % 2 === 0;
        if (isEven) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, yPosition, 170, 8, 'F');
        }

        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(9);
        doc.text(item.label, 25, yPosition + 5);

        doc.setFont(FONT_NAME, 'normal');
        doc.text(item.value, 100, yPosition + 5);

        doc.setDrawColor(230, 230, 230);
        doc.rect(20, yPosition, 170, 8, 'D');
        doc.line(95, yPosition, 95, yPosition + 8);

        yPosition += 8;
      });

      // Notes section
      if (oprema.napomena) {
        yPosition += 15;
        const noteText = doc.splitTextToSize(oprema.napomena, pageWidth - 50);
        const notesHeight = 25 + (noteText.length * 4);
        yPosition = checkNewPage(yPosition, notesHeight);
        
        doc.setFontSize(12);
        doc.setFont(FONT_NAME, 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text('NAPOMENE', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(9);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(noteText, 20, yPosition);
        yPosition += noteText.length * 4;
      }

      // Add space between oprema (except for the last one)
      if (opremaIndex < opremaList.length - 1) {
        yPosition += 20;
        yPosition = checkNewPage(yPosition, 20);
        
        // Add separator line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }
    });

    // Add footer to all pages
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ukupni_izvjestaj_ostala_oprema_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Greška pri generiranju ukupnog izvještaja:', error);
    res.status(500).json({ 
      error: 'Greška pri generiranju ukupnog izvještaja',
      details: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}; 