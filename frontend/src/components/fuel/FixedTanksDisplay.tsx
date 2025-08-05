"use client";

import { useEffect, useState } from 'react';
import { FixedStorageTank, FixedTankStatus, FuelType } from '@/types/fuel';
import { useAuth } from '@/contexts/AuthContext';

// Definiranje interfacea za CustomsBreakdownItem unutar komponente
interface CustomsBreakdownItem {
  mrn: string;
  quantity: number;
  quantity_kg: number;
  date_received: string;
  specific_gravity?: number;
}

// Definiranje tipa za odgovor sa customs breakdown podacima
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import NewFixedTankForm from './NewFixedTankForm';
import { getFixedTanks, getFixedTankCustomsBreakdown, getTotalFuelSummary } from '@/lib/apiService';
import FixedTankDetailsModal from './FixedTankDetailsModal';
import FixedToFixedTransferModal from './FixedToFixedTransferModal';

interface FixedTanksDisplayProps {
  showAddTankButton?: boolean;
  showTransferButton?: boolean;
  showEditTankButton?: boolean;
  showDetailsButton?: boolean;
}

export default function FixedTanksDisplay({
  showAddTankButton = true,
  showTransferButton = true,
  showEditTankButton = true,
  showDetailsButton = true,
}: FixedTanksDisplayProps) {
  const [tanks, setTanks] = useState<FixedStorageTank[]>([]);
  const [tanksCustomsData, setTanksCustomsData] = useState<{ [tankId: string]: { avgDensity: number; totalKg: number } }>({});
  const [filteredTanks, setFilteredTanks] = useState<FixedStorageTank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFuel, setTotalFuel] = useState<number>(0);
  const [totalFuelKg, setTotalFuelKg] = useState<number>(0);
  
  // Total fuel summary state (fixed + mobile tanks)
  const [totalFuelSummary, setTotalFuelSummary] = useState<{
    fixedTanksTotal: number;
    mobileTanksTotal: number;
    grandTotal: number;
    fixedTanksTotalKg: number;
    mobileTanksTotalKg: number;
    grandTotalKg: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('ALL');
  const [isAddTankModalOpen, setIsAddTankModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTankForDetails, setSelectedTankForDetails] = useState<FixedStorageTank | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [hiddenTankIds, setHiddenTankIds] = useState<Set<number>>(() => {
    // Load hidden tank IDs from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenTankIds');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Set(parsed);
        } catch (error) {
          console.error('Error parsing hidden tank IDs from localStorage:', error);
        }
      }
    }
    return new Set();
  });
  const [tankToHide, setTankToHide] = useState<FixedStorageTank | null>(null);
  const [showHideConfirmation, setShowHideConfirmation] = useState(false);
  const [tankToDelete, setTankToDelete] = useState<FixedStorageTank | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { authToken, authUser } = useAuth();

  // Function to fetch total fuel summary (fixed + mobile tanks)
  const fetchTotalFuelSummary = async () => {
    try {
      setSummaryLoading(true);
      const summaryData = await getTotalFuelSummary();
      setTotalFuelSummary(summaryData);
    } catch (error) {
      console.error('Error fetching total fuel summary:', error);
      setTotalFuelSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadTanks = async () => {
    try {
      setLoading(true);
      const tanksData = await getFixedTanks();
      setTanks(tanksData);
      setFilteredTanks(tanksData); // Initialize filteredTanks early
      setError(null);

      // Fetch customs data sequentially and collect it
      const newTanksCustomsData: { [tankId: string]: { avgDensity: number; totalKg: number } } = {};
      for (const tank of tanksData) {
        try {
          // fetchTankCustomsData will now return data instead of setting state directly
          const customsData = await fetchTankCustomsData(tank.id);
          newTanksCustomsData[tank.id] = customsData;
        } catch (err) {
          console.error(`Failed to fetch customs data for tank ${tank.id}`, err);
          // Provide default/fallback data if a single tank's customs data fails
          newTanksCustomsData[tank.id] = { avgDensity: 0.8, totalKg: 0 };
        }
      }
      setTanksCustomsData(newTanksCustomsData); // Set state once with all collected data

    } catch (err: any) {
      setError(err.message || 'Došlo je do greške prilikom učitavanja podataka.');
      setTanks([]);
      setFilteredTanks([]);
      setTanksCustomsData({}); // Clear customs data on general error
    } finally {
      setLoading(false);
    }
  };

  // Modified fetchTankCustomsData to return data instead of setting state
  const fetchTankCustomsData = async (tankId: number): Promise<{ avgDensity: number; totalKg: number }> => {
    try {
      const response = await getFixedTankCustomsBreakdown(tankId);

      if (response && typeof response === 'object' && 'customs_breakdown' in response) {
        const customsBreakdown = response.customs_breakdown || [];

        if (Array.isArray(customsBreakdown) && customsBreakdown.length > 0) {
          let totalWeightedDensity = 0;
          let totalLiters = 0;
          let totalKgCalc = 0; // Renamed to avoid conflict with parameter name

          customsBreakdown.forEach(item => {
            const density = item.specific_gravity || 0.8;
            const liters = typeof item.remaining_quantity_liters === 'number' ?
              item.remaining_quantity_liters :
              parseFloat(String(item.remaining_quantity_liters || '0'));

            totalWeightedDensity += density * liters;
            totalLiters += liters;

            // Uvijek koristi remaining_quantity_kg iz API-ja kao autoritativni izvor
            const remainingKg = typeof item.remaining_quantity_kg === 'number' ?
              item.remaining_quantity_kg :
              parseFloat(String(item.remaining_quantity_kg || '0'));
            
            // Direktno dodajemo remaining_quantity_kg bez fallbacka na izračun liters * density
            totalKgCalc += remainingKg;
          });

          const avgDensity = totalLiters > 0 ? totalWeightedDensity / totalLiters : 0.8;
          return { avgDensity, totalKg: totalKgCalc };
        }
      }
      // If no MRN data or response is not as expected, return default
      return { avgDensity: 0.8, totalKg: 0 };
    } catch (error) {
      console.error(`Greška pri dohvaćanju customs podataka za tank ${tankId}:`, error);
      // U slučaju greške, vrati default vrijednosti
      throw error; // Re-throw error to be caught by loadTanks, or return default:
      // return { avgDensity: 0.8, totalKg: 0 }; 
    }
  };

  useEffect(() => {
    loadTanks();
    fetchTotalFuelSummary();
  }, []);

  useEffect(() => {
    // Calculate total fuel from real tanks (excluding EXCESS FUEL tank with ID 4 and hidden tanks)
    const realTanks = tanks.filter(tank => tank.id !== 4 && !hiddenTankIds.has(tank.id));
    const currentTotal = realTanks.reduce((sum, tank) => sum + tank.current_quantity_liters, 0);
    setTotalFuel(currentTotal);
    
    // Izračunaj ukupnu masu goriva u kilogramima iz tanksCustomsData
    if (realTanks.length > 0) {
      let totalKg = 0;
      realTanks.forEach(tank => {
        const customsData = tanksCustomsData[tank.id] || { totalKg: 0, avgDensity: 0.8 };
        // Ako imamo izračunate totalKg iz MRN podataka, koristi to, inače izračunaj iz litara i gustoće
        totalKg += customsData.totalKg > 0 ? 
          customsData.totalKg : 
          tank.current_quantity_liters * customsData.avgDensity;
      });
      setTotalFuelKg(totalKg);
    }
  }, [tanks, tanksCustomsData, hiddenTankIds]);

  useEffect(() => {
    let tempTanks = [...tanks];
    
    // Filter based on status
    if (statusFilter && statusFilter !== 'ALL') {
      tempTanks = tempTanks.filter(tank => tank.status === statusFilter);
    }
    
    // Filter based on fuel type
    if (fuelTypeFilter && fuelTypeFilter !== 'ALL') {
      tempTanks = tempTanks.filter(tank => tank.fuel_type === fuelTypeFilter);
    }
    
    // Filter out EXCESS_FUEL_HOLDING from main table
    tempTanks = tempTanks.filter(tank => tank.tank_name !== 'EXCESS_FUEL_HOLDING');
    
    // Filter out hidden tanks
    tempTanks = tempTanks.filter(tank => !hiddenTankIds.has(tank.id));
    
    setFilteredTanks(tempTanks);
  }, [tanks, statusFilter, fuelTypeFilter, hiddenTankIds]);

  // Separate holding tank for dedicated display
  const holdingTank = tanks.find(tank => tank.tank_name === 'EXCESS_FUEL_HOLDING');

  // Calculate total fuel from real tanks (excluding EXCESS FUEL tank with ID 4 and hidden tanks)
  const realTanks = tanks.filter(tank => tank.id !== 4 && !hiddenTankIds.has(tank.id));
  const totalRealTankFuel = realTanks.reduce((sum, tank) => sum + tank.current_quantity_liters, 0);
  const totalRealTankFuelKg = realTanks.reduce((sum, tank) => {
    const customsData = tanksCustomsData[tank.id] || { avgDensity: 0.8, totalKg: 0 };
    return sum + (customsData.totalKg > 0 ? customsData.totalKg : tank.current_quantity_liters * customsData.avgDensity);
  }, 0);

  // Create three tanks with equal distribution
  const fictitiousTanks = [
    {
      id: 'fictitious-1',
      tank_name: 'TANK 1',
      tank_identifier: 'D-8074',
      fuel_type: 'JET A-1',
      capacity_liters: 80000,
      current_quantity_liters: totalRealTankFuel / 3,
      status: 'ACTIVE' as FixedTankStatus,
      avgDensity: 0.8,
      currentKg: totalRealTankFuelKg / 3
    },
    {
      id: 'fictitious-2',
      tank_name: 'TANK 2',
      tank_identifier: '17/96-108',
      fuel_type: 'JET A-1',
      capacity_liters: 80000,
      current_quantity_liters: totalRealTankFuel / 3,
      status: 'ACTIVE' as FixedTankStatus,
      avgDensity: 0.8,
      currentKg: totalRealTankFuelKg / 3
    },
    {
      id: 'fictitious-3',
      tank_name: 'TANK 3',
      tank_identifier: '17/91-1767',
      fuel_type: 'JET A-1',
      capacity_liters: 80000,
      current_quantity_liters: totalRealTankFuel / 3,
      status: 'ACTIVE' as FixedTankStatus,
      avgDensity: 0.8,
      currentKg: totalRealTankFuelKg / 3
    }
  ];

  const getStatusBadgeClasses = (status: FixedTankStatus): string => {
    switch (status) {
      case FixedTankStatus.ACTIVE:
        return 'bg-gradient-to-r from-[#00B300] to-[#008000] text-white';
      case FixedTankStatus.INACTIVE:
        return 'bg-gradient-to-r from-[#666666] to-[#444444] text-white';
      case FixedTankStatus.MAINTENANCE:
        return 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black';
      case FixedTankStatus.OUT_OF_SERVICE:
        return 'bg-gradient-to-r from-[#E60026] to-[#4D000A] text-white';
      default:
        return 'bg-gradient-to-r from-[#AAAAAA] to-[#888888] text-black'; // Default to a visible gray
    }
  };

  const handleOpenDetailsModal = (tank: FixedStorageTank) => {
    setSelectedTankForDetails(tank);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTankForDetails(null);
  };

  const handleFormSubmitSuccess = () => {
    setIsAddTankModalOpen(false);
    loadTanks();
  };

  const handleTransferSuccess = () => {
    setIsTransferModalOpen(false);
    loadTanks();
  };

  const handleHideTank = (tank: FixedStorageTank) => {
    setTankToHide(tank);
    setShowHideConfirmation(true);
  };

  const confirmHideTank = () => {
    if (tankToHide) {
      setHiddenTankIds(prev => {
        const newSet = new Set([...prev, tankToHide.id]);
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('hiddenTankIds', JSON.stringify([...newSet]));
        }
        return newSet;
      });
    }
    setShowHideConfirmation(false);
    setTankToHide(null);
  };

  const cancelHideTank = () => {
    setShowHideConfirmation(false);
    setTankToHide(null);
  };

  const handleShowTank = (tankId: number) => {
    setHiddenTankIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(tankId);
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hiddenTankIds', JSON.stringify([...newSet]));
      }
      return newSet;
    });
  };

  const handleDeleteTank = (tank: FixedStorageTank) => {
    setTankToDelete(tank);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteTank = async () => {
    if (!tankToDelete) return;
    
    setIsDeleting(true);
    try {
      if (!authToken) {
        throw new Error('Token nije priložen. Molimo se ulogujte ponovo.');
      }

      const response = await fetch(`/api/fuel/fixed-tanks/${tankToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Greška prilikom brisanja tanka');
      }

      // Remove from hidden tanks if it was hidden
      setHiddenTankIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tankToDelete.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hiddenTankIds', JSON.stringify([...newSet]));
        }
        return newSet;
      });

      // Reload tanks to reflect the deletion
      await loadTanks();
      
      setShowDeleteConfirmation(false);
      setTankToDelete(null);
    } catch (error: any) {
      console.error('Error deleting tank:', error);
      alert(`Greška prilikom brisanja tanka: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteTank = () => {
    setShowDeleteConfirmation(false);
    setTankToDelete(null);
  };

  if (loading) {
    return <p>Učitavanje podataka o fiksnim tankovima...</p>;
  }

  if (error) {
    return <p>Greška: {error}</p>;
  }

  const uniqueFuelTypes = Array.from(new Set(tanks.map(tank => tank.fuel_type)));

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
      {/* Header with title and action buttons */}
      <div className="relative overflow-hidden p-6 rounded-xl shadow-lg text-white">
        {/* Black gradient with subtle red corners */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-md border border-white/10 z-0"></div>
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        {/* Glass highlight effect - matching tab header */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
        {/* Total Fuel Summary Block (Fixed + Mobile Tanks) - Full Width */}
        <div className="mb-4 relative z-10">
          {summaryLoading ? (
            <div className="flex items-center justify-center text-white/60 py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#F08080] mr-2"></div>
              <span className="text-base">Učitavanje ukupnog stanja goriva...</span>
            </div>
          ) : totalFuelSummary ? (
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 mr-3 text-[#E60026]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 19c-5 0-8-3-8-8s3-8 8-8 8 3 8 8-3 8-8 8z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 9h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Sveukupno stanje goriva po ulaznim i izlaznim podacima</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="backdrop-blur-md bg-[#F08080]/10 border border-white/10 p-4 rounded-lg shadow-lg relative overflow-hidden group hover:bg-[#F08080]/15 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#F08080] rounded-full filter blur-2xl opacity-5 -translate-y-1/2 translate-x-1/4 group-hover:opacity-10 transition-opacity"></div>
                  <div className="text-sm font-medium text-gray-300 mb-1">Fiksni Tankovi</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {totalFuelSummary.fixedTanksTotal != null ? totalFuelSummary.fixedTanksTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    {totalFuelSummary.fixedTanksTotalKg != null ? totalFuelSummary.fixedTanksTotalKg.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} kg
                  </div>
                </div>
                <div className="backdrop-blur-md bg-[#F08080]/10 border border-white/10 p-4 rounded-lg shadow-lg relative overflow-hidden group hover:bg-[#F08080]/15 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#F08080] rounded-full filter blur-2xl opacity-5 -translate-y-1/2 translate-x-1/4 group-hover:opacity-10 transition-opacity"></div>
                  <div className="text-sm font-medium text-gray-300 mb-1">Mobilni Tankovi</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {totalFuelSummary.mobileTanksTotal != null ? totalFuelSummary.mobileTanksTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    {totalFuelSummary.mobileTanksTotalKg != null ? totalFuelSummary.mobileTanksTotalKg.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} kg
                  </div>
                </div>
                <div className="backdrop-blur-md bg-[#F08080]/20 border border-white/10 p-4 rounded-lg shadow-lg relative overflow-hidden group hover:bg-[#F08080]/25 transition-all">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#F08080] rounded-full filter blur-2xl opacity-10 -translate-y-1/2 translate-x-1/4 group-hover:opacity-15 transition-opacity"></div>
                  <div className="text-sm font-medium text-gray-300 mb-1">Ukupno</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {totalFuelSummary.grandTotal != null ? totalFuelSummary.grandTotal.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} L
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    {totalFuelSummary.grandTotalKg != null ? totalFuelSummary.grandTotalKg.toLocaleString('bs-BA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'} kg
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4 text-base">
              Nije moguće učitati podatke o ukupnom stanju goriva.
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4 relative z-10">
          <div className="flex gap-2 flex-wrap">
            {showAddTankButton && (
              <Dialog open={isAddTankModalOpen} onOpenChange={setIsAddTankModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium py-2 px-4 rounded-xl flex items-center space-x-2 text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5C13 4.44772 12.5523 4 12 4Z" fill="currentColor"/></svg>
                    <span>Dodaj Novi Tank</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] bg-gradient-to-br from-[#1A1A1A] to-[#111111]/90 backdrop-blur-md border-0 shadow-2xl text-white">
                  <DialogHeader className="pb-4 border-b border-white/20">
                    <DialogTitle className="text-xl font-bold text-white">Dodaj Novi Fiksni Tank</DialogTitle>
                    <DialogDescription className="text-white/70">
                      Unesite detalje za novi fiksni tank goriva.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="overflow-y-auto py-4 px-1 flex-grow">
                    <NewFixedTankForm 
                      onSubmitSuccess={handleFormSubmitSuccess} 
                      onCancel={() => setIsAddTankModalOpen(false)}
                    />
                  </div>
                  <DialogFooter className="pt-4 border-t border-white/20 mt-auto">
                    <Button variant="outline" onClick={() => setIsAddTankModalOpen(false)} className="border-[#E60026]/50 bg-[#E60026]/10 text-[#E60026] hover:bg-[#E60026]/20 hover:border-[#E60026]/70">Otkaži</Button>
                    <Button type="submit" form="new-tank-form" className="bg-gradient-to-r from-[#E60026] to-[#4D000A] hover:from-[#B3001F] hover:to-[#800014] text-white">Sačuvaj</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {showTransferButton && (
              <Button 
                variant="outline"
                onClick={() => setIsTransferModalOpen(true)}
                className="backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all py-2 px-4 rounded-xl flex items-center space-x-2 text-sm"
              >
                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <span>Pretakanje (Fiksni u Fiksni)</span>
              </Button>
            )}
          </div>
        </div>
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm relative z-10">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white/20 border-white/30 text-white">
              <SelectValue placeholder="Filtriraj po statusu" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="all" className="text-gray-800 hover:bg-[#E60026]/10 focus:bg-[#E60026]/10">Svi Statusi</SelectItem>
              {Object.values(FixedTankStatus).map(status => (
                <SelectItem key={status} value={status} className="text-gray-800 hover:bg-[#E60026]/10 focus:bg-[#E60026]/10">{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white/20 border-white/30 text-white">
              <SelectValue placeholder="Filtriraj po tipu goriva" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="all" className="text-gray-800 hover:bg-[#E60026]/10 focus:bg-[#E60026]/10">Svi Tipovi Goriva</SelectItem>
              {uniqueFuelTypes.map(fuelType => (
                <SelectItem key={fuelType} value={fuelType} className="text-gray-800 hover:bg-[#E60026]/10 focus:bg-[#E60026]/10">{fuelType}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="ml-auto flex items-center text-sm">
            <span className="bg-white/20 px-3 py-1.5 rounded-lg">
              Ukupno: {filteredTanks.length} {filteredTanks.length === 1 ? 'rezervoar' : filteredTanks.length > 1 && filteredTanks.length < 5 ? 'rezervoara' : 'rezervoara'}
            </span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        {filteredTanks.length === 0 && !loading && (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300 transition-all hover:border-[#E60026]/30">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-gray-500 text-lg">Nema fiksnih tankova koji odgovaraju zadatim filterima.</p>
            <p className="text-gray-400 mt-2">Pokušajte sa drugim filterima ili dodajte novi tank.</p>
          </div>
        )}

        {filteredTanks.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <TableRow>
                  <TableHead className="w-[180px] font-semibold">Naziv</TableHead>
                  <TableHead className="font-semibold">Identifikator</TableHead>
                  <TableHead className="font-semibold">Tip Goriva</TableHead>
                  <TableHead className="text-right font-semibold">Kapacitet (L)</TableHead>
                  <TableHead className="text-right font-semibold">Trenutno (L)</TableHead>
                  <TableHead className="text-right font-semibold">Trenutno (kg)</TableHead>
                  <TableHead className="text-right font-semibold">Gustoća</TableHead>
                  <TableHead className="w-[150px] font-semibold">Popunjenost</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-center font-semibold">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTanks.map((tank) => {
                  const percentage = tank.capacity_liters > 0 ? (tank.current_quantity_liters / tank.capacity_liters) * 100 : 0;
                  
                  // Dohvati podatke o gustoći i kilogramima iz state-a ili koristi default vrijednosti
                  const customsData = tanksCustomsData[tank.id] || { avgDensity: 0.8, totalKg: 0 };
                  const avgDensity = customsData.avgDensity;
                  
                  // Izračunaj količinu u kilogramima koristeći prosječnu gustoću ili vrijednost iz MRN podataka
                  const currentKg = customsData.totalKg > 0 ? 
                    customsData.totalKg : 
                    tank.current_quantity_liters * avgDensity;
                  
                  return (
                    <TableRow key={tank.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-gray-800">{tank.tank_name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                          {tank.tank_identifier || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {tank.fuel_type.toLowerCase() === 'jet a-1'.toLowerCase() ? (
                            <img 
                              src="/JET A-1.svg" 
                              alt="JET A-1" 
                              className="w-14 h-14 object-contain" 
                            />
                          ) : (
                            <>
                              <span className="w-3 h-3 rounded-full bg-[#E60026] mr-2"></span>
                              {tank.fuel_type}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{tank.capacity_liters.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{tank.current_quantity_liters.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <span className="font-medium">
                            {currentKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-gray-500 text-xs ml-1">kg</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          {avgDensity.toFixed(4)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-[calc(100%-40px)] mr-2 h-2.5 rounded-full overflow-hidden bg-gray-100">
                            <div 
                              className={`h-full rounded-full ${percentage > 80 ? 'bg-[#E60026]' : percentage > 30 ? 'bg-[#B3001F]' : 'bg-[#800014]'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{percentage.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeClasses(tank.status as FixedTankStatus)} px-2 py-1`}>{tank.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          {showDetailsButton && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenDetailsModal(tank)}
                              className="text-[#E60026] hover:bg-[#E60026]/10 dark:text-[#E60026] dark:hover:bg-[#E60026]/20"
                            >
                              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Detalji
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleHideTank(tank)}
                            className="text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            title="Sakrij tank iz prikaza"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </Button>
                          {authUser?.role === 'ADMIN' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteTank(tank)}
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              title="Obriši tank trajno"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableCaption className="mt-4 text-gray-500 italic font-light">
                Lista svih fiksnih tankova goriva.
              </TableCaption>
            </Table>
          </div>
        )}
        
        {/* Additional Tanks Section */}
        {totalRealTankFuel > 0 && (
          <div className="mt-8">
            <div className="relative overflow-hidden p-6 rounded-xl shadow-lg border border-gray-100 bg-white">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50 z-0"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full filter blur-2xl -translate-y-1/2 translate-x-1/4 z-0"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/20 to-blue-500/20 rounded-full filter blur-xl translate-y-1/2 -translate-x-1/4 z-0"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Stanje goriva po tankovima</h3>
                    <p className="text-gray-600 text-sm">Pregled raspodjele ukupnog goriva</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {fictitiousTanks.map((tank, index) => {
                    const percentage = tank.capacity_liters > 0 ? (tank.current_quantity_liters / tank.capacity_liters) * 100 : 0;
                    const colors = [
                      'from-blue-500 to-cyan-500',
                      'from-indigo-500 to-purple-500', 
                      'from-emerald-500 to-teal-500'
                    ];
                    
                    return (
                      <div key={tank.id} className="group relative">
                        {/* Card with gradient border */}
                        <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                          {/* Gradient border effect */}
                          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors[index]} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                          
                          {/* Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 bg-gradient-to-br ${colors[index]} rounded-lg flex items-center justify-center mr-3 shadow-md`}>
                                <span className="text-white font-bold text-sm">{index + 1}</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800 text-lg">{tank.tank_name}</h4>
                                <p className="text-gray-500 text-xs">Identifikator</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 bg-gradient-to-r ${colors[index]} text-white rounded-full text-xs font-semibold shadow-sm`}>
                              {tank.tank_identifier}
                            </span>
                          </div>
                          
                          {/* Fuel type indicator */}
                          <div className="flex items-center mb-4">
                            <img 
                              src="/JET A-1.svg" 
                              alt="JET A-1" 
                              className="w-8 h-8 object-contain mr-2" 
                            />
                            <span className="text-sm font-medium text-gray-700">{tank.fuel_type}</span>
                          </div>
                          
                          {/* Stats grid */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 mb-1">Kapacitet</div>
                              <div className="font-bold text-gray-800">{tank.capacity_liters.toLocaleString()} L</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 mb-1">Trenutno</div>
                              <div className="font-bold text-gray-800">{tank.current_quantity_liters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</div>
                            </div>
                          </div>
                          
                          {/* Mass display */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-4">
                            <div className="text-xs text-gray-500 mb-1">Masa goriva</div>
                            <div className="font-bold text-gray-800 text-lg">{tank.currentKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 font-medium">Popunjenost</span>
                              <span className={`font-bold ${percentage > 80 ? 'text-red-600' : percentage > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full h-3 rounded-full overflow-hidden bg-gray-200 shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                  percentage > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                                  percentage > 30 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                                  'bg-gradient-to-r from-green-500 to-green-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary card */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        Ukupno goriva: <span className="font-bold text-gray-800">{totalRealTankFuel.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</span> 
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="font-bold text-gray-800">{totalRealTankFuelKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 bg-white/60 px-3 py-1 rounded-full">
                      Ravnomjerno raspoređeno
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {holdingTank && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-amber-800">Holding Tank za višak litara</h3>
              </div>
              
              <div className="bg-white/60 rounded-lg p-4 backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-amber-700 mb-1">Naziv</span>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </div>
                      <span className="text-gray-800 font-medium">EXCESS FUEL</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-amber-700 mb-1">Tip</span>
                    <span className="text-gray-800 font-medium">VIRTUAL HOLDING</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-amber-700 mb-1">Trenutna količina</span>
                    <div className="text-xl font-bold text-amber-800">
                      {holdingTank.current_quantity_liters.toLocaleString()} L
                    </div>
                  </div>
                </div>
                
                {holdingTank.current_quantity_liters > 0 && (
                  <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                    <div className="flex items-center text-amber-800">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">
                        Ovaj tank sadrži {holdingTank.current_quantity_liters.toLocaleString()}L goriva iz različitih MRN zapisa
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <FixedTankDetailsModal
          tank={selectedTankForDetails}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
        />

        <FixedToFixedTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onTransferSuccess={handleTransferSuccess}
          availableTanks={tanks}
        />

        {/* Hidden Tanks Section - at the bottom */}
        {hiddenTankIds.size > 0 && (
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                  <span className="text-xs text-gray-600">
                    Sakriveni tankovi ({hiddenTankIds.size}):
                  </span>
                </div>
                <div className="flex gap-1">
                  {tanks
                    .filter(tank => hiddenTankIds.has(tank.id))
                    .map(tank => (
                      <Button
                        key={tank.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowTank(tank.id)}
                        className="text-xs px-2 py-1 h-6 text-gray-600 border-gray-300 hover:bg-gray-100"
                      >
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {tank.tank_name}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hide Confirmation Modal */}
        <Dialog open={showHideConfirmation} onOpenChange={setShowHideConfirmation}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">Potvrda sakrivanja tanka</DialogTitle>
              <DialogDescription className="text-gray-600">
                Da li ste sigurni da želite da sakrijete tank "{tankToHide?.tank_name}" iz prikaza?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={cancelHideTank}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Otkaži
              </Button>
              <Button 
                onClick={confirmHideTank}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Sakrij tank
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-red-800 flex items-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Trajno brisanje tanka
              </DialogTitle>
              <div className="space-y-3">
                <p className="text-gray-600">
                  Da li ste sigurni da želite da <strong>trajno obrišete</strong> tank "{tankToDelete?.tank_name}"?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-medium mb-2">⚠️ Ova akcija je nepovratna!</p>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• Tank će biti označen kao obrisan</li>
                    <li>• Neće se prikazivati u listi tankova</li>
                    <li>• Podaci o tanku će ostati u bazi za audit</li>
                    <li>• Tank se može vratiti samo administrativno</li>
                  </ul>
                </div>
                {tankToDelete && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-700 text-sm font-medium mb-1">Detalji tanka:</p>
                    <div className="text-gray-600 text-sm space-y-1">
                      <p>• Naziv: {tankToDelete.tank_name}</p>
                      <p>• Identifikator: {tankToDelete.tank_identifier || 'N/A'}</p>
                      <p>• Kapacitet: {tankToDelete.capacity_liters.toLocaleString()} L</p>
                      <p>• Trenutno gorivo: {tankToDelete.current_quantity_liters.toLocaleString()} L</p>
                    </div>
                  </div>
                )}
              </div>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={cancelDeleteTank}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Otkaži
              </Button>
              <Button 
                onClick={confirmDeleteTank}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    Brisanje...
                  </>
                ) : (
                  'Trajno obriši tank'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Operational Fuel Status */}
        <div className="mt-6 relative z-10">
          {summaryLoading ? (
            <div className="flex items-center justify-center text-white/60 py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F08080] mr-2"></div>
              <span className="text-sm">Računanje operativnog stanja...</span>
            </div>
          ) : totalFuelSummary ? (
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 mr-3 text-[#E60026]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Operativno stanje goriva</span>
              </h3>
              
              <div className="backdrop-blur-md bg-[#F08080]/10 border border-white/10 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:bg-[#F08080]/15 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 group-hover:opacity-10 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F08080] rounded-full filter blur-2xl opacity-5 translate-y-1/2 -translate-x-1/4 group-hover:opacity-10 transition-opacity"></div>
                
                <div className="text-center relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white/30 border border-white/40 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-800" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-800 mb-2 uppercase tracking-wide">Dostupno za operacije</div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {totalFuelSummary.grandTotal != null ? (totalFuelSummary.grandTotal - 6000).toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                      </div>
                      <div className="text-lg font-medium text-gray-700">Litara</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {totalFuelSummary.grandTotalKg != null ? (totalFuelSummary.grandTotalKg - 4800).toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                      </div>
                      <div className="text-lg font-medium text-gray-700">Kilograma</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-700 bg-white/20 rounded-lg p-3 border border-white/30">
                    <span className="text-gray-800 font-medium">Oduzeto:</span> 6.000L (3.000L cijevi + filteri + mrtve tačke) = <span className="text-gray-900 font-bold">Realno operativno stanje</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 backdrop-blur-md bg-white/20 border border-white/30 rounded-lg p-4">
                <div className="text-xs text-gray-700 leading-relaxed">
                  <strong className="text-gray-900">Napomena:</strong> Ovo je okvirno operativno stanje, kad se mjeri stanje goriva u fiksnim rezervoarima ne može se izmjeriti stanje goriva koje se nalazi u cijevima, što je okvirno nekih 3000L, gorivo u filterima kamiona što je 500L po filteru, te mrtve tačke u cisternama. Stvarno operativno stanje je približno ovome.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4 text-sm">
              Nije moguće izračunati operativno stanje goriva.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
