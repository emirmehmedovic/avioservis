import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowUpCircleIcon, PencilIcon, TrashIcon, EyeIcon, ExclamationCircleIcon, TruckIcon, BeakerIcon, MapPinIcon, PhotoIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import TankRefillForm from './TankRefillForm';
import { fetchWithAuth, uploadTankImage, getTotalFuelSummary, getMobileTankCustomsBreakdown, CustomsBreakdownResponse, getCachedTanks, clearTanksCache, clearMobileTankCustomsCache } from '@/lib/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import TankFormWithImageUpload from './TankFormWithImageUpload';
import TankImageDisplay from './TankImageDisplay';
import { format } from 'date-fns';

interface FuelTank {
  id: number;
  identifier: string;
  name: string;
  location: string;
  location_description?: string;
  capacity_liters: number;
  current_liters: number;
  current_kg?: number; // Polje za količinu u kilogramima
  current_quantity_liters?: number; // Kompatibilnost
  current_quantity_kg?: number; // Kompatibilnost s fiksnim tankovima
  calculated_kg?: number; // Novo polje - točna vrijednost u kilogramima izračunata iz MRN zapisa
  total_remaining_liters_from_mrn?: number; // Ukupni preostali litri iz MRN zapisa
  fuel_type: string;
  last_refill_date?: string;
  last_maintenance_date?: string;
  image_url?: string; // URL to the tank image
}

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

// Definicija tipa za MRN podatke
interface CustomsBreakdownItem {
  mrn: string;
  quantity: number;       // količina u litrama
  quantity_kg?: number;  // količina u kilogramima
  density_at_intake?: number; // specifična gustoća goriva pri unosu
  date_received: string;
}

// Komponenta za prikaz MRN podataka s pie chartom
const MRNBreakdownChart: React.FC<{
  customsData: CustomsBreakdownItem[];
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
      <div className="text-gray-300 text-center py-2 text-xs">
        Nema MRN podataka za ovaj tank
      </div>
    );
  }

  // Pripremi podatke za pie chart - skrati MRN brojeve za bolji prikaz
  const chartData = customsData.map(item => {
    // Skrati MRN broj za prikaz u grafu
    const shortMrn = item.mrn.length > 10 
      ? `${item.mrn.substring(0, 6)}...${item.mrn.substring(item.mrn.length - 4)}` 
      : item.mrn;
    
    return {
      name: shortMrn,
      fullMrn: item.mrn, // Čuvamo puni MRN za tooltip
      value: item.quantity,
      kg: item.quantity_kg // Dodajemo količinu u kilogramima
    };
  });

  // Boje za pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Izračunaj ukupnu količinu u litrama i kilogramima
  const totalQuantity = customsData.reduce((sum, item) => sum + item.quantity, 0);
  const totalKg = customsData.reduce((sum, item) => sum + (item.quantity_kg || 0), 0);

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
        {customsData.length > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            {customsData.length} MRN {customsData.length === 1 ? 'zapis' : 'zapisa'}
          </div>
        )}
      </div>
    </div>
  );
};

// Definicija tipa za mapu MRN podataka po tanku
interface TankCustomsMap {
  [tankId: number]: CustomsBreakdownItem[];
}

export default function TankManagement() {
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentTank, setCurrentTank] = useState<FuelTank | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [totalFuel, setTotalFuel] = useState({ liters: 0, kg: 0 });
  const [transactions, setTransactions] = useState<MobileTankTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<MobileTankTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<MobileTankTransaction[]>([]);
  
  // State za MRN podatke
  const [tanksCustomsData, setTanksCustomsData] = useState<TankCustomsMap>({});
  const [loadingCustoms, setLoadingCustoms] = useState<{[tankId: number]: boolean}>({});
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
  }, []);
  
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
      
      console.log('Dohvaćeni podaci o cisternama:', data);
      
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
            console.error(`Greška pri dohvaćanju MRN podataka za tank ${tank.id}:`, error);
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
      const response = await getMobileTankCustomsBreakdown(tankId, false); // koristimo keširanu verziju
      console.log(`Odgovor za MRN podatke tanka ${tankId}:`, response);
      
      // Provjeri strukturu odgovora
      if (response && typeof response === 'object' && 'customs_breakdown' in response) {
        // Koristimo tip iz apiService
        const typedResponse = response as CustomsBreakdownResponse;
        
        if (typedResponse.customs_breakdown && Array.isArray(typedResponse.customs_breakdown) && typedResponse.customs_breakdown.length > 0) {
          console.log(`Tank ${tankId} ima ${typedResponse.customs_breakdown.length} MRN zapisa`);
          
          // Transformiraj podatke u očekivani format s uključenim kilogramima
          const transformedData = typedResponse.customs_breakdown.map((item) => ({
            mrn: item.customs_declaration_number,
            quantity: parseFloat(item.remaining_quantity_liters.toString()),
            quantity_kg: item.remaining_quantity_kg ? parseFloat(item.remaining_quantity_kg.toString()) : undefined,
            date_received: item.date_added
          }));
          
          console.log('Transformirani MRN podaci s kilogramima:', transformedData);
          
          // Spremi podatke u state
          setTanksCustomsData(prev => ({
            ...prev,
            [tankId]: transformedData
          }));
        } else {
          console.log(`Tank ${tankId} nema MRN zapisa ili su u nevažećem formatu`);
          setTanksCustomsData(prev => ({
            ...prev,
            [tankId]: []
          }));
        }
      } else if (Array.isArray(response)) {
        console.log(`Tank ${tankId} ima ${response.length} MRN zapisa u formatu niza`);
        // Ako je response već niz, pretpostavi da je u očekivanom formatu
        setTanksCustomsData(prev => ({
          ...prev,
          [tankId]: response
        }));
      } else {
        console.warn(`Tank ${tankId} ima neočekivani format MRN podataka:`, response);
        // Postavi prazni niz za ovaj tank ako je format neočekivan
        setTanksCustomsData(prev => ({
          ...prev,
          [tankId]: []
        }));
      }
    } catch (error) {
      console.error(`Greška pri dohvaćanju MRN podataka za tank ${tankId}:`, error);
      // U slučaju greške, postavi prazni niz za ovaj tank
      setTanksCustomsData(prev => ({
        ...prev,
        [tankId]: []
      }));
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
            console.error(`Error fetching transactions for tank ${tank.id}:`, error);
            return [];
          })
      ));
      
      const combinedTransactions = tanksData.flat();
      setAllTransactions(combinedTransactions);
      setTransactions(combinedTransactions);
      applyFilters(combinedTransactions);
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
      applyFilters(data);
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
      current_liters: (tank.current_liters || tank.current_quantity_liters || 0).toString(),
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
    // Ako nema MRN podataka ili nema litre, vrati undefined
    if (!customsData?.length || !liters) return undefined;
    
    // Provjeri imamo li density_at_intake vrijednosti u podacima
    const hasCustomDensities = customsData.some(item => item.density_at_intake !== undefined);
    
    if (hasCustomDensities) {
      // Ako imamo density_at_intake u MRN zapisima, koristimo te vrijednosti za izračun
      let remainingLiters = liters;
      let totalKg = 0;
      
      // Iteriraj kroz MRN zapise koristeći FIFO princip i njihove specifične gustoće
      for (const item of customsData) {
        const density = item.density_at_intake || 0.8; // Koristi specificnu gustocu ili default 0.8 kao fallback
        const litersFromThisItem = Math.min(remainingLiters, item.quantity);
        
        if (litersFromThisItem <= 0) break;
        
        // Dodaj kg za ovaj MRN koristeći njegovu specifičnu gustoću
        totalKg += litersFromThisItem * density;
        remainingLiters -= litersFromThisItem;
        
        if (remainingLiters <= 0) break;
      }
      
      return totalKg;
    } else {
      // Ako nemamo density_at_intake, koristi tradicionalnu metodu s prosječnom gustoćom
      const totalLiters = customsData.reduce((sum, item) => sum + item.quantity, 0);
      const totalKgFromMrn = customsData.reduce((sum, item) => sum + (item.quantity_kg || 0), 0);
      
      // Ako nema kilogram podataka u MRN zapisima, vrati undefined
      if (!totalKgFromMrn) return undefined;
      
      // Izračunaj prosječnu gustoću iz MRN zapisa (ne koristi fiksnu 0.8)
      const avgDensity = totalKgFromMrn / totalLiters;
      
      // Vrati kilogram vrijednost za zadane litre koristeći stvarnu prosječnu gustoću
      return liters * avgDensity;
    }
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
                        {/* Prikaz kilograma - prioritizira calculated_kg vrijednost iz backenda */}
                        {(tank.calculated_kg !== undefined || tank.current_kg || tank.current_quantity_kg || calculateKilogramsFromCustomsData(currentAmount, tanksCustomsData[tank.id] || [])) && (
                          <p className="font-medium text-white text-md mt-1">
                            <span className="text-yellow-300">
                              {Number(tank.calculated_kg !== undefined ? 
                                tank.calculated_kg : 
                                (tank.current_kg || 
                                tank.current_quantity_kg || 
                                calculateKilogramsFromCustomsData(currentAmount, tanksCustomsData[tank.id] || []) || 
                                0)).toFixed(1)} kg
                            </span>
                            {tank.calculated_kg !== undefined && 
                              <span className="text-xs text-gray-400 ml-2">(točno izračunato)</span>
                            }
                            {!tank.calculated_kg && calculateKilogramsFromCustomsData(currentAmount, tanksCustomsData[tank.id] || []) && 
                              tanksCustomsData[tank.id]?.length > 0 && 
                              !(tank.current_kg || tank.current_quantity_kg) && 
                              <span className="text-xs text-gray-400 ml-2">(približno izračunato)</span>
                            }
                          </p>
                        )}
                      </div>
                      
                      {/* MRN Breakdown Chart */}
                      <div className="backdrop-blur-md bg-white/5 border border-white/10 p-3 rounded-xl col-span-2">
                        <MRNBreakdownChart 
                          customsData={tanksCustomsData[tank.id] || []} 
                          isLoading={loadingCustoms[tank.id] || false} 
                        />
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
            
            {/* Transaction Table */}
            {loadingTransactions ? (
              <div className="flex justify-center py-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-red-200 border-opacity-50 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-red-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-4 text-red-700 font-medium">Učitavanje transakcija...</p>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Nema transakcija</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {transactions.length > 0 
                    ? 'Nema transakcija koje odgovaraju odabranim filterima.'
                    : 'Za ovu cisternu još uvijek nema zabilježenih transakcija.'}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Transakcije</h4>
                  <span className="text-sm text-gray-500">
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transakcija' : 'transakcija'}
                    {filteredTransactions.length !== allTransactions.length && ` (od ukupno ${allTransactions.length})`}
                  </span>
                </div>
                
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Datum i vrijeme</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Cisterna</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tip transakcije</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Količina (L)</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Izvor/Destinacija</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">MRN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredTransactions.map((transaction) => {
                        // Determine transaction type display and badge color
                        let typeDisplay = '';
                        let badgeColor = '';
                        let sourceDestDisplay = '';
                        
                        switch(transaction.type) {
                          case 'supplier_refill':
                            typeDisplay = 'Dopuna od dobavljača';
                            badgeColor = 'bg-green-100 text-green-800';
                            sourceDestDisplay = transaction.supplier_name || 'N/A';
                            break;
                          case 'fixed_tank_transfer':
                            typeDisplay = 'Transfer iz fiksnog tanka';
                            badgeColor = 'bg-blue-100 text-blue-800';
                            sourceDestDisplay = transaction.source_name || 'N/A';
                            break;
                          case 'aircraft_fueling':
                            typeDisplay = 'Točenje aviona';
                            badgeColor = 'bg-orange-100 text-orange-800';
                            sourceDestDisplay = transaction.destination_name || 'N/A';
                            break;
                          case 'adjustment':
                            typeDisplay = 'Korekcija količine';
                            badgeColor = 'bg-gray-100 text-gray-800';
                            sourceDestDisplay = 'Sistemska korekcija';
                            break;
                          default:
                            typeDisplay = transaction.type;
                            badgeColor = 'bg-gray-100 text-gray-800';
                            sourceDestDisplay = 'N/A';
                        }
                        
                        // Create a unique key by combining transaction ID with tank identifier
                        const uniqueKey = `${transaction.id}-${transaction.tankIdentifier || 'unknown'}-${transaction.transaction_datetime}`;
                        
                        return (
                          <tr key={uniqueKey}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {format(new Date(transaction.transaction_datetime), 'dd.MM.yyyy HH:mm')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {transaction.tankName} ({transaction.tankIdentifier})
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                {typeDisplay}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {transaction.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {sourceDestDisplay}
                              {transaction.invoice_number && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Faktura: {transaction.invoice_number}
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {transaction.type === 'fixed_tank_transfer' && transaction.mrnBreakdown ? 
                                (() => {
                                  try {
                                    const mrnData = JSON.parse(transaction.mrnBreakdown);
                                    if (mrnData && mrnData.length > 0) {
                                      return (
                                        <div className="flex flex-col space-y-1">
                                          {mrnData.map((item: any, index: number) => (
                                            <div key={index} className="text-xs">
                                              {item.mrn}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    } else {
                                      return '-';
                                    }
                                  } catch (e) {
                                    console.error('Greška pri parsiranju MRN podataka:', e);
                                    return '-';
                                  }
                                })() : 
                                '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
} 