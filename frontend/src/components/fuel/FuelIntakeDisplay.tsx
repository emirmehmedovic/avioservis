"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect as useEffectOriginal } from 'react';
import dayjs from 'dayjs';
import {
  FuelIntakeRecord,
  FuelIntakeFilters,
  FuelType,
  FuelCategory,
} from '@/types/fuel';
import { fetchWithAuth } from '@/lib/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from "@/components/ui/input";
import FuelIntakeRecordDetailsModal, { FuelIntakeRecordWithDetails } from './FuelIntakeRecordDetailsModal';

interface FuelDocument {
  id: number;
  document_name: string;
  mime_type: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return dayjs(dateString).format('DD.MM.YYYY');
};

export default function FuelIntakeDisplay() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [records, setRecords] = useState<FuelIntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFuelIntake, setTotalFuelIntake] = useState<number>(0);
  const [filters, setFilters] = useState<Partial<FuelIntakeFilters>>({
    fuel_type: 'all',
    fuel_category: 'all',
    refinery_name: '',
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<FuelIntakeRecordWithDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters: Record<string, string> = {};
      if (filters.fuel_type && filters.fuel_type !== 'all') {
        activeFilters.fuel_type = filters.fuel_type;
      }
      if (filters.fuel_category && filters.fuel_category !== 'all') {
        activeFilters.fuel_category = filters.fuel_category;
      }
      if (filters.refinery_name && filters.refinery_name.trim() !== '') {
        activeFilters.refinery_name = filters.refinery_name.trim();
      }
      if (filters.startDate) activeFilters.startDate = dayjs(filters.startDate).format('YYYY-MM-DD');
      if (filters.endDate) activeFilters.endDate = dayjs(filters.endDate).add(1, 'day').subtract(1, 'second').format('YYYY-MM-DD[T]HH:mm:ss');
      // Add other filters if they are implemented, e.g. supplier_name, delivery_vehicle_plate

      const queryParams = new URLSearchParams(activeFilters).toString();
      const url = queryParams ? `${API_URL}/api/fuel/intake-records?${queryParams}` : `${API_URL}/api/fuel/intake-records`;

      const data = await fetchWithAuth<FuelIntakeRecord[]>(
        url,
        { method: 'GET' }
      );
      console.log('Fetched records data:', data);
      // Log each record's full structure
      data.forEach(record => {
        console.log(`Record ID ${record.id} - Full record:`, JSON.stringify(record, null, 2));
      });
      setRecords(data);
      
      // Calculate total fuel intake
      const total = data.reduce((sum, record) => {
        return sum + (record.quantity_liters_received || 0);
      }, 0);
      setTotalFuelIntake(total);
    } catch (err: any) {
      setError(err.message || 'Greška pri učitavanju zapisa o prijemu goriva.');
      setRecords([]);
      setTotalFuelIntake(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleFilterChange = (filterName: keyof FuelIntakeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleOpenDetailsModal = async (recordId: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const detailedRecordData = await fetchWithAuth<FuelIntakeRecordWithDetails>(
        `${API_URL}/api/fuel/intake-records/${recordId}`,
        { method: 'GET' }
      );
      console.log('Detailed record data:', detailedRecordData);
      setSelectedRecordForDetails(detailedRecordData);
      setIsDetailsModalOpen(true);
    } catch (err: any) {
      console.error("Error fetching details with fetchWithAuth:", err);
      setError(err.message || 'Greška pri učitavanju detalja zapisa.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedRecordForDetails(null);
  };

  const handleDeleteClick = (recordId: number) => {
    setRecordToDelete(recordId);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setRecordToDelete(null);
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (recordToDelete === null) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      // First, get the record details to show in the success message
      const recordDetails = await fetchWithAuth<FuelIntakeRecordWithDetails>(
        `${API_URL}/api/fuel/intake-records/${recordToDelete}`,
        { method: 'GET' }
      );
      
      // Use the same endpoint but with DELETE method to delete the record
      // The backend will handle reversing the fuel quantities in tanks
      const response = await fetchWithAuth(
        `${API_URL}/api/fuel/intake-records/${recordToDelete}`,
        { method: 'DELETE' }
      );
      
      // Remove the deleted record from the state
      setRecords(prevRecords => prevRecords.filter(record => record.id !== recordToDelete));
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      
      // Show success message with details about reversed quantities
      const totalReversed = recordDetails.fixedTankTransfers?.reduce(
        (sum, transfer) => sum + parseFloat(String(transfer.quantity_liters_transferred)), 0
      ) || 0;
      
      // Optional: You could add a toast notification here to show success message
      console.log(`Uspješno obrisan zapis o prijemu goriva. Poništeno ${totalReversed.toFixed(2)} litara goriva iz tankova.`);
    } catch (err: any) {
      console.error('Error deleting fuel intake record:', err);
      setError(err.message || 'Greška pri brisanju zapisa o prijemu goriva.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadDocument = async (docToDownload: FuelDocument) => {
    if (!docToDownload || !docToDownload.id) {
      console.error('Document ID is missing, cannot download.');
      setError('Greška: ID dokumenta nedostaje.');
      return;
    }

    setLoadingDetails(true); 
    setError(null);

    try {
      const response: Response = await fetchWithAuth(
        `${API_URL}/api/fuel/documents/${docToDownload.id}/download`,
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
      const a = document.createElement('a');
      a.href = url;
      a.download = docToDownload.document_name || `document-${docToDownload.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("Error downloading document with fetchWithAuth:", err);
      setError(err.message || 'Greška pri preuzimanju dokumenta.');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (error) {
    return <p className="text-red-500 p-4">Greška: {error}</p>;
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
      {/* Header with title and action buttons */}
      <div className="p-6 rounded-xl text-white relative overflow-hidden">
        {/* Background gradient matching other components */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-md border border-white/10 z-0"></div>
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        {/* Glass highlight effect - matching tab header */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 10C20 10 18 14 12 14C6 14 4 10 4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Evidencija Ulaska Goriva
            </h2>
            <p className="text-sm opacity-80 mt-1">Pregled i upravljanje zapisima o ulazu goriva</p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard/fuel/intakes/new')} 
            className="mt-4 sm:mt-0 px-4 py-2 backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl flex items-center gap-2"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Novi Zapis o Ulazu
          </Button>
        </div>
        
        {/* Filter Section */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-white mb-1">Datum od:</label>
              <Input 
                type="date" 
                id="startDate"
                value={filters.startDate || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('startDate', e.target.value)}
                className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-white mb-1">Datum do:</label>
              <Input 
                type="date" 
                id="endDate"
                value={filters.endDate || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('endDate', e.target.value)}
                className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white"
              />
            </div>
            <div>
              <label htmlFor="fuelTypeFilter" className="block text-sm font-medium text-white mb-1">Tip Goriva:</label>
              <Select 
                value={filters.fuel_type || 'all'} 
                onValueChange={(value: string) => handleFilterChange('fuel_type', value)}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-white/20 border-white/30 text-white" id="fuelTypeFilter">
                  <SelectValue placeholder="Svi tipovi goriva" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi Tipovi Goriva</SelectItem>
                  {Object.values(FuelType).map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="categoryFilter" className="block text-sm font-medium text-white mb-1">Kategorija:</label>
              <Select 
                value={filters.fuel_category || 'all'} 
                onValueChange={(value: string) => handleFilterChange('fuel_category', value)}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-white/20 border-white/30 text-white" id="categoryFilter">
                  <SelectValue placeholder="Sve kategorije" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve Kategorije</SelectItem>
                  {Object.values(FuelCategory).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="refineryFilter" className="block text-sm font-medium text-white mb-1">Rafinerija:</label>
              <Input
                id="refineryFilter"
                value={filters.refinery_name || ''}
                onChange={(e) => handleFilterChange('refinery_name', e.target.value)}
                placeholder="Filtriraj po rafineriji"
                className="w-full sm:w-[200px] bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 border-opacity-50 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-indigo-700 font-medium">Učitavanje zapisa o ulazu goriva...</p>
            </div>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nema zapisa</h3>
            <p className="mt-1 text-sm text-gray-500">Nema zapisa koji odgovaraju zadatim filterima ili nema unesenih zapisa.</p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableCaption>Lista svih zapisa o ulazu goriva.</TableCaption>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Datum</TableHead>
                  <TableHead className="font-semibold">MRN</TableHead>
                  <TableHead className="font-semibold">Rafinerija</TableHead>
                  <TableHead className="text-right font-semibold">Količina (L)</TableHead>
                  <TableHead className="text-right font-semibold">Količina (KG)</TableHead>
                  <TableHead className="text-right font-semibold">Gustoća</TableHead>
                  <TableHead className="text-right font-semibold">Cijena/KG</TableHead>
                  <TableHead className="font-semibold">Valuta</TableHead>
                  <TableHead className="text-right font-semibold">Ukupna Cijena</TableHead>
                  <TableHead className="font-semibold">Tip Goriva</TableHead>
                  <TableHead className="font-semibold">Kategorija</TableHead>
                  <TableHead className="font-semibold">Dost. Cisterna</TableHead>
                  <TableHead className="text-center font-semibold">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow 
                    key={record.id} 
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <TableCell>{formatDate(record.intake_datetime)}</TableCell>
                    <TableCell>
                      {record.customs_declaration_number ? (
                        <span className="text-gray-900">{record.customs_declaration_number}</span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.refinery_name ? (
                        <span className="text-gray-900">{record.refinery_name}</span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{record.quantity_liters_received.toLocaleString()} L</TableCell>
                    <TableCell className="text-right">{record.quantity_kg_received.toLocaleString()} kg</TableCell>
                    <TableCell className="text-right">{record.specific_gravity.toFixed(4)}</TableCell>
                    <TableCell className="text-right">
                      {typeof record.price_per_kg === 'number' ? (
                        record.price_per_kg.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.currency ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {record.currency}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {typeof record.total_price === 'number' ? (
                        <span className="font-medium">
                          {record.total_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          {record.currency ? ` ${record.currency}` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.fuel_type?.toLowerCase() === 'jet a-1'.toLowerCase() ? (
                        <div className="flex items-center">
                          <img 
                            src="/JET A-1.svg" 
                            alt="JET A-1" 
                            className="w-10 h-10 object-contain" 
                          />
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {record.fuel_type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Display category from backend */}
                      {record.fuel_category === 'Izvoz' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Izvoz
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Domaće tržište
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 8H21L19 16H5L3 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="17" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {record.delivery_vehicle_plate}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleOpenDetailsModal(record.id)} 
                          className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors w-8 h-8 p-0"
                          disabled={loadingDetails}
                          title="Detalji"
                        >
                          {loadingDetails && selectedRecordForDetails?.id === record.id ? (
                            <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </Button>
                        {(authUser?.role === 'ADMIN' || authUser?.role === 'KONTROLA') && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleDeleteClick(record.id)} 
                            disabled={loadingDetails || isDeleting}
                            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition-colors w-8 h-8 p-0"
                            title="Obriši"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Card for Total Fuel Intake */}
        {!loading && !error && records.length > 0 && (
          <div className="mt-6 p-6 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg">
            <div className="flex flex-col space-y-2">
              <h3 className="text-lg font-semibold text-white">Ukupni Prijem Goriva za Filtrirani Period</h3>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                <div className="p-4 bg-[#F08080]/30 rounded-xl border border-[#F08080]/20 w-full md:w-auto">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-[#F08080]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V8C22 6.89543 21.1046 6 20 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <p className="text-sm text-white/70">Ukupna količina</p>
                      <p className="text-2xl font-bold text-white">{totalFuelIntake.toLocaleString('bs-BA')} L</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-[#4d4c4c]/50 rounded-xl border border-white/10 flex-1 w-full md:w-auto">
                  <div className="text-sm text-white/70">Period</div>
                  <div className="text-white font-medium">
                    {dayjs(filters.startDate).format('DD.MM.YYYY')} - {dayjs(filters.endDate).format('DD.MM.YYYY')}
                  </div>
                </div>
                
                {filters.fuel_type && filters.fuel_type !== 'all' && (
                  <div className="p-4 bg-[#4d4c4c]/50 rounded-xl border border-white/10 w-full md:w-auto">
                    <div className="text-sm text-white/70">Tip goriva</div>
                    <div className="text-white font-medium">{filters.fuel_type}</div>
                  </div>
                )}
                
                {filters.fuel_category && filters.fuel_category !== 'all' && (
                  <div className="p-4 bg-[#4d4c4c]/50 rounded-xl border border-white/10 w-full md:w-auto">
                    <div className="text-sm text-white/70">Kategorija</div>
                    <div className="text-white font-medium">{filters.fuel_category}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      
        <FuelIntakeRecordDetailsModal 
          isOpen={isDetailsModalOpen}
          record={selectedRecordForDetails}
          onClose={handleCloseDetailsModal}
          onDownloadDocument={handleDownloadDocument}
        />

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Potvrda brisanja</h3>
              <p className="text-gray-700 mb-6">
                Da li ste sigurni da želite obrisati ovaj zapis o prijemu goriva? 
                Ova akcija ne može biti poništena i svi povezani dokumenti će također biti obrisani.
              </p>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleCancelDelete} 
                  disabled={isDeleting}
                >
                  Odustani
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleConfirmDelete} 
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Brisanje...
                    </>
                  ) : 'Obriši'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 