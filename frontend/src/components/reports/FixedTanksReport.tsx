'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFixedTanks, getFixedTankHistory, getTotalFixedTankIntake, getAllFixedTankIntakesList, getTotalFuelSummary } from '@/lib/apiService';
import type { FixedStorageTank, TankTransaction } from '@/types/fuel';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2, ChevronDown, ChevronUp, Filter, FileDown } from 'lucide-react'; 
import { BeakerIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input'; 
import { useAuth } from '@/contexts/AuthContext'; 
import jsPDF from 'jspdf';
import { autoTable, CellHookData } from 'jspdf-autotable'; 
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';
// Removed Radix UI Select - using native HTML select instead 
import AllIntakesList from '@/components/customs/AllIntakesList'; 

interface TankWithHistory extends FixedStorageTank {
  history?: TankTransaction[];
  showHistory?: boolean;
  historyLoading?: boolean;
  errorHistory?: string | null;
  filterStartDate?: string; 
  filterEndDate?: string;   
  filterTransactionType?: TankTransaction['type'] | 'all'; 
}

export default function FixedTanksReport() {
  const [tanks, setTanks] = useState<TankWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authToken } = useAuth(); 

  // State for Total Intake Summary
  const [totalIntakeStartDate, setTotalIntakeStartDate] = useState<string>('');
  const [totalIntakeEndDate, setTotalIntakeEndDate] = useState<string>('');
  const [totalIntakeAmount, setTotalIntakeAmount] = useState<number | null>(null);
  const [totalIntakeLoading, setTotalIntakeLoading] = useState<boolean>(false);
  const [totalIntakeError, setTotalIntakeError] = useState<string | null>(null);
  
  // State for fuel summary
  const [fuelSummary, setFuelSummary] = useState<{
    fixedTanksTotal: number;
    mobileTanksTotal: number;
    grandTotal: number;
    fixedTanksTotalKg: number;
    mobileTanksTotalKg: number;
    grandTotalKg: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Function to fetch fuel summary data
  const fetchFuelSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const summaryData = await getTotalFuelSummary();
      setFuelSummary(summaryData);
    } catch (error) {
      console.error('Error fetching fuel summary:', error);
      setSummaryError('Greška pri učitavanju ukupnog stanja goriva');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    const fetchTanksData = async () => { 
      if (!authToken) {
        setError("Token za autentifikaciju nije pronađen. Molimo ulogirajte se ponovo.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getFixedTanks(); 
        const today = new Date();
        const defaultStartDate = format(startOfMonth(today), 'yyyy-MM-dd');
        const defaultEndDate = format(endOfMonth(today), 'yyyy-MM-dd');

        setTanks(data.map(tank => ({ 
          ...tank, 
          showHistory: false, 
          historyLoading: false, 
          filterStartDate: defaultStartDate, 
          filterEndDate: defaultEndDate,   
          filterTransactionType: 'all' 
        })));
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Greška pri dohvatu tankova');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (authToken) { 
     fetchTanksData();
     fetchFuelSummary();
    } else {
      // Handle case where authToken is not yet available or never becomes available
      // setError("Čekanje na autentifikaciju..."); 
      // setLoading(false); 
    }
  }, [authToken]);

  // Initialize total intake dates to current month
  useEffect(() => {
    const today = new Date();
    setTotalIntakeStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setTotalIntakeEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
  }, []); 

  // Fetch total intake data
  const fetchCombinedIntakeData = useCallback(async () => {
    if (!authToken || !totalIntakeStartDate || !totalIntakeEndDate) {
      setTotalIntakeAmount(null);
      return;
    }
    setTotalIntakeLoading(true);
    setTotalIntakeError(null);

    try {
      const totalIntake = await getTotalFixedTankIntake(totalIntakeStartDate, totalIntakeEndDate);
      setTotalIntakeAmount(totalIntake.totalIntake);
    } catch (err: any) {
      const errorMessage = err.message || 'Greška pri dohvatu podataka o prijemu.';
      setTotalIntakeError(errorMessage);
      setTotalIntakeAmount(null); 
      console.error(err);
    } finally {
      setTotalIntakeLoading(false);
    }
  }, [authToken, totalIntakeStartDate, totalIntakeEndDate]);

  // useEffect to fetch combined data when dates or token change
  useEffect(() => {
    if (totalIntakeStartDate && totalIntakeEndDate && authToken) {
      fetchCombinedIntakeData();
    }
  }, [fetchCombinedIntakeData, totalIntakeStartDate, totalIntakeEndDate, authToken]);

  const handleFilterDateChange = (tankId: number, dateType: 'startDate' | 'endDate', value: string) => {
    setTanks(prevTanks =>
      prevTanks.map(tank =>
        tank.id === tankId ? { ...tank, [dateType === 'startDate' ? 'filterStartDate' : 'filterEndDate']: value } : tank
      )
    );
  };

  const handleFilterTransactionTypeChange = (tankId: number, type: TankTransaction['type'] | 'all') => {
    setTanks(prevTanks =>
      prevTanks.map(tank =>
        tank.id === tankId ? { ...tank, filterTransactionType: type } : tank
      )
    );
    // Optionally, re-fetch or re-filter history if it's already loaded
    // For simplicity, we'll rely on the user clicking "Prikaži/Osvježi Historiju" or applying date filters again
    // or we can automatically trigger a refresh if history is shown
    const currentTank = tanks.find(t => t.id === tankId);
    if (currentTank?.showHistory) {
      toggleHistory(tankId, true); 
    }
  };

  const toggleHistory = async (tankId: number, forceFetch: boolean = false) => {
    console.log(`FixedTanksReport - toggleHistory called for tank ID ${tankId}, forceFetch: ${forceFetch}`);
    console.log(`Current filter dates: startDate=${tanks.find(t => t.id === tankId)?.filterStartDate}, endDate=${tanks.find(t => t.id === tankId)?.filterEndDate}`);
    console.log(`Current filter transaction type: ${tanks.find(t => t.id === tankId)?.filterTransactionType || 'all'}`);

    const targetTank = tanks.find(t => t.id === tankId);
    if (!targetTank) return;

    if (!targetTank.showHistory || forceFetch) {
      try {
        console.log(`FixedTanksReport - Fetching history for tank ID ${tankId}...`);
        setTanks(prev => prev.map(t => t.id === tankId ? { ...t, historyLoading: true, errorHistory: null } : t));
        if (!authToken) {
            console.log('FixedTanksReport - Authentication token not found');
            setTanks(prev => prev.map(t => t.id === tankId ? { ...t, historyLoading: false, errorHistory: 'Token za autentifikaciju nije pronađen.' } : t));
            return;
        }
        
        const historyData = await getFixedTankHistory(tankId, targetTank.filterStartDate, targetTank.filterEndDate);
        console.log(`FixedTanksReport - History data received for tank ID ${tankId}:`, historyData);
        
        // Log transaction types distribution
        const transactionTypes: Record<string, number> = {};
        historyData.forEach(transaction => {
          transactionTypes[transaction.type] = (transactionTypes[transaction.type] || 0) + 1;
        });
        console.log('FixedTanksReport - Transaction types distribution:', transactionTypes);
        
        // Check if there are any 'intake' transactions
        const intakeTransactions = historyData.filter(t => t.type === 'intake');
        console.log(`FixedTanksReport - Number of 'intake' transactions: ${intakeTransactions.length}`);
        
        setTanks(prev => prev.map(t => t.id === tankId ? { ...t, history: historyData, showHistory: true, historyLoading: false } : t));
      } catch (err: any) {
        console.error(`Greška pri dohvatu historije za tank ${tankId}:`, err);
        setTanks(prev => prev.map(t => t.id === tankId ? { ...t, showHistory: true, historyLoading: false, errorHistory: err.message || 'Greška pri dohvatu historije.' } : t));
      }
    } else {
      console.log(`FixedTanksReport - Hiding history for tank ID ${tankId}`);
      setTanks(prev => prev.map(t => t.id === tankId ? { ...t, showHistory: false } : t));
    }
  };

  const handleExportToPdf = (tank: TankWithHistory) => {
    if (!tank.history || tank.history.length === 0) {
      alert("Nema transakcija za izvoz.");
      return;
    }

    const doc = new jsPDF();
    const FONT_NAME = 'NotoSans';

    // Pravilno dodavanje i učitavanje fontova za podršku bosanskih znakova
    try {
      // Helper funkcija za uklanjanjanje prefiksa iz Base64 stringa
      const stripPrefix = (base64String: string) => {
        const prefix = 'data:font/ttf;base64,';
        if (base64String.startsWith(prefix)) {
          return base64String.substring(prefix.length);
        }
        return base64String;
      };
      
      if (notoSansRegularBase64) {
        // Dodaj font u VFS (Virtual File System) jsPDF-a
        const cleanedRegular = stripPrefix(notoSansRegularBase64);
        doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
        // Registruj font za korištenje
        doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
        
        // Postavi font kao aktivni
        doc.setFont(FONT_NAME);
      } else {
        console.error("NotoSansRegular font nije dostupan");
      }
      
      if (notoSansBoldBase64) {
        // Dodaj bold font u VFS
        const cleanedBold = stripPrefix(notoSansBoldBase64);
        doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
        // Registruj bold font
        doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
      } else {
        console.error("NotoSansBold font nije dostupan");
      }
    } catch (e) {
      console.error("Greška prilikom postavljanja fontova:", e);
      alert("Greška: Fontovi za PDF nisu mogli biti učitani. Bosanski znakovi možda neće biti ispravno prikazani.");
    }  

    // Naslov
    const title = `Izvještaj o transakcijama za rezervoar: ${tank.tank_name} (${tank.tank_identifier})`;
    doc.setFontSize(18);
    try {
      doc.setFont(FONT_NAME, 'bold');
    } catch (e) {
      console.error("Greška pri postavljanju bold fonta za naslov:", e);
    }
    doc.text(title, 14, 22);
    
    // Vraćanje na normalni font za ostatak dokumenta
    try {
      doc.setFont(FONT_NAME, 'normal');
    } catch (e) {
      console.error("Greška pri vraćanju na normalni font:", e);
    }

    // Detalji o tanku
    doc.setFontSize(11);
    doc.text(`Rezervoar: ${tank.tank_name} (${tank.tank_identifier})`, 14, 32);
    doc.text(`Vrsta goriva: ${tank.fuel_type}`, 14, 38);
    doc.text(`Kapacitet: ${tank.capacity_liters.toLocaleString()} L`, 14, 44);
    
    let periodText = "Period: Sve prikazane transakcije";
    if (tank.filterStartDate && tank.filterEndDate) {
      periodText = `Period: ${new Date(tank.filterStartDate).toLocaleDateString()} - ${new Date(tank.filterEndDate).toLocaleDateString()}`;
    } else if (tank.filterStartDate) {
      periodText = `Period: Od ${new Date(tank.filterStartDate).toLocaleDateString()}`;
    } else if (tank.filterEndDate) {
      periodText = `Period: Do ${new Date(tank.filterEndDate).toLocaleDateString()}`;
    }
    doc.text(periodText, 14, 50);

    // Definicija za mapiranje tipova transakcija
    const transactionTypeMap: { [key: string]: string } = {
      'intake': 'ULAZ GORIVA',
      'transfer_to_mobile': 'PRETAKANJE U MOBILNI TANK',
      'adjustment_plus': 'KOREKCIJA POZITIVNA (+)',
      'adjustment_minus': 'KOREKCIJA NEGATIVNA (-)',
      'fuel_drain': 'DRENIRANO GORIVO',
      'fuel_return': 'POVRAT FILTRIRANOG GORIVA',
      'internal_transfer_in': 'INTERNI ULAZ',
      'internal_transfer_out': 'INTERNI IZLAZ'
      // Dodajte ostale tipove ako postoje
    };

    // Tablica transakcija
    const tableColumn = ["Datum i vrijeme", "Tip", "Količina (L)", "Dokument", "Izvor/Dest.", "Napomene"];
    const tableRows = tank.history
      .filter(entry => 
        tank.filterTransactionType === 'all' || !tank.filterTransactionType || entry.type === tank.filterTransactionType
      )
      .map(transaction => {
      const transactionDate = new Date(transaction.transaction_datetime);
      const formattedDateTime = `${transactionDate.toLocaleDateString('hr-HR')} ${transactionDate.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}`;
      
      const transactionTypeDisplay = transactionTypeMap[transaction.type] || transaction.type.toUpperCase();

      // Ensure quantityLiters is a number before calling toFixed
      const rawQuantity = transaction.quantityLiters;
      let quantity = 0;
      if (typeof rawQuantity === 'string') {
        quantity = parseFloat(rawQuantity);
      } else if (typeof rawQuantity === 'number') {
        quantity = rawQuantity;
      }
      // If parsing failed or was not a number/string, quantity remains 0.
      // Handle NaN explicitly if parseFloat results in NaN from a string like "abc"
      if (isNaN(quantity)) {
        console.warn('FixedTanksReport - PDF Export: Invalid quantity encountered:', rawQuantity, 'Defaulting to 0.');
        quantity = 0;
      }
      const formattedQuantity = quantity.toFixed(2);
      let quantityPrefix = '';
      if (transaction.type === 'intake' || transaction.type === 'fuel_return') {
        quantityPrefix = '+';
      } else if (transaction.type === 'transfer_to_mobile' || transaction.type === 'fuel_drain') {
        quantityPrefix = '-';
      }

      return [
        formattedDateTime,
        transactionTypeDisplay,
        { 
          content: quantityPrefix + formattedQuantity + ' L', 
          styles: { halign: 'right' as const } 
        },
        transaction.relatedDocument || '-',
        transaction.sourceOrDestination || '-',
        transaction.notes || '-'
      ];
    });

    // Poziv autoTable kao funkcije
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows as any, 
      startY: 60,
      theme: 'grid', 
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: [255, 255, 255], 
        // fontStyle: 'bold',
      },
      willDrawCell: (data) => {
        if (data.section === 'head') {
          try {
            doc.setFont(FONT_NAME, 'bold'); 
          } catch (e) {
            console.error("Greška pri postavljanja bold fonta za zaglavlje:", e);
          }
        }
      },
      didDrawCell: (data) => {
        // Vrati na normalni font za tijelo tablice NAKON što je ćelija (ili red) zaglavlja iscrtana
        // Ovo osigurava da ostatak dokumenta koristi regular font ako nije drugačije specificirano
        if (data.section === 'head' || data.section === 'body') { 
          try {
            doc.setFont('NotoSans', 'normal'); 
          } catch (e) {
            console.error("Greška pri vraćanju na normalni font:", e);
          }
        }
      },
      columnStyles: {
        0: { cellWidth: 35 }, 
        1: { cellWidth: 50 }, 
        2: { cellWidth: 25, halign: 'right' }, 
        3: { cellWidth: 'auto' }, 
        4: { cellWidth: 'auto' }, 
        5: { cellWidth: 'auto' }, 
      },
      didDrawPage: (data) => {
        // Footer - Broj stranice
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        try {
          doc.setFont('NotoSans', 'normal');
        } catch (e) {
          console.error("Greška pri postavljanju fonta za podnožje:", e);
        }
        doc.text(
          'Stranica ' + String(data.pageNumber) + ' od ' + String(pageCount),
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    doc.save(`izvjestaj_rezervoar_${tank.tank_identifier}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-slate-600 mx-auto mb-4" />
      <p className="text-gray-600 font-medium">Učitavanje izvještaja o fiksnim tankovima...</p>
    </div>
  );

  if (error) return (
    <div className="bg-white rounded-lg border border-red-200 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-1">Greška pri učitavanju</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    </div>
  );

  if (tanks.length === 0) return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-gray-600 font-medium">Nema dostupnih fiksnih tankova.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg overflow-hidden max-w-full border border-gray-200">
      {/* Header - Clean, minimal design */}
      <div className="bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-[#4FC3C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Izvještaj o Fiksnim Rezervoarima Goriva
            </h2>
            <p className="text-gray-400 mt-2">Pregled stanja i historije transakcija fiksnih rezervoara</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 md:p-8">
        {/* Summary Section - Minimal, clean design */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Sažetak Stanja Goriva</h3>
            <button
              onClick={fetchFuelSummary}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={summaryLoading}
              title="Osvježi podatke"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {summaryLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : summaryError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {summaryError}
            </div>
          ) : fuelSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Fiksni Tankovi</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {fuelSummary?.fixedTanksTotal != null ? fuelSummary.fixedTanksTotal.toLocaleString('bs-BA', { maximumFractionDigits: 0 }) : '0'} L
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {fuelSummary?.fixedTanksTotalKg != null ? fuelSummary.fixedTanksTotalKg.toLocaleString('bs-BA', { maximumFractionDigits: 0 }) : '0'} kg
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-stone-50 border border-stone-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-stone-100 rounded-lg">
                    <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Mobilni Tankovi</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {fuelSummary?.mobileTanksTotal != null ? fuelSummary.mobileTanksTotal.toLocaleString('bs-BA', { maximumFractionDigits: 0 }) : '0'} L
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {fuelSummary?.mobileTanksTotalKg != null ? fuelSummary.mobileTanksTotalKg.toLocaleString('bs-BA', { maximumFractionDigits: 0 }) : '0'} kg
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-zinc-100 rounded-lg">
                    <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Ukupno</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {fuelSummary?.grandTotal != null ? fuelSummary.grandTotal.toLocaleString('bs-BA', { maximumFractionDigits: 0 }) : '0'} L
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {fuelSummary?.grandTotalKg != null ? fuelSummary.grandTotalKg.toLocaleString('bs-BA', { maximumFractionDigits: 0 }) : '0'} kg
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-neutral-100 rounded-lg">
                    <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Gustoća</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {fuelSummary?.grandTotal && fuelSummary?.grandTotalKg ?
                        (fuelSummary.grandTotalKg / fuelSummary.grandTotal).toLocaleString('bs-BA', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) :
                        '0.000'
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">kg/L</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-gray-600 text-center">
              Nema podataka o ukupnom stanju goriva.
            </div>
          )}
        </div>
        
        <div className="grid gap-6">
          {tanks.map(tank => {
            // Calculate fill percentage for visual indicator
            const fillPercentage = tank.capacity_liters > 0 && typeof tank.current_quantity_liters === 'number' 
              ? Math.min(100, (tank.current_quantity_liters / tank.capacity_liters) * 100) 
              : 0;
              
            // Determine color based on fill level
            const fillColorClass = fillPercentage < 20 
              ? 'bg-red-500' 
              : fillPercentage < 50 
                ? 'bg-yellow-500' 
                : 'bg-green-500';
                
            return (
              <div
                key={tank.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                {/* Card header with teal accent */}
                <div className="h-1 bg-gradient-to-r from-[#4FC3C7] to-teal-400"></div>

                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                        {tank.tank_name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {tank.fuel_type}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Kap: {tank.capacity_liters.toLocaleString()} L
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => toggleHistory(tank.id)}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      {tank.showHistory
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                      {tank.historyLoading
                        ? 'Učitavanje...'
                        : (tank.showHistory ? 'Sakrij' : 'Prikaži')
                      }
                    </button>
                  </div>

                  {/* Current quantity section */}
                  {typeof tank.current_quantity_liters === 'number' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-1">Trenutno stanje</p>
                            <p className="text-3xl font-bold text-gray-900">
                              {tank.current_quantity_liters.toLocaleString()}
                              <span className="text-lg text-gray-600 ml-1">L</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 font-medium mb-1">Kapacitet</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {tank.capacity_liters.toLocaleString()} L
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${fillColorClass}`}
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 font-medium">
                            {fillPercentage.toFixed(1)}% popunjeno
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* History section */}
                {tank.showHistory && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* Loading state */}
                    {tank.historyLoading && (
                      <div className="p-8 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                        <span className="ml-3 text-gray-600">Učitavanje historije...</span>
                      </div>
                    )}

                    {/* Error state */}
                    {tank.errorHistory && (
                      <div className="p-4 bg-red-50 border-b border-red-200 m-4 rounded-lg">
                        <div className="flex items-center text-red-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Greška: {tank.errorHistory}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* History content */}
                    {!tank.historyLoading && !tank.errorHistory && (
                      <>
                        {/* Filter controls */}
                        <div className="p-6 bg-white border-b border-gray-200">
                          {/* Filters Row */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            {/* Start Date Filter */}
                            <div>
                              <label htmlFor={`start-date-${tank.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                                Od datuma
                              </label>
                              <Input
                                type="date"
                                id={`start-date-${tank.id}`}
                                value={tank.filterStartDate || ''}
                                onChange={(e) => handleFilterDateChange(tank.id, 'startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                              />
                            </div>
                            {/* End Date Filter */}
                            <div>
                              <label htmlFor={`end-date-${tank.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                                Do datuma
                              </label>
                              <Input
                                type="date"
                                id={`end-date-${tank.id}`}
                                value={tank.filterEndDate || ''}
                                onChange={(e) => handleFilterDateChange(tank.id, 'endDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                              />
                            </div>
                            {/* Transaction Type Filter */}
                            <div>
                              <label htmlFor={`filter-type-${tank.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                                Tip transakcije
                              </label>
                              <select
                                id={`filter-type-${tank.id}`}
                                value={tank.filterTransactionType || 'all'}
                                onChange={(e) => handleFilterTransactionTypeChange(tank.id, e.target.value as TankTransaction['type'] | 'all')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                              >
                                <option value="all">Svi tipovi</option>
                                <option value="intake">Ulaz</option>
                                <option value="transfer_to_mobile">Izlaz (Mob.)</option>
                                <option value="fuel_drain">Drenirano</option>
                                <option value="fuel_return">Povrat filtriranog</option>
                                <option value="internal_transfer_in">Interni Ulaz</option>
                                <option value="internal_transfer_out">Interni Izlaz</option>
                              </select>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex items-end gap-2">
                              <button onClick={() => toggleHistory(tank.id, true)} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                <Filter size={16} />
                                <span className="hidden sm:inline">Osvježi</span>
                              </button>
                              {tank.history && tank.history.length > 0 && (
                                <button onClick={() => handleExportToPdf(tank)} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                  <FileDown size={16} />
                                  <span className="hidden sm:inline">PDF</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* No data message */}
                        {(!tank.history || tank.history.length === 0) ? (
                          <div className="p-12 text-center bg-white">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-gray-600 font-medium">Nema historije transakcija</p>
                            <p className="text-gray-500 text-sm mt-1">Odaberite period ili primijeni filtere da vidjete transakcije.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                            <Table className="min-w-full text-xs sm:text-sm">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px] sm:w-[150px] whitespace-nowrap">Datum i Vrijeme</TableHead>
                                  <TableHead className="w-[70px] sm:w-[100px]">Tip</TableHead>
                                  <TableHead className="text-right w-[80px] sm:w-[120px]">Količina (L)</TableHead>
                                  <TableHead className="hidden sm:table-cell">Izvor/Odredište</TableHead>
                                  <TableHead className="hidden sm:table-cell">Napomene</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tank.history
                                  .filter(entry => 
                                    tank.filterTransactionType === 'all' || !tank.filterTransactionType || entry.type === tank.filterTransactionType
                                  )
                                  .map(entry => {
                                    // DEBUGGING: Log entry and transaction_datetime
                                    if (!entry.transaction_datetime || isNaN(new Date(entry.transaction_datetime as string | number | Date).getTime())) {
                                      console.log('FixedTanksReport - Invalid or missing transaction_datetime. Entry:', entry, 'transaction_datetime:', entry.transaction_datetime);
                                    }
                                    // END DEBUGGING
                                    return (
                                      <TableRow key={entry.id}>
                                        <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                          {entry.transaction_datetime && !isNaN(new Date(entry.transaction_datetime as string | number | Date).getTime()) 
                                            ? format(new Date(entry.transaction_datetime as string | number | Date), 'dd.MM.yyyy HH:mm') 
                                            : 'Nevažeći datum'}
                                        </TableCell>
                                        <TableCell>
                                        <Badge 
                                          className={`text-xs sm:text-sm ${entry.type === 'intake' 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200' 
                                            : entry.type === 'transfer_to_mobile' 
                                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200' 
                                              : entry.type === 'fuel_drain'
                                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                              : entry.type === 'fuel_return'
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                              : entry.type === 'internal_transfer_in'
                                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200'
                                              : entry.type === 'internal_transfer_out'
                                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200'
                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
                                          }`}
                                        >  {entry.type === 'intake' ? 'ULAZ' 
                                            : entry.type === 'transfer_to_mobile' ? 'IZLAZ (MOB.)' 
                                            : entry.type === 'fuel_drain' ? 'DRENIRANO' 
                                            : entry.type === 'fuel_return' ? 'POVRAT FILTRIRANOG GORIVA'
                                            : entry.type === 'internal_transfer_in' ? 'INTERNI ULAZ'
                                            : entry.type === 'internal_transfer_out' ? 'INTERNI IZLAZ'
                                            : entry.type.toUpperCase()}
                                        </Badge>
                                      </TableCell>
                                        <TableCell className="text-right text-xs sm:text-sm">
                                          <span className={
                                            entry.type === 'intake' ? 'text-emerald-600 dark:text-emerald-400' 
                                            : entry.type === 'transfer_to_mobile' || entry.type === 'fuel_drain' ? 'text-red-600 dark:text-red-400' 
                                            : entry.type === 'fuel_return' ? 'text-green-600 dark:text-green-400'
                                            : entry.type === 'internal_transfer_in' ? 'text-blue-600 dark:text-blue-400'
                                            : entry.type === 'internal_transfer_out' ? 'text-orange-600 dark:text-orange-400'
                                            : 'text-gray-700 dark:text-gray-300' 
                                          }>
                                            {entry.type === 'intake' || entry.type === 'fuel_return' ? '+' : entry.type === 'transfer_to_mobile' || entry.type === 'fuel_drain' ? '-' : ''}{parseFloat(String(entry.quantityLiters || 0)).toFixed(2)} L
                                          </span>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                          {entry.sourceOrDestination || 'N/A'}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                          {
                                            (entry.type === 'internal_transfer_in' && entry.notes === 'Internal transfer in')
                                              ? 'Interni prijem goriva'
                                              : (entry.type === 'internal_transfer_out' && entry.notes === 'Internal transfer out')
                                                ? 'Interni izdatak goriva'
                                                : entry.notes || entry.relatedDocument || '-'
                                          }
                                        </TableCell></TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Intake Summary Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ukupan Ulaz Goriva</h2>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label htmlFor="totalIntakeStartDate" className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
                <Input
                  type="date"
                  id="totalIntakeStartDate"
                  value={totalIntakeStartDate}
                  onChange={(e) => setTotalIntakeStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label htmlFor="totalIntakeEndDate" className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
                <Input
                  type="date"
                  id="totalIntakeEndDate"
                  value={totalIntakeEndDate}
                  onChange={(e) => setTotalIntakeEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchCombinedIntakeData}
                  disabled={totalIntakeLoading || !totalIntakeStartDate || !totalIntakeEndDate}
                  className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {totalIntakeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                  <span className="hidden sm:inline">Osvježi</span>
                </button>
              </div>
            </div>

            {totalIntakeLoading && (
              <div className="flex items-center justify-center text-gray-500 py-6">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>Dohvaćam ukupan ulaz...</span>
              </div>
            )}
            {totalIntakeError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                <p>Greška: {totalIntakeError}</p>
              </div>
            )}
            {!totalIntakeLoading && totalIntakeAmount !== null && !totalIntakeError && (
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-gray-600 font-medium mb-2">Ukupan ulaz za odabrani period</p>
                <p className="text-4xl font-bold text-slate-900">
                  {totalIntakeAmount ? parseFloat(String(totalIntakeAmount)).toFixed(2) : '0'}
                  <span className="text-xl text-slate-600 ml-2">L</span>
                </p>
              </div>
            )}
            {!totalIntakeLoading && totalIntakeAmount === null && !totalIntakeError && totalIntakeStartDate && totalIntakeEndDate && (
              <div className="p-6 bg-gray-50 rounded-lg text-gray-600 text-center">
                Nema podataka o ulazu za odabrani period.
              </div>
            )}
            {!totalIntakeLoading && totalIntakeAmount === null && !totalIntakeError && (!totalIntakeStartDate || !totalIntakeEndDate) && (
              <div className="p-6 bg-gray-50 rounded-lg text-gray-600 text-center">
                Molimo odaberite period za prikaz ukupnog ulaza.
              </div>
            )}
          </div>

          {/* Section for Combined Intake List */}
          {(totalIntakeStartDate && totalIntakeEndDate) && (
            <div className="mt-8">
              <AllIntakesList
                startDate={totalIntakeStartDate}
                endDate={totalIntakeEndDate}
                title="Lista Svih Prijema Goriva u Fiksne Rezervoare (za odabrani period)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
