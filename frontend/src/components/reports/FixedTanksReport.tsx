'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFixedTanks, getFixedTankHistory, getTotalFixedTankIntake, getAllFixedTankIntakesList, getTotalFuelSummary } from '@/lib/apiService';
import type { FixedStorageTank, TankTransaction } from '@/types/fuel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
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
    <div className="flex justify-center items-center h-64 bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] rounded-xl shadow-lg border border-white/5">
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#F08080]" />
        <span className="mt-4 text-white font-medium">Učitavanje izvještaja o fiksnim tankovima...</span>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500 rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
      <div className="flex items-center relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-white font-medium">Greška: {error}</span>
      </div>
    </div>
  );
  
  if (tanks.length === 0) return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
      <div className="flex items-center relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#4FC3C7] mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-white font-medium">Nema dostupnih fiksnih tankova.</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-w-full">
      {/* Header with glassmorphism effect */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-[#F08080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Izvještaj o Fiksnim Rezervoarima Goriva
            </h2>
            <p className="text-gray-300 mt-1 ml-10">Pregled stanja i historije transakcija fiksnih rezervoara</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 sm:p-4 md:p-6">
        {/* Summary Section */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Sažetak Stanja Goriva tipa JET A-1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <BeakerIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Ukupno Stanje Goriva
                <button 
                  onClick={fetchFuelSummary} 
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                  disabled={summaryLoading}
                  title="Osvježi podatke"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </h3>
              <div className="mt-4">
                {summaryLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                  </div>
                ) : summaryError ? (
                  <div className="text-red-600 dark:text-red-400 py-2">
                    {summaryError}
                  </div>
                ) : fuelSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg shadow-sm">
                      <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Fiksni Tankovi</div>
                      <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {fuelSummary?.fixedTanksTotal != null ? fuelSummary.fixedTanksTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg shadow-sm">
                      <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Mobilni Tankovi</div>
                      <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {fuelSummary?.mobileTanksTotal != null ? fuelSummary.mobileTanksTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 sm:p-4 rounded-lg shadow-sm">
                      <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Ukupno</div>
                      <div className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {fuelSummary?.grandTotal != null ? fuelSummary.grandTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 py-2">
                    Nema podataka o ukupnom stanju goriva.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
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
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
              >
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {tank.tank_name}
                      </h3>
                        <div className="mt-1 flex flex-wrap gap-1 sm:gap-2">
                        <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 text-xs sm:text-sm">
                          {tank.fuel_type}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 text-xs sm:text-sm">
                          Kap: {tank.capacity_liters.toLocaleString()} L
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Fill level indicator */}
                      {typeof tank.current_quantity_liters === 'number' && (
                        <div className="hidden sm:flex flex-col items-center">
                          <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${fillColorClass} rounded-full`} 
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                          <span className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                            {fillPercentage.toFixed(0)}% puno
                          </span>
                        </div>
                      )}
                      
                      <button
                        onClick={() => toggleHistory(tank.id)}
                        className="backdrop-blur-md bg-gray-700/70 border border-white/20 text-white shadow-lg hover:bg-gray-600/70 transition-all font-medium rounded-xl flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm"
                      >
                        {tank.showHistory 
                          ? <><ChevronUp className="h-4 w-4 mr-1" /></>
                          : <><ChevronDown className="h-4 w-4 mr-1" /></>
                        }
                        {tank.historyLoading 
                          ? 'Učitavanje...' 
                          : (tank.showHistory ? 'Sakrij Historiju' : 'Prikaži Historiju')
                        }
                      </button>
                    </div>
                  </div>
                  
                  {/* Current quantity display */}
                  {typeof tank.current_quantity_liters === 'number' && (
                    <div className="mt-4 flex items-center">
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {tank.current_quantity_liters.toLocaleString()}
                          </span>
                          <span className="ml-1 text-gray-600 dark:text-gray-400">L</span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-500">
                            trenutno stanje
                          </span>
                        </div>
                        
                        {/* Mobile-only progress bar */}
                        <div className="mt-2 sm:hidden w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${fillColorClass} rounded-full`} 
                            style={{ width: `${fillPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* History section */}
                {tank.showHistory && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {/* Loading state */}
                    {tank.historyLoading && (
                      <div className="p-8 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <span className="ml-3 text-gray-600 dark:text-gray-400">Učitavanje historije...</span>
                      </div>
                    )}
                    
                    {/* Error state */}
                    {tank.errorHistory && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                        <div className="flex items-center text-red-600 dark:text-red-400">
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
                        <CardContent>
                          {/* Filters Row */}
                          <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mb-4 items-start md:items-end">
                            {/* Start Date Filter */}
                            <div className="flex-1">
                              <label htmlFor={`start-date-${tank.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Početni datum:
                              </label>
                              <Input 
                                type="date" 
                                id={`start-date-${tank.id}`}
                                value={tank.filterStartDate || ''} 
                                onChange={(e) => handleFilterDateChange(tank.id, 'startDate', e.target.value)}
                                className="w-full"
                              />
                            </div>
                            {/* End Date Filter */}
                            <div className="flex-1">
                              <label htmlFor={`end-date-${tank.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Krajnji datum:
                              </label>
                              <Input 
                                type="date" 
                                id={`end-date-${tank.id}`}
                                value={tank.filterEndDate || ''} 
                                onChange={(e) => handleFilterDateChange(tank.id, 'endDate', e.target.value)}
                                className="w-full"
                              />
                            </div>
                            {/* Transaction Type Filter */}
                            <div className="flex-1 md:mt-0 mt-2">
                              <label htmlFor={`filter-type-${tank.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tip transakcije:
                              </label>
                              <Select
                                value={tank.filterTransactionType || 'all'}
                                onValueChange={(value) => handleFilterTransactionTypeChange(tank.id, value as TankTransaction['type'] | 'all')}
                              >
                                <SelectTrigger id={`filter-type-${tank.id}`} className="w-full">
                                  <SelectValue placeholder="Svi tipovi" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Svi tipovi</SelectItem>
                                  <SelectItem value="intake">Ulaz</SelectItem>
                                  <SelectItem value="transfer_to_mobile">Izlaz (Mob.)</SelectItem>
                                  <SelectItem value="fuel_drain">Drenirano</SelectItem>
                                  <SelectItem value="fuel_return">Povrat filtriranog goriva</SelectItem>
                                  <SelectItem value="internal_transfer_in">Interni Ulaz</SelectItem>
                                  <SelectItem value="internal_transfer_out">Interni Izlaz</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex items-end space-x-2 md:mt-0 mt-2">
                              <button onClick={() => toggleHistory(tank.id, true)} className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                                <Filter size={14} className="mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Primijeni Filtere i Osvježi</span>
                                <span className="inline sm:hidden">Osvježi</span>
                              </button>
                              {tank.history && tank.history.length > 0 && (
                                <button onClick={() => handleExportToPdf(tank)} className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm">
                                  <FileDown size={14} className="mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Izvezi u PDF</span>
                                  <span className="inline sm:hidden">PDF</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>

                        {/* No data message */}
                        {(!tank.history || tank.history.length === 0) ? (
                          <div className="p-8 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">Nema historije transakcija za odabrani period.</p>
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
      <div className="mt-12 pt-8 border-t">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Ukupan Ulaz Goriva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Ukupan ulaz goriva (po periodu):</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 items-end">
                <div>
                  <label htmlFor="totalIntakeStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Od datuma:</label>
                  <Input
                    type="date"
                    id="totalIntakeStartDate"
                    value={totalIntakeStartDate}
                    onChange={(e) => setTotalIntakeStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="totalIntakeEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Do datuma:</label>
                  <Input
                    type="date"
                    id="totalIntakeEndDate"
                    value={totalIntakeEndDate}
                    onChange={(e) => setTotalIntakeEndDate(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
              <button 
                onClick={fetchCombinedIntakeData} 
                disabled={totalIntakeLoading || !totalIntakeStartDate || !totalIntakeEndDate} 
                className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {totalIntakeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />} 
                <span className="hidden sm:inline">Osvježi Ukupan Ulaz</span>
                <span className="inline sm:hidden">Osvježi</span>
              </button>
              
              {totalIntakeLoading && (
                <div className="mt-4 flex items-center justify-center text-gray-500 dark:text-gray-400 py-3">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Dohvaćam ukupan ulaz...</span>
                </div>
              )}
              {totalIntakeError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400 rounded-md">
                  <p>Greška: {totalIntakeError}</p>
                </div>
              )}
              {!totalIntakeLoading && totalIntakeAmount !== null && !totalIntakeError && (
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 sm:mt-4">
                  {totalIntakeAmount ? parseFloat(String(totalIntakeAmount)).toFixed(2) : '0'} L
                </p>
              )}
              {!totalIntakeLoading && totalIntakeAmount === null && !totalIntakeError && totalIntakeStartDate && totalIntakeEndDate && (
                 <p className="mt-4 text-gray-500 dark:text-gray-400 py-3">Nema podataka o ulazu za odabrani period ili datumi nisu validni.</p>
              )}
               {!totalIntakeLoading && totalIntakeAmount === null && !totalIntakeError && (!totalIntakeStartDate || !totalIntakeEndDate) && (
                 <p className="mt-4 text-gray-500 dark:text-gray-400 py-3">Molimo odaberite period za prikaz ukupnog ulaza.</p>
              )}
            </div>

            {/* Section for Combined Intake List */}
            {(totalIntakeStartDate && totalIntakeEndDate) && (
              <AllIntakesList 
                startDate={totalIntakeStartDate} 
                endDate={totalIntakeEndDate} 
                title="Lista Svih Prijema Goriva u Fiksne Rezervoare (za odabrani period)"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
