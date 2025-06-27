import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as z from 'zod';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from './activity.controller';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { notoSansRegularBase64 } from '../fonts/fonts';
import { notoSansBoldBase64 } from '../fonts/notoSansBoldBase64';

const prisma = new PrismaClient();

// Font configuration
const FONT_NAME = 'NotoSans';

// Validation schema
const rezervoarSchema = z.object({
  naziv_rezervoara: z.string().min(1, 'Naziv rezervoara je obavezan'),
  mjesto_koristenja: z.string().min(1, 'Mjesto korištenja je obavezno'),
  id_broj: z.string().min(1, 'ID broj je obavezan'),
  vlasnik: z.string().min(1, 'Vlasnik je obavezan'),
  oblik_rezervoara: z.string().min(1, 'Oblik rezervoara je obavezan'),
  kapacitet: z.number().positive('Kapacitet mora biti pozitivan broj'),
  materijal_izgradnje: z.string().min(1, 'Materijal izgradnje je obavezan'),
  zastita_unutrasnjeg_rezervoara: z.string().min(1, 'Zaštita je obavezna'),
  datum_kalibracije: z.string().or(z.date()),
  dimenzije_l: z.number().positive('Dužina mora biti pozitivna'),
  dimenzije_w: z.number().positive('Širina mora biti pozitivna'),
  dimenzije_h: z.number().positive('Visina mora biti pozitivna'),
  napomene: z.string().optional(),
});

// Helper function to delete a file if it exists
const deleteFileFromServer = (fileUrlPath: string | null | undefined) => {
  if (!fileUrlPath) return;
  try {
    const fileName = path.basename(fileUrlPath);
    const localPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'rezervoari_dokumenti', fileName);
    
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`Successfully deleted old file: ${localPath}`);
    }
  } catch (err) {
    console.error(`Error deleting file ${fileUrlPath}:`, err);
  }
};

// GET /api/rezervoari - Dobijanje liste svih rezervoara
export const getAllRezervoari = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oblik_rezervoara, vlasnik } = req.query;
    
    const filters: any = {};
    if (oblik_rezervoara) filters.oblik_rezervoara = oblik_rezervoara as string;
    if (vlasnik) filters.vlasnik = { contains: vlasnik as string, mode: 'insensitive' };

    const rezervoari = await prisma.rezervoar.findMany({
      where: filters,
      orderBy: {
        kreiran: 'desc',
      }
    });
    
    res.status(200).json(rezervoari);
  } catch (error: any) {
    console.error('Error fetching rezervoari:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju rezervoara' });
  }
};

// GET /api/rezervoari/:id - Dobijanje detalja specifičnog rezervoara
export const getRezervoarById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const rezervoar = await prisma.rezervoar.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!rezervoar) {
      res.status(404).json({ message: 'Rezervoar nije pronađen' });
      return;
    }
    
    res.status(200).json(rezervoar);
  } catch (error: any) {
    console.error('Error fetching rezervoar:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju rezervoara' });
  }
};

// POST /api/rezervoari - Kreiranje novog rezervoara
export const createRezervoar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Creating rezervoar with data:', req.body);
    
    // Parse numeric fields from form data
    const numericFields = ['kapacitet', 'dimenzije_l', 'dimenzije_w', 'dimenzije_h'];
    numericFields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = parseFloat(req.body[field]);
      }
    });

    // Validate data
    const validatedData = rezervoarSchema.parse(req.body);
    
    let dokument_url: string | null = null;
    
    // Handle file upload
    if (req.file) {
      const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'rezervoari_dokumenti');
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const uniqueFilename = `rezervoar-${Date.now()}-${Math.floor(Math.random() * 1E9)}.${req.file.originalname.split('.').pop()}`;
      const newPath = path.join(uploadDir, uniqueFilename);
      
      try {
        await fs.promises.rename(req.file.path, newPath);
        dokument_url = `/uploads/rezervoari_dokumenti/${uniqueFilename}`;
      } catch (err) {
        console.error('Error moving uploaded file:', err);
        res.status(500).json({ message: 'Greška pri snimanju dokumenta' });
        return;
      }
    }

    const newRezervoar = await prisma.rezervoar.create({
      data: {
        ...validatedData,
        datum_kalibracije: new Date(validatedData.datum_kalibracije),
        dokument_url,
      },
    });

    // Log activity
    if (req.user) {
      const metadata = {
        rezervoarId: newRezervoar.id,
        naziv: newRezervoar.naziv_rezervoara,
        id_broj: newRezervoar.id_broj,
      };

      const description = `Korisnik ${req.user.username} je kreirao novi rezervoar "${newRezervoar.naziv_rezervoara}" (ID: ${newRezervoar.id_broj}) kapaciteta ${Number(newRezervoar.kapacitet).toLocaleString()} L.`;

      await logActivity(
        req.user.id,
        req.user.username,
        'CREATE_REZERVOAR',
        'Rezervoar',
        newRezervoar.id,
        description,
        metadata,
        req
      );
    }

    console.log('Rezervoar created successfully:', newRezervoar);
    res.status(201).json(newRezervoar);
  } catch (error: any) {
    console.error('Error creating rezervoar:', error);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('id_broj')) {
      res.status(409).json({ message: 'Rezervoar sa ovim ID brojem već postoji.' });
      return;
    }
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: 'Neispravni podaci', 
        errors: error.errors 
      });
      return;
    }
    
    res.status(500).json({ message: 'Greška pri kreiranju rezervoara' });
  }
};

// PUT /api/rezervoari/:id - Ažuriranje rezervoara
export const updateRezervoar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if rezervoar exists
    const existingRezervoar = await prisma.rezervoar.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!existingRezervoar) {
      res.status(404).json({ message: 'Rezervoar nije pronađen' });
      return;
    }
    
    // Parse numeric fields from form data
    const numericFields = ['kapacitet', 'dimenzije_l', 'dimenzije_w', 'dimenzije_h'];
    numericFields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = parseFloat(req.body[field]);
      }
    });

    // Validate data (make all fields optional for update)
    const updateSchema = rezervoarSchema.partial();
    const validatedData = updateSchema.parse(req.body);
    
    let dokument_url = existingRezervoar.dokument_url;
    
    // Handle file upload
    if (req.file) {
      // Delete old file if exists
      deleteFileFromServer(existingRezervoar.dokument_url);
      
      const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'rezervoari_dokumenti');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const uniqueFilename = `rezervoar-${Date.now()}-${Math.floor(Math.random() * 1E9)}.${req.file.originalname.split('.').pop()}`;
      const newPath = path.join(uploadDir, uniqueFilename);
      
      try {
        await fs.promises.rename(req.file.path, newPath);
        dokument_url = `/uploads/rezervoari_dokumenti/${uniqueFilename}`;
      } catch (err) {
        console.error('Error moving uploaded file:', err);
        res.status(500).json({ message: 'Greška pri snimanju dokumenta' });
        return;
      }
    }

    const updatedData: any = { ...validatedData };
    if (validatedData.datum_kalibracije) {
      updatedData.datum_kalibracije = new Date(validatedData.datum_kalibracije);
    }
    if (dokument_url !== existingRezervoar.dokument_url) {
      updatedData.dokument_url = dokument_url;
    }

    const updatedRezervoar = await prisma.rezervoar.update({
      where: { id: parseInt(id) },
      data: updatedData,
    });

    // Log activity
    if (req.user) {
      const metadata = {
        rezervoarId: updatedRezervoar.id,
        naziv: updatedRezervoar.naziv_rezervoara,
        id_broj: updatedRezervoar.id_broj,
        changes: validatedData,
      };

      const description = `Korisnik ${req.user.username} je ažurirao rezervoar "${updatedRezervoar.naziv_rezervoara}" (ID: ${updatedRezervoar.id_broj}).`;

      await logActivity(
        req.user.id,
        req.user.username,
        'UPDATE_REZERVOAR',
        'Rezervoar',
        updatedRezervoar.id,
        description,
        metadata,
        req
      );
    }

    res.status(200).json(updatedRezervoar);
  } catch (error: any) {
    console.error('Error updating rezervoar:', error);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('id_broj')) {
      res.status(409).json({ message: 'Rezervoar sa ovim ID brojem već postoji.' });
      return;
    }
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: 'Neispravni podaci', 
        errors: error.errors 
      });
      return;
    }
    
    res.status(500).json({ message: 'Greška pri ažuriranju rezervoara' });
  }
};

// DELETE /api/rezervoari/:id - Brisanje rezervoara
export const deleteRezervoar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if rezervoar exists
    const existingRezervoar = await prisma.rezervoar.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!existingRezervoar) {
      res.status(404).json({ message: 'Rezervoar nije pronađen' });
      return;
    }

    // Delete associated file if exists
    deleteFileFromServer(existingRezervoar.dokument_url);

    // Delete from database
    await prisma.rezervoar.delete({
      where: { id: parseInt(id) },
    });

    // Log activity
    if (req.user) {
      const metadata = {
        rezervoarId: parseInt(id),
        naziv: existingRezervoar.naziv_rezervoara,
        id_broj: existingRezervoar.id_broj,
      };

      const description = `Korisnik ${req.user.username} je obrisao rezervoar "${existingRezervoar.naziv_rezervoara}" (ID: ${existingRezervoar.id_broj}).`;

      await logActivity(
        req.user.id,
        req.user.username,
        'DELETE_REZERVOAR',
        'Rezervoar',
        parseInt(id),
        description,
        metadata,
        req
      );
    }

    res.status(200).json({ message: 'Rezervoar je uspješno obrisan' });
  } catch (error: any) {
    console.error('Error deleting rezervoar:', error);
    res.status(500).json({ message: 'Greška pri brisanju rezervoara' });
  }
};

// GET /api/rezervoari/:id/pdf - Generiranje PDF izvještaja
export const generateRezervoarPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const rezervoar = await prisma.rezervoar.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!rezervoar) {
      res.status(404).json({ message: 'Rezervoar nije pronađen' });
      return;
    }

    // Import jsPDF dynamically
    const { jsPDF } = require('jspdf');
    
    const doc = new jsPDF({
      putOnlyUsedFonts: true,
      compress: true,
      format: 'a4'
    });
    
    // Font name to use throughout the document
    const FONT_NAME = 'NotoSans';
    
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
      doc.text('HIFA-PETROL d.o.o. Sarajevo - Sistem za upravljanje rezervoarima', pageWidth / 2, pageHeight - 15, { align: 'center' });
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
    doc.text('Rezervoari - Tehnički izvještaj', 20, 35);
    
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
    doc.text('IZVJEŠTAJ O REZERVOARU', pageWidth / 2, 60, { align: 'center' });
    
    // Basic information section
    let yPosition = 80;
    yPosition = checkNewPage(yPosition, 30); // Check if we need new page for this section
    
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('OSNOVNI PODACI REZERVOARA', 20, yPosition);
    yPosition += 10;
    
    // Draw table header
    yPosition = drawTableHeader(yPosition, 'OPIS', 'VRIJEDNOST');
    
    // Basic info data
    const basicInfoData = [
      ['Naziv rezervoara', rezervoar.naziv_rezervoara],
      ['ID broj', rezervoar.id_broj],
      ['Mjesto korištenja', rezervoar.mjesto_koristenja],
      ['Vlasnik', rezervoar.vlasnik],
      ['Oblik rezervoara', rezervoar.oblik_rezervoara],
      ['Kapacitet', `${Number(rezervoar.kapacitet).toLocaleString('bs-BA')} L`],
      ['Materijal izgradnje', rezervoar.materijal_izgradnje],
      ['Zaštita unutrašnjeg rezervoara', rezervoar.zastita_unutrasnjeg_rezervoara],
      ['Datum kalibracije', rezervoar.datum_kalibracije.toLocaleDateString('bs-BA')]
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
    
    const volumen = Number(rezervoar.dimenzije_l) * Number(rezervoar.dimenzije_w) * Number(rezervoar.dimenzije_h);
    
    const technicalData = [
      ['Dužina (L)', `${Number(rezervoar.dimenzije_l)} m`],
      ['Širina (W)', `${Number(rezervoar.dimenzije_w)} m`],
      ['Visina (H)', `${Number(rezervoar.dimenzije_h)} m`],
      ['Izračunati volumen', `${volumen.toFixed(2)} m³`],
      ['Odnos V/K', `${((volumen * 1000) / Number(rezervoar.kapacitet)).toFixed(3)}`]
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
    if (rezervoar.napomene) {
      yPosition += 15;
      const noteText = doc.splitTextToSize(rezervoar.napomene, pageWidth - 50);
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
    if (rezervoar.dokument_url) {
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
    res.setHeader('Content-Disposition', `attachment; filename="rezervoar-izvjestaj-${rezervoar.id_broj}-${reportDate.replace(/\./g, '')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Greška pri generiranju PDF-a' });
  }
};

// GET /api/rezervoari/:id/dokument - Download dokumenta
export const downloadRezervoarDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const rezervoar = await prisma.rezervoar.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!rezervoar) {
      res.status(404).json({ message: 'Rezervoar nije pronađen' });
      return;
    }

    if (!rezervoar.dokument_url) {
      res.status(404).json({ message: 'Dokument nije pronađen' });
      return;
    }

    // Full path to the document file
    const filePath = path.join(__dirname, '..', '..', 'public', rezervoar.dokument_url);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Dokument nije pronađen na serveru' });
      return;
    }

    // Get file extension and determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }

    // Get original filename or create one
    const originalName = path.basename(filePath);
    const downloadName = `rezervoar_${rezervoar.naziv_rezervoara}_${originalName}`;

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Greška pri preuzimanju dokumenta' });
      }
    });
    
  } catch (error: any) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Greška pri preuzimanju dokumenta' });
  }
};

export const generateFullReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rezervoarIds } = req.body;
    
    if (!Array.isArray(rezervoarIds) || rezervoarIds.length === 0) {
      res.status(400).json({ message: 'Lista ID-jeva rezervoara je obavezna' });
      return;
    }

    // Fetch all rezervoari
    const rezervoari = await prisma.rezervoar.findMany({
      where: {
        id: { in: rezervoarIds }
      },
      orderBy: { naziv_rezervoara: 'asc' }
    });

    if (rezervoari.length === 0) {
      res.status(404).json({ message: 'Rezervoari nisu pronađeni' });
      return;
    }

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

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Register fonts
    registerFont(doc);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const checkNewPage = (currentY: number, requiredHeight: number = 20, addTableHeader?: { left: string, right: string }): number => {
      const footerSpace = 35; // Space reserved for footer
      if (currentY + requiredHeight > pageHeight - footerSpace) {
        addFooter(); // Add footer to current page before adding new page
        doc.addPage();
        registerFont(doc); // Re-register font for new page
        let newY = addReportHeader();
        
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
      // Header with company info (same as individual PDF)
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
      doc.text('Rezervoari za gorivo', 20, 35);
      
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
      doc.text('UKUPNI IZVJEŠTAJ - REZERVOARI', pageWidth / 2, 60, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      return 70;
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
      doc.text('HIFA-PETROL d.o.o. Sarajevo - Rezervoari za gorivo', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Generiran: ${reportDate} u ${reportTime}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    };

    let yPosition = addReportHeader();

    // Summary section
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('SAŽETAK IZVJEŠTAJA', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Ukupan broj rezervoara: ${rezervoari.length}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Datum izvještaja: ${new Date().toLocaleDateString('bs-BA')}`, 20, yPosition);
    yPosition += 15;

    // Process each rezervoar using the same layout as individual reports
    for (let rezervoarIndex = 0; rezervoarIndex < rezervoari.length; rezervoarIndex++) {
      const rezervoar = rezervoari[rezervoarIndex];
      
      // Check if we need a new page for rezervoar header
      yPosition = checkNewPage(yPosition, 80);

      // Rezervoar separator header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPosition, 170, 15, 'F');
      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text(`REZERVOAR ${rezervoarIndex + 1}: ${rezervoar.naziv_rezervoara.toUpperCase()}`, 25, yPosition + 10);
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      // Basic data section (same as individual PDF)
      yPosition = checkNewPage(yPosition, 30);
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('OSNOVNI PODACI', 20, yPosition);
      yPosition += 10;

      // Basic data table header
      yPosition = drawTableHeader(yPosition, 'PARAMETAR', 'VRIJEDNOST');

      const basicData = [
        { label: 'Naziv rezervoara', value: rezervoar.naziv_rezervoara },
        { label: 'ID broj', value: rezervoar.id_broj },
        { label: 'Vlasnik', value: rezervoar.vlasnik },
        { label: 'Mjesto korištenja', value: rezervoar.mjesto_koristenja },
        { label: 'Oblik rezervoara', value: rezervoar.oblik_rezervoara },
        { label: 'Kapacitet', value: `${Number(rezervoar.kapacitet).toLocaleString()} L` },
        { label: 'Materijal izgradnje', value: rezervoar.materijal_izgradnje },
        { label: 'Zaštita', value: rezervoar.zastita_unutrasnjeg_rezervoara },
        { label: 'Datum kalibracije', value: new Date(rezervoar.datum_kalibracije).toLocaleDateString('bs-BA') }
      ];

      basicData.forEach((item, index) => {
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

      // Technical specifications section
      yPosition += 15;
      yPosition = checkNewPage(yPosition, 40);
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('TEHNIČKI PODACI', 20, yPosition);
      yPosition += 10;

      // Tech table header
      yPosition = drawTableHeader(yPosition, 'PARAMETAR', 'VRIJEDNOST');

      const volumen = Number(rezervoar.dimenzije_l) * Number(rezervoar.dimenzije_w) * Number(rezervoar.dimenzije_h);
      
      const technicalData = [
        { label: 'Dužina (L)', value: `${Number(rezervoar.dimenzije_l)} m` },
        { label: 'Širina (W)', value: `${Number(rezervoar.dimenzije_w)} m` },
        { label: 'Visina (H)', value: `${Number(rezervoar.dimenzije_h)} m` },
        { label: 'Izračunati volumen', value: `${volumen.toFixed(2)} m³` },
        { label: 'Odnos V/K', value: `${((volumen * 1000) / Number(rezervoar.kapacitet)).toFixed(3)}` }
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

      // Notes section if exists
      if (rezervoar.napomene) {
        yPosition += 15;
        const noteText = doc.splitTextToSize(rezervoar.napomene, pageWidth - 50);
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

      // Document information if exists
      if (rezervoar.dokument_url) {
        yPosition += 15;
        yPosition = checkNewPage(yPosition, 25);
        
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

      // Add separator between rezervoari (except for the last one)
      if (rezervoarIndex < rezervoari.length - 1) {
        yPosition += 20;
        yPosition = checkNewPage(yPosition, 10);
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 10;
      }
    }

    // Add footer to all pages
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Set response headers
    const reportDate = new Date().toLocaleDateString('bs-BA').replace(/\./g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ukupni-izvjestaj-rezervoari-${reportDate}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('Greška pri generiranju ukupnog izvještaja:', error);
    res.status(500).json({ message: 'Greška pri generiranju ukupnog izvještaja' });
  }
}; 