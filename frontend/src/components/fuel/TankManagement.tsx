import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowUpCircleIcon, PencilIcon, TrashIcon, EyeIcon, ExclamationCircleIcon, TruckIcon, BeakerIcon, MapPinIcon, PhotoIcon, ClockIcon, DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import TankRefillForm from './TankRefillForm';
import { fetchWithAuth, uploadTankImage, getTotalFuelSummary, getMobileTankCustomsBreakdown, CustomsBreakdownResponse, getCachedTanks, clearTanksCache, clearMobileTankCustomsCache } from '@/lib/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import TankFormWithImageUpload from './TankFormWithImageUpload';
import TankImageDisplay from './TankImageDisplay';
import ExcessFuelModal, { TankCustomsMap, CustomsBreakdownItem } from './ExcessFuelModal';
import { format } from 'date-fns';
import { FuelTank } from './types';

// Represents a single transaction in the history of a mobile tank (aircraft tanker)
interface MobileTankTransaction {
  id: number;
  transaction_datetime: string; // ISO date-time string
  type: 'supplier_refill' | 'fixed_tank_transfer' | 'aircraft_fueling' | 'adjustment' | string;
  quantity_liters: number;
  source_name?: string; // For fixed_tank_transfer: name of the fixed tank
  source_id?: number;   // For fixed_tank_transfer: ID of the fixed tank
  destination_name?: string; // For aircraft_fueling: aircraft registration or flight number
  tankName?: string;    // Name of the tank this transaction belongs to
  tankIdentifier?: string; // Identifier of the tank this transaction belongs to
  destination_id?: number;   // For aircraft_fueling: operation ID
  supplier_name?: string;    // For supplier_refill: name of the supplier
  invoice_number?: string;   // For supplier_refill: invoice number
  price_per_liter?: number;  // For supplier_refill: price per liter
  notes?: string;
  user?: string;             // User who performed the transaction
  mrnBreakdown?: string;     // JSON string containing MRN breakdown data for fixed_tank_transfer
}

// Komponenta za prikaz MRN podataka s pie chartom
const MRNBreakdownChart: React.FC<{
  customsData: any[];
  isLoading: boolean;
}> = ({ customsData, isLoading }) => {
  // Ako nema podataka ili je učitavanje u tijeku, prikaži odgovarajuću poruku
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F08080]"></div>
      </div>
    );
  }

  if (!customsData || customsData.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-xs text-gray-400">Nema MRN podataka</div>
      </div>
    );
  }

  // Sigurnosna provjera da su svi elementi niza objekti s potrebnim svojstvima
  const validCustomsData = customsData.filter(item => 
    item && 
    typeof item === 'object' && (item.remaining_quantity_liters || item.remaining_quantity_kg)
  );
  
  if (validCustomsData.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-xs text-gray-400">Nema validnih MRN podataka</div>
      </div>
    );
  }

  // Pripremi podatke za pie chart
  const chartData = validCustomsData.map(item => {
    // Sigurnosna provjera za item.customs_declaration_number
    const mrn = item.customs_declaration_number || 'Nepoznato';
    // Skrati MRN broj za prikaz u grafu
    const shortMrn = mrn.length > 10 
      ? `${mrn.substring(0, 6)}...${mrn.substring(mrn.length - 4)}` 
      : mrn;
    
    return {
      name: shortMrn,
      fullMrn: mrn, // Čuvamo puni MRN za tooltip
      value: item.remaining_quantity_liters || 0, // KORISTIMO REMAINING umjesto quantity
      kg: item.remaining_quantity_kg || 0 // KORISTIMO REMAINING umjesto quantity_kg
    };
  });

  // Boje za pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Izračunaj ukupnu količinu u litrama i kilogramima
  const totalQuantity = validCustomsData.reduce((sum, item) => sum + (item.remaining_quantity_liters || 0), 0);
  const totalKg = validCustomsData.reduce((sum, item) => sum + (item.remaining_quantity_kg || 0), 0);

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-300 mb-1">MRN Raspodjela Goriva</div>
      <div className="flex flex-col items-center">
        <PieChart width={120} height={100}>
          <Pie
            data={chartData}
            cx={60}
            cy={50}
            innerRadius={20}
            outerRadius={40}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value: number, _name: string, entry: any) => {
              const kgValue = entry.payload.kg;
              return [
                `${value.toLocaleString()} L${kgValue ? ` / ${kgValue.toLocaleString()} kg` : ''}`, 
                `MRN: ${entry.payload.fullMrn || entry.payload.name}`
              ];
            }}
            position={{ x: 0, y: 0 }}
            cursor={{ fill: 'transparent' }}
            wrapperStyle={{ 
              zIndex: 1000, 
              position: 'fixed', 
              backgroundColor: 'rgba(35, 35, 35, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none'
            }}
          />
        </PieChart>
        <div className="text-xs text-gray-300 mt-1">
          Ukupno: <span className="font-medium text-white">{totalQuantity.toLocaleString()} L</span>
          {totalKg > 0 && (
            <span className="font-medium text-yellow-300 ml-2">{totalKg.toLocaleString()} kg</span>
          )}
        </div>
        {validCustomsData.length > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            {validCustomsData.length} MRN {validCustomsData.length === 1 ? 'zapis' : 'zapisa'}
          </div>
        )}
      </div>
    </div>
  );
};

export default function TankManagement() {
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showExcessFuelModal, setShowExcessFuelModal] = useState(false);
  const [currentTank, setCurrentTank] = useState<FuelTank | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [totalFuel, setTotalFuel] = useState({ liters: 0, kg: 0 });
  const [transactions, setTransactions] = useState<MobileTankTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<MobileTankTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<MobileTankTransaction[]>([]);
  const [totalFuelSummary, setTotalFuelSummary] = useState<{ fixedTanksTotal: number; mobileTanksTotal: number; grandTotal: number } | null>(null);
  const [editingTank, setEditingTank] = useState<FuelTank | null>(null);
  const [refillTank, setRefillTank] = useState<FuelTank | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentTankForImage, setCurrentTankForImage] = useState<FuelTank | null>(null);
  const [loadingImages, setLoadingImages] = useState<{[key: number]: boolean}>({});
  const [showHistory, setShowHistory] = useState<{[key: number]: boolean}>({});
  const [tankHistory, setTankHistory] = useState<{[key: number]: any[]}>({});
  const [loadingHistory, setLoadingHistory] = useState<{[key: number]: boolean}>({});
  const [showCustoms, setShowCustoms] = useState<{[key: number]: boolean}>({});
  
  // State za MRN podatke
  const [tanksCustomsData, setTanksCustomsData] = useState<TankCustomsMap>({});
  const [loadingCustoms, setLoadingCustoms] = useState<{[tankId: number]: boolean}>({});
  
  // Adapter funkcija za konverziju između API formata i ExcessFuelModal formata
  const adaptCustomsDataFormat = (data: any): CustomsBreakdownItem[] => {
    // Ako je data null ili undefined vrati prazan niz
    if (!data) return [];
    
    // Ako je data niz, koristimo ga direktno
    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item.id || 0,
        customs_declaration_number: item.customs_declaration_number || item.mrn || '',
        quantity: item.quantity_liters || item.remaining_quantity_liters || item.quantity || 0,
        density_at_intake: item.density_at_intake || item.specific_gravity || undefined,
        source_tank: item.source_tank || undefined,
        create_date: item.date_added || item.date_received || undefined,
        // Dodatna polja koja možda trebaju biti kopirana
        ...item
      }));
    }
    
    // Ako objekt ima customs_breakdown svojstvo i to je niz, koristi njega
    if (data && typeof data === 'object' && 'customs_breakdown' in data && Array.isArray(data.customs_breakdown)) {
      return adaptCustomsDataFormat(data.customs_breakdown);
    }
    
    // U svim drugim slučajevima vrati prazan niz
    return [];
  };

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

  // Helper function to detect orphaned liters (MRNs with <= 0.1 KG but > 0.1 L)
  const getOrphanedLiters = (customsData: any[], tank?: FuelTank): number => {
    // Ako imamo MRN podatke, provjeri orphaned liters unutar MRN zapisa
    if (Array.isArray(customsData) && customsData.length > 0) {
      return customsData
        .filter(item => 
          item && 
          (item.remaining_quantity_kg || 0) <= 0.1 && 
          (item.remaining_quantity_liters || 0) > 0.1
        )
        .reduce((sum, item) => sum + (item.remaining_quantity_liters || 0), 0);
    }
    
    // Ako nemamo MRN podatke ali imamo tank s literima i bez kilograma
    // Ovo se događa kad tank ima gorivo ali nema MRN podataka
    if (tank && (!tank.current_quantity_kg || tank.current_quantity_kg <= 0.1) && 
        tank.current_liters && tank.current_liters > 0.1) {
      return tank.current_liters;
    }
    
    return 0;
  };

  // Helper function to open excess fuel modal with detected orphaned liters
  const openExcessFuelModalWithOrphaned = (tank: FuelTank) => {
    const customsDataForTank = adaptCustomsDataFormat(tanksCustomsData[tank.id] || []);
    const orphanedLiters = getOrphanedLiters(customsDataForTank, tank);
    
    setCurrentTank(tank);
    setShowExcessFuelModal(true);
    // ExcessFuelModal will detect the orphaned liters automatically
  };

  // Use month-year for the month picker input
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM'));
  // Add specific date range filters for more precise filtering
  const [startDateFilter, setStartDateFilter] = useState<string>(getFirstDayOfMonth());
  const [endDateFilter, setEndDateFilter] = useState<string>(getLastDayOfMonth());
  const [tankFilter, setTankFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Fuel summary state
  const [fuelSummary, setFuelSummary] = useState<{
    fixedTanksTotal: number;
    mobileTanksTotal: number;
    grandTotal: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    identifier: '',
    name: '',
    location: '',
    capacity_liters: '',
    current_liters: '',
    fuel_type: 'Jet A-1'
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchTanks();
    fetchFuelSummary();
    
    // Jednostavan poller koji provjerava localStorage za promjene
    const checkForUpdates = () => {
      const lastOperation = localStorage.getItem('fuelingOperationCompleted');
      const lastCheck = localStorage.getItem('lastTankManagementCheck');
      
      if (lastOperation && lastOperation !== lastCheck) {
        console.log('Detected fueling operation completion, refreshing data...');
        
        // Osvježi osnovne podatke
        fetchTanks();
        fetchFuelSummary();
        
        // Osvježi MRN podatke za sve tankove - koristi trenutno stanje tanks array-a
        if (tanks && tanks.length > 0) {
          console.log(`Refreshing customs data for ${tanks.length} tanks...`);
          tanks.forEach(tank => {
            console.log(`Refreshing customs data for tank ${tank.id} (${tank.name})`);
            fetchTankCustomsData(tank.id);
          });
        } else {
          console.log('No tanks available for customs data refresh');
        }
        
        localStorage.setItem('lastTankManagementCheck', lastOperation);
        console.log('Data refresh completed');
      }
    };
    
    // Provjeri odmah i zatim svakih 2 sekunde
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [tanks]);
  
  // Fetch all transactions when tanks are loaded
  useEffect(() => {
    if (tanks.length > 0) {
      fetchAllTankTransactions();
    }
  }, [tanks]);
  
  // Apply filters whenever the filter values change
  useEffect(() => {
    applyFilters();
  }, [startDateFilter, endDateFilter, typeFilter, tankFilter]);

  const fetchTanks = async () => {
    try {
      setLoading(true);
      // Use cached function instead of direct API call
      const data = await getCachedTanks();
      
      if (Array.isArray(data)) {
        setTanks(data);
        
        // Dohvati MRN podatke za svaki tank
        data.forEach(async (tank: FuelTank) => {
          // Postavi stanje učitavanja za ovaj tank
          setLoadingCustoms(prev => ({ ...prev, [tank.id]: true }));
          
          try {
            // Dohvati MRN podatke za ovaj tank
            await fetchTankCustomsData(tank.id);
          } catch (error) {
            console.error(`Tank ${tank.id} nema MRN podataka - greška: ${error}`);
            // U slučaju greške, postavi prazni niz za ovaj tank
            setTanksCustomsData(prev => ({
              ...prev,
              [tank.id]: []
            }));
            setLoadingCustoms(prev => ({ ...prev, [tank.id]: false }));
          }
        });
      } else {
        console.error('Neočekivani format odgovora:', data);
        toast.error('Greška pri dohvaćanju podataka o cisternama');
      }
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error('Greška pri dohvaćanju podataka o cisternama');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch customs (MRN) data for a specific tank
  const fetchTankCustomsData = async (tankId: number) => {
    // Postavi stanje učitavanja za ovaj tank
    setLoadingCustoms(prev => ({ ...prev, [tankId]: true }));
    
    try {
      console.log(`Dohvaćanje MRN podataka za tank ID ${tankId}`);
      const response = await getMobileTankCustomsBreakdown(tankId, true); // FORSIRAJ SVJEŽE PODATKE (bez cache-a)
      console.log(`RAW Odgovor za MRN podatke tanka ${tankId}: ${JSON.stringify(response)}`);
      
      // Provjeri strukturu odgovora
      if (response && typeof response === 'object' && 'customs_breakdown' in response) {
        // Koristimo tip iz apiService
        const typedResponse = response as CustomsBreakdownResponse;
        
        if (typedResponse.customs_breakdown && Array.isArray(typedResponse.customs_breakdown) && typedResponse.customs_breakdown.length > 0) {
          console.log(`Tank ${tankId} ima ${typedResponse.customs_breakdown.length} MRN zapisa`);
          const adaptedData = adaptCustomsDataFormat(response.customs_breakdown);
          console.log(`Adapted data for tank ${tankId}: ${JSON.stringify(adaptedData)}`);
          
          // AUTOMATSKA DETEKCIJA PROBLEMA S MRN ZAPISIMA
          // Provjeri ima li MRN zapisa s 0 KG ali preostalom količinom litara
          const problematicMrnRecords = adaptedData.filter(item => {
            const remainingKg = item.remaining_quantity_kg || 0;
            const remainingLiters = item.remaining_quantity_liters || item.quantity || 0;
            return remainingKg === 0 && remainingLiters > 0;
          });
          
          if (problematicMrnRecords.length > 0) {
            console.warn(` Tank ${tankId} ima ${problematicMrnRecords.length} problematičnih MRN zapisa (0 KG, ali ${problematicMrnRecords.reduce((sum, item) => sum + (item.remaining_quantity_liters || item.quantity || 0), 0).toFixed(3)} L):`, problematicMrnRecords);
            
            // Automatski pokreni ExcessFuelModal za ovaj tank
            setCurrentTank(tanks.find(t => t.id === tankId) || null);
            setShowExcessFuelModal(true);
            
            // Prikaži toast upozorenje
            toast.error(`Tank ${tanks.find(t => t.id === tankId)?.name || tankId} ima MRN zapise s 0 KG ali preostalom količinom litara. Molimo riješite višak goriva.`, {
              duration: 8000,
              position: 'top-center'
            });
          }
          
          setTanksCustomsData(prev => {
            const newState = {
              ...prev,
              [tankId]: adaptedData
            };
            console.log(`Updated tanksCustomsData state for tank ${tankId}: ${JSON.stringify(newState[tankId])}`);
            return newState;
          });
        } else if (Array.isArray(response)) {
          console.log(`Tank ${tankId} ima ${response.length} MRN zapisa u formatu niza`);
          const adaptedData = adaptCustomsDataFormat(response);
          console.log(`Adapted array data for tank ${tankId}: ${JSON.stringify(adaptedData)}`);
          
          // AUTOMATSKA DETEKCIJA PROBLEMA S MRN ZAPISIMA (za niz format)
          const problematicMrnRecords = adaptedData.filter(item => {
            const remainingKg = item.remaining_quantity_kg || 0;
            const remainingLiters = item.remaining_quantity_liters || item.quantity || 0;
            return remainingKg === 0 && remainingLiters > 0;
          });
          
          if (problematicMrnRecords.length > 0) {
            console.warn(` Tank ${tankId} ima ${problematicMrnRecords.length} problematičnih MRN zapisa (0 KG, ali ${problematicMrnRecords.reduce((sum, item) => sum + (item.remaining_quantity_liters || item.quantity || 0), 0).toFixed(3)} L):`, problematicMrnRecords);
            
            // Automatski pokreni ExcessFuelModal za ovaj tank
            setCurrentTank(tanks.find(t => t.id === tankId) || null);
            setShowExcessFuelModal(true);
            
            // Prikaži toast upozorenje
            toast.error(`Tank ${tanks.find(t => t.id === tankId)?.name || tankId} ima MRN zapise s 0 KG ali preostalom količinom litara. Molimo riješite višak goriva.`, {
              duration: 8000,
              position: 'top-center'
            });
          }
          
          // Ako je response već niz, pretpostavi da je u očekivanom formatu
          setTanksCustomsData(prev => {
            const newState = {
              ...prev,
              [tankId]: adaptedData
            };
            console.log(`Updated tanksCustomsData state for tank ${tankId}: ${JSON.stringify(newState[tankId])}`);
            return newState;
          });
        } else {
          console.log(`Tank ${tankId} nema MRN podataka - prazan odgovor: ${JSON.stringify(response)}`);
          setTanksCustomsData(prev => ({
            ...prev,
            [tankId]: []
          }));
        }
      } else {
        console.log(`Tank ${tankId} nema MRN podataka - neočekivani format: ${JSON.stringify(response)}`);
        setTanksCustomsData(prev => ({
          ...prev,
          [tankId]: []
        }));
      }
    } catch (error) {
      console.error(`Tank ${tankId} nema MRN podataka - greška: ${error}`);
      // U slučaju greške, postavi prazni niz za ovaj tank
      setTanksCustomsData(prev => ({
        ...prev,
        [tankId]: []
      }));
      setLoadingCustoms(prev => ({ ...prev, [tankId]: false }));
    } finally {
      setLoadingCustoms(prev => ({ ...prev, [tankId]: false }));
    }
  };
  
  // Function to fetch fuel summary data
  const fetchFuelSummary = async () => {
    try {
      setSummaryLoading(true);
      const summaryData = await getTotalFuelSummary();
      setFuelSummary(summaryData);
    } catch (error) {
      console.error('Error fetching fuel summary:', error);
      toast.error('Greška pri učitavanju ukupnog stanja goriva');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleImageUploaded = async (imageUrl: string) => {
    setImagePreview(imageUrl);
    // Refresh the tanks data to get the updated image URL
    await fetchTanks();
  };
  
  const fetchAllTankTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const tanksData = await Promise.all(tanks.map(tank => 
        fetchWithAuth<MobileTankTransaction[]>(`/api/fuel/tanks/${tank.id}/transactions`)
          .then(data => data.map(transaction => ({
            ...transaction,
            tankName: tank.name,
            tankIdentifier: tank.identifier
          })))
          .catch(error => {
            console.error(`Error fetching transactions for tank ${tank.id}: ${error}`);
            return [];
          })
      ));
      
      const combinedTransactions = tanksData.flat();
      setAllTransactions(combinedTransactions);
      setTransactions(combinedTransactions);
      applyFilters();
    } catch (error) {
      console.error('Error fetching all tank transactions:', error);
      toast.error('Greška pri učitavanju historije transakcija');
      setAllTransactions([]);
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  const fetchTankTransactions = async (tankId: number) => {
    setLoadingTransactions(true);
    try {
      const data = await fetchWithAuth<MobileTankTransaction[]>(`/api/fuel/tanks/${tankId}/transactions`);
      setTransactions(data);
      applyFilters();
    } catch (error) {
      console.error('Error fetching tank transactions:', error);
      toast.error('Greška pri učitavanju historije transakcija');
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  const applyFilters = (data: MobileTankTransaction[] = transactions) => {
    let filtered = [...data];
    
    // Apply date range filter (YYYY-MM-DD to YYYY-MM-DD)
    if (startDateFilter && endDateFilter) {
      const startDate = new Date(startDateFilter);
      startDate.setHours(0, 0, 0, 0); // Start of day
      
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_datetime);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }
    
    // Apply transaction type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }
    
    // Apply tank filter
    if (tankFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.tankIdentifier === tankFilter);
    }
    
    setFilteredTransactions(filtered);
  };
  
  // Use the imported uploadTankImage function from apiService
  const handleTankImageUpload = async (tankId: number, file: File): Promise<string> => {
    try {
      const response = await uploadTankImage(tankId, file);
      return response.image_url;
    } catch (error) {
      console.error('Error uploading tank image:', error);
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      identifier: '',
      name: '',
      location: '',
      capacity_liters: '',
      current_liters: '',
      fuel_type: 'Jet A-1'
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleAddTank = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Pretvaranje string vrijednosti u brojeve za API poziv
      const dataToSubmit = {
        ...formData,
        capacity_liters: parseFloat(formData.capacity_liters) || 0,
        current_liters: parseFloat(formData.current_liters) || 0
      };
      
      const newTank = await fetchWithAuth<FuelTank>('/api/fuel/tanks', {
        method: 'POST',
        body: JSON.stringify(dataToSubmit),
      });
      
      // Image upload is handled by TankFormWithImageUpload component
      if (newTank.id) {
        try {
          // Image already uploaded by the TankFormWithImageUpload component
        } catch (imageError) {
          console.error('Error uploading tank image:', imageError);
          toast.error('Tank je dodan, ali slika nije uspješno uploadana');
        }
      }
      
      toast.success('Tanker uspješno dodan');
      // Poništi keš pre dohvata svežih podataka
      clearTanksCache();
      fetchTanks();
      fetchFuelSummary(); // Refresh fuel summary after adding a tank
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding tank:', error);
      toast.error('Greška pri dodavanju tankera');
    }
  };

  const handleEditTank = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTank) return;
    
    try {
      // Pretvaranje string vrijednosti u brojeve za API poziv
      const dataToSubmit = {
        ...formData,
        capacity_liters: parseFloat(formData.capacity_liters) || 0,
        current_liters: parseFloat(formData.current_liters) || 0
      };
      
      await fetchWithAuth<FuelTank>(`/api/fuel/tanks/${currentTank.id}`, {
        method: 'PUT',
        body: JSON.stringify(dataToSubmit),
      });
      
      // Image upload is handled by TankFormWithImageUpload component
      
      toast.success('Tanker uspješno ažuriran');
      // Poništi keš pre dohvata svežih podataka
      clearTanksCache();
      fetchTanks();
      fetchFuelSummary(); // Refresh fuel summary after updating a tank
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      console.error('Error updating tank:', error);
      toast.error('Greška pri ažuriranju tankera');
    }
  };

  const handleDeleteTank = async (id: number) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj tanker?')) return;
    
    try {
      await fetchWithAuth<{ message: string }>(`/api/fuel/tanks/${id}`, {
        method: 'DELETE',
      });
      
      toast.success('Tanker uspješno obrisan');
      // Poništi keš pre dohvata svežih podataka
      clearTanksCache();
      fetchTanks();
      fetchFuelSummary(); // Refresh fuel summary after deleting a tank
    } catch (error) {
      console.error('Error deleting tank:', error);
      toast.error('Greška pri brisanju tankera');
    }
  };

  const openEditModal = (tank: FuelTank) => {
    setCurrentTank(tank);
    setFormData({
      identifier: tank.identifier || '',
      name: tank.name || '',
      location: tank.location || '',
      capacity_liters: tank.capacity_liters?.toString() || '0',
      current_liters: (tank.current_quantity_liters !== undefined ? tank.current_quantity_liters : tank.current_liters || 0).toString(),
      fuel_type: tank.fuel_type || 'Jet A-1'
    });
    
    // Set image preview if tank has an image
    if (tank.image_url) {
      setImagePreview(tank.image_url);
    } else {
      setImagePreview(null);
    }
    
    setSelectedImage(null);
    setShowEditModal(true);
  };

  const openRefillModal = (tank: FuelTank) => {
    setCurrentTank(tank);
    setShowRefillModal(true);
  };
  
  // Calculate fill percentage
  const calculateFillPercentage = (current: number, capacity: number) => {
    return Math.min(Math.round((current / capacity) * 100), 100);
  };
  
  // Izračunaj kilogram vrijednosti na osnovu stvarne gustoće iz MRN zapisa, a ne fiksne 0.8
  const calculateKilogramsFromCustomsData = (liters: number, customsData: CustomsBreakdownItem[]) => {
    // Ako nema MRN podataka, vrati undefined
    if (!customsData?.length) return undefined;
    
    // Ako je data niz, koristimo ga direktno
    if (Array.isArray(customsData)) {
      return customsData.reduce((sum, item) => sum + (item.remaining_quantity_kg || 0), 0);
    }
    
    // U svim drugim slučajevima vrati undefined
    return undefined;
  };

  // Get status indicator based on fill percentage
  const getStatusIndicator = (percentage: number) => {
    if (percentage < 15) return { label: 'Nizak nivo', color: 'bg-red-500', textColor: 'text-red-800', bgColor: 'bg-red-50' };
    if (percentage < 30) return { label: 'Nizak nivo', color: 'bg-orange-500', textColor: 'text-orange-800', bgColor: 'bg-orange-50' };
    if (percentage < 50) return { label: 'Srednje', color: 'bg-yellow-500', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50' };
    if (percentage < 80) return { label: 'Dobro', color: 'bg-blue-500', textColor: 'text-blue-800', bgColor: 'bg-blue-50' };
    return { label: 'Puno', color: 'bg-green-500', textColor: 'text-green-800', bgColor: 'bg-green-50' };
  };

  // Filter tanks based on search term
  const filteredTanks = tanks.filter(tank => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tank.name.toLowerCase().includes(searchLower) ||
      tank.identifier.toLowerCase().includes(searchLower) ||
      tank.location.toLowerCase().includes(searchLower) ||
      tank.fuel_type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <div className="container mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <TruckIcon className="h-6 w-6 mr-2" />
              Upravljanje Tankerima
            </h1>
            <p className="text-gray-300 mt-1 ml-8">
              Upravljanje mobilnim cisternama za gorivo
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium py-2 px-4 rounded-xl flex items-center gap-2 text-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Dodaj Novi Tank</span>
          </button>
        </div>
      </div>
      
      {/* Fuel Summary Component */}
      <div className="bg-white shadow overflow-hidden rounded-xl mb-6 border border-gray-100">
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-br from-[#4d4c4c]/90 to-[#1a1a1a]/90 backdrop-blur-sm text-white">
          <h3 className="text-lg leading-6 font-medium flex items-center">
            <BeakerIcon className="h-5 w-5 mr-2 text-white" />
            Ukupno Stanje Goriva
            <button 
              onClick={fetchFuelSummary} 
              className="ml-2 backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-sm hover:bg-white/20 transition-all p-1 rounded-lg"
              disabled={summaryLoading}
              title="Osvježi podatke"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </h3>
        </div>
        <div className="border-t border-white/5 px-4 py-5 sm:p-6 bg-gradient-to-br from-[#1a1a1a]/80 to-[#333333]/80 backdrop-blur-sm">
          {summaryLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F08080]"></div>
            </div>
          ) : fuelSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="backdrop-blur-md bg-[#F08080]/10 border border-white/10 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:bg-[#F08080]/15 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 group-hover:opacity-10 transition-opacity"></div>
                <div className="text-sm font-medium text-gray-300">Fiksni Tankovi</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {fuelSummary.fixedTanksTotal != null ? fuelSummary.fixedTanksTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                </div>
              </div>
              <div className="backdrop-blur-md bg-[#F08080]/10 border border-white/10 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:bg-[#F08080]/15 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 group-hover:opacity-10 transition-opacity"></div>
                <div className="text-sm font-medium text-gray-300">Mobilni Tankovi</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {fuelSummary.mobileTanksTotal != null ? fuelSummary.mobileTanksTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                </div>
              </div>
              <div className="backdrop-blur-md bg-[#F08080]/20 border border-white/10 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:bg-[#F08080]/25 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080] rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4 group-hover:opacity-15 transition-opacity"></div>
                <div className="text-sm font-medium text-gray-300">Ukupno</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {fuelSummary.grandTotal != null ? fuelSummary.grandTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              Nije moguće učitati podatke o ukupnom stanju goriva.
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 p-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#B3001F] border-opacity-50 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-[#800014] rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-[#E60026] font-medium">Učitavanje podataka o cisternama...</p>
          </div>
        </div>
      ) : tanks.length === 0 ? (
        <div className="p-8 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto"
          >
            <div className="mx-auto w-20 h-20 bg-[#E60026] rounded-full flex items-center justify-center mb-5 shadow-inner">
              <ExclamationCircleIcon className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nema unesenih cisterni</h3>
            <p className="text-gray-500 mb-6">Trenutno nema dostupnih podataka o avio cisternama. Dodajte prvu cisternu da započnete.</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-[#E60026] to-[#800014] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E60026] transition-colors"
            >
              <PlusIcon className="-ml-0.5 mr-2 h-5 w-5" />
              Dodaj Prvu Cisternu
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTanks.map((tank, index) => {
              // Use current_quantity_liters if available (for compatibility), otherwise use current_liters
              const currentAmount = tank.current_quantity_liters !== undefined ? tank.current_quantity_liters : tank.current_liters;
              const fillPercentage = calculateFillPercentage(currentAmount, tank.capacity_liters);
              const status = getStatusIndicator(fillPercentage);
              const locationText = tank.location_description || tank.location;
              
              return (
                <motion.div
                  key={tank.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#333333]/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/5 hover:shadow-xl transition-all duration-300 relative group p-6"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1 relative overflow-hidden">
                      <div className="w-full h-48 mb-2">
                        {tank.image_url ? (
                          <TankImageDisplay 
                            imageUrl={tank.image_url} 
                            tankName={tank.name} 
                            height="h-48"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <TruckIcon className="h-20 w-20 text-white/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between mt-2">
                        <div className="flex justify-between">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-md bg-[#F08080]/20 border border-white/10 text-white">
                            {tank.name || 'Cisterna'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-md bg-white/10 border border-white/10 text-white">
                            ID: {tank.identifier}
                          </span>
                        </div>
                        <div className="text-right mt-2">
                          <span className="text-sm font-bold text-white">{fillPercentage}%</span>
                          <span className="text-xs text-gray-300 ml-1">popunjenost</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fuel gauge visualization */}
                    <div className="mt-4">
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${status.color}`}
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Tank details in a grid */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                       <div className="backdrop-blur-md bg-white/5 border border-white/10 p-3 rounded-xl">
                         <p className="text-xs text-gray-300 mb-0">Tip Goriva</p>
                         <div className="flex items-start pt-0">
                          {tank.fuel_type.toLowerCase() === 'jet a-1'.toLowerCase() ? (
                            <img 
                              src="/JET A-1.svg" 
                              alt="JET A-1" 
                              className="w-14 h-14 object-contain" 
                            />
                          ) : (
                            <>
                              <span className="w-3 h-3 rounded-full bg-[#E60026] mr-2"></span>
                              <p className="font-medium text-gray-900">{tank.fuel_type}</p>
                            </>
                          )}
                        </div>
                       </div>
                      
                      <div className="backdrop-blur-md bg-white/5 border border-white/10 p-3 rounded-xl">
                        <p className="text-xs text-gray-300 mb-1">Kapacitet</p>
                        <p className="font-medium text-white">{tank.capacity_liters.toLocaleString()} L</p>
                      </div>

                      
                      <div className="backdrop-blur-md bg-white/5 border border-white/10 p-3 rounded-xl col-span-2">
                        <p className="text-xs text-gray-300 mb-1">Trenutna Količina</p>
                        <p className="font-medium text-white text-lg">
                          {Number(currentAmount).toFixed(1)} L
                          <span className="text-xs text-gray-400 ml-2">od {Number(tank.capacity_liters).toFixed(1)} L</span>
                        </p>
                        {/* Prikaz kilograma - koristi samo backend podatke */}
                        {(() => {
                          console.log(` DEBUG Tank ${tank.id} backend polja: calculated_kg=${tank.calculated_kg}, current_kg=${tank.current_kg}, current_quantity_kg=${tank.current_quantity_kg}`);
                          
                          // Prvo provjeri backend polja
                          if (tank.calculated_kg !== undefined || tank.current_kg || tank.current_quantity_kg) {
                            const finalKg = tank.calculated_kg !== undefined ? 
                              tank.calculated_kg : 
                              (tank.current_kg || tank.current_quantity_kg || 0);
                            
                            console.log(` Tank ${tank.id} koristi backend kg: ${finalKg}`);
                            
                            return (
                              <p className="font-medium text-white text-md mt-1">
                                <span className="text-yellow-300">
                                  {Number(finalKg).toFixed(1)} kg
                                </span>
                                {tank.calculated_kg !== undefined && 
                                  <span className="text-xs text-gray-400 ml-2">(izračunato)</span>
                                }
                                {tank.current_kg && !tank.calculated_kg && 
                                  <span className="text-xs text-gray-400 ml-2">(backend kg)</span>
                                }
                              </p>
                            );
                          }
                          
                          // Ako backend ne šalje kg polja, koristi MRN podatke
                          const customsDataForTank = adaptCustomsDataFormat(tanksCustomsData[tank.id] || []);
                          console.log(` Tank ${tank.id} MRN podaci: ${JSON.stringify(customsDataForTank)}`);
                          
                          if (customsDataForTank.length > 0) {
                            const totalKg = customsDataForTank.reduce((sum, item) => sum + (item.remaining_quantity_kg || 0), 0);
                            console.log(` Tank ${tank.id} koristi MRN kg: ${totalKg}`);
                            
                            return (
                              <p className="font-medium text-white text-md mt-1">
                                <span className="text-yellow-300">
                                  {totalKg.toFixed(1)} kg
                                </span>
                                <span className="text-xs text-gray-400 ml-2">(iz MRN zapisa)</span>
                              </p>
                            );
                          }
                          
                          console.log(` Tank ${tank.id} nema kg podataka!`);
                          return null;
                        })()}
                        
                        {/* MRN Breakdown Tooltip */}
                        {(() => {
                          const customsDataForTank = adaptCustomsDataFormat(tanksCustomsData[tank.id] || []);
                          const isLoadingCustoms = loadingCustoms[tank.id] || false;
                          
                          return (
                            <MRNBreakdownChart 
                              customsData={customsDataForTank}
                              isLoading={isLoadingCustoms}
                            />
                          );
                        })()}

                        {/* Orphaned Liters Warning Alert */}
                        {(() => {
                          const customsDataForTank = adaptCustomsDataFormat(tanksCustomsData[tank.id] || []);
                          const orphanedLiters = getOrphanedLiters(customsDataForTank, tank);
                          
                          if (orphanedLiters > 0.1) {
                            return (
                              <div className="mt-2 p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                                <div className="flex items-center">
                                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 mr-2 flex-shrink-0" />
                                  <span className="text-xs text-amber-300">
                                    {Number(orphanedLiters).toFixed(1)}L bez MRN pokrića
                                  </span>
                                </div>
                                <div className="text-xs text-amber-400/80 mt-1">
                                  Potreban ručni transfer u holding tank
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="mt-6 flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openRefillModal(tank)}
                          className="flex-1 flex items-center justify-center px-3 py-2 backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl"
                        >
                          <ArrowUpCircleIcon className="mr-1.5 h-5 w-5" />
                          Dopuni
                        </button>
                        
                        <button
                          onClick={() => openEditModal(tank)}
                          className="flex items-center justify-center px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all rounded-xl"
                        >
                          <PencilIcon className="mr-1.5 h-4 w-4" />
                          Uredi
                        </button>
                        
                        <button
                          onClick={() => handleDeleteTank(tank.id)}
                          className="flex items-center justify-center px-3 py-2 backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg hover:bg-red-500/20 transition-all rounded-xl"
                        >
                          <TrashIcon className="mr-1.5 h-4 w-4" />
                          Obriši
                        </button>
                      </div>
                      
                      {/* Manual Excess Transfer Button - Only show when orphaned liters detected */}
                      {(() => {
                        const customsDataForTank = adaptCustomsDataFormat(tanksCustomsData[tank.id] || []);
                        const orphanedLiters = getOrphanedLiters(customsDataForTank, tank);
                        
                        if (orphanedLiters > 0.1) {
                          return (
                            <div className="flex mt-2">
                              <button
                                onClick={() => openExcessFuelModalWithOrphaned(tank)}
                                className="flex-1 flex items-center justify-center px-3 py-2 backdrop-blur-md bg-amber-500/30 border border-amber-400/20 text-amber-200 shadow-lg hover:bg-amber-500/40 transition-all font-medium rounded-xl"
                              >
                                <ExclamationTriangleIcon className="mr-1.5 h-5 w-5" />
                                Prebaci Višak ({Number(orphanedLiters).toFixed(1)}L)
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Tank Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Dodaj Novi Tank</h3>
                <TankFormWithImageUpload
                  formData={formData}
                  onSubmit={handleAddTank}
                  onCancel={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  handleInputChange={handleInputChange}
                  onImageUploaded={handleImageUploaded}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tank Modal */}
      {showEditModal && currentTank && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Uredi Tank</h3>
                <TankFormWithImageUpload
                  isEdit={true}
                  tankId={currentTank.id}
                  existingImageUrl={currentTank.image_url}
                  formData={formData}
                  onSubmit={handleEditTank}
                  onCancel={() => setShowEditModal(false)}
                  handleInputChange={handleInputChange}
                  onImageUploaded={handleImageUploaded}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refill Tank Modal */}
      {showRefillModal && currentTank && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <TankRefillForm 
                tankId={currentTank.id} 
                onSuccess={() => {
                  setShowRefillModal(false);
                  fetchTanks();
                  fetchFuelSummary(); // Refresh fuel summary after refill
                }}
                onCancel={() => setShowRefillModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction History Section */}
      <div className="mt-10 bg-white shadow-lg overflow-hidden rounded-xl border border-gray-100">
          <div className="relative overflow-hidden p-6 rounded-t-xl shadow-md">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-md border-b border-white/10 z-0"></div>
            {/* Subtle red shadows in corners */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
            
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center">
                <ClockIcon className="h-6 w-6 mr-2" />
                Historija Transakcija
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-300">
                Pregled historije dopuna i transfera za sve cisterne
              </p>
            </div>
          </div>
          
          <div className="p-6">
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">Od datuma</label>
              <input
                type="date"
                id="start-date-filter"
                className="shadow-sm focus:ring-[#F08080] focus:border-[#F08080] block w-full sm:text-sm border-gray-300 rounded-xl"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  applyFilters();
                }}
              />
            </div>
            
            <div>
              <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">Do datuma</label>
              <input
                type="date"
                id="end-date-filter"
                className="shadow-sm focus:ring-[#F08080] focus:border-[#F08080] block w-full sm:text-sm border-gray-300 rounded-xl"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  applyFilters();
                }}
              />
            </div>
            
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Tip transakcije</label>
              <select
                id="type-filter"
                className="shadow-sm focus:ring-[#F08080] focus:border-[#F08080] block w-full sm:text-sm border-gray-300 rounded-xl"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  applyFilters();
                }}
              >
                <option value="all">Sve transakcije</option>
                <option value="supplier_refill">Dopuna od dobavljača</option>
                <option value="fixed_tank_transfer">Transfer iz fiksnog tanka</option>
                <option value="aircraft_fueling">Točenje aviona</option>
                <option value="adjustment">Korekcija količine</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="tank-filter" className="block text-sm font-medium text-gray-700 mb-1">Aviocisterna</label>
              <select
                id="tank-filter"
                className="shadow-sm focus:ring-[#F08080] focus:border-[#F08080] block w-full sm:text-sm border-gray-300 rounded-xl"
                value={tankFilter}
                onChange={(e) => {
                  setTankFilter(e.target.value);
                  applyFilters();
                }}
              >
                <option value="all">Sve cisterne</option>
                {tanks.map(tank => (
                  <option key={tank.id} value={tank.identifier}>{tank.name} ({tank.identifier})</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end md:col-span-4">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl"
                onClick={() => {
                  setStartDateFilter(getFirstDayOfMonth());
                  setEndDateFilter(getLastDayOfMonth());
                  setTypeFilter('all');
                  setTankFilter('all');
                  applyFilters();
                }}
              >
                Resetuj filtere
              </button>
            </div>
          </div>
          {/* Ovdje je bila tablica transakcija - privremeno uklonjena zbog TypeScript grešaka. */}
          {/* Tablica transakcija će biti implementirana u budućoj verziji */}
          <div className="text-center py-8">
            <p className="text-gray-500">Pregled transakcija trenutno nije dostupan.</p>
          </div>
        </div>
      </div>
      
      {/* Excess Fuel Modal using external component */}
      {currentTank && (
        <ExcessFuelModal
          isOpen={showExcessFuelModal}
          onClose={() => setShowExcessFuelModal(false)}
          tank={currentTank}
          tanksCustomsData={tanksCustomsData}
          fetchTanks={fetchTanks}
          fetchTankCustomsData={fetchTankCustomsData}
        />
      )}
      </div>
    </>
  );
}