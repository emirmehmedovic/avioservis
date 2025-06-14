'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FuelIntakeRecord, FuelType, FuelIntakeDocument } from '@/types/fuel';
import { FuelOperation as BaseFuelOperation } from '@/lib/types';

// Extended interface to include EXD and K number fields
interface FuelOperation extends BaseFuelOperation {
  exd_number?: string | null;
  k_number?: string | null;
}
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, DocumentTextIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

const FONT_NAME = 'NotoSans';

// Helper function to format date as dd.mm.yyyy HH:MM
const formatDateTimeForReport = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Direktno formatiranje datuma za osiguranje formata dd.mm.yyyy HH:MM
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Greška pri formatiranju datuma:', error);
    return 'N/A';
  }
};

// Helper function to format date as dd.mm.yyyy (bez vremena)
const formatDateForReport = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Direktno formatiranje datuma za osiguranje formata dd.mm.yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Greška pri formatiranju datuma:', error);
    return 'N/A';
  }
};

// Funkcija za pravilno prikazivanje tipa saobraćaja
const getTrafficTypeDisplay = (operation: any): string => {
  // Provjera tip_saobracaja polja (ispravno polje prema definiciji FuelOperation)
  if (operation.tip_saobracaja) {
    // Mapiranje kodova na pune nazive
    switch(operation.tip_saobracaja.toLowerCase()) {
      case 'd': return 'Domaći';
      case 'm': return 'Međunarodni';
      case 'domestic': return 'Domaći';
      case 'international': return 'Međunarodni';
      case 'izvoz': return 'Izvoz';
      case 'uvoz': return 'Uvoz';
      case 'unutarnji': return 'Unutarnji saobraćaj';
      default: return operation.tip_saobracaja; // Vraćamo originalnu vrijednost ako nije prepoznata
    }
  }
  
  // Provjera traffic_type polja (alternativno polje koje možda postoji u podacima)
  if (operation.traffic_type) {
    // Mapiranje kodova na pune nazive
    switch(operation.traffic_type.toLowerCase()) {
      case 'd': return 'Domaći';
      case 'm': return 'Međunarodni';
      case 'domestic': return 'Domaći';
      case 'international': return 'Međunarodni';
      default: return operation.traffic_type; // Vraćamo originalnu vrijednost ako nije prepoznata
    }
  }
  
  // Provjera flight_type polja (alternativno polje koje možda postoji u podacima)
  if (operation.flight_type) {
    // Mapiranje kodova na pune nazive
    switch(operation.flight_type.toLowerCase()) {
      case 'd': return 'Domaći';
      case 'm': return 'Međunarodni';
      case 'domestic': return 'Domaći';
      case 'international': return 'Međunarodni';
      default: return operation.flight_type; // Vraćamo originalnu vrijednost ako nije prepoznata
    }
  }
  
  // Ako nema ni jednog od polja
  return 'Nije definisano';
};

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

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface FuelIntakeReportFilters {
  fuel_type: FuelType | 'all';
  startDate: string;
  endDate: string;
  customs_declaration_number: string;
  refinery_name: string;
  currency: string;
  fuel_category: string;
}

const FuelIntakeReport: React.FC = () => {
  const [records, setRecords] = useState<FuelIntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track totals for reporting
  const [totalLiters, setTotalLiters] = useState<number>(0);
  const [totalKg, setTotalKg] = useState<number>(0);
  const [averageDensity, setAverageDensity] = useState<number>(0);
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

  const [filters, setFilters] = useState<FuelIntakeReportFilters>({
    fuel_type: 'all',
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
    customs_declaration_number: '',
    refinery_name: '',
    currency: '',
    fuel_category: 'all',
  });

  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
  const [selectedMrn, setSelectedMrn] = useState<string | null>(null);
  const [mrnReportData, setMrnReportData] = useState<{
    intake: any;
    fuelingOperations: any[];
    drainedFuel: any[];
    balance: {
      totalIntake: number;
      totalFuelingOperations: number;
      totalDrained: number;
      remainingFuel: number;
    };
  } | null>(null);
  
  // State za balans MRN-ova
  const [mrnBalances, setMrnBalances] = useState<Record<string, {
    totalIntake: number;
    totalUsed: number;
    remainingFuel: number;
    remainingFuelKg: number; // Dodano za praćenje preostalih kilograma
    specificGravity: number; // Dodano za praćenje specifične gustoće
    totalIntakeKg: number; // Dodano za praćenje ukupnog ulaza u kg
    totalUsedKg: number;   // Dodano za praćenje ukupno iskorištenog u kg
  }>>({});;
  const [loadingMrnReport, setLoadingMrnReport] = useState(false);
  const [loadingRecordDetails, setLoadingRecordDetails] = useState(false);

  // Funkcija za dohvat balansa MRN-ova
  const fetchMrnBalances = async () => {
    try {
      // Dohvati osnovne balanse MRN-ova
      const data = await fetchWithAuth<Record<string, {
        totalIntake: number;
        totalUsed: number;
        remainingFuel: number;
        remainingFuelKg: number; 
        specificGravity: number; 
      }>>('/api/fuel/mrn-balances');
      
      // Unaprijeđeni balans s ispravnim izračunom kg vrijednosti
      const enhancedBalances: Record<string, {
        totalIntake: number;
        totalUsed: number;
        remainingFuel: number;
        remainingFuelKg: number;
        specificGravity: number;
        totalIntakeKg: number;
        totalUsedKg: number;
      }> = {};
      
      // Za svaki MRN, dohvati detaljne podatke za precizan izračun kg vrijednosti
      const mrnPromises = Object.keys(data).map(async mrn => {
        try {
          const mrnDetail = await fetchWithAuth<{
            intake: any;
            fuelingOperations: any[];
            drainedFuel: any[];
            balance: {
              totalIntake: number;
              totalFuelingOperations: number;
              totalDrained: number;
              remainingFuel: number;
            };
          }>(`/api/fuel/mrn-report/${mrn}`);
          
          if (mrnDetail) {
            const { intake, fuelingOperations } = mrnDetail;
            
            // Izračun ukupne količine u kg
            let totalIntakeKg = 0;
            if (intake.quantity_kg_received && !isNaN(intake.quantity_kg_received)) {
              totalIntakeKg = intake.quantity_kg_received;
            } else if (intake.specific_gravity && intake.quantity_liters_received && 
                !isNaN(intake.specific_gravity) && !isNaN(intake.quantity_liters_received)) {
              totalIntakeKg = intake.quantity_liters_received * intake.specific_gravity;
            }
            
            // Izračun iskorištene količine u kg koristeći istu logiku kao PDF izvještaj
            let totalDeliveredKg = 0;
            const targetMRN = intake.customs_declaration_number;
            
            fuelingOperations.forEach((op) => {
              let operationKg = 0;
              let operationUsesTargetMrn = false;
              
              // Provjeri postoje li MRN breakdown podaci
              let mrnBreakdownData: { mrn: string; quantity: number; kg?: number }[] = [];
              try {
                if (op.mrnBreakdown) {
                  mrnBreakdownData = JSON.parse(op.mrnBreakdown);
                }
              } catch (e) {
                console.warn('Neispravan MRN breakdown format:', op.mrnBreakdown);
              }
              
              if (mrnBreakdownData.length > 0) {
                const targetMrnEntry = mrnBreakdownData.find(entry => entry.mrn === targetMRN);
                
                if (targetMrnEntry) {
                  operationUsesTargetMrn = true;
                  if (typeof targetMrnEntry.kg === 'number' && !isNaN(targetMrnEntry.kg)) {
                    operationKg = targetMrnEntry.kg;
                  } else if (typeof targetMrnEntry.quantity === 'number' && op.specific_density && !isNaN(op.specific_density)) {
                    operationKg = targetMrnEntry.quantity * op.specific_density;
                  }
                }
              } else {
                operationUsesTargetMrn = true;
                
                if (typeof op.quantity_kg === 'number' && !isNaN(op.quantity_kg)) {
                  operationKg = op.quantity_kg;
                } else if (op.specific_density && op.quantity_liters && !isNaN(op.specific_density) && !isNaN(op.quantity_liters)) {
                  operationKg = op.quantity_liters * op.specific_density;
                }
              }
              
              if (operationUsesTargetMrn && !isNaN(operationKg) && operationKg > 0) {
                totalDeliveredKg += operationKg;
              }
            });
            
            // Izračun preostalog goriva u kg
            const remainingFuelKg = totalIntakeKg - totalDeliveredKg;
            
            // Spremi proširene podatke za ovaj MRN
            enhancedBalances[mrn] = {
              ...data[mrn],
              totalIntakeKg,
              totalUsedKg: totalDeliveredKg,
              remainingFuelKg: remainingFuelKg // Ažurirano s ispravnom vrijednosti
            };
          }
        } catch (error) {
          console.error(`Error fetching details for MRN ${mrn}:`, error);
          // Zadržimo originalnu vrijednost ako dohvat detalja ne uspije
          enhancedBalances[mrn] = {
            ...data[mrn],
            totalIntakeKg: 0,
            totalUsedKg: 0
          };
        }
      });
      
      // Pričekaj da se svi MRN izvještaji dohvate
      await Promise.all(mrnPromises);
      
      // Dopuni preostale MRN-ove koji možda nisu bili obrađeni
      Object.keys(data).forEach(mrn => {
        if (!enhancedBalances[mrn]) {
          enhancedBalances[mrn] = {
            ...data[mrn],
            totalIntakeKg: 0,
            totalUsedKg: 0
          };
        }
      });
      
      setMrnBalances(enhancedBalances);
    } catch (err: any) {
      console.error('Error fetching MRN balances:', err);
      // Ne prikazujemo toast za ovu grešku jer nije kritična
    }
  };

  const fetchIntakeRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters: Record<string, string> = {};
      if (filters.fuel_type && filters.fuel_type !== 'all') {
        activeFilters.fuel_type = filters.fuel_type;
      }
      if (filters.startDate) {
        // Set start date to beginning of the day (00:00:00)
        const startDateObj = new Date(filters.startDate);
        startDateObj.setHours(0, 0, 0, 0);
        activeFilters.startDate = startDateObj.toISOString();
      }
      if (filters.endDate) {
        // Set end date to end of the day (23:59:59)
        const endDateObj = new Date(filters.endDate);
        endDateObj.setHours(23, 59, 59, 999);
        activeFilters.endDate = endDateObj.toISOString();
      }
      if (filters.customs_declaration_number) {
        activeFilters.customs_declaration_number = filters.customs_declaration_number;
      }
      if (filters.currency) {
        activeFilters.currency = filters.currency;
      }
      if (filters.refinery_name) {
        activeFilters.refinery_name = filters.refinery_name;
      }
      if (filters.fuel_category && filters.fuel_category !== 'all') {
        activeFilters.fuel_category = filters.fuel_category;
      }

      const queryParams = new URLSearchParams(activeFilters).toString();
      const url = `/api/fuel/intake-records${queryParams ? `?${queryParams}` : ''}`;
      
      const data = await fetchWithAuth<FuelIntakeRecord[]>(url);
      setRecords(data);
      
      // Izračunaj ukupne količine
      if (data.length > 0) {
        const totalLitersValue = data.reduce((sum: number, record: FuelIntakeRecord) => sum + record.quantity_liters_received, 0);
        
        // Poboljšani izračun ukupne težine u kg s boljom provjerom ispravnosti podataka
        const totalKgValue = data.reduce((sum: number, record: FuelIntakeRecord) => {
          let kgValue = 0;
          if (record.quantity_kg_received) {
            const parsedKg = parseFloat(record.quantity_kg_received);
            if (!isNaN(parsedKg)) {
              kgValue = parsedKg;
            }
          }
          // If quantity_kg_received is not available or not a valid number, try to calculate
          if (kgValue === 0 && 
              typeof record.quantity_liters_received === 'number' && 
              typeof record.specific_gravity === 'number' && 
              !isNaN(record.quantity_liters_received) && 
              !isNaN(record.specific_gravity)) {
            kgValue = record.quantity_liters_received * record.specific_gravity;
          }
          return sum + kgValue;
        }, 0);
        
        // Poboljšani izračun prosječne gustoće
        // Brojimo samo zapise koji imaju validne vrijednosti
        let validDensityCount = 0;
        const totalDensity = data.reduce((sum: number, record: FuelIntakeRecord) => {
          if (typeof record.specific_gravity === 'number' && !isNaN(record.specific_gravity)) {
            validDensityCount++;
            return sum + record.specific_gravity;
          }
          return sum;
        }, 0);
        
        const avgDensity = validDensityCount > 0 ? totalDensity / validDensityCount : 0;
        
        setTotalLiters(totalLitersValue);
        setTotalKg(totalKgValue);
        setAverageDensity(avgDensity);
      } else {
        setTotalLiters(0);
        setTotalKg(0);
        setAverageDensity(0);
      }
      
      // Nakon dohvaćanja podataka o unosu goriva, dohvati i balanse MRN-ova
      await fetchMrnBalances();
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching fuel intake records:', err);
      setError(err.message || 'Greška pri dohvaćanju podataka');
      toast.error('Greška pri dohvaćanju podataka');
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIntakeRecords();
  }, [fetchIntakeRecords]);

  const handleFilterChange = (
    filterName: keyof FuelIntakeReportFilters,
    value: string | FuelType
  ) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const fetchMrnReportData = async (mrn: string) => {
    setLoadingMrnReport(true);
    setError(null);
    try {
      const response = await fetchWithAuth<{
        intake: FuelIntakeRecord;
        fuelingOperations: FuelOperation[];
        drainedFuel: any[];
        balance: {
          totalIntake: number;
          totalFuelingOperations: number;
          totalDrained: number;
          remainingFuel: number;
        };
      }>(`${API_URL}/api/fuel/mrn-report/${mrn}`);
      
      if (!response) {
        throw new Error('Nije pronađen izvještaj za ovaj MRN');
      }
      
      setMrnReportData(response);
      return response;
    } catch (error) {
      console.error('Error fetching MRN report:', error);
      toast.error(`Greška prilikom dohvaćanja MRN izvještaja: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
      return null;
    } finally {
      setLoadingMrnReport(false);
    }
  };

  // Funkcija za generiranje MRN izvještaja

  const handleGenerateMrnReport = async (mrn: string) => {
    const data = await fetchMrnReportData(mrn);
    if (!data) return;
    
    generateMrnReportPdf(data);
  };

  const generateMrnReportPdf = (data: {
    intake: FuelIntakeRecord;
    fuelingOperations: FuelOperation[];
    drainedFuel: any[];
    balance: {
      totalIntake: number;
      totalFuelingOperations: number;
      totalDrained: number;
      remainingFuel: number;
    };
  }) => {
    const { intake, fuelingOperations, drainedFuel, balance } = data;
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    registerFont(doc);

    // Title
    doc.setFontSize(16);
    doc.setFont(FONT_NAME, 'bold');
    doc.text(`MRN Izvještaj: ${intake.customs_declaration_number}`, 14, 20);
    
    // Intake details
    doc.setFontSize(12);
    doc.text('Podaci o ulazu goriva:', 14, 30);
    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'normal');
    
    // Izračunavanje količine u kg ako je dostupna specifična gustoća
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
    
    let yPos = 35;
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: intakeDetails,
      theme: 'plain',
      styles: { font: FONT_NAME, fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      didDrawPage: (data: any) => {
        yPos = data.cursor.y + 10; // Dodajemo malo razmaka nakon tablice
      }
    });
    
    // Fueling operations
    
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('Operacije točenja goriva:', 14, yPos + 10);
    
    if (fuelingOperations.length > 0) {
      const fuelingOpsData = fuelingOperations.map(op => {
        // Pokušaj dohvatiti točnu količinu goriva za ovaj MRN iz mrnBreakdown podataka
        let mrnQuantity = op.quantity_liters;
        
        if (op.mrnBreakdown) {
          try {
            const mrnData = JSON.parse(op.mrnBreakdown);
            const mrnEntry = mrnData.find((entry: { mrn: string, quantity: number }) => 
              entry.mrn === intake.customs_declaration_number
            );
            
            if (mrnEntry) {
              mrnQuantity = mrnEntry.quantity;
            }
          } catch (error) {
            console.error('Greška pri parsiranju mrnBreakdown podataka:', error);
          }
        }
        
        return [
          formatDateForReport(op.dateTime),
          op.aircraft_registration || 'N/A',
          op.airline?.name || 'N/A',
          // Prikazujemo točan tip saobraćaja
          getTrafficTypeDisplay(op), // Dodano tip saobraćaja
          op.delivery_note_number || 'N/A',
          typeof mrnQuantity === 'number' ? mrnQuantity.toLocaleString('bs-BA') : 'N/A',
          typeof op.quantity_kg === 'number' ? op.quantity_kg.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) : (typeof op.specific_density === 'number' && typeof mrnQuantity === 'number' ? (mrnQuantity * op.specific_density).toLocaleString('bs-BA', { maximumFractionDigits: 2 }) : 'N/A'),
          typeof op.specific_density === 'number' ? op.specific_density.toLocaleString('bs-BA', { maximumFractionDigits: 4 }) : 'N/A',
          // Cijena po kilogramu - pokušaj koristiti cijenu iz MRN-a ako je moguće
          (() => {
            // Ako transakcija ima direktno cijenu, prikaži ju
            if (typeof op.price_per_kg === 'number' && !isNaN(op.price_per_kg)) {
              return op.price_per_kg.toLocaleString('bs-BA', { maximumFractionDigits: 5 });
            }
            
            // Ako imamo podatke od MRN-a u izvještaju (iz fuel intake zapisa)
            if (intake && typeof intake.price_per_kg === 'number' && !isNaN(intake.price_per_kg)) {
              return intake.price_per_kg.toLocaleString('bs-BA', { maximumFractionDigits: 5 });
            }
            
            // Pokušaj pronaći cijenu u povezanim MRN podacima
            try {
              if (op.mrnBreakdown) {
                const mrnDataWithPrice = JSON.parse(op.mrnBreakdown).find(
                  (entry: any) => entry.price_per_kg && !isNaN(entry.price_per_kg)
                );
                
                if (mrnDataWithPrice && typeof mrnDataWithPrice.price_per_kg === 'number') {
                  return mrnDataWithPrice.price_per_kg.toLocaleString('bs-BA', { maximumFractionDigits: 5 });
                }
              }
            } catch (e) {
              // Ignoriraj grešku parsiranja
            }
            
            // Ako nismo uspjeli naći cijenu, prikaži 0.00 umjesto N/A
            return '0.00';
          })(),
          op.destination || 'N/A',
          op.operator_name || 'N/A'
        ];
      });
      
      autoTable(doc, {
        startY: yPos + 15,
        head: [['Datum', 'Registracija', 'Aviokompanija', 'Tip saobraćaja', 'Dostavnica', 'Količina (L)', 'Količina (kg)', 'Spec. gustoća', 'Cijena po kg', 'Destinacija', 'Operator']],
        body: fuelingOpsData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
        styles: { font: FONT_NAME, fontSize: 8 },
        didDrawPage: (data: any) => {
          yPos = data.cursor.y;
        }
      });
      
      yPos += 10;
      
      // Dodajemo detaljni izvještaj za svaku pojedinačnu transakciju
      doc.setFontSize(12);
      doc.setFont(FONT_NAME, 'bold');
      doc.text('Detalji pojedinačnih transakcija:', 14, yPos + 10);
      
      // Dodajemo novu stranicu za pojedinačne transakcije
      doc.addPage();
      
      // Za svaku operaciju točenja goriva dodajemo detaljni izvještaj na zasebnoj stranici
      fuelingOperations.forEach((op, index) => {
        // Svaka transakcija nakon prve dobiva novu stranicu
        if (index > 0) {
          doc.addPage();
        }
        
        // Početak s vrha stranice
        yPos = 20;
        
        // Vizualno unapređenje - dodavanje pravokutnika za naslov transakcije
        doc.setFillColor(230, 230, 250); // Svijetlo siva pozadina
        doc.rect(10, yPos - 5, doc.internal.pageSize.width - 20, 12, 'F');
        
        doc.setFontSize(10); // Smanjeno sa 11 na 10
        doc.setFont(FONT_NAME, 'bold');
        // Dodajemo broj dostavnice u naslov transakcije
        const deliveryNote = op.delivery_note_number ? `Dostavnica: ${op.delivery_note_number}` : '';
        doc.text(`Transakcija #${index + 1}: ${op.aircraft_registration || 'N/A'} - ${formatDateForReport(op.dateTime)}`, 14, yPos);
        if (deliveryNote) {
          doc.setFontSize(9); // Smanjeno sa 10 na 9
          doc.text(deliveryNote, doc.internal.pageSize.width - 60, yPos);
        }
        yPos += 10; // Smanjen razmak nakon naslova
        
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        
        // Izračunavanje ukupne cijene
        let totalPrice = 0;
        let quantityKg = 0;
        
        if (op.quantity_kg && op.price_per_kg) {
          quantityKg = op.quantity_kg;
          totalPrice = op.quantity_kg * op.price_per_kg;
        } else if (op.specific_density && op.quantity_liters && op.price_per_kg) {
          quantityKg = op.quantity_liters * op.specific_density;
          totalPrice = quantityKg * op.price_per_kg;
        }
        
        // Ekvivalentne cijene u različitim valutama
        // Konverzija valuta koristi sljedeće tečajeve:
        // 1. BAM prema EUR: 1.95583 (fiksni tečaj prema Centralnoj banci BiH)
        // 2. BAM prema USD: 1.8 (približni tečaj, može se ažurirati prema aktualnom tečaju)
        // Logika konverzije:
        // - Ako je originalna valuta EUR: prvo konvertiramo u BAM (EUR * 1.95583), zatim iz BAM u USD (BAM / 1.8)
        // - Ako je originalna valuta USD: prvo konvertiramo u BAM (USD * 1.8), zatim iz BAM u EUR (BAM / 1.95583)
        // - Ako je originalna valuta BAM: konvertiramo direktno u EUR (BAM / 1.95583) i USD (BAM / 1.8)
        const eurRate = 1.95583; // Fiksni tečaj BAM prema EUR
        const usdRate = 1.8;     // Približni tečaj BAM prema USD (može se ažurirati)
        
        let priceInBAM = totalPrice;
        let priceInEUR = 0;
        let priceInUSD = 0;
        
        // Konverzija cijena ovisno o valuti transakcije
        if (op.currency === 'EUR') {
          priceInBAM = totalPrice * eurRate;
          priceInEUR = totalPrice;
          priceInUSD = priceInBAM / usdRate;
        } else if (op.currency === 'USD') {
          priceInBAM = totalPrice * usdRate;
          priceInEUR = priceInBAM / eurRate;
          priceInUSD = totalPrice;
        } else {
          // Ako je valuta BAM ili nije definirana
          priceInEUR = priceInBAM / eurRate;
          priceInUSD = priceInBAM / usdRate;
        }
        
        // Organiziramo podatke o transakciji u dvije kolone za bolju preglednost
        // Prva kolona: osnovni podaci o letu i gorivu
        const columnOneData = [
          ['Datum i vrijeme', formatDateTimeForReport(op.dateTime)],
          ['Registracija zrakoplova', op.aircraft_registration || 'N/A'],
          ['Aviokompanija', op.airline?.name || 'N/A'],
          ['Tip saobraćaja', getTrafficTypeDisplay(op)],
          ['Broj dostavnice', op.delivery_note_number || 'N/A'],
          ['Količina (L)', op.quantity_liters ? op.quantity_liters.toLocaleString('bs-BA') : 'N/A'],
          ['Količina (kg)', quantityKg ? quantityKg.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) : 'N/A'],
          ['Specifična gustoća', op.specific_density ? op.specific_density.toLocaleString('bs-BA', { maximumFractionDigits: 4 }) : 'N/A']
        ];
        
        // Druga kolona: podaci o cijenama i destinaciji
        const columnTwoData = [
          ['Cijena po kg', op.price_per_kg ? op.price_per_kg.toLocaleString('bs-BA', { maximumFractionDigits: 5 }) + ' ' + (op.currency || 'BAM') : 'N/A'],
          ['Ukupna cijena', totalPrice ? totalPrice.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' ' + (op.currency || 'BAM') : 'N/A'],
          // Prikazujemo samo relevantne ekvivalente ovisno o originalnoj valuti
          ...(op.currency === 'BAM' ? [
            ['Ekvivalent u EUR', priceInEUR ? priceInEUR.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' EUR' : 'N/A'],
            ['Ekvivalent u USD', priceInUSD ? priceInUSD.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' USD' : 'N/A']
          ] : op.currency === 'EUR' ? [
            ['Ekvivalent u BAM', priceInBAM ? priceInBAM.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' BAM' : 'N/A'],
            ['Ekvivalent u USD', priceInUSD ? priceInUSD.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' USD' : 'N/A']
          ] : op.currency === 'USD' ? [
            ['Ekvivalent u BAM', priceInBAM ? priceInBAM.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' BAM' : 'N/A'],
            ['Ekvivalent u EUR', priceInEUR ? priceInEUR.toLocaleString('bs-BA', { maximumFractionDigits: 2 }) + ' EUR' : 'N/A']
          ] : []),
          ['Destinacija', op.destination || 'N/A'],
          ['Operator', op.operator_name || 'N/A']
        ];
        
        // Crtamo dvije kolone s podacima - kompaktniji prikaz
        const colWidth = (doc.internal.pageSize.width - 30) / 2;
        
        // Prva kolona - kompaktnija postavka
        autoTable(doc, {
          startY: yPos,
          head: [],
          body: columnOneData,
          theme: 'grid',
          styles: { font: FONT_NAME, fontSize: 8, cellPadding: 2 }, // Manji font i padding
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 }, // Uža labela
            1: { cellWidth: colWidth - 50 }
          },
          margin: { left: 10 }, // Uži rubovi
          tableWidth: colWidth
        });
        
        // Druga kolona (paralelno s prvom) - kompaktnija postavka
        autoTable(doc, {
          startY: yPos,
          head: [],
          body: columnTwoData,
          theme: 'grid',
          styles: { font: FONT_NAME, fontSize: 8, cellPadding: 2 },  // Manji font i padding
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 }, // Uža labela
            1: { cellWidth: colWidth - 50 }
          },
          margin: { left: 15 + colWidth },
          tableWidth: colWidth
        });
        
        // Pomjeramo poziciju nakon većeg od dvije tabele - smanjen razmak
        yPos += Math.max(
          columnOneData.length * 8,  // Približna visina prve tabele - sažeta
          columnTwoData.length * 8   // Približna visina druge tabele - sažeta
        ) + 10;  // Manji dodatni razmak
        
        // Dodajemo MRN podatke ako postoje - naglašeno prema zahtjevu
        if (op.mrnBreakdown) {
          try {
            const mrnData = JSON.parse(op.mrnBreakdown);
            if (mrnData && mrnData.length > 0) {
              // Kreiramo kompaktniji prikaz za MRN podatke i EXD/K brojeve
              const hasExdKNumbers = op.exd_number || op.k_number;
              const pageWidth = doc.internal.pageSize.width - 20;
              
              // Kreiramo podatke za MRN tablicu
              const mrnTableData = mrnData.map((entry: { mrn: string, quantity: number, kg?: number }) => [
                entry.mrn,
                typeof entry.quantity === 'number' ? entry.quantity.toLocaleString('bs-BA') + ' L' : 'N/A',
                // Dodajemo kilograme ako postoje, ili izračunavamo iz količine i specifične gustoće
                typeof entry.kg === 'number' ? 
                  entry.kg.toLocaleString('bs-BA') + ' KG' : 
                  (op.specific_density && typeof entry.quantity === 'number' ? 
                    (entry.quantity * op.specific_density).toLocaleString('bs-BA') + ' KG' : 
                    'N/A'),
                // Poboljšan izračun postotka - sada koristi UKUPNU količinu svih MRN zapisa za izračun
                typeof entry.quantity === 'number' ? 
                  // Sumiramo količinu svih MRN zapisa za ovu operaciju da dobijemo ukupnu količinu
                  (() => {
                    let totalMrnQuantity = 0;
                    try {
                      // Ako imamo mrnBreakdown, sumiramo količine svih MRN zapisa
                      if (op.mrnBreakdown) {
                        const allMrnData = JSON.parse(op.mrnBreakdown);
                        allMrnData.forEach((mrnEntry: { quantity: number }) => {
                          if (typeof mrnEntry.quantity === 'number') {
                            totalMrnQuantity += mrnEntry.quantity;
                          }
                        });
                      } else {
                        // Ako nemamo mrnBreakdown, koristimo op.quantity_liters kao ukupnu količinu
                        totalMrnQuantity = typeof op.quantity_liters === 'number' ? op.quantity_liters : 0;
                      }
                    } catch (e) {
                      // U slučaju greške, koristimo op.quantity_liters
                      totalMrnQuantity = typeof op.quantity_liters === 'number' ? op.quantity_liters : 0;
                    }
                    
                    // Izračunaj postotak samo ako imamo validnu ukupnu količinu
                    return totalMrnQuantity > 0 ? 
                      ((entry.quantity / totalMrnQuantity) * 100).toFixed(2) + '%' : 
                      "0.00%";
                  })() : 
                  "0.00%"
              ]);
              
              // Postavimo širinu lijeve kolone (za MRN) ovisno o tome ima li EXD/K brojeva
              const leftColWidth = hasExdKNumbers ? pageWidth * 0.6 : pageWidth;
              
              doc.setFillColor(230, 240, 250); // Svijetlo plava pozadina za isticanje
              doc.rect(10, yPos, leftColWidth, 7, 'F');
              doc.setFontSize(9);
              doc.setFont(FONT_NAME, 'bold');
              doc.text('MRN brojevi', 14, yPos + 5);
              
              // Ako imamo EXD/K brojeve, prikažimo ih u drugoj koloni
              if (hasExdKNumbers) {
                const rightColWidth = pageWidth * 0.4;
                doc.rect(10 + leftColWidth, yPos, rightColWidth, 7, 'F');
                doc.text('EXD i K brojevi', 14 + leftColWidth, yPos + 5);
              }
              
              yPos += 10;
              
              // MRN tablica - lijevo
              autoTable(doc, {
                startY: yPos,
                head: [['MRN broj', 'Količina (L)', 'Količina (KG)', 'Postotak']],
                body: mrnTableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], font: FONT_NAME, fontStyle: 'bold', fontSize: 9 },
                styles: { font: FONT_NAME, fontSize: 8 },
                margin: { left: 10 },
                tableWidth: leftColWidth
              });
              
              // EXD/K tablica - desno
              if (hasExdKNumbers) {
                const rightColWidth = pageWidth * 0.4;
                const exdKData = [
                  ['EXD broj', op.exd_number || 'Nije unesen'],
                  ['K broj', op.k_number || 'Nije unesen']
                ];
                
                autoTable(doc, {
                  startY: yPos,
                  head: [],
                  body: exdKData,
                  theme: 'plain',
                  styles: { font: FONT_NAME, fontSize: 8, cellPadding: 2 },
                  columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40 },
                    1: { cellWidth: 'auto' }
                  },
                  margin: { left: 10 + leftColWidth },
                  tableWidth: rightColWidth
                });
              }
              
              // Ažuriramo poziciju za sljedeći sadržaj
              yPos += (mrnTableData.length + 2) * 8;
            }
          } catch (error) {
            console.error('Greška pri parsiranju mrnBreakdown podataka za detalje:', error);
          }
        }
        
        // Dodajemo napomene ako postoje
        if (op.notes) {
          // Dodajemo napomene u drugu kolonu
          columnTwoData.push(['Napomene', op.notes]);
        }
        
        // Dodajemo separator između transakcija - nakon dvostupčanog prikaza
        // Sve je već prikazano u dvije kolone iznad pomoću columnOneData i columnTwoData
        
        // Dodajemo separator između transakcija
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, doc.internal.pageSize.width - 20, yPos);
        
        yPos += 20; // Povećan razmak između transakcija
      });
    } else {
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      doc.text('Nema operacija točenja goriva za ovaj MRN.', 14, yPos + 15);
      yPos += 20;
    }
    
    // Drained fuel
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('Drenirano gorivo:', 14, yPos + 10);
    
    if (drainedFuel.length > 0) {
      const drainedFuelData = drainedFuel.map(df => {
        // Pokušaj dohvatiti točnu količinu goriva za ovaj MRN iz mrnBreakdown podataka
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
      
      autoTable(doc, {
        startY: yPos + 15,
        head: [['Datum', 'Količina (L)', 'Razlog', 'Operator']],
        body: drainedFuelData,
        theme: 'grid',
        headStyles: { fillColor: [192, 57, 43], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
        styles: { font: FONT_NAME, fontSize: 9 },
        didDrawPage: (data: any) => {
          yPos = data.cursor.y;
        }
      });
      
      yPos += 10;
    } else {
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal');
      doc.text('Nema dreniranog goriva za ovaj MRN.', 14, yPos + 15);
      yPos += 20;
    }
    
    // Dodajemo novu stranicu za summary (balans)
    doc.addPage();
    yPos = 20;
    
    // Naslov za summary stranicu
    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('Sažetak MRN izvještaja', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Prikazujemo broj carinske deklaracije
    doc.setFontSize(12);
    doc.text(`Carinska deklaracija: ${intake.customs_declaration_number || 'N/A'}`, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 20;
    
    // Izračun količine u kilogramima i prosječne gustoće
    let totalDeliveredKg = 0;
    let totalIntakeKg = 0;
    let totalDensity = 0;
    let operationsWithDensity = 0;
    
    console.log('Izračunavam ukupne količine za sažetak izvještaja:');
    
    // POTPUNO PRESLOŽIMO IZRAČUN - ali samo za specifični MRN koji je predmet izvještaja
    // Umjesto sumiranja svih operacija, uzimamo u obzir samo dijelove operacija koji se odnose na trenutni MRN
    const targetMRN = intake.customs_declaration_number; // MRN koji je predmet izvještaja
    console.log(`Analiziramo transakcije za specifični MRN: ${targetMRN}`);
    
    console.log('Pojedinačni redovi operacija:');
    fuelingOperations.forEach((op, index) => {
      console.log(`Red ${index + 1}: `, op);
      
      // Provjeri ima li operacija MRN breakdown podatke (razdvojene po pojedinim MRN-ovima)
      let mrnBreakdownData: { mrn: string; quantity: number; kg?: number }[] = [];
      try {
        if (op.mrnBreakdown) {
          mrnBreakdownData = JSON.parse(op.mrnBreakdown);
          console.log(`  - sadrži MRN breakdown podatke:`, mrnBreakdownData);
        }
      } catch (e) {
        console.warn(`  - neispravan MRN breakdown format:`, op.mrnBreakdown);
      }
      
      // Ako operacija ima MRN breakdown podatke, traži samo količinu za naš ciljani MRN
      let operationKg = 0;
      let operationUsesTargetMrn = false;
      
      if (mrnBreakdownData.length > 0) {
        // Traži količinu specifičnu za ciljani MRN
        const targetMrnEntry = mrnBreakdownData.find(entry => entry.mrn === targetMRN);
        
        if (targetMrnEntry) {
          operationUsesTargetMrn = true;
          // Ako imamo direktno kg vrijednost u MRN zapisu, koristi ju
          if (typeof targetMrnEntry.kg === 'number' && !isNaN(targetMrnEntry.kg)) {
            operationKg = targetMrnEntry.kg;
            console.log(`  - koristi kg iz MRN podataka: ${operationKg}`);
          } 
          // Inače, izračunaj iz količine i gustoće
          else if (typeof targetMrnEntry.quantity === 'number' && op.specific_density && !isNaN(op.specific_density)) {
            operationKg = targetMrnEntry.quantity * op.specific_density;
            console.log(`  - izračunava iz MRN količine: ${targetMrnEntry.quantity} L * ${op.specific_density} = ${operationKg} kg`);
          }
        } else {
          console.log(`  - ne koristi ciljani MRN ${targetMRN}`);
        }
      } 
      // Ako nema MRN breakdown podataka, pretpostavi da je cijela operacija pod ciljanim MRN-om
      else {
        operationUsesTargetMrn = true;
        
        if (typeof op.quantity_kg === 'number' && !isNaN(op.quantity_kg)) {
          operationKg = op.quantity_kg;
          console.log(`  - koristi quantity_kg: ${operationKg}`);
        } else if (op.specific_density && op.quantity_liters && !isNaN(op.specific_density) && !isNaN(op.quantity_liters)) {
          operationKg = op.quantity_liters * op.specific_density;
          console.log(`  - izračunava iz gustoće: ${op.quantity_liters} L * ${op.specific_density} = ${operationKg} kg`);
        }
      }
      
      // Dodajemo vrijednost totalDeliveredKg samo ako je stvarna vrijednost (nije NaN) i koristi ciljani MRN
      if (operationUsesTargetMrn && !isNaN(operationKg) && operationKg > 0) {
        totalDeliveredKg += operationKg;
        console.log(`  - dodano u ukupno: ${operationKg.toFixed(2)} kg, novo stanje: ${totalDeliveredKg.toFixed(2)} kg`);
      }
      
      // Prosječnu gustoću računamo samo iz operacija koje koriste naš MRN
      if (operationUsesTargetMrn && op.specific_density && !isNaN(op.specific_density)) {
        totalDensity += op.specific_density;
        operationsWithDensity++;
      }
    });
    
    // Izračunavamo primljeno gorivo u kg (koristeći podatke iz ulaza goriva)
    if (intake.specific_gravity && intake.quantity_liters_received && 
        !isNaN(intake.specific_gravity) && !isNaN(intake.quantity_liters_received)) {
      totalIntakeKg = intake.quantity_liters_received * intake.specific_gravity;
    } else if (intake.quantity_kg_received && !isNaN(parseFloat(intake.quantity_kg_received))) {
      totalIntakeKg = parseFloat(intake.quantity_kg_received);
    }
    
    console.log(`Ukupno primljeno (kg): ${totalIntakeKg.toFixed(2)}`);
    console.log(`Ukupno isporučeno (kg): ${totalDeliveredKg.toFixed(2)}`);
    
    // Koristimo originalne podatke za volumene
    console.log(`Ukupno primljeno (L): ${balance.totalIntake}`);
    console.log(`Ukupno isporučeno (L): ${balance.totalFuelingOperations}`);
    console.log(`Ukupno drenirano (L): ${balance.totalDrained}`);
    console.log(`Preostalo (L): ${balance.remainingFuel}`);
    
    // Izračun prosječne gustoće
    const averageDensity = operationsWithDensity > 0 ? totalDensity / operationsWithDensity : 0;
    
    // Kreiramo tabelu sa zbirnim podacima - organizirano u kategorije
    
    // Header za tabelu
    doc.setFillColor(41, 128, 185); // Plava boja za header
    doc.rect(30, yPos, doc.internal.pageSize.width - 60, 10, 'F');
    doc.setTextColor(255, 255, 255); // Bijeli tekst
    doc.setFontSize(11);
    doc.text('Sažetak količina goriva', doc.internal.pageSize.width / 2, yPos + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0); // Vratimo na crnu boju
    yPos += 15;
    
    // Grupiramo podatke za bolju organizaciju tabele
    // Važna napomena: Zanemarujemo balance vrijednosti i koristimo isključivo naš precizni izračun
    // Deklariraj stvarne vrijednosti koje prikazujemo u PDF-u da izbjegnemo korištenje potencijalno netočnih balance vrijednosti
    const displayIntakeKg = totalIntakeKg;
    const displayDeliveredKg = totalDeliveredKg;
    const displayRemainingKg = displayIntakeKg - displayDeliveredKg;
    
    console.log('KONAČNE VRIJEDNOSTI ZA PRIKAZ:');
    console.log(`Težina - Primljeno (kg): ${displayIntakeKg.toFixed(2)}`);
    console.log(`Težina - Isporučeno (kg): ${displayDeliveredKg.toFixed(2)}`);
    console.log(`Težina - Preostalo (kg): ${displayRemainingKg.toFixed(2)}`);
    
    const weightData = [
      ['Težina - Primljeno (kg)', displayIntakeKg.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Težina - Isporučeno (kg)', displayDeliveredKg.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Težina - Preostalo (kg)', displayRemainingKg.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ['Prosječna specifična gustoća', averageDensity.toLocaleString('bs-BA', { minimumFractionDigits: 4, maximumFractionDigits: 4 })]
    ];
    
    const volumeData = [
      ['Volumen - Primljeno (L)', balance.totalIntake.toLocaleString('bs-BA')],
      ['Volumen - Isporučeno (L)', balance.totalFuelingOperations.toLocaleString('bs-BA')],
      ['Volumen - Drenirano (L)', balance.totalDrained.toLocaleString('bs-BA')],
      ['Volumen - Preostalo (L)', balance.remainingFuel.toLocaleString('bs-BA')]
    ];
    
    // Kategorija 1: Podaci o težini (kg)
    doc.setFillColor(240, 240, 240); // Svijetlo siva pozadina za kategorije
    doc.rect(30, yPos, doc.internal.pageSize.width - 60, 10, 'F');
    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('Podaci o težini', 35, yPos + 7);
    yPos += 15;
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: weightData,
      theme: 'grid',
      styles: { font: FONT_NAME, fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: 50, right: 50 }
    });
    
    yPos += weightData.length * 12 + 10;
    
    // Kategorija 2: Podaci o volumenu (L)
    doc.setFillColor(240, 240, 240); 
    doc.rect(30, yPos, doc.internal.pageSize.width - 60, 10, 'F');
    doc.setFont(FONT_NAME, 'bold');
    doc.text('Podaci o volumenu', 35, yPos + 7);
    yPos += 15;
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: volumeData,
      theme: 'grid',
      styles: { font: FONT_NAME, fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: 50, right: 50 }
    });
    
    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`Izvještaj generisan: ${formatDateTimeForReport(new Date())}`, 14, footerY);
    
    // Preuzimanje PDF-a
    const fileName = `MRN_Izvjestaj_${intake.customs_declaration_number}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('MRN izvještaj uspješno generisan.');
  };

  const handleDownloadDocument = async (document: FuelIntakeDocument) => {
    if (!document || !document.id) {
      toast.error('ID dokumenta nedostaje.');
      return;
    }
    try {
      const response: Response = await fetchWithAuth(
        `${API_URL}/api/fuel/documents/${document.id}/download`,
        { method: 'GET', returnRawResponse: true }
      );

      if (!response.ok) {
        let errorMsg = `Greška pri preuzimanju dokumenta: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
        } catch (e) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.document_name || `document-${document.id}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Dokument uspješno preuzet.`);
    } catch (error) {
      console.error('Error downloading document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška prilikom preuzimanja.';
      toast.error(`Greška: ${errorMessage}`);
    } finally {
    }
  };

  const handleExportSingleRecordToPdf = (record: FuelIntakeRecord) => {
    const doc = new jsPDF();
    registerFont(doc);

    doc.setFontSize(18);
    doc.setFont(FONT_NAME, 'bold'); 
    doc.text(`Izvještaj o Ulazu Goriva - ID: ${record.id}`, 14, 22);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.setFontSize(10);

    let yPos = 35;
    const lineHeight = 8; 
    const leftMargin = 14;
    const labelValueSpacing = 50; 
    const valueX = leftMargin + labelValueSpacing;

    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Osnovni Podaci', leftMargin, yPos);
    yPos += lineHeight + 2;
    doc.setFontSize(10);
    doc.setFont(FONT_NAME, 'normal'); 

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Datum i Vrijeme Ulaza:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(formatDateTimeForReport(record.intake_datetime), valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Tip Goriva:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.fuel_type, valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Kategorija:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.fuel_category || 'Domaće tržište', valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Dostavno Vozilo (Reg.):', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.delivery_vehicle_plate || 'N/A', valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Vozač:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.delivery_vehicle_driver_name || 'N/A', valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Količina (L):', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.quantity_liters_received.toLocaleString('bs-BA'), valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Količina (KG):', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(parseFloat(record.quantity_kg_received).toLocaleString('bs-BA'), valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Specifična Gustoća:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.specific_gravity.toLocaleString('bs-BA'), valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Dobavljač:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.supplier_name || 'N/A', valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Broj Dostavnice:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.delivery_note_number || 'N/A', valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Broj carinske prijave/MRN:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.customs_declaration_number || 'N/A', valueX, yPos); yPos += lineHeight;

    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Rafinerija:', leftMargin, yPos);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.text(record.refinery_name || 'N/A', valueX, yPos); yPos += lineHeight;
    
    // Add price-related fields
    if (typeof record.price_per_kg === 'number') {
      doc.setFont(FONT_NAME, 'bold'); 
      doc.text('Cijena po KG:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal'); 
      doc.text(`${record.price_per_kg.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, valueX, yPos); yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold'); 
      doc.text('Valuta:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal'); 
      doc.text(record.currency || 'N/A', valueX, yPos); yPos += lineHeight;
      
      doc.setFont(FONT_NAME, 'bold'); 
      doc.text('Ukupna cijena:', leftMargin, yPos);
      doc.setFont(FONT_NAME, 'normal'); 
      if (typeof record.total_price === 'number') {
        doc.text(`${record.total_price.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${record.currency || ''}`, valueX, yPos);
      } else {
        doc.text('N/A', valueX, yPos);
      }
      yPos += lineHeight;
    }

    yPos += 10;

    if (record.fixedTankTransfers && record.fixedTankTransfers.length > 0) {
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold'); 
      doc.text('Raspodjela u Fiksne Tankove', 14, yPos);
      yPos += lineHeight + 2;
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal'); 

      const transferTableBody = record.fixedTankTransfers.map((t: any) => [
        t.affectedFixedTank?.tank_name || 'N/A',
        t.affectedFixedTank?.tank_identifier || 'N/A',
        t.quantity_liters_transferred.toLocaleString('bs-BA'),
        formatDateTimeForReport(t.transfer_datetime)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Naziv Tanka', 'Identifikator Tanka', 'Količina (L)', 'Vrijeme Transfera']],
        body: transferTableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 }, 
        styles: { font: FONT_NAME, fontSize: 9 }, 
        didDrawPage: (data: any) => { yPos = data.cursor.y; }
      });
      yPos += 10; 
    } else {
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal'); 
      doc.text('Nema podataka o raspodjeli u fiksne tankove.', 14, yPos);
      yPos += lineHeight + 5; 
    }

    yPos += 5; 

    if (record.documents && record.documents.length > 0) {
      doc.setFontSize(14);
      doc.setFont(FONT_NAME, 'bold'); 
      doc.text('Priloženi Dokumenti', 14, yPos);
      yPos += lineHeight + 2;
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal'); 

      const docTableBody = record.documents.map((d: any) => [
        d.document_name,
        d.document_type,
        d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(2)} KB` : 'N/A'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Naziv Dokumenta', 'Tip Dokumenta', 'Veličina']],
        body: docTableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 }, 
        styles: { font: FONT_NAME, fontSize: 9 }, 
        didDrawPage: (data: any) => { yPos = data.cursor.y; }
      });
      yPos += 10; 
    } else {
      doc.setFontSize(10);
      doc.setFont(FONT_NAME, 'normal'); 
      doc.text('Nema priloženih dokumenata.', 14, yPos);
      yPos += lineHeight;
    }

    doc.save(`Izvjestaj_Ulaz_Goriva_ID_${record.id}.pdf`);
    toast.success('PDF izvještaj uspješno generisan.');
  };

  const handleExportAllToPdf = () => {
    if (records.length === 0) {
      toast.error('Nema podataka za izvoz u PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    registerFont(doc);

    doc.setFontSize(16);
    doc.setFont(FONT_NAME, 'bold'); 
    doc.text('Izvještaj Svih Ulaza Goriva', 14, 22);
    doc.setFont(FONT_NAME, 'normal'); 
    doc.setFontSize(10);

    const dateRangeText = filters.startDate && filters.endDate
      ? `Period: ${formatDateForReport(filters.startDate)} - ${formatDateForReport(filters.endDate)}`
      : 'Svi zapisi';
    doc.text(dateRangeText, 14, 32);

    const tableData = records.map(record => [
      formatDateForReport(record.intake_datetime), // Use dd.mm.yyyy format
      record.customs_declaration_number || 'N/A',
      record.fuel_type,
      record.fuel_category || 'Domaće tržište',
      record.quantity_liters_received.toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' L',
      (parseFloat(record.quantity_kg_received) || 0).toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg',
      (typeof record.specific_gravity === 'number' ? record.specific_gravity.toFixed(4) : 'N/A'),
      typeof record.price_per_kg === 'number' ? record.price_per_kg.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A',
      record.currency || 'N/A',
      typeof record.total_price === 'number' ? record.total_price.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + (record.currency ? ` ${record.currency}` : '') : 'N/A',
      record.refinery_name || 'N/A',
      record.supplier_name || 'N/A',
      record.delivery_note_number || 'N/A'
    ]);

    // Calculate totals from records
    const totalLiters = records.reduce((sum, record) => sum + (record.quantity_liters_received || 0), 0);
    const totalKg = records.reduce((sum, record) => sum + (parseFloat(record.quantity_kg_received) || 0), 0);
    const averageDensity = totalLiters > 0 ? totalKg / totalLiters : 0;
    const totalPrice = records.reduce((sum, record) => sum + (record.total_price || 0), 0);

    autoTable(doc, {
      startY: 40,
      head: [['Datum', 'MRN', 'Tip Goriva', 'Kategorija', 'Količina (L)', 'Količina (kg)', 'Gustoća', 'Cijena/KG', 'Valuta', 'Ukupna Cijena', 'Rafinerija', 'Dobavljač', 'Br. Otpremnice']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 }, 
      styles: { font: FONT_NAME, fontSize: 9 },
      didDrawPage: function(data: any) {
        // Add footer with total information
        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(10);
        
        // Display totals in the footer
        const footerY = doc.internal.pageSize.height - 20;
        doc.text(`Ukupno Litara: ${totalLiters.toLocaleString('bs-BA')} L`, data.settings.margin.left, footerY - 12);
        doc.text(`Ukupno Kilograma: ${totalKg.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, data.settings.margin.left, footerY - 8);
        doc.text(`Prosječna Gustoća: ${averageDensity.toLocaleString('bs-BA', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg/L`, data.settings.margin.left, footerY - 4);
        
        // Add total price if there are records with price information
        if (totalPrice > 0) {
          // Find the most common currency
          const currencyCounts: Record<string, number> = {};
          records.forEach(record => {
            if (record.currency) {
              currencyCounts[record.currency] = (currencyCounts[record.currency] || 0) + 1;
            }
          });
          let mostCommonCurrency = '';
          let maxCount = 0;
          for (const currency in currencyCounts) {
            if (currencyCounts[currency] > maxCount) {
              maxCount = currencyCounts[currency];
              mostCommonCurrency = currency;
            }
          }
          
          doc.text(`Ukupna Cijena: ${totalPrice.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mostCommonCurrency}`, data.settings.margin.left, footerY);
        }
        
        // Add page number
        doc.setFont(FONT_NAME, 'normal');
        doc.setFontSize(8);
        doc.text(`Stranica ${data.pageNumber}`, doc.internal.pageSize.width - 20, footerY);
      }
    });

    doc.save(`Izvjestaj_Ulaz_Goriva_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF izvještaj uspješno generisan sa ukupnim količinama.');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header with glassmorphism effect */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-[#e53e3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Izvještaj o Ulazu Goriva
            </h2>
            <p className="text-gray-300 mt-1 ml-11">Pregled svih zapisa o ulazu goriva i pratećih dokumenata</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filteri izvještaja
              </h3>
            </div>
            
            <div className="p-5 bg-white dark:bg-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Datum od:</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <Input
                      type="date"
                      id="startDateFilter"
                      className="pl-10 bg-gray-50 dark:bg-gray-900"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Datum do:</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <Input
                      type="date"
                      id="endDateFilter"
                      className="pl-10 bg-gray-50 dark:bg-gray-900"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="fuelTypeFilterReport" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tip Goriva:</label>
                  <Select
                    value={filters.fuel_type}
                    onValueChange={(value: FuelType | 'all') => handleFilterChange('fuel_type', value)}
                  >
                    <SelectTrigger id="fuelTypeFilterReport" className="bg-gray-50 dark:bg-gray-900">
                      <SelectValue placeholder="Svi tipovi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Svi tipovi</SelectItem>
                      {Object.values(FuelType).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="categoryFilterReport" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kategorija:</label>
                  <Select
                    value={filters.fuel_category}
                    onValueChange={(value: string) => handleFilterChange('fuel_category', value)}
                  >
                    <SelectTrigger id="categoryFilterReport" className="bg-gray-50 dark:bg-gray-900">
                      <SelectValue placeholder="Sve kategorije" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Sve kategorije</SelectItem>
                      <SelectItem value="Izvoz">Izvoz</SelectItem>
                      <SelectItem value="Domaće tržište">Domaće tržište</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="refineryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rafinerija:</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      id="refineryFilter"
                      className="pl-10 bg-gray-50 dark:bg-gray-900"
                      placeholder="Naziv rafinerije"
                      value={filters.refinery_name}
                      onChange={(e) => handleFilterChange('refinery_name', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="mrnFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">MRN:</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      id="mrnFilter"
                      className="pl-10 bg-gray-50 dark:bg-gray-900"
                      placeholder="MRN broj"
                      value={filters.customs_declaration_number}
                      onChange={(e) => handleFilterChange('customs_declaration_number', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="currencyFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valuta:</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      id="currencyFilter"
                      className="pl-10 bg-gray-50 dark:bg-gray-900"
                      placeholder="Valuta (npr. EUR, BAM)"
                      value={filters.currency}
                      onChange={(e) => handleFilterChange('currency', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={fetchIntakeRecords} 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Primjenjujem...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Primijeni filtere
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>



        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Pregled ulaza goriva
              </h3>
            </div>
            
            {loading && !records.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 dark:text-gray-400">Učitavanje podataka...</p>
              </div>
            ) : error && !records.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Greška pri učitavanju podataka</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{error}</p>
              </div>
            ) : !records.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Nema podataka za prikaz</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Podesite filtere i pokušajte ponovo</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto w-full">
                  <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Datum</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">MRN</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Tip Goriva</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Kategorija</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Količina (L)</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Količina (kg)</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Stanje MRN (L/KG)</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Cijena/KG</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">Valuta</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Ukupno</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Rafinerija</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Dobavljač</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Br. Otpr.</th>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {records.map((record) => (
                        <React.Fragment key={record.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">{formatDateForReport(record.intake_datetime)}</td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">{record.customs_declaration_number || 'N/A'}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${record.fuel_type === FuelType.JET_A1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'}`}>
                                {record.fuel_type}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(record.fuel_category === 'Izvoz') ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'}`}>
                                {record.fuel_category || 'Domaće tržište'}
                              </span>
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300 font-medium">
                              {record.quantity_liters_received.toLocaleString('hr-HR')} L
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300 font-medium">
                              {record.quantity_kg_received ? (parseFloat(record.quantity_kg_received) || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg' : 'N/A'}
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">
                              {record.customs_declaration_number && mrnBalances[record.customs_declaration_number] ? 
                                <span className={`font-medium ${mrnBalances[record.customs_declaration_number].remainingFuel > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {typeof mrnBalances[record.customs_declaration_number].remainingFuel === 'number' ? mrnBalances[record.customs_declaration_number].remainingFuel.toLocaleString('hr-HR', { maximumFractionDigits: 1 }) : '0'} L / 
                                  {typeof mrnBalances[record.customs_declaration_number].remainingFuelKg === 'number' ? mrnBalances[record.customs_declaration_number].remainingFuelKg.toLocaleString('hr-HR', { maximumFractionDigits: 1 }) : '0'} KG
                                </span> : 
                                'N/A'
                              }
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">
                              {typeof record.price_per_kg === 'number' ? record.price_per_kg.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">
                              {record.currency || 'N/A'}
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">
                              {typeof record.total_price === 'number' ? record.total_price.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}
                            </td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">{record.refinery_name || 'N/A'}</td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">{record.supplier_name}</td>
                            <td className="px-2 py-2 break-words text-xs text-gray-700 dark:text-gray-300">{record.delivery_note_number}</td>
                            <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 flex flex-col space-y-1">
                              {record.documents && record.documents.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)}
                                  className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-900/20 px-2 py-1 text-xs"
                                >
                                  <DocumentTextIcon className="h-3 w-3 mr-1" /> 
                                  Dok ({record.documents.length})
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleExportSingleRecordToPdf(record)}
                                className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 px-2 py-1 text-xs"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                PDF
                              </Button>
                              {record.customs_declaration_number && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleGenerateMrnReport(record.customs_declaration_number!)}
                                  className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20 px-2 py-1 text-xs"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  MRN Izvještaj
                                </Button>
                              )}
                            </td>
                          </tr>
                          {expandedRecordId === record.id && record.documents && record.documents.length > 0 && (
                            <tr>
                              <td colSpan={7} className="p-2 bg-gray-50 dark:bg-gray-700/50">
                                <div className="p-2">
                                  <h4 className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Povezani dokumenti:</h4>
                                  <ul className="list-disc pl-5">
                                    {record.documents.map(doc => (
                                      <li key={doc.id} className="text-xs flex justify-between items-center py-1">
                                        <span className="text-gray-600 dark:text-gray-400">{doc.document_name} ({doc.document_type}, {(doc.file_size_bytes / 1024).toFixed(1)} KB)</span>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDownloadDocument(doc)}
                                          className="p-0 h-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                                        >
                                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Preuzmi
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {records.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Prikazano <span className="font-medium text-gray-700 dark:text-gray-300">{records.length}</span> zapisa
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExportAllToPdf()}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Izvezi sve u PDF
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Statistički prikaz ukupnih količina - premješteno ispod tabele */}
        {records.length > 0 && (
          <div className="mt-6 mb-6">
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 002 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 012 2h2a2 2 0 012 2v-2a2 2 0 01 2-2h2z" />
                  </svg>
                  Statistika ulaza goriva
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ukupna količina</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalLiters.toLocaleString('bs-BA', { maximumFractionDigits: 1 })} L</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19.7 11H18.3C17.91 11 17.58 11.33 17.5 11.72L17 14H7L6.5 11.72C6.42 11.33 6.09 11 5.7 11H4.3C3.84 11 3.5 11.5 3.66 11.93L4.65 15.59C4.79 16.35 5.47 16.91 6.25 16.91H17.75C18.53 16.91 19.21 16.35 19.35 15.59L20.34 11.93C20.5 11.5 20.16 11 19.7 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 6.5V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 6.5V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 4V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ukupna težina</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalKg.toLocaleString('bs-BA', { maximumFractionDigits: 1 })} kg</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Prosječna gustoća</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{averageDensity.toLocaleString('bs-BA', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelIntakeReport;
