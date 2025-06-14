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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e53e3e]" />
            <span className="mt-4 text-gray-500 dark:text-gray-400">Učitavanje podataka...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{error}</h3>
          <p className="text-gray-500 dark:text-gray-400">Molimo pokušajte ponovo kasnije.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header with glassmorphism effect */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full opacity-10 transform translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full opacity-10 transform -translate-x-16 translate-y-16"></div>
        <div className="relative z-10">
          <div className="flex items-center">
            <div className="bg-white/20 p-3 rounded-xl mr-4">
              <TruckIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              Izvještaj o Stanju Avio Cisterni
            </h2>
          </div>
          <p className="text-gray-300 mt-1 ml-11">Pregled trenutnog stanja mobilnih cisterni za gorivo</p>
        </div>
      </div>
      {tankers.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <TruckIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nema podataka o cisternama</h3>
          <p className="text-gray-500 dark:text-gray-400">Trenutno nema dostupnih podataka o avio cisternama.</p>
        </div>
      ) : (
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 text-[#e53e3e]" />
              Pregled cisterni
            </h3>
          </div>

          {/* Summary cards - Glassmorphism style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative backdrop-blur-md bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 border border-white/20 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4"></div>
              <div className="flex items-center relative z-10">
                <div className="bg-[#e53e3e]/20 p-3 rounded-xl mr-4 border border-white/10">
                  <TruckIcon className="h-5 w-5 text-[#e53e3e]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Ukupno cisterni</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{tankers.length}</p>
                </div>
              </div>
            </div>
            
            <div className="relative backdrop-blur-md bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 border border-white/20 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4"></div>
              <div className="flex items-center relative z-10">
                <div className="bg-[#4FC3C7]/20 p-3 rounded-xl mr-4 border border-white/10">
                  <DropletIcon className="h-5 w-5 text-[#4FC3C7]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Ukupni kapacitet</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {tankers.reduce((sum, tanker) => sum + parseFloat(String(tanker.capacity_liters) || '0'), 0).toLocaleString('hr-HR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative backdrop-blur-md bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 border border-white/20 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FBBF24] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4"></div>
              <div className="flex items-center relative z-10">
                <div className="bg-[#FBBF24]/20 p-3 rounded-xl mr-4 border border-white/10">
                  <GaugeIcon className="h-5 w-5 text-[#FBBF24]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Trenutno goriva</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {tankers.reduce((sum, tanker) => sum + parseFloat(String(tanker.current_liters) || '0'), 0).toLocaleString('hr-HR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                  </p>
                </div>
              </div>
            </div>

            <div className="relative backdrop-blur-md bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 border border-white/20 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5CF6] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4"></div>
              <div className="flex items-center relative z-10">
                <div className="bg-[#8B5CF6]/20 p-3 rounded-xl mr-4 border border-white/10">
                  <PercentIcon className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Prosječna popunjenost</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
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
          <div className="overflow-x-auto rounded-xl border border-white/20 backdrop-blur-md bg-white/5 dark:bg-gray-800/30 shadow-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10">Identifikator</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10">Naziv</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10">Lokacija</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10">Tip Goriva</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10 text-right">Kapacitet (L)</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10 text-right">Trenutno (L)</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10 text-right">Popunjenost</TableHead>
                  <TableHead className="bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] text-white border-b border-white/10 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tankers.map((tanker) => {
                  const fillPercentage = getFillPercentage(tanker.current_liters, tanker.capacity_liters);
                  return (
                    <TableRow key={tanker.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium">{tanker.identifier}</TableCell>
                      <TableCell>{tanker.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span>{tanker.location || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="backdrop-blur-md bg-[#3B82F6]/30 border border-white/20 text-white shadow-sm hover:bg-[#3B82F6]/40">
                          {tanker.fuel_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{tanker.capacity_liters.toLocaleString()} L</TableCell>
                      <TableCell className="text-right font-medium">{parseFloat(tanker.current_liters.toString()).toFixed(1)} L</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <span className={`mr-2 font-medium ${getStatusColorClass(fillPercentage)}`}>
                            {fillPercentage.toFixed(1)}%
                          </span>
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStatusColor(fillPercentage)}`} 
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`backdrop-blur-md border border-white/20 shadow-sm ${fillPercentage < 20 ? 'bg-[#e53e3e]/30 text-white' : fillPercentage < 50 ? 'bg-[#FBBF24]/30 text-white' : 'bg-[#4FC3C7]/30 text-white'}`}>
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
              className={`flex items-center ${showTransactions ? 'bg-[#e53e3e]' : 'bg-[#3B82F6]'} hover:bg-opacity-90 rounded-lg px-6 py-3 transition-colors shadow-lg border border-white/10`}
            >
              <HistoryIcon className="h-5 w-5 text-white mr-2" />
              <span className="text-white text-base font-medium">
                {showTransactions ? 'Sakrij historiju transakcija' : 'Prikaži historiju transakcija'}
              </span>
            </button>
          </div>
          
          {/* Transaction History Section */}
          {showTransactions && (
            <div className="mt-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <HistoryIcon className="h-5 w-5 mr-2 text-[#e53e3e]" />
                    Historija transakcija cisterni
                  </h3>
                </div>
                
                {/* Filters */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Od datuma</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          value={startDateFilter}
                          onChange={(e) => setStartDateFilter(e.target.value)}
                          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-[#e53e3e] focus:border-[#e53e3e] block w-full pl-10 p-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Do datuma</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          value={endDateFilter}
                          onChange={(e) => setEndDateFilter(e.target.value)}
                          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-[#e53e3e] focus:border-[#e53e3e] block w-full pl-10 p-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tip transakcije</label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-[#e53e3e] focus:border-[#e53e3e] block w-full p-2"
                      >
                        <option value="all">Sve transakcije</option>
                        <option value="supplier_refill">Punjenje od dobavljača</option>
                        <option value="fixed_tank_transfer">Transfer iz fiksnog tanka</option>
                        <option value="aircraft_fueling">Punjenje aviona</option>
                        <option value="adjustment">Korekcija</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pretraga</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <SearchIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Pretraži transakcije..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-[#e53e3e] focus:border-[#e53e3e] block w-full pl-10 p-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Transactions Table */}
                {loadingTransactions ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#e53e3e]" />
                      <span className="mt-4 text-gray-500 dark:text-gray-400">Učitavanje transakcija...</span>
                    </div>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 text-gray-400 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <FilterIcon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nema pronađenih transakcija</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Pokušajte promijeniti filtere ili odabrati drugi vremenski period.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportTransactionsToPdf}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Izvezi u PDF
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-gray-50 dark:bg-gray-800">Datum/Vrijeme</TableHead>
                          <TableHead className="bg-gray-50 dark:bg-gray-800">Cisterna</TableHead>
                          <TableHead className="bg-gray-50 dark:bg-gray-800">Tip transakcije</TableHead>
                          <TableHead className="bg-gray-50 dark:bg-gray-800 text-right">Količina (L)</TableHead>
                          <TableHead className="bg-gray-50 dark:bg-gray-800">Izvor/Odredište</TableHead>
                          <TableHead className="bg-gray-50 dark:bg-gray-800">Broj dostavnice</TableHead>
                          <TableHead className="bg-gray-50 dark:bg-gray-800">Napomena</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction, index) => (
                          <TableRow key={`${transaction.id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(transaction.transaction_datetime), 'dd.MM.yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {transaction.tankName} ({transaction.tankIdentifier})
                            </TableCell>
                            <TableCell>
                              <Badge className={getTransactionTypeBadgeClass(transaction.type)}>
                                {getTransactionTypeDisplay(transaction.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {transaction.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
                            </TableCell>
                            <TableCell>
                              {getSourceDestinationDisplay(transaction)}
                            </TableCell>
                            <TableCell>
                              {transaction.type === 'aircraft_fueling' ? (transaction.delivery_note_number || '-') : (transaction.invoice_number || '-')}
                            </TableCell>
                            <TableCell>
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
