"use client";

import { useEffect, useState } from 'react';
import { FixedStorageTank, FixedTankStatus, FuelType } from '@/types/fuel';

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
import { getFixedTanks, getFixedTankCustomsBreakdown } from '@/lib/apiService';
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

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('ALL');
  const [isAddTankModalOpen, setIsAddTankModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTankForDetails, setSelectedTankForDetails] = useState<FixedStorageTank | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

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
  }, []);

  useEffect(() => {
    const currentTotal = tanks.reduce((sum, tank) => sum + tank.current_quantity_liters, 0);
    setTotalFuel(currentTotal);
    
    // Izračunaj ukupnu masu goriva u kilogramima iz tanksCustomsData
    if (tanks.length > 0) {
      let totalKg = 0;
      tanks.forEach(tank => {
        const customsData = tanksCustomsData[tank.id] || { totalKg: 0, avgDensity: 0.8 };
        // Ako imamo izračunate totalKg iz MRN podataka, koristi to, inače izračunaj iz litara i gustoće
        totalKg += customsData.totalKg > 0 ? 
          customsData.totalKg : 
          tank.current_quantity_liters * customsData.avgDensity;
      });
      setTotalFuelKg(totalKg);
    }
  }, [tanks, tanksCustomsData]);

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
    
    setFilteredTanks(tempTanks);
  }, [tanks, statusFilter, fuelTypeFilter]);

  // Separate holding tank for dedicated display
  const holdingTank = tanks.find(tank => tank.tank_name === 'EXCESS_FUEL_HOLDING');

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
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2 text-[#E60026]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 10V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Fiksni Tankovi Goriva</span>
            </h2>
            <p className="text-lg mt-1 ml-8 text-white/80">
              Ukupno goriva: <strong className="text-white">{totalFuel.toLocaleString()} L</strong> <span className="mx-1">|</span> <strong className="text-white">{totalFuelKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</strong>
            </p>
          </div>
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
      </div>
    </div>
  );
}
