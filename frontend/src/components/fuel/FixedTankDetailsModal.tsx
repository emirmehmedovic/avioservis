"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { FixedStorageTank, TankTransaction, FixedTankStatus, FuelType } from '@/types/fuel';
import { getFixedTankHistory, getFixedTankCustomsBreakdown, updateFixedTank as apiUpdateFixedTank, getReserveFuelByTank } from '@/lib/apiService';
import { ReserveFuelItem, ReserveFuelResponse } from '@/types/reserveFuel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { BeakerIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

// Define interface for custom breakdown items
interface CustomsBreakdownItem {
  mrn: string;
  quantity: number;
  quantity_kg: number;
  date_received: string;
}

interface FixedTankDetailsModalProps {
  tank: FixedStorageTank | null;
  isOpen: boolean;
  onClose: () => void;
  onTankUpdated?: (updatedTank: FixedStorageTank) => void;
  documentUrl?: string | null;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    // Format as dd.mm.yyyy HH:MM
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (e) {
    return 'N/A';
  }
};

const getTransactionTypeBadgeClasses = (type: TankTransaction['type']): string => {
  switch (type) {
    case 'intake': return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'transfer_to_mobile': return 'bg-purple-500 text-white hover:bg-purple-600';
    case 'adjustment_plus': return 'bg-green-500 text-white hover:bg-green-600';
    case 'adjustment_minus': return 'bg-red-500 text-white hover:bg-red-600';
    case 'internal_transfer_in': return 'bg-sky-500 text-white hover:bg-sky-600';
    case 'internal_transfer_out': return 'bg-orange-500 text-white hover:bg-orange-600';
    case 'fuel_drain': return 'bg-red-700 text-white hover:bg-red-800';
    case 'fuel_return': return 'bg-green-700 text-white hover:bg-green-800';
    default: return 'bg-gray-500 text-white hover:bg-gray-600';
  }
};

const getTankStatusBadgeClasses = (status: FixedTankStatus): string => {
  switch (status) {
    case FixedTankStatus.ACTIVE:
      return 'bg-green-500 text-white hover:bg-green-600';
    case FixedTankStatus.INACTIVE:
      return 'bg-gray-500 text-white hover:bg-gray-600';
    case FixedTankStatus.MAINTENANCE:
      return 'bg-yellow-500 text-black hover:bg-yellow-600';
    case FixedTankStatus.OUT_OF_SERVICE:
      return 'bg-red-500 text-white hover:bg-red-600';
    default:
      return 'bg-gray-300 text-black hover:bg-gray-400';
  }
};

const getTransactionTypeTranslation = (type: TankTransaction['type']) => {
    switch (type) {
        case 'intake': return 'Ulaz goriva';
        case 'transfer_to_mobile': return 'Pretakanje (mobilna)';
        case 'adjustment_plus': return 'Korekcija (+)';
        case 'adjustment_minus': return 'Korekcija (-)';
        case 'internal_transfer_in': return 'Interni Ulaz';
        case 'internal_transfer_out': return 'Interni Izlaz';
        case 'fuel_drain': return 'Dreniranje';
        case 'fuel_return': return 'Povrat filtriranog goriva';
        default: return type;
    }
};

export default function FixedTankDetailsModal({ tank, isOpen, onClose, onTankUpdated, documentUrl }: FixedTankDetailsModalProps) {
  const [history, setHistory] = useState<TankTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  // Stanje za MRN podatke
  const [customsBreakdown, setCustomsBreakdown] = useState<CustomsBreakdownItem[]>([]);
  const [loadingCustoms, setLoadingCustoms] = useState(false);
  const [customsError, setCustomsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'customs' | 'reserve'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editableTankData, setEditableTankData] = useState<Partial<FixedStorageTank>>({});
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [removeCurrentDocument, setRemoveCurrentDocument] = useState(false);
// Dodati ove linije nakon postojećih useState deklaracija
const [reserveFuel, setReserveFuel] = useState<ReserveFuelItem[]>([]);
const [reserveFuelSummary, setReserveFuelSummary] = useState<{
  totalAvailableLiters: number;
  recordCount: number;
  availableRecordCount: number;
}>({ totalAvailableLiters: 0, recordCount: 0, availableRecordCount: 0 });
const [loadingReserveFuel, setLoadingReserveFuel] = useState(false);
const [reserveFuelError, setReserveFuelError] = useState<string | null>(null);

  


  useEffect(() => {
    if (isOpen && tank) {
      setEditableTankData(tank);
      setSelectedDocument(null); // Reset selected document when modal opens/tank changes
      setRemoveCurrentDocument(false); // Reset document removal flag
      setIsEditing(false); 
      setUpdateError(null); 
      
      // Reset history state
      setHistory([]);
    }
  }, [isOpen, tank]);

  // Function to fetch tank history
  const fetchHistory = async () => {
    if (!tank) return;
    
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await getFixedTankHistory(tank.id);
      setHistory(data);
    } catch (err: any) {
      setHistoryError(err.message || 'Greška pri učitavanju istorije.');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Function to fetch customs breakdown (MRN stanje)
  const fetchCustomsBreakdown = async () => {
    if (!tank) return;
    
    setLoadingCustoms(true);
    setCustomsError(null);
    
    try {
      const response = await getFixedTankCustomsBreakdown(tank.id);
      
      // Provjeri strukturu odgovora
      console.log('Customs breakdown response:', response);
      
      // Definiraj tip za response
      interface CustomsBreakdownResponse {
        tank?: any;
        customs_breakdown?: Array<{
          id: number;
          customs_declaration_number: string;
          quantity_liters: number;
          remaining_quantity_liters: number;
          quantity_kg: number;
          remaining_quantity_kg: number;
          date_added: string;
          supplier_name: string | null;
          delivery_vehicle_plate: string | null;
          specific_gravity?: number | null;
        }>;
        total_customs_tracked_liters?: number;
        total_customs_tracked_kg?: number;
      }
      
      // Ako je response objekt s customs_breakdown poljem, koristi to
      if (response && typeof response === 'object' && 'customs_breakdown' in response) {
        const typedResponse = response as CustomsBreakdownResponse;
        if (typedResponse.customs_breakdown && Array.isArray(typedResponse.customs_breakdown)) {
          // Transformiraj podatke u očekivani format
          const transformedData: CustomsBreakdownItem[] = typedResponse.customs_breakdown.map((item) => ({
            mrn: item.customs_declaration_number,
            quantity: item.remaining_quantity_liters,
            quantity_kg: item.remaining_quantity_kg || 0,
            date_received: item.date_added
          }));
          setCustomsBreakdown(transformedData);
        } else {
          setCustomsBreakdown([] as CustomsBreakdownItem[]);
        }
      } else if (Array.isArray(response)) {
        // Ako je response već niz, osiguraj da ima quantity_kg polje
        const dataWithKg = response.map(item => {
          // Create a properly typed object meeting the CustomsBreakdownItem interface
          const typedItem: CustomsBreakdownItem = {
            mrn: item.mrn || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity as string) || 0,
            quantity_kg: item.quantity || 0,
            date_received: item.date_received || ''
          };
          return typedItem;
        });
        setCustomsBreakdown(dataWithKg);
      } else {
        // Ako je neočekivani format, postavi prazni niz
        console.error('Unexpected response format:', response);
        setCustomsBreakdown([] as CustomsBreakdownItem[]);
      }
    } catch (error) {
      console.error('Error fetching customs breakdown:', error);
      setCustomsError('Greška pri dohvaćanju stanja goriva po carinskim prijavama.');
    } finally {
      setLoadingCustoms(false);
    }
  };
  
  useEffect(() => {
    if (isOpen && tank && activeTab === 'history') {
      fetchHistory();
    }
  }, [isOpen, tank, activeTab]);
  
  // Dohvati MRN podatke kada je aktivan tab "customs"
  useEffect(() => {
    if (isOpen && tank && activeTab === 'customs') {
      fetchCustomsBreakdown();
    }
  }, [isOpen, tank, activeTab]);
  


  useEffect(() => {
    if (isOpen) {
      setActiveTab('info');
      if (tank) {
        setEditableTankData(tank);
      }
      setIsEditing(false); 
      setUpdateError(null);
      setSelectedDocument(null);
      setRemoveCurrentDocument(false); // Reset removal flag
    }
  }, [isOpen, tank]); 

  const handleEditToggle = () => {
    if (isEditing) {
      if (tank) setEditableTankData(tank);
      setUpdateError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableTankData(prev => ({
      ...prev,
      [name]: name === 'capacity_liters' ? parseFloat(value) : value,
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedDocument(event.target.files[0]);
      setRemoveCurrentDocument(false); // If a new file is selected, don't remove the (soon to be old) one explicitly by flag
    } else {
      setSelectedDocument(null);
    }
  };

  const handleRemoveDocumentToggle = () => {
    setRemoveCurrentDocument(!removeCurrentDocument);
    if (!removeCurrentDocument) { // If we are now setting it to true
        setSelectedDocument(null); // Clear any selected new file, as we are opting to remove
    }
  }

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!tank) return;
    setIsSaving(true);
    setUpdateError(null);

    const formData = new FormData();
// Dodati novu funkciju nakon fetchCustomsBreakdown
const fetchReserveFuel = async () => {
  if (!tank) return;
  
  setLoadingReserveFuel(true);
  setReserveFuelError(null);
  
  try {
    const response = await getReserveFuelByTank(tank.id, 'fixed');
    
    if (response.success && response.data && response.summary) {
      setReserveFuel(response.data);
      setReserveFuelSummary(response.summary);
    } else {
      console.error('Unexpected response format:', response);
      setReserveFuel([]);
      setReserveFuelSummary({ totalAvailableLiters: 0, recordCount: 0, availableRecordCount: 0 });
    }
  } catch (error) {
    console.error('Error fetching reserve fuel data:', error);
    setReserveFuelError('Greška pri dohvaćanju podataka o rezervnom gorivu.');
  } finally {
    setLoadingReserveFuel(false);
  }
};
// Dodati novi useEffect nakon postojećih useEffect blokova
useEffect(() => {
  if (isOpen && tank && activeTab === 'reserve') {
    fetchReserveFuel();
  }
}, [isOpen, tank, activeTab]);
    // Append all editableTankData fields to formData
    // Ensure correct types are passed, especially for numbers
    Object.entries(editableTankData).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'identificationDocumentUrl' || key === 'current_quantity_liters') {
        // Skip non-editable or specially handled fields
        return;
      }
      if (value !== null && value !== undefined) {
        formData.append(key, String(value)); // Convert all values to string for FormData
      }
    });
    
    // Handle capacity_liters specifically if it's in editableTankData
    if (editableTankData.capacity_liters !== undefined) {
        formData.set('capacity_liters', String(editableTankData.capacity_liters));
    }

    if (selectedDocument) {
      formData.append('identificationDocument', selectedDocument);
    } else if (removeCurrentDocument && tank.identificationDocumentUrl) {
      formData.append('remove_document', 'true');
    }

    try {
      // Type assertion for formData as Partial<FixedStorageTank> might be tricky with FormData.
      // The backend will handle parsing FormData fields.
      const updatedTank = await apiUpdateFixedTank(tank.id, formData as any); // Use 'as any' or create a specific type for FormData submission
      
      if (onTankUpdated) {
        onTankUpdated(updatedTank);
      }
      setIsEditing(false);
      // Update editableTankData with the response to reflect changes immediately if staying in edit mode or re-opening
      setEditableTankData(updatedTank);
      setSelectedDocument(null); // Clear selected file after successful upload
      setRemoveCurrentDocument(false); // Reset removal flag
      // onClose(); // Optionally close modal on successful save
    } catch (error: any) {
      console.error("Error saving tank details:", error);
      setUpdateError(error.message || 'Greška pri čuvanju podataka.');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to render the current document display and removal/upload options
  const renderDocumentSection = () => {
    const currentDocUrl = editableTankData.identificationDocumentUrl;
    return (
      <div className="mb-4 p-3 border rounded-md bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-1">Identifikacioni Dokument</label>
        {currentDocUrl && !selectedDocument && !removeCurrentDocument && (
          <div className="flex items-center justify-between p-2 border rounded-md bg-white">
            <a 
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${currentDocUrl}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-600 hover:text-indigo-800 underline truncate">
              {currentDocUrl.split('/').pop() || 'Pogledaj dokument'}
            </a>
            <Button onClick={handleRemoveDocumentToggle} variant="destructive" size="sm">Ukloni</Button>
          </div>
        )}

        {(removeCurrentDocument && currentDocUrl) && (
            <div className="p-2 border border-dashed border-red-400 rounded-md bg-red-50 text-red-700">
                Dokument će biti uklonjen pri čuvanju. 
                <Button onClick={handleRemoveDocumentToggle} variant="link" size="sm" className="ml-2 text-red-700 hover:text-red-900">Poništi uklanjanje</Button>
                <span className="mx-2">ili</span> 
                <label htmlFor="documentUploadNew" className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer">
                    dodaj novi dokument.
                </label>
            </div>
        )}

        {(!currentDocUrl || selectedDocument || (!removeCurrentDocument && !currentDocUrl) ) && !removeCurrentDocument && (
          <input 
            id="documentUploadNew"
            type="file" 
            onChange={handleFileChange} 
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            accept=".pdf,.jpg,.jpeg,.png"
          />
        )}
        {selectedDocument && (
          <div className="mt-2 text-sm text-gray-600 flex items-center justify-between p-2 border rounded-md bg-green-50">
            <span>Novi dokument: {selectedDocument.name}</span>
            <Button onClick={() => setSelectedDocument(null)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700">X</Button>
          </div>
        )}
        
      </div>
    );
  }

  // Helper function to render just the document link for read-only view
  const renderReadOnlyDocumentLink = () => {
    if (!editableTankData.identificationDocumentUrl) {
      return <p className="text-sm text-gray-500">Nema priloženog dokumenta.</p>;
    }
    return (
      <div className="mt-1">
        <a 
          href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${editableTankData.identificationDocumentUrl}`}
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-indigo-600 hover:text-indigo-800 underline truncate flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          {editableTankData.identificationDocumentUrl.split('/').pop() || 'Pogledaj dokument'}
        </a>
      </div>
    );
  };

  if (!isOpen || !tank) {
    return null;
  }

  const fillPercentage = tank.capacity_liters > 0 
    ? Math.min(100, (tank.current_quantity_liters / tank.capacity_liters) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Detalji fiksnog tanka {tank.tank_name}</DialogTitle>
        <div className="relative overflow-hidden p-6 text-white">
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-[#1a1a1a]/80 to-black/60 backdrop-blur-xl z-0"></div>
          
          {/* Subtle accent color gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#E60026]/5 to-[#4D000A]/10 z-0"></div>
          
          {/* Glass highlight effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <svg className="w-6 h-6 mr-2 text-[#E60026]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 10V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{tank.tank_name} ({tank.tank_identifier})</span>
              </h2>
              <div className="mt-1 flex items-center">
                <span className="px-2 py-1 bg-white/20 rounded text-sm mr-3">{tank.tank_identifier}</span>
                <Badge className={`${getTankStatusBadgeClasses(tank.status as FixedTankStatus)}`}>{tank.status}</Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0" 
              onClick={onClose}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="sr-only">Zatvori</span>
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'info' ? 'text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-500 hover:text-indigo-700'}`}
              onClick={() => setActiveTab('info')}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Osnovne Informacije
              </div>
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'history' ? 'text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-500 hover:text-indigo-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Istorija Transakcija
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  {history.length}
                </span>
              </div>
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'customs' ? 'text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-500 hover:text-indigo-700'}`}
              onClick={() => setActiveTab('customs')}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17H5C3.89543 17 3 16.1046 3 15V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V15C21 16.1046 20.1046 17 19 17H15M9 17L12 21M9 17L12 13M15 17L12 21M15 17L12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Stanje po MRN
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  {customsBreakdown.length}
                </span>
              </div>
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'reserve' ? 'text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-500 hover:text-indigo-700'}`}
              onClick={() => setActiveTab('reserve')}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 8H19M5 8C3.89543 8 3 7.10457 3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6C21 7.10457 20.1046 8 19 8M5 8L5 18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V8M12 12V16M12 12L9 14M12 12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Rezervno Gorivo
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  {reserveFuel.filter(item => !item.is_dispensed).length}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Render content based on active tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Tank Info Section */}
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Osnovne Informacije</h3>
              {updateError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                  <p className="font-bold">Greška</p>
                  <p>{updateError}</p>
                </div>
              )}
              {isEditing ? (
                <form onSubmit={handleSaveChanges} className="space-y-4">
                  <div>
                    <label htmlFor="tank_name" className="block text-sm font-medium text-gray-700">Naziv Tanka</label>
                    <input
                      type="text"
                      name="tank_name"
                      id="tank_name"
                      value={editableTankData.tank_name || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="tank_identifier" className="block text-sm font-medium text-gray-700">Identifikator Tanka</label>
                    <input
                      type="text"
                      name="tank_identifier"
                      id="tank_identifier"
                      value={editableTankData.tank_identifier || ''}
                      onChange={handleInputChange} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                      required
                      readOnly 
                    />
                     <p className="mt-1 text-xs text-gray-500">Identifikator tanka se ne može mijenjati nakon kreiranja.</p>
                  </div>
                  <div>
                    <label htmlFor="fuel_type" className="block text-sm font-medium text-gray-700">Tip Goriva</label>
                    <select
                      name="fuel_type"
                      id="fuel_type"
                      value={editableTankData.fuel_type || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      {Object.values(FuelType).map(ft => (
                        <option key={ft} value={ft}>{ft}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="capacity_liters" className="block text-sm font-medium text-gray-700">Kapacitet (L)</label>
                    <input
                      type="number"
                      name="capacity_liters"
                      id="capacity_liters"
                      value={editableTankData.capacity_liters || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label htmlFor="location_description" className="block text-sm font-medium text-gray-700">Opis Lokacije</label>
                    <textarea
                      id="location_description"
                      name="location_description"
                      value={editableTankData.location_description || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  {/* Document Upload/Management Section */}
                  {renderDocumentSection()}

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      name="status"
                      id="status"
                      value={editableTankData.status || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      {Object.values(FixedTankStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </form>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Naziv Tanka</dt>
                    <dd className="mt-1 text-md text-gray-900">{tank.tank_name}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Identifikator</dt>
                    <dd className="mt-1 text-md text-gray-900">{tank.tank_identifier}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Tip Goriva</dt>
                    <dd className="mt-1 text-md text-gray-900">{tank.fuel_type}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Kapacitet</dt>
                    <dd className="mt-1 text-md text-gray-900">{tank.capacity_liters.toLocaleString('bs-BA')} L</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Trenutna Količina</dt>
                    <dd className="mt-1 text-md text-gray-900">{tank.current_quantity_liters.toLocaleString('bs-BA')} L</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Popunjenost</dt>
                    <dd className="mt-1 text-md text-gray-900">
                      <div className="w-full bg-gray-200 rounded-full h-5">
                        <div 
                          className="bg-indigo-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
                          style={{ width: `${fillPercentage.toFixed(2)}%` }}
                        >
                          {fillPercentage.toFixed(2)}%
                        </div>
                      </div>
                    </dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-md">
                      <Badge className={`${getTankStatusBadgeClasses(tank.status as FixedTankStatus)}`}>
                        {tank.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Lokacija</dt>
                    <dd className="mt-1 text-md text-gray-900">{tank.location_description || 'N/A'}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Kreiran</dt>
                    <dd className="mt-1 text-md text-gray-900">{formatDate(tank.createdAt)}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Ažuriran</dt>
                    <dd className="mt-1 text-md text-gray-900">{formatDate(tank.updatedAt)}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Identifikacioni Dokument</dt>
                    <dd className="mt-1 text-md text-gray-900">
                      {renderReadOnlyDocumentLink()}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          )}

          {activeTab === 'customs' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Stanje Goriva po Carinskim Prijavama (MRN)</h3>
              
              {loadingCustoms && (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-3 text-gray-600">Učitavanje MRN podataka...</span>
                </div>
              )}
              
              {customsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Greška: {customsError}</span>
                  </div>
                </div>
              )}
              
              {!loadingCustoms && !customsError && customsBreakdown.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 17H5C3.89543 17 3 16.1046 3 15V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V15C21 16.1046 20.1046 17 19 17H15M9 17L12 21M9 17L12 13M15 17L12 21M15 17L12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-gray-500 text-lg">Nema podataka o carinskim prijavama za ovaj tank.</p>
                  <p className="text-gray-400 mt-2">Podaci će se pojaviti kada se izvrši prijem goriva sa MRN brojem.</p>
                </div>
              )}
              
              {!loadingCustoms && !customsError && customsBreakdown.length > 0 && (
                <>
                  {/* Vizualni prikaz MRN količina */}
                  <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="text-lg font-medium text-gray-700 mb-3">Vizualni prikaz količina po MRN</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={customsBreakdown.map((item, index) => ({
                              name: item.mrn || 'Nepoznat MRN',
                              displayName: `${Number(typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity as string) || 0).toLocaleString('bs-BA')} L`,
                              value: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity as string) || 0,
                              kg_value: item.quantity_kg || 0,
                              datum: item.date_received ? formatDate(item.date_received) : 'Nepoznat datum',
                              fill: `hsl(${(index * 30) % 360}, 70%, 50%)`
                            }))}
                            dataKey="value"
                            nameKey="displayName"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => entry.displayName}
                            labelLine={false}
                          >
                            {customsBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 30) % 360}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip 
                            wrapperStyle={{
                              zIndex: 1000,
                              backgroundColor: 'rgba(35, 35, 35, 0.95)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                              color: '#fff',
                              fontSize: '14px',
                              pointerEvents: 'none'
                            }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length > 0) {
                                return (
                                  <div className="custom-tooltip" style={{ backgroundColor: 'rgba(35, 35, 35, 0.95)', padding: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <p className="label" style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                                      MRN: {payload[0].payload.name}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 5px 0' }}>
                                      <p className="intro" style={{ margin: 0 }}>
                                        <span style={{ fontWeight: 'bold' }}>Litri:</span> {Number(payload[0].value).toLocaleString('bs-BA')} L
                                      </p>
                                      <p className="intro" style={{ margin: '0 0 0 15px' }}>
                                        <span style={{ fontWeight: 'bold' }}>KG:</span> {Number(parseFloat(payload[0].payload.kg_value).toFixed(3)).toLocaleString('bs-BA')} KG
                                      </p>
                                    </div>
                                    <p className="desc" style={{ margin: '0' }}>
                                      Datum prijema: {payload[0].payload.datum}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Tabela MRN podataka */}
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <div className="border border-gray-200 rounded-lg">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="font-semibold">MRN Broj</TableHead>
                              <TableHead className="text-right font-semibold">Količina (L)</TableHead>
                              <TableHead className="text-right font-semibold">Količina (KG)</TableHead>
                              <TableHead className="font-semibold">Datum Prijema</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customsBreakdown.map((item, index) => (
                              <TableRow key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                <TableCell className="font-medium">{item.mrn || 'Nepoznat MRN'}</TableCell>
                                <TableCell className="text-right">
                                  {typeof item.quantity === 'number' 
                                    ? Number(item.quantity).toLocaleString('bs-BA') 
                                    : Number(parseFloat(item.quantity as string) || 0).toLocaleString('bs-BA')} L
                                </TableCell>
                                <TableCell className="text-right">
                                  {Number(parseFloat(String(item.quantity_kg || 0)).toFixed(3)).toLocaleString('bs-BA')} KG
                                </TableCell>
                                <TableCell>
                                  {item.date_received ? formatDate(item.date_received) : 'Nepoznat datum'}
                                </TableCell>
                              </TableRow>
                            ))}
                            {customsBreakdown.length > 0 && (
                              <TableRow className="bg-gray-100 font-semibold">
                                <TableCell>UKUPNO</TableCell>
                                <TableCell className="text-right">
                                  {customsBreakdown
                                    .reduce((sum, item) => {
                                      const value = typeof item.quantity === 'number' 
                                        ? item.quantity 
                                        : parseFloat(item.quantity as string) || 0;
                                      return sum + value;
                                    }, 0)
                                    .toLocaleString('bs-BA')} L
                                </TableCell>
                                <TableCell className="text-right">
                                  {customsBreakdown
                                    .reduce((sum, item) => {
                                      return sum + Number(item.quantity_kg || 0);
                                    }, 0)
                                    .toLocaleString('bs-BA')} KG
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {activeTab === 'history' && (
            <div>
              {loadingHistory && (
                <div className="flex justify-center items-center py-12">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-3 text-gray-600">Učitavanje istorije...</span>
                </div>
              )}
              
              {historyError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Greška: {historyError}</span>
                  </div>
                </div>
              )}
              
              {!loadingHistory && !historyError && history.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-gray-500 text-lg">Nema zabilježenih transakcija za ovaj tank.</p>
                  <p className="text-gray-400 mt-2">Transakcije će se pojaviti kada se izvrše operacije sa tankom.</p>
                </div>
              )}
              
              {!loadingHistory && !historyError && history.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <div className="border border-gray-200 rounded-lg">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="font-semibold">Datum i Vrijeme</TableHead>
                            <TableHead className="font-semibold">Tip</TableHead>
                            <TableHead className="text-right font-semibold">Količina (L)</TableHead>
                            <TableHead className="font-semibold">Dokument/Referenca</TableHead>
                            <TableHead className="font-semibold">Izvor/Odredište</TableHead>
                            <TableHead className="font-semibold">Napomene</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((tx) => (
                            <TableRow key={tx.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="text-sm">{formatDate(tx.transaction_datetime)}</TableCell>
                              <TableCell>
                                <Badge className={`${getTransactionTypeBadgeClasses(tx.type)} px-2 py-1`}>
                                  {getTransactionTypeTranslation(tx.type)}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${tx.quantityLiters > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.quantityLiters > 0 ? '+' : ''}{tx.quantityLiters.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {tx.relatedDocument ? (
                                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{tx.relatedDocument}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{tx.sourceOrDestination || <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="text-sm">
                                {
                                  (tx.type === 'internal_transfer_in' && tx.notes === 'Internal transfer in')
                                    ? 'Interni prijem goriva'
                                    : (tx.type === 'internal_transfer_out' && tx.notes === 'Internal transfer out')
                                      ? 'Interni izdatak goriva'
                                      : tx.notes || <span className="text-gray-400">—</span>
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reserve' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">Rezervno Gorivo</h3>
                <Badge className="bg-blue-600 text-white">{reserveFuelSummary.totalAvailableLiters.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L dostupno</Badge>
              </div>
              
              {reserveFuelError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                  <p>{reserveFuelError}</p>
                </div>
              )}
              
              {loadingReserveFuel ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm text-gray-500">Ukupno dostupno</div>
                      <div className="text-2xl font-semibold text-indigo-700">{reserveFuelSummary.totalAvailableLiters.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm text-gray-500">Ukupni broj unosa</div>
                      <div className="text-2xl font-semibold text-gray-900">{reserveFuelSummary.recordCount}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm text-gray-500">Broj aktivnih unosa</div>
                      <div className="text-2xl font-semibold text-green-600">{reserveFuelSummary.availableRecordCount}</div>
                    </div>
                  </div>

                  {reserveFuel.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Količina (L)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Napomena</TableHead>
                          <TableHead>Izdavanje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reserveFuel.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(typeof item.created_at === 'string' ? item.created_at : item.created_at.toString())}</TableCell>
                            <TableCell>{Number(item.quantity_liters).toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              {item.is_dispensed ? (
                                <Badge variant="destructive">Iskorišteno</Badge>
                              ) : (
                                <Badge className="bg-green-600 text-white">Dostupno</Badge>
                              )}
                            </TableCell>
                            <TableCell>{item.notes || '-'}</TableCell>
                            <TableCell>
                              {item.is_dispensed ? (
                                <div className="text-sm">
                                  <div>{item.dispensed_at ? formatDate(typeof item.dispensed_at === 'string' ? item.dispensed_at : item.dispensed_at.toString()) : ''}</div>
                                  <div className="text-xs text-gray-500">{item.dispensed_notes || '-'}</div>
                                </div>
                              ) : (
                                <span className="text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Nema podataka o rezervnom gorivu za ovaj tank.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div> 
            {isEditing && updateError && (
                 <p className="text-sm text-red-600">Greška: {updateError}</p>
            )}
          </div>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleEditToggle} 
                  variant="outline"
                  disabled={isSaving}
                >
                  Odustani
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleSaveChanges} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? 'Čuvanje...' : 'Sačuvaj Promjene'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleEditToggle} 
                className="bg-gradient-to-r from-[#E60026] to-[#4D000A] hover:from-[#B3001F] hover:to-[#800014] text-white"
              >
                Uredi Tank
              </Button>
            )}
            <Button 
              onClick={() => { 
                if (isEditing) handleEditToggle(); 
                onClose(); 
              }}
              className="bg-black/80 hover:bg-black text-white"
              disabled={isSaving}
            >
              Zatvori
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}