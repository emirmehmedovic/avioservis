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

// Interfaces za tipove
interface PlanKalibracije {
  id: number;
  naziv_opreme: string;
  vlasnik_opreme: string;
  mjesto_koristenja_opreme: string;
  identifikacijski_broj: string;
  volumetar_kalibracija_od: Date | null;
  volumetar_kalibracija_do: Date | null;
  glavni_volumetar_kalibracija_od: Date | null;
  glavni_volumetar_kalibracija_do: Date | null;
  manometri_kalibracija_od: Date | null;
  manometri_kalibracija_do: Date | null;
  crijevo_punjenje_kalibracija_od: Date | null;
  crijevo_punjenje_kalibracija_do: Date | null;
  glavni_manometar_kalibracija_od: Date | null;
  glavni_manometar_kalibracija_do: Date | null;
  termometar_kalibracija_od: Date | null;
  termometar_kalibracija_do: Date | null;
  hidrometar_kalibracija_od: Date | null;
  hidrometar_kalibracija_do: Date | null;
  elektricni_denziometar_kalibracija_od: Date | null;
  elektricni_denziometar_kalibracija_do: Date | null;
  mjerac_provodljivosti_kalibracija_od: Date | null;
  mjerac_provodljivosti_kalibracija_do: Date | null;
  mjerac_otpora_provoda_kalibracija_od: Date | null;
  mjerac_otpora_provoda_kalibracija_do: Date | null;
  moment_kljuc_kalibracija_od: Date | null;
  moment_kljuc_kalibracija_do: Date | null;
  shal_detector_kalibracija_od: Date | null;
  shal_detector_kalibracija_do: Date | null;
  napomene: string | null;
  dokumenti_url: string | null;
  kreiran: Date;
  azuriran: Date;
}

interface StatusInfo {
  status: 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';
  message: string;
  expiredInstruments: string[];
  expiringSoonInstruments: string[];
}

// Helper funkcija za provjeru statusa
const getStatusInfo = (plan: PlanKalibracije): StatusInfo => {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const instruments = [
    { name: 'Volumetar', date: plan.volumetar_kalibracija_do },
    { name: 'Glavni volumetar', date: plan.glavni_volumetar_kalibracija_do },
    { name: 'Manometri', date: plan.manometri_kalibracija_do },
    { name: 'Crijevo za punjenje', date: plan.crijevo_punjenje_kalibracija_do },
    { name: 'Glavni manometar', date: plan.glavni_manometar_kalibracija_do },
    { name: 'Termometar', date: plan.termometar_kalibracija_do },
    { name: 'Hidrometar', date: plan.hidrometar_kalibracija_do },
    { name: 'Električni denziometar', date: plan.elektricni_denziometar_kalibracija_do },
    { name: 'Mjerač provodljivosti', date: plan.mjerac_provodljivosti_kalibracija_do },
    { name: 'Mjerač otpora provoda', date: plan.mjerac_otpora_provoda_kalibracija_do },
    { name: 'Moment ključ', date: plan.moment_kljuc_kalibracija_do },
    { name: 'Shal detector', date: plan.shal_detector_kalibracija_do },
  ];

  const expiredInstruments: string[] = [];
  const expiringSoonInstruments: string[] = [];
  let hasValidDates = false;

  instruments.forEach(instrument => {
    if (instrument.date) {
      hasValidDates = true;
      const expiryDate = new Date(instrument.date);
      
      if (expiryDate < today) {
        expiredInstruments.push(instrument.name);
      } else if (expiryDate <= thirtyDaysFromNow) {
        expiringSoonInstruments.push(instrument.name);
      }
    }
  });

  if (!hasValidDates) {
    return {
      status: 'nepotpun',
      message: 'Nedostaju podaci o kalibraciji',
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiredInstruments.length > 0) {
    return {
      status: 'istekao',
      message: `Istekli instrumenti: ${expiredInstruments.join(', ')}`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiringSoonInstruments.length > 0) {
    return {
      status: 'uskoro_istice',
      message: `Uskoro ističu: ${expiringSoonInstruments.join(', ')}`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  return {
    status: 'aktivan',
    message: 'Svi instrumenti su važeći',
    expiredInstruments,
    expiringSoonInstruments
  };
};

// Lista svih planova kalibracije
export const getAllPlanKalibracije = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      status, 
      sortBy = 'kreiran', 
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Osnovni query
    let whereClause: any = {};

    // Search po nazivu opreme, vlasniku ili ID broju
    if (search) {
      whereClause.OR = [
        { naziv_opreme: { contains: search as string, mode: 'insensitive' } },
        { vlasnik_opreme: { contains: search as string, mode: 'insensitive' } },
        { identifikacijski_broj: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const planovi = await prisma.planKalibracije.findMany({
      where: whereClause,
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: Number(limit),
    });

    const total = await prisma.planKalibracije.count({ where: whereClause });

    // Dodavanje status informacija
    const planoviSaStatusom = planovi.map(plan => ({
      ...plan,
      statusInfo: getStatusInfo(plan)
    }));

    // Filtriranje po statusu ako je specificirano
    let filteredPlanovi = planoviSaStatusom;
    if (status && status !== 'svi') {
      filteredPlanovi = planoviSaStatusom.filter(plan => plan.statusInfo.status === status);
    }

    // Summary statistike
    const summary = {
      ukupno: total,
      aktivni: planoviSaStatusom.filter(p => p.statusInfo.status === 'aktivan').length,
      istekli: planoviSaStatusom.filter(p => p.statusInfo.status === 'istekao').length,
      uskoro_isticu: planoviSaStatusom.filter(p => p.statusInfo.status === 'uskoro_istice').length,
      nepotpuni: planoviSaStatusom.filter(p => p.statusInfo.status === 'nepotpun').length,
    };

    res.json({
      planovi: filteredPlanovi,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      summary
    });
  } catch (error) {
    console.error('Greška pri dohvaćanju planova kalibracije:', error);
    res.status(500).json({ error: 'Greška pri dohvaćanju planova kalibracije' });
  }
};

// Dohvaćanje plana po ID-u
export const getPlanKalibracijeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.planKalibracije.findUnique({
      where: { id: Number(id) }
    });

    if (!plan) {
      res.status(404).json({ error: 'Plan kalibracije nije pronađen' });
      return;
    }

    const planSaStatusom = {
      ...plan,
      statusInfo: getStatusInfo(plan)
    };

    res.json(planSaStatusom);
  } catch (error) {
    console.error('Greška pri dohvaćanju plana kalibracije:', error);
    res.status(500).json({ error: 'Greška pri dohvaćanju plana kalibracije' });
  }
};

// Kreiranje novog plana
export const createPlanKalibracije = async (req: Request, res: Response) => {
  try {
    const planData = req.body;

    // Validacija jedinstvenog ID broja
    const postojeciPlan = await prisma.planKalibracije.findUnique({
      where: { identifikacijski_broj: planData.identifikacijski_broj }
    });

    if (postojeciPlan) {
      res.status(400).json({ error: 'Plan sa ovim identifikacijskim brojem već postoji' });
      return;
    }

    // Kreiranje plana
    const noviPlan = await prisma.planKalibracije.create({
      data: {
        ...planData,
        // Konvertiranje stringova u datume
        volumetar_kalibracija_od: planData.volumetar_kalibracija_od ? new Date(planData.volumetar_kalibracija_od) : null,
        volumetar_kalibracija_do: planData.volumetar_kalibracija_do ? new Date(planData.volumetar_kalibracija_do) : null,
        glavni_volumetar_kalibracija_od: planData.glavni_volumetar_kalibracija_od ? new Date(planData.glavni_volumetar_kalibracija_od) : null,
        glavni_volumetar_kalibracija_do: planData.glavni_volumetar_kalibracija_do ? new Date(planData.glavni_volumetar_kalibracija_do) : null,
        manometri_kalibracija_od: planData.manometri_kalibracija_od ? new Date(planData.manometri_kalibracija_od) : null,
        manometri_kalibracija_do: planData.manometri_kalibracija_do ? new Date(planData.manometri_kalibracija_do) : null,
        crijevo_punjenje_kalibracija_od: planData.crijevo_punjenje_kalibracija_od ? new Date(planData.crijevo_punjenje_kalibracija_od) : null,
        crijevo_punjenje_kalibracija_do: planData.crijevo_punjenje_kalibracija_do ? new Date(planData.crijevo_punjenje_kalibracija_do) : null,
        glavni_manometar_kalibracija_od: planData.glavni_manometar_kalibracija_od ? new Date(planData.glavni_manometar_kalibracija_od) : null,
        glavni_manometar_kalibracija_do: planData.glavni_manometar_kalibracija_do ? new Date(planData.glavni_manometar_kalibracija_do) : null,
        termometar_kalibracija_od: planData.termometar_kalibracija_od ? new Date(planData.termometar_kalibracija_od) : null,
        termometar_kalibracija_do: planData.termometar_kalibracija_do ? new Date(planData.termometar_kalibracija_do) : null,
        hidrometar_kalibracija_od: planData.hidrometar_kalibracija_od ? new Date(planData.hidrometar_kalibracija_od) : null,
        hidrometar_kalibracija_do: planData.hidrometar_kalibracija_do ? new Date(planData.hidrometar_kalibracija_do) : null,
        elektricni_denziometar_kalibracija_od: planData.elektricni_denziometar_kalibracija_od ? new Date(planData.elektricni_denziometar_kalibracija_od) : null,
        elektricni_denziometar_kalibracija_do: planData.elektricni_denziometar_kalibracija_do ? new Date(planData.elektricni_denziometar_kalibracija_do) : null,
        mjerac_provodljivosti_kalibracija_od: planData.mjerac_provodljivosti_kalibracija_od ? new Date(planData.mjerac_provodljivosti_kalibracija_od) : null,
        mjerac_provodljivosti_kalibracija_do: planData.mjerac_provodljivosti_kalibracija_do ? new Date(planData.mjerac_provodljivosti_kalibracija_do) : null,
        mjerac_otpora_provoda_kalibracija_od: planData.mjerac_otpora_provoda_kalibracija_od ? new Date(planData.mjerac_otpora_provoda_kalibracija_od) : null,
        mjerac_otpora_provoda_kalibracija_do: planData.mjerac_otpora_provoda_kalibracija_do ? new Date(planData.mjerac_otpora_provoda_kalibracija_do) : null,
        moment_kljuc_kalibracija_od: planData.moment_kljuc_kalibracija_od ? new Date(planData.moment_kljuc_kalibracija_od) : null,
        moment_kljuc_kalibracija_do: planData.moment_kljuc_kalibracija_do ? new Date(planData.moment_kljuc_kalibracija_do) : null,
        shal_detector_kalibracija_od: planData.shal_detector_kalibracija_od ? new Date(planData.shal_detector_kalibracija_od) : null,
        shal_detector_kalibracija_do: planData.shal_detector_kalibracija_do ? new Date(planData.shal_detector_kalibracija_do) : null,
      }
    });

    const planSaStatusom = {
      ...noviPlan,
      statusInfo: getStatusInfo(noviPlan)
    };

    res.status(201).json(planSaStatusom);
  } catch (error) {
    console.error('Greška pri kreiranju plana kalibracije:', error);
    res.status(500).json({ error: 'Greška pri kreiranju plana kalibracije' });
  }
};

// Ažuriranje plana
export const updatePlanKalibracije = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const planData = req.body;

    // Provjera postojanja plana
    const postojeciPlan = await prisma.planKalibracije.findUnique({
      where: { id: Number(id) }
    });

    if (!postojeciPlan) {
      res.status(404).json({ error: 'Plan kalibracije nije pronađen' });
      return;
    }

    // Provjera jedinstvenog ID broja ako se mijenja
    if (planData.identifikacijski_broj && planData.identifikacijski_broj !== postojeciPlan.identifikacijski_broj) {
      const duplikatPlan = await prisma.planKalibracije.findUnique({
        where: { identifikacijski_broj: planData.identifikacijski_broj }
      });

      if (duplikatPlan) {
        res.status(400).json({ error: 'Plan sa ovim identifikacijskim brojem već postoji' });
        return;
      }
    }

    // Ažuriranje plana
    const azuriraniPlan = await prisma.planKalibracije.update({
      where: { id: Number(id) },
      data: {
        ...planData,
        // Konvertiranje stringova u datume
        volumetar_kalibracija_od: planData.volumetar_kalibracija_od ? new Date(planData.volumetar_kalibracija_od) : null,
        volumetar_kalibracija_do: planData.volumetar_kalibracija_do ? new Date(planData.volumetar_kalibracija_do) : null,
        glavni_volumetar_kalibracija_od: planData.glavni_volumetar_kalibracija_od ? new Date(planData.glavni_volumetar_kalibracija_od) : null,
        glavni_volumetar_kalibracija_do: planData.glavni_volumetar_kalibracija_do ? new Date(planData.glavni_volumetar_kalibracija_do) : null,
        manometri_kalibracija_od: planData.manometri_kalibracija_od ? new Date(planData.manometri_kalibracija_od) : null,
        manometri_kalibracija_do: planData.manometri_kalibracija_do ? new Date(planData.manometri_kalibracija_do) : null,
        crijevo_punjenje_kalibracija_od: planData.crijevo_punjenje_kalibracija_od ? new Date(planData.crijevo_punjenje_kalibracija_od) : null,
        crijevo_punjenje_kalibracija_do: planData.crijevo_punjenje_kalibracija_do ? new Date(planData.crijevo_punjenje_kalibracija_do) : null,
        glavni_manometar_kalibracija_od: planData.glavni_manometar_kalibracija_od ? new Date(planData.glavni_manometar_kalibracija_od) : null,
        glavni_manometar_kalibracija_do: planData.glavni_manometar_kalibracija_do ? new Date(planData.glavni_manometar_kalibracija_do) : null,
        termometar_kalibracija_od: planData.termometar_kalibracija_od ? new Date(planData.termometar_kalibracija_od) : null,
        termometar_kalibracija_do: planData.termometar_kalibracija_do ? new Date(planData.termometar_kalibracija_do) : null,
        hidrometar_kalibracija_od: planData.hidrometar_kalibracija_od ? new Date(planData.hidrometar_kalibracija_od) : null,
        hidrometar_kalibracija_do: planData.hidrometar_kalibracija_do ? new Date(planData.hidrometar_kalibracija_do) : null,
        elektricni_denziometar_kalibracija_od: planData.elektricni_denziometar_kalibracija_od ? new Date(planData.elektricni_denziometar_kalibracija_od) : null,
        elektricni_denziometar_kalibracija_do: planData.elektricni_denziometar_kalibracija_do ? new Date(planData.elektricni_denziometar_kalibracija_do) : null,
        mjerac_provodljivosti_kalibracija_od: planData.mjerac_provodljivosti_kalibracija_od ? new Date(planData.mjerac_provodljivosti_kalibracija_od) : null,
        mjerac_provodljivosti_kalibracija_do: planData.mjerac_provodljivosti_kalibracija_do ? new Date(planData.mjerac_provodljivosti_kalibracija_do) : null,
        mjerac_otpora_provoda_kalibracija_od: planData.mjerac_otpora_provoda_kalibracija_od ? new Date(planData.mjerac_otpora_provoda_kalibracija_od) : null,
        mjerac_otpora_provoda_kalibracija_do: planData.mjerac_otpora_provoda_kalibracija_do ? new Date(planData.mjerac_otpora_provoda_kalibracija_do) : null,
        moment_kljuc_kalibracija_od: planData.moment_kljuc_kalibracija_od ? new Date(planData.moment_kljuc_kalibracija_od) : null,
        moment_kljuc_kalibracija_do: planData.moment_kljuc_kalibracija_do ? new Date(planData.moment_kljuc_kalibracija_do) : null,
        shal_detector_kalibracija_od: planData.shal_detector_kalibracija_od ? new Date(planData.shal_detector_kalibracija_od) : null,
        shal_detector_kalibracija_do: planData.shal_detector_kalibracija_do ? new Date(planData.shal_detector_kalibracija_do) : null,
      }
    });

    const planSaStatusom = {
      ...azuriraniPlan,
      statusInfo: getStatusInfo(azuriraniPlan)
    };

    res.json(planSaStatusom);
  } catch (error) {
    console.error('Greška pri ažuriranju plana kalibracije:', error);
    res.status(500).json({ error: 'Greška pri ažuriranju plana kalibracije' });
  }
};

// Brisanje plana
export const deletePlanKalibracije = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const postojeciPlan = await prisma.planKalibracije.findUnique({
      where: { id: Number(id) }
    });

    if (!postojeciPlan) {
      res.status(404).json({ error: 'Plan kalibracije nije pronađen' });
      return;
    }

    // Brisanje povezanih fajlova ako postoje
    if (postojeciPlan.dokumenti_url) {
      const filePath = path.join(__dirname, '../../../public', postojeciPlan.dokumenti_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.planKalibracije.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Plan kalibracije je uspješno obrisan' });
  } catch (error) {
    console.error('Greška pri brisanju plana kalibracije:', error);
    res.status(500).json({ error: 'Greška pri brisanju plana kalibracije' });
  }
};

// Upload dokumenta
export const uploadKalibracijaDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Nema upload-ovanog fajla' });
      return;
    }

    const postojeciPlan = await prisma.planKalibracije.findUnique({
      where: { id: Number(id) }
    });

    if (!postojeciPlan) {
      res.status(404).json({ error: 'Plan kalibracije nije pronađen' });
      return;
    }

    // Kreiranje upload folder-a ako ne postoji
    const uploadsDir = path.join(__dirname, '../../../public/uploads/plan_kalibracije_dokumenti');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generiranje unique filename
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    const fileExtension = path.extname(file.originalname);
    const filename = `kalibracija-${id}-${timestamp}-${randomNum}${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);

    // Premještanje fajla
    fs.writeFileSync(filePath, file.buffer);

    // Ažuriranje baze podataka
    const dokumentUrl = `/uploads/plan_kalibracije_dokumenti/${filename}`;
    const azuriraniPlan = await prisma.planKalibracije.update({
      where: { id: Number(id) },
      data: { dokumenti_url: dokumentUrl }
    });

    res.json({
      message: 'Dokument je uspješno upload-ovan',
      dokumenti_url: dokumentUrl,
      plan: azuriraniPlan
    });
  } catch (error) {
    console.error('Greška pri upload-u dokumenta:', error);
    res.status(500).json({ error: 'Greška pri upload-u dokumenta' });
  }
};

// Generisanje PDF izvještaja
export const generatePlanKalibracijePDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const plan = await prisma.planKalibracije.findUnique({
      where: { id: Number(id) }
    });

    if (!plan) {
      res.status(404).json({ error: 'Plan kalibracije nije pronađen' });
      return;
    }

    const statusInfo = getStatusInfo(plan);

    // Kreiranje PDF-a
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
      doc.text('HIFA-PETROL d.o.o. Sarajevo - Plan kalibracije instrumenata', pageWidth / 2, pageHeight - 15, { align: 'center' });
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
    doc.text('Plan kalibracije instrumenata', 20, 35);
    
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
    doc.text('PLAN KALIBRACIJE INSTRUMENATA', pageWidth / 2, 60, { align: 'center' });
    
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
      ['Naziv opreme', plan.naziv_opreme],
      ['Identifikacijski broj', plan.identifikacijski_broj],
      ['Vlasnik opreme', plan.vlasnik_opreme],
      ['Mjesto korištenja', plan.mjesto_koristenja_opreme],
      ['Status plana', statusInfo.message],
      ['Kreiran', plan.kreiran.toLocaleDateString('bs-BA')],
      ['Zadnje ažuriran', plan.azuriran.toLocaleDateString('bs-BA')]
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
    
    // Calibration data section
    yPosition += 15;
    yPosition = checkNewPage(yPosition, 40); // Check if we need new page for calibration section
    
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('KALIBRACIJE INSTRUMENATA', 20, yPosition);
    yPosition += 10;
    
    // Calibration instruments data
    const calibrationData = [
      {
        name: 'Volumetar',
        from: plan.volumetar_kalibracija_od,
        to: plan.volumetar_kalibracija_do
      },
      {
        name: 'Glavni volumetar',
        from: plan.glavni_volumetar_kalibracija_od,
        to: plan.glavni_volumetar_kalibracija_do
      },
      {
        name: 'Manometri',
        from: plan.manometri_kalibracija_od,
        to: plan.manometri_kalibracija_do
      },
      {
        name: 'Crijevo za punjenje',
        from: plan.crijevo_punjenje_kalibracija_od,
        to: plan.crijevo_punjenje_kalibracija_do
      },
      {
        name: 'Glavni manometar',
        from: plan.glavni_manometar_kalibracija_od,
        to: plan.glavni_manometar_kalibracija_do
      },
      {
        name: 'Termometar',
        from: plan.termometar_kalibracija_od,
        to: plan.termometar_kalibracija_do
      },
      {
        name: 'Hidrometar',
        from: plan.hidrometar_kalibracija_od,
        to: plan.hidrometar_kalibracija_do
      },
      {
        name: 'Električni denziometar',
        from: plan.elektricni_denziometar_kalibracija_od,
        to: plan.elektricni_denziometar_kalibracija_do
      },
      {
        name: 'Mjerač provodljivosti',
        from: plan.mjerac_provodljivosti_kalibracija_od,
        to: plan.mjerac_provodljivosti_kalibracija_do
      },
      {
        name: 'Mjerač otpora provoda',
        from: plan.mjerac_otpora_provoda_kalibracija_od,
        to: plan.mjerac_otpora_provoda_kalibracija_do
      },
      {
        name: 'Moment ključ',
        from: plan.moment_kljuc_kalibracija_od,
        to: plan.moment_kljuc_kalibracija_do
      },
      {
        name: 'Shal detector',
        from: plan.shal_detector_kalibracija_od,
        to: plan.shal_detector_kalibracija_do
      }
    ];

    // Group calibrations by sections for better organization
    const activeCalibrations = calibrationData.filter(cal => cal.from || cal.to);
    const inactiveCalibrations = calibrationData.filter(cal => !cal.from && !cal.to);

    // Active calibrations section
    if (activeCalibrations.length > 0) {
      // Draw calibration table header
      yPosition = drawTableHeader(yPosition, 'INSTRUMENT', 'KALIBRACIJA OD - DO | STATUS');

      activeCalibrations.forEach((calibration, index) => {
        yPosition = checkNewPage(yPosition, 12, { left: 'INSTRUMENT', right: 'KALIBRACIJA OD - DO | STATUS' });

        const isEven = index % 2 === 0;
        if (isEven) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, yPosition, 170, 12, 'F');
        }

        // Instrument name
        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(9);
        doc.text(calibration.name, 25, yPosition + 4);

        // Date range and status
        doc.setFont(FONT_NAME, 'normal');
        const fromDate = calibration.from ? new Date(calibration.from).toLocaleDateString('bs-BA') : 'N/A';
        const toDate = calibration.to ? new Date(calibration.to).toLocaleDateString('bs-BA') : 'N/A';
        const dateRange = `${fromDate} - ${toDate}`;
        doc.text(dateRange, 100, yPosition + 4);

        // Status
        let status = 'N/A';
        let statusColor = [128, 128, 128]; // Gray for N/A
        if (calibration.to) {
          const today = new Date();
          const expiryDate = new Date(calibration.to);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(today.getDate() + 30);

          if (expiryDate < today) {
            status = 'ISTEKAO';
            statusColor = [220, 53, 69]; // Red
          } else if (expiryDate <= thirtyDaysFromNow) {
            status = 'USKORO ISTIČE';
            statusColor = [255, 193, 7]; // Yellow
          } else {
            status = 'VAŽEĆI';
            statusColor = [40, 167, 69]; // Green
          }
        }

        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFont(FONT_NAME, 'bold');
        doc.text(status, 100, yPosition + 9);
        doc.setTextColor(0, 0, 0); // Reset to black

        // Draw border
        doc.setDrawColor(230, 230, 230);
        doc.rect(20, yPosition, 170, 12, 'D');
        doc.line(95, yPosition, 95, yPosition + 12);

        yPosition += 12;
      });
    }

    // Inactive calibrations section
    if (inactiveCalibrations.length > 0) {
      yPosition += 10;
      yPosition = checkNewPage(yPosition, 30);
      
      doc.setFontSize(11);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(128, 128, 128);
      doc.text('INSTRUMENTI BEZ UNESENIH KALIBRACIJA', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      doc.setFont(FONT_NAME, 'normal');
      const inactiveList = inactiveCalibrations.map(cal => cal.name).join(', ');
      const splitInactiveText = doc.splitTextToSize(inactiveList, pageWidth - 40);
      doc.text(splitInactiveText, 20, yPosition);
      yPosition += splitInactiveText.length * 5;
    }

    // Notes section
    if (plan.napomene) {
      yPosition += 15;
      yPosition = checkNewPage(yPosition, 30);
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('NAPOMENE', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setFont(FONT_NAME, 'normal');
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(plan.napomene, pageWidth - 40);
      doc.text(splitText, 20, yPosition);
    }

    // Add footer to last page
    addFooter(doc, pageWidth, pageHeight);

    // Generiranje PDF-a kao buffer
    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="plan_kalibracije_${plan.identifikacijski_broj}.pdf"`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Greška pri generisanju PDF-a:', error);
    res.status(500).json({ error: 'Greška pri generisanju PDF-a' });
  }
};

export const generateFullReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planIds } = req.body;

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      res.status(400).json({ error: 'Lista ID-jeva planova je obavezna' });
      return;
    }

    // Dohvati sve planove
    const planovi = await prisma.planKalibracije.findMany({
      where: {
        id: {
          in: planIds
        }
      },
      orderBy: {
        naziv_opreme: 'asc'
      }
    });

    if (planovi.length === 0) {
      res.status(404).json({ error: 'Planovi nisu pronađeni' });
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
      doc.setFillColor(0, 51, 102);
      doc.rect(20, yPos, 170, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(9);
      doc.text(leftHeader, 25, yPos + 6);
      doc.text(rightHeader, 100, yPos + 6);
      doc.setTextColor(0, 0, 0);
      
      return yPos + 10;
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
      doc.text('Plan kalibracije instrumenata', 20, 35);
      
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
      doc.text('UKUPNI IZVJEŠTAJ - PLAN KALIBRACIJE', pageWidth / 2, 60, { align: 'center' });
      
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
      doc.text('HIFA-PETROL d.o.o. Sarajevo - Plan kalibracije instrumenata', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Generiran: ${reportDate} u ${reportTime}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
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
    doc.text(`Ukupan broj planova: ${planovi.length}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Datum izvještaja: ${new Date().toLocaleDateString('bs-BA')}`, 20, yPosition);
    yPosition += 15;

    // Process each plan using the same layout as individual reports
    for (let planIndex = 0; planIndex < planovi.length; planIndex++) {
      const plan = planovi[planIndex];
      
      // Check if we need a new page for plan header
      yPosition = checkNewPage(yPosition, 80);

      // Plan separator header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPosition, 170, 15, 'F');
      doc.setFont(FONT_NAME, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text(`PLAN ${planIndex + 1}: ${plan.naziv_opreme.toUpperCase()}`, 25, yPosition + 10);
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
      yPosition = drawTableHeader(yPosition, 'OPIS', 'VRIJEDNOST');

      const basicData = [
        { label: 'Naziv opreme', value: plan.naziv_opreme },
        { label: 'Vlasnik opreme', value: plan.vlasnik_opreme },
        { label: 'Identifikacijski broj', value: plan.identifikacijski_broj },
        { label: 'Mjesto korištenja', value: plan.mjesto_koristenja_opreme }
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

      // Calibration data section (same as individual PDF)
      yPosition += 15;
      yPosition = checkNewPage(yPosition, 40);
      
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('KALIBRACIJE INSTRUMENATA', 20, yPosition);
      yPosition += 10;

      // Calibration instruments data
      const calibrationData = [
        { name: 'Volumetar', from: plan.volumetar_kalibracija_od, to: plan.volumetar_kalibracija_do },
        { name: 'Glavni volumetar', from: plan.glavni_volumetar_kalibracija_od, to: plan.glavni_volumetar_kalibracija_do },
        { name: 'Manometri', from: plan.manometri_kalibracija_od, to: plan.manometri_kalibracija_do },
        { name: 'Crijevo za punjenje', from: plan.crijevo_punjenje_kalibracija_od, to: plan.crijevo_punjenje_kalibracija_do },
        { name: 'Glavni manometar', from: plan.glavni_manometar_kalibracija_od, to: plan.glavni_manometar_kalibracija_do },
        { name: 'Termometar', from: plan.termometar_kalibracija_od, to: plan.termometar_kalibracija_do },
        { name: 'Hidrometar', from: plan.hidrometar_kalibracija_od, to: plan.hidrometar_kalibracija_do },
        { name: 'Električni denziometar', from: plan.elektricni_denziometar_kalibracija_od, to: plan.elektricni_denziometar_kalibracija_do },
        { name: 'Mjerač provodljivosti', from: plan.mjerac_provodljivosti_kalibracija_od, to: plan.mjerac_provodljivosti_kalibracija_do },
        { name: 'Mjerač otpora provoda', from: plan.mjerac_otpora_provoda_kalibracija_od, to: plan.mjerac_otpora_provoda_kalibracija_do },
        { name: 'Moment ključ', from: plan.moment_kljuc_kalibracija_od, to: plan.moment_kljuc_kalibracija_do },
        { name: 'Shal detector', from: plan.shal_detector_kalibracija_od, to: plan.shal_detector_kalibracija_do }
      ];

      // Active calibrations
      const activeCalibrations = calibrationData.filter(cal => cal.from || cal.to);
      const inactiveCalibrations = calibrationData.filter(cal => !cal.from && !cal.to);

      if (activeCalibrations.length > 0) {
        yPosition = drawTableHeader(yPosition, 'INSTRUMENT', 'KALIBRACIJA OD - DO | STATUS');

        activeCalibrations.forEach((calibration, index) => {
          yPosition = checkNewPage(yPosition, 12, { left: 'INSTRUMENT', right: 'KALIBRACIJA OD - DO | STATUS' });

          const isEven = index % 2 === 0;
          if (isEven) {
            doc.setFillColor(252, 252, 252);
            doc.rect(20, yPosition, 170, 12, 'F');
          }

          doc.setFont(FONT_NAME, 'bold');
          doc.setFontSize(9);
          doc.text(calibration.name, 25, yPosition + 4);

          doc.setFont(FONT_NAME, 'normal');
          const fromDate = calibration.from ? new Date(calibration.from).toLocaleDateString('bs-BA') : 'N/A';
          const toDate = calibration.to ? new Date(calibration.to).toLocaleDateString('bs-BA') : 'N/A';
          const dateRange = `${fromDate} - ${toDate}`;
          doc.text(dateRange, 100, yPosition + 4);

          // Status
          let status = 'N/A';
          let statusColor = [128, 128, 128];
          if (calibration.to) {
            const today = new Date();
            const expiryDate = new Date(calibration.to);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            if (expiryDate < today) {
              status = 'ISTEKAO';
              statusColor = [220, 53, 69];
            } else if (expiryDate <= thirtyDaysFromNow) {
              status = 'USKORO ISTIČE';
              statusColor = [255, 193, 7];
            } else {
              status = 'VAŽEĆI';
              statusColor = [40, 167, 69];
            }
          }

          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.setFont(FONT_NAME, 'bold');
          doc.text(status, 100, yPosition + 9);
          doc.setTextColor(0, 0, 0);

          doc.setDrawColor(230, 230, 230);
          doc.rect(20, yPosition, 170, 12, 'D');
          doc.line(95, yPosition, 95, yPosition + 12);

          yPosition += 12;
        });
      }

      // Inactive calibrations
      if (inactiveCalibrations.length > 0) {
        yPosition += 10;
        yPosition = checkNewPage(yPosition, 30);
        
        doc.setFontSize(11);
        doc.setFont(FONT_NAME, 'bold');
        doc.setTextColor(128, 128, 128);
        doc.text('INSTRUMENTI BEZ UNESENIH KALIBRACIJA', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(9);
        doc.setFont(FONT_NAME, 'normal');
        const inactiveList = inactiveCalibrations.map(cal => cal.name).join(', ');
        const splitInactiveText = doc.splitTextToSize(inactiveList, pageWidth - 40);
        doc.text(splitInactiveText, 20, yPosition);
        yPosition += splitInactiveText.length * 5;
      }

      // Notes section
      if (plan.napomene) {
        yPosition += 15;
        yPosition = checkNewPage(yPosition, 30);
        
        doc.setFontSize(12);
        doc.setFont(FONT_NAME, 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text('NAPOMENE', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(9);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(0, 0, 0);
        const splitText = doc.splitTextToSize(plan.napomene, pageWidth - 40);
        doc.text(splitText, 20, yPosition);
        yPosition += splitText.length * 5;
      }

      // Add space between plans (except for the last one)
      if (planIndex < planovi.length - 1) {
        yPosition += 20;
        yPosition = checkNewPage(yPosition, 20);
        
        // Add separator line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 15;
      }
    }

    // Add footer to all pages
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ukupni_izvjestaj_plan_kalibracije_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Greška pri generiranju ukupnog izvještaja:', error);
    res.status(500).json({ 
      error: 'Greška pri generiranju ukupnog izvještaja',
      details: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
}; 