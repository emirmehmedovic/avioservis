import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { fetchWithAuth } from '@/lib/apiService';
import { 
  TruckIcon, 
  GaugeIcon, 
  MapPinIcon, 
  DropletIcon, 
  PercentIcon, 
  HistoryIcon, 
  CalendarIcon, 
  SearchIcon, 
  FilterIcon, 
  Loader2,
  FileText 
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';

const FONT_NAME = 'NotoSans';

interface TankerVehicle {
  id: number;
  identifier: string;
  name: string;
  location: string;
  capacity_liters: number;
  current_liters: number;
  fuel_type: string;
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
  delivery_note_number?: string;
  price_per_liter?: number;
  notes?: string;
  user?: string;
}

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

// Helper function to format date as dd.mm.yyyy HH:MM
const formatDateTimeForReport = (dateInput?: string | Date): string => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
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

const TankerVehiclesReport: React.FC = () => {
  const [tankers, setTankers] = useState<TankerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Transaction history state
  const [showTransactions, setShowTransactions] = useState(false);
  const [allTransactions, setAllTransactions] = useState<TankerTransaction[]>([]);
  const [transactions, setTransactions] = useState<TankerTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TankerTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState<string>(getFirstDayOfMonth());
  const [endDateFilter, setEndDateFilter] = useState<string>(getLastDayOfMonth());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tankFilter, setTankFilter] = useState('all');

  useEffect(() => {
    const fetchTankerData = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<TankerVehicle[]>('/api/fuel/tanks');
        setTankers(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching tanker vehicles report data:', err);
        setError('Greška pri učitavanju podataka o cisternama.');
        if (err instanceof Error) {
            toast.error(`Greška: ${err.message}`);
        } else {
            toast.error('Dogodila se nepoznata greška.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTankerData();
  }, []);
  

  
  // Fetch all tanker transactions
  const fetchAllTankerTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const tanksData = await Promise.all(tankers.map(tank => 
        fetchWithAuth<TankerTransaction[]>(`/api/fuel/tanks/${tank.id}/transactions`)
          .then(data => {
            // Add tank name and identifier to each transaction
            return data.map(transaction => ({
              ...transaction,
              tankName: tank.name,
              tankIdentifier: tank.identifier
            }));
          })
          .catch(error => {
            console.error(`Error fetching transactions for tank ${tank.id}:`, error);
            return [];
          })
      ));

      let combinedTransactions = tanksData.flat();
      
      // For aircraft_fueling transactions, fetch delivery note numbers from fueling operations
      const aircraftFuelingTransactions = combinedTransactions.filter(t => t.type === 'aircraft_fueling');
      
      if (aircraftFuelingTransactions.length > 0) {
        try {
          // Fetch all fueling operations
          const fuelingOperationsResponse = await fetchWithAuth<any>('/api/fuel/fueling-operations');
          let fuelingOperations: any[] = [];
          
          // Check if the response has operations property (FuelingOperationsApiResponse) or is an array
          if (fuelingOperationsResponse.operations) {
            fuelingOperations = fuelingOperationsResponse.operations;
          } else if (Array.isArray(fuelingOperationsResponse)) {
            fuelingOperations = fuelingOperationsResponse;
          }
          
          // Map delivery note numbers to aircraft fueling transactions based on matching criteria
          // (matching by date, destination, and quantity)
          combinedTransactions = combinedTransactions.map(transaction => {
            if (transaction.type === 'aircraft_fueling') {
              // Find matching fueling operation
              const matchingOperation = fuelingOperations.find((op: any) => {
                const transactionDate = new Date(transaction.transaction_datetime);
                const operationDate = new Date(op.dateTime);
                
                // Check if dates are within 1 minute of each other and quantities match
                const timeDiff = Math.abs(transactionDate.getTime() - operationDate.getTime());
                const isDateClose = timeDiff < 60000; // 60000 ms = 1 minute
                
                // Check if destination matches aircraft registration or destination_name
                const destinationMatches = 
                  (op.aircraft_registration && transaction.destination_name && 
                   transaction.destination_name.includes(op.aircraft_registration)) ||
                  (op.aircraft && transaction.destination_name && 
                   transaction.destination_name.includes(op.aircraft.registration));
                
                // Check if quantities are close enough (allowing for small rounding differences)
                const quantityDiff = Math.abs(transaction.quantity_liters - op.quantity_liters);
                const isQuantityClose = quantityDiff < 1; // Less than 1 liter difference
                
                return isDateClose && (destinationMatches || isQuantityClose);
              });
              
              if (matchingOperation) {
                return {
                  ...transaction,
                  delivery_note_number: matchingOperation.delivery_note_number || null
                };
              }
            }
            return transaction;
          });
        } catch (error) {
          console.error('Error fetching fueling operations:', error);
          // Continue with existing transactions if fueling operations fetch fails
        }
      }
      
      console.log('Combined transactions with delivery notes:', combinedTransactions);
      setAllTransactions(combinedTransactions);
      setTransactions(combinedTransactions);
      applyFilters(combinedTransactions);
    } catch (error) {
      console.error('Error fetching all tanker transactions:', error);
      toast.error('Greška pri učitavanju historije transakcija');
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Apply filters to transactions
  const applyFilters = (data: TankerTransaction[] = allTransactions) => {
    console.log('Applying filters to data:', data);
    if (!data || data.length === 0) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = [...data];

    // Apply date range filter
    if (startDateFilter) {
      const startDate = new Date(startDateFilter);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.transaction_datetime) >= startDate);
    }
    if (endDateFilter) {
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.transaction_datetime) <= endDate);
    }

    // Apply transaction type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Apply tank filter
    if (tankFilter !== 'all') {
      filtered = filtered.filter(t => t.tankIdentifier === tankFilter);
    }

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        (t.tankName && t.tankName.toLowerCase().includes(term)) ||
        (t.tankIdentifier && t.tankIdentifier.toLowerCase().includes(term)) ||
        (t.source_name && t.source_name.toLowerCase().includes(term)) ||
        (t.destination_name && t.destination_name.toLowerCase().includes(term)) ||
        (t.supplier_name && t.supplier_name.toLowerCase().includes(term)) ||
        (t.invoice_number && t.invoice_number.toLowerCase().includes(term)) ||
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    }

    console.log('Filtered transactions:', filtered);
    setFilteredTransactions(filtered);
  };

  // Toggle transaction history view
  const toggleTransactionHistory = () => {
    const newShowTransactions = !showTransactions;
    setShowTransactions(newShowTransactions);
    
    if (newShowTransactions && allTransactions.length === 0) {
      fetchAllTankerTransactions();
    }
  };

  useEffect(() => {
    if (showTransactions) {
      applyFilters();
    }
  }, [startDateFilter, endDateFilter, searchTerm, typeFilter, tankFilter, showTransactions, allTransactions]);

  const getFillPercentage = (current: number, capacity: number) => {
    if (capacity === 0) return 0;
    return ((current / capacity) * 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 20) return 'bg-red-500 dark:bg-red-600';
    if (percentage < 50) return 'bg-amber-500 dark:bg-amber-600';
    return 'bg-emerald-500 dark:bg-emerald-600';
  };
  
  const getStatusColorClass = (percentage: number) => {
    if (percentage < 20) return 'text-red-600 dark:text-red-400';
    if (percentage < 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };
  
  // Get badge class for transaction type
  const getTransactionTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'supplier_refill':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'fixed_tank_transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'aircraft_fueling':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'adjustment':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  // Get display text for transaction type
  const getTransactionTypeDisplay = (type: string) => {
    switch (type) {
      case 'supplier_refill':
        return 'Punjenje od dobavljača';
      case 'fixed_tank_transfer':
        return 'Transfer iz fiksnog tanka';
      case 'aircraft_fueling':
        return 'Punjenje aviona';
      case 'adjustment':
        return 'Korekcija';
      default:
        return type;
    }
  };
  
  // Get source/destination display text
  const getSourceDestinationDisplay = (transaction: TankerTransaction): string => {
    if (transaction.type === 'supplier_refill' && transaction.supplier_name) {
      return `Dobavljač: ${transaction.supplier_name}`;
    } else if (transaction.type === 'fixed_tank_transfer' && transaction.source_name) {
      return `Iz tanka: ${transaction.source_name}`;
    } else if (transaction.type === 'aircraft_fueling' && transaction.destination_name) {
      return `Avion: ${transaction.destination_name}`;
    }
    return '-';
  };

  // Handle export of transactions to PDF
  const handleExportTransactionsToPdf = () => {
    if (filteredTransactions.length === 0) {
      toast.error('Nema podataka za izvoz u PDF.');
      return;
    }

    const doc = new jsPDF();
    registerFont(doc);

    // Set title and header
    doc.setFontSize(18);
    doc.setFont(FONT_NAME, 'bold');
    doc.text('Izvještaj Transakcija Avio Cisterni', 14, 22);
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(10);

    // Add date range
    const dateRangeText = startDateFilter && endDateFilter
      ? `Period: ${startDateFilter} do ${endDateFilter}`
      : 'Sve transakcije';
    doc.text(dateRangeText, 14, 30);
    
    // Add filter information
    let filterText = '';
    if (typeFilter !== 'all') {
      filterText += `Tip: ${getTransactionTypeDisplay(typeFilter)}, `;
    }
    if (tankFilter !== 'all') {
      const selectedTanker = tankers.find(t => t.identifier === tankFilter);
      if (selectedTanker) {
        filterText += `Cisterna: ${selectedTanker.name} (${selectedTanker.identifier}), `;
      }
    }
    if (searchTerm) {
      filterText += `Pretraga: "${searchTerm}", `;
    }
    
    if (filterText) {
      filterText = 'Filteri: ' + filterText.slice(0, -2); // Remove trailing comma and space
      doc.text(filterText, 14, 36);
    }

    // Prepare table data
    const tableData = filteredTransactions.map(transaction => [
      formatDateTimeForReport(transaction.transaction_datetime),
      `${transaction.tankName} (${transaction.tankIdentifier})`,
      getTransactionTypeDisplay(transaction.type),
      transaction.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 }) + ' L',
      getSourceDestinationDisplay(transaction),
      transaction.type === 'aircraft_fueling' ? (transaction.delivery_note_number || '-') : (transaction.invoice_number || '-'),
      transaction.notes || '-'
    ]);

    // Calculate total quantity
    const totalQuantity = filteredTransactions.reduce((sum, transaction) => sum + transaction.quantity_liters, 0);

    // Create a variable to store the last table end position
    let lastTableEndY = 0;
  
    // Generate table
    autoTable(doc, {
      startY: filterText ? 42 : 36,
      head: [['Datum/Vrijeme', 'Cisterna', 'Tip Transakcije', 'Količina', 'Izvor/Odredište', 'Broj Dostavnice', 'Napomena']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133], font: FONT_NAME, fontStyle: 'bold', fontSize: 10 },
      styles: { font: FONT_NAME, fontSize: 9 },
      didDrawPage: function(data) {
        // Add page number on all pages
        const footerY = doc.internal.pageSize.height - 20;
        doc.setFont(FONT_NAME, 'normal');
        doc.setFontSize(8);
        doc.text(`Stranica ${data.pageNumber}`, doc.internal.pageSize.width - 20, footerY);
      },
      didDrawCell: function(data) {
        // Track the last cell position to know where the table ends
        lastTableEndY = Math.max(lastTableEndY, data.cell.y + data.cell.height);
      }
    });
  
    // Add a new page for the summary if we're close to the bottom of the page
    if (lastTableEndY > doc.internal.pageSize.height - 40) {
      doc.addPage();
      lastTableEndY = 20; // Reset Y position on new page
    }
  
    // Add summary at the end of the document (after the table)
    // This ensures it only appears once at the end
    const summaryY = lastTableEndY + 10;
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(10);
    doc.text('Sumarni Podaci:', 14, summaryY);
    doc.text(`Ukupno Transakcija: ${filteredTransactions.length}`, 14, summaryY + 6);
    doc.text(`Ukupna Količina: ${totalQuantity.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L`, 14, summaryY + 12);

    // Save the PDF
    doc.save(`Izvjestaj_Transakcije_Cisterni_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF izvještaj uspješno generisan.');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-slate-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Učitavanje podataka...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-1">Greška pri učitavanju</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200 max-w-full">
      {/* Header - Clean, minimal design */}
      <div className="bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-[#e53e3e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Izvještaj o Stanju Avio Cisterni
            </h2>
            <p className="text-gray-400 mt-2">Pregled trenutnog stanja mobilnih cisterni za gorivo</p>
          </div>
        </div>
      </div>
      {tankers.length === 0 ? (
        <div className="p-12 text-center bg-white">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <TruckIcon className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nema podataka o cisternama</h3>
          <p className="text-gray-500 text-sm">Trenutno nema dostupnih podataka o avio cisternama.</p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Sažetak Stanja Cisterni</h3>
          </div>

          {/* Summary cards - Neutral style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <TruckIcon className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Ukupno cisterni</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{tankers.length}</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-stone-50 border border-stone-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-stone-100 rounded-lg">
                  <DropletIcon className="w-6 h-6 text-stone-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Ukupni kapacitet</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {tankers.reduce((sum, tanker) => sum + parseFloat(String(tanker.capacity_liters) || '0'), 0).toLocaleString('hr-HR', { maximumFractionDigits: 0 })} L
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-zinc-100 rounded-lg">
                  <GaugeIcon className="w-6 h-6 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Trenutno goriva</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {tankers.reduce((sum, tanker) => sum + parseFloat(String(tanker.current_liters) || '0'), 0).toLocaleString('hr-HR', { maximumFractionDigits: 0 })} L
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-neutral-100 rounded-lg">
                  <PercentIcon className="w-6 h-6 text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Prosječna popunjenost</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {tankers.length > 0 ?
                      (tankers.reduce((sum, tanker) => sum + getFillPercentage(tanker.current_liters, tanker.capacity_liters), 0) / tankers.length).toFixed(1) :
                      '0'}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Data table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Identifikator</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Naziv</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Lokacija</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Tip Goriva</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold text-right">Kapacitet (L)</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold text-right">Trenutno (L)</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold text-right">Popunjenost</TableHead>
                  <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tankers.map((tanker) => {
                  const fillPercentage = getFillPercentage(tanker.current_liters, tanker.capacity_liters);
                  return (
                    <TableRow key={tanker.id} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                      <TableCell className="font-medium text-gray-900">{tanker.identifier}</TableCell>
                      <TableCell className="text-gray-700">{tanker.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-gray-700">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span>{tanker.location || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-700">
                          {tanker.fuel_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{tanker.capacity_liters.toLocaleString()} L</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{parseFloat(tanker.current_liters.toString()).toFixed(1)} L</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium text-gray-900 min-w-[40px]">
                            {fillPercentage.toFixed(1)}%
                          </span>
                          <div className="w-16 h-2 bg-gray-300 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getStatusColor(fillPercentage)}`}
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${fillPercentage < 20 ? 'bg-red-100 text-red-700' : fillPercentage < 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {fillPercentage < 20 ? 'Nisko' : fillPercentage < 50 ? 'Srednje' : 'Dobro'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Toggle button for transaction history */}
          <div className="flex justify-center mt-8 mb-4">
            <button
              onClick={toggleTransactionHistory}
              className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-colors ${showTransactions ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-slate-600 hover:bg-slate-700 text-white'}`}
            >
              <HistoryIcon className="h-5 w-5 mr-2" />
              <span>
                {showTransactions ? 'Sakrij historiju transakcija' : 'Prikaži historiju transakcija'}
              </span>
            </button>
          </div>
          
          {/* Transaction History Section */}
          {showTransactions && (
            <div className="mt-8">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <HistoryIcon className="h-5 w-5 mr-2 text-slate-600" />
                    Historija transakcija cisterni
                  </h3>
                </div>

                {/* Filters */}
                <div className="p-6 bg-white border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tip transakcije</label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="all">Sve transakcije</option>
                        <option value="supplier_refill">Punjenje od dobavljača</option>
                        <option value="fixed_tank_transfer">Transfer iz fiksnog tanka</option>
                        <option value="aircraft_fueling">Punjenje aviona</option>
                        <option value="adjustment">Korekcija</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pretraga</label>
                      <input
                        type="text"
                        placeholder="Pretraži transakcije..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Transactions Table */}
                {loadingTransactions ? (
                  <div className="flex justify-center items-center h-64 bg-white">
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                      <span className="mt-4 text-gray-500">Učitavanje transakcija...</span>
                    </div>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex justify-center items-center h-64 bg-white">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                        <FilterIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900">Nema pronađenih transakcija</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Pokušajte promijeniti filtere ili odabrati drugi vremenski period.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportTransactionsToPdf}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Izvezi u PDF
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Datum/Vrijeme</TableHead>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Cisterna</TableHead>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Tip transakcije</TableHead>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold text-right">Količina (L)</TableHead>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Izvor/Odredište</TableHead>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Broj dostavnice</TableHead>
                            <TableHead className="bg-gray-50 text-gray-900 border-b border-gray-200 font-semibold">Napomena</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions.map((transaction, index) => (
                            <TableRow key={`${transaction.id}-${index}`} className="hover:bg-gray-50 border-b border-gray-200 transition-colors">
                              <TableCell className="whitespace-nowrap text-gray-900">
                                {format(new Date(transaction.transaction_datetime), 'dd.MM.yyyy HH:mm')}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {transaction.tankName} ({transaction.tankIdentifier})
                              </TableCell>
                              <TableCell>
                                <Badge className={getTransactionTypeBadgeClass(transaction.type)}>
                                  {getTransactionTypeDisplay(transaction.type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-900">
                                {transaction.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {getSourceDestinationDisplay(transaction)}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {transaction.type === 'aircraft_fueling' ? (transaction.delivery_note_number || '-') : (transaction.invoice_number || '-')}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {transaction.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TankerVehiclesReport;
