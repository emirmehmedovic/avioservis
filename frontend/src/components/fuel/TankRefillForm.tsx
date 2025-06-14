
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth, getFixedTankCustomsBreakdown, CustomsBreakdownItem } from '@/lib/apiService';
import { ArrowUpCircleIcon, TruckIcon, BuildingStorefrontIcon, DocumentTextIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface TankRefillFormProps {
  tankId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FuelTank {
  id: number;
  identifier: string;
  name: string;
  current_liters: number;
  capacity_liters: number;
}

interface FixedStorageTank {
  id: number;
  tank_name: string;
  tank_identifier: string;
  name?: string; // Fallback for backward compatibility
  identifier?: string; // Fallback for backward compatibility
  capacity_liters: number;
  current_quantity_liters: number;
  fuel_type: string;
  // Custom fields for MRN data
  oldestMrnDate?: string;
  oldestMrn?: string;
  customsData?: CustomsBreakdownItem[];
}

export default function TankRefillForm({ tankId, onSuccess, onCancel }: TankRefillFormProps) {
  const [tank, setTank] = useState<FuelTank | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Currently only using fixedTank option
  const [refillSourceType, setRefillSourceType] = useState<'supplier' | 'fixedTank'>('fixedTank');
  const [fixedTanks, setFixedTanks] = useState<FixedStorageTank[]>([]);
  const [loadingFixedTanks, setLoadingFixedTanks] = useState(false);
  const [selectedFixedTankId, setSelectedFixedTankId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantity_liters: 0,
    supplier: '',
    invoice_number: '',
    price_per_liter: 0,
    notes: ''
  });

  useEffect(() => {
    const fetchTank = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<FuelTank>(`/api/fuel/tanks/${tankId}`);
        setTank(data);
      } catch (error) {
        console.error('Error fetching tank details:', error);
        toast.error('Greška pri učitavanju podataka o tankeru');
        onCancel();
      } finally {
        setLoading(false);
      }
    };

    fetchTank();
  }, [tankId, onCancel]);

  useEffect(() => {
    const fetchFixedTanks = async () => {
      console.log('Fixed tanks fetch useEffect triggered. refillSourceType:', refillSourceType);
      if (refillSourceType === 'fixedTank') {
        setLoadingFixedTanks(true);
        try {
          // Fetch basic tank data
          const data = await fetchWithAuth<FixedStorageTank[]>('/api/fuel/fixed-tanks');
          console.log('Fetched fixed tanks raw data FROM API:', JSON.stringify(data, null, 2));
          
          // Fetch MRN data for each tank and enhance the tank objects
          const tanksWithMrnData = await Promise.all(data.map(async (tank) => {
            try {
              const customsData = await getFixedTankCustomsBreakdown(tank.id);
              let oldestMrnDate = null;
              let oldestMrn = null;
              
              // Process customs data to find the oldest MRN
              if (Array.isArray(customsData)) {
                // Direct array format
                if (customsData.length > 0) {
                  // Sort by date to find oldest
                  const sorted = [...customsData].sort((a, b) => 
                    new Date(a.date_received).getTime() - new Date(b.date_received).getTime()
                  );
                  oldestMrnDate = sorted[0].date_received;
                  oldestMrn = sorted[0].mrn;
                  return { ...tank, oldestMrnDate, oldestMrn, customsData };
                }
              } else if (customsData.customs_breakdown && customsData.customs_breakdown.length > 0) {
                // Response object format
                const sorted = [...customsData.customs_breakdown].sort((a, b) => 
                  new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
                );
                oldestMrnDate = sorted[0].date_added;
                oldestMrn = sorted[0].customs_declaration_number;
                
                // Convert to consistent format for component use
                const formattedCustomsData = customsData.customs_breakdown.map(item => ({
                  mrn: item.customs_declaration_number,
                  quantity: item.remaining_quantity_liters,
                  date_received: item.date_added
                }));
                
                return { ...tank, oldestMrnDate, oldestMrn, customsData: formattedCustomsData };
              }
              
              return { ...tank }; // No MRN data
            } catch (error) {
              console.error(`Error fetching customs data for tank ${tank.id}:`, error);
              return { ...tank }; // Return tank without MRN data on error
            }
          }));
          
          // Sort tanks by oldest MRN date first
          const sortedTanks = tanksWithMrnData.sort((a, b) => {
            // Tanks with MRN data come first
            if (a.oldestMrnDate && !b.oldestMrnDate) return -1;
            if (!a.oldestMrnDate && b.oldestMrnDate) return 1;
            if (!a.oldestMrnDate && !b.oldestMrnDate) return 0;
            
            // Sort by oldest MRN date
            return new Date(a.oldestMrnDate!).getTime() - new Date(b.oldestMrnDate!).getTime();
          });
          
          setFixedTanks(sortedTanks);
        } catch (error) {
          console.error('Error fetching fixed tanks (inside catch block):', error);
          toast.error('Greška pri učitavanju fiksnih tankova');
          setFixedTanks([]);
        } finally {
          setLoadingFixedTanks(false);
        }
      }
    };
    fetchFixedTanks();
  }, [refillSourceType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name.includes('_liters') || name.includes('price') 
        ? value === '' ? 0 : Math.round(Number(value) * 100) / 100 // Konverzija u broj i zaokruživanje na 2 decimale
        : value,
      // Ensure supplier-specific fields are reset if switching away from supplier
      ...(refillSourceType !== 'supplier' && name === 'refillSourceType' && { supplier: '', invoice_number: '', price_per_liter: 0 })
    });
  };

  // Funkcija za pravilno parsiranje decimalnih vrijednosti
  const parseDecimalValue = (value: any): number => {
    // Ako je vrijednost null ili undefined, vratiti 0
    if (value === null || value === undefined) return 0;
    
    // Ako je već broj, samo ga vraćamo
    if (typeof value === 'number') return value;
    
    // Ako je string, pretvaramo ga u broj
    return Number(value);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tank) return;
    
    if (formData.quantity_liters <= 0) {
      toast.error('Količina mora biti pozitivan broj');
      return;
    }
    
    // Koristimo parseDecimalValue za sigurno parsiranje vrijednosti
    const currentLiters = parseDecimalValue(tank.current_liters);
    const capacityLiters = parseDecimalValue(tank.capacity_liters);
    const addLiters = parseDecimalValue(formData.quantity_liters);
    
    console.log('Detaljni podaci o tanku prije validacije:');
    console.log('Raw current_liters:', tank.current_liters, 'Tip:', typeof tank.current_liters);
    console.log('Raw capacity_liters:', tank.capacity_liters, 'Tip:', typeof tank.capacity_liters);
    console.log('Parsed current_liters:', currentLiters, 'Tip:', typeof currentLiters);
    console.log('Parsed capacity_liters:', capacityLiters, 'Tip:', typeof capacityLiters);
    console.log('Parsed quantity_liters:', addLiters, 'Tip:', typeof addLiters);
    
    const newTotalAmountInMobileTank = currentLiters + addLiters;
    console.log('New total amount:', newTotalAmountInMobileTank, 'Tip:', typeof newTotalAmountInMobileTank);
    
    // Posebna obrada za slučaj kada je kapacitet sumnjiv (jako mali ili veliki)
    if (capacityLiters < 1000 || capacityLiters > 1000000) {
      console.warn(`Sumnjiv kapacitet tanka: ${capacityLiters} L. Mogući problem s formatiranjem decimalnih vrijednosti.`);
    }
    
    if (newTotalAmountInMobileTank > capacityLiters) {
      const excessAmount = newTotalAmountInMobileTank - capacityLiters;
      console.log('Excess amount:', excessAmount, 'Tip:', typeof excessAmount);
      
      // Dodatna provjera za negativno prekoračenje (ovo bi bio bug u podacima)
      if (excessAmount < 0) {
        console.error('Detektirano negativno prekoračenje - ovo je vjerojatno greška u podacima ili parsiranju!');
        toast.error(`Detektirana nekonzistentnost u podacima. Molimo kontaktirajte administratora sistema. (Kod greške: NFE-${Math.abs(Math.round(excessAmount))})`);
      } else {
        toast.error(`Dopuna prekoračuje kapacitet mobilnog tankera za ${excessAmount.toFixed(2)} litara`);
      }
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (refillSourceType === 'fixedTank') {
        if (!selectedFixedTankId) {
          toast.error('Molimo odaberite izvorni fiksni tank.');
          setSubmitting(false);
          return;
        }
        
        // Find the selected fixed tank
        const sourceFixedTank = fixedTanks.find(ft => ft.id === selectedFixedTankId);
        if (!sourceFixedTank) {
          toast.error('Odabrani fiksni tank nije pronađen. Molimo osvježite listu.');
          setSubmitting(false);
          return;
        }
        
        if (formData.quantity_liters > sourceFixedTank.current_quantity_liters) {
          toast.error(`Količina za transfer (${formData.quantity_liters} L) prekoračuje dostupnu količinu u fiksnom tanku (${sourceFixedTank.current_quantity_liters} L).`);
          setSubmitting(false);
          return;
        }
        
        // Check if there's a tank with an older MRN that should be used first
        const oldestTank = fixedTanks.find(ft => 
          ft.oldestMrnDate && 
          ft.current_quantity_liters > 0 && 
          ft.fuel_type === sourceFixedTank.fuel_type
        );
        
        // If the selected tank is not the one with the oldest MRN, warn the user
        if (oldestTank && 
            oldestTank.id !== sourceFixedTank.id && 
            oldestTank.oldestMrnDate && 
            sourceFixedTank.oldestMrnDate && 
            new Date(oldestTank.oldestMrnDate).getTime() < new Date(sourceFixedTank.oldestMrnDate).getTime()) {
          
          const confirmUse = window.confirm(
            `UPOZORENJE: Postoji fiksni tank (${oldestTank.tank_name || oldestTank.name}) sa starijim MRN brojem ` +
            `(${oldestTank.oldestMrn} od ${oldestTank.oldestMrnDate ? format(new Date(oldestTank.oldestMrnDate), 'dd.MM.yyyy') : 'n/a'}). ` +
            `Prema pravilima, trebali biste prvo koristiti gorivo iz tanka sa najstarijim MRN brojem. ` +
            `\n\nŽelite li nastaviti sa odabranim tankom?`
          );
          
          if (!confirmUse) {
            setSubmitting(false);
            return;
          }
        }

        const transferPayload = {
          source_fixed_tank_id: selectedFixedTankId,
          target_mobile_tank_id: tankId,
          quantity_liters: formData.quantity_liters,
          transfer_datetime: new Date(formData.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
          notes: formData.notes, 
        };

        await fetchWithAuth(`/api/fuel/transfers/fixed-to-mobile`, {
          method: 'POST',
          body: JSON.stringify(transferPayload),
        });
        toast.success('Transfer iz fiksnog tanka uspješno evidentiran');

      } /* else { // refillSourceType === 'supplier'
        if (!formData.supplier.trim()) {
          toast.error('Dobavljač je obavezan');
          setSubmitting(false);
          return;
        }
        // Ensure only relevant data is sent for supplier refill
        const supplierRefillPayload = {
          date: new Date(formData.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
          quantity_liters: formData.quantity_liters,
          supplier: formData.supplier,
          invoice_number: formData.invoice_number,
          price_per_liter: formData.price_per_liter,
          notes: formData.notes,
        };
        await fetchWithAuth(`/api/fuel/tanks/${tankId}/refills`, {
          method: 'POST',
          body: JSON.stringify(supplierRefillPayload),
        });
        toast.success('Dopuna od dobavljača uspješno evidentirana');
      } */
      
      onSuccess();
    } catch (error) {
      console.error('Error during submission:', error);
      // Attempt to parse error response if available
      let errorMessage = 'Greška pri evidentiranju.';
      if (error instanceof Error) {
        errorMessage = error.message;
        try {
          // Assuming the error might have a response property with JSON
          const errResponse = (error as any).response;
          if (errResponse && typeof errResponse.data?.message === 'string') {
            errorMessage = errResponse.data.message;
          } else if (typeof errResponse?.data === 'string') {
            errorMessage = errResponse.data;
          }
        } catch (parseError) {
          // Ignore if cannot parse further
        }
      }
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-200 border-opacity-50 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-indigo-700 font-medium">Učitavanje podataka...</p>
        </div>
      </div>
    );
  }

  if (!tank) {
    return <div>Greška: Tanker nije pronađen</div>;
  }

  const selectedFixedTank = fixedTanks.find(ft => ft.id === selectedFixedTankId);

  return (
    <div>
      <div className="p-5 rounded-t-lg text-white mb-6 -m-6 relative overflow-hidden">
        {/* Black glassmorphism background - exactly matching tab header */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/60 to-black/40 backdrop-blur-xl border border-white/20 z-0"></div>
        {/* Glass highlight effect - matching tab header */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
        <h3 className="text-xl font-bold flex items-center relative z-10">
          <ArrowUpCircleIcon className="w-6 h-6 mr-2" />
          Dopuna Cisterne
        </h3>
        <p className="mt-1 text-sm opacity-90 relative z-10">{tank.name} ({tank.identifier})</p>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-lg border border-indigo-100 shadow-sm"
      >
        <div className="flex items-center mb-3">
          <TruckIcon className="w-5 h-5 text-indigo-600 mr-2" />
          <h4 className="font-medium text-indigo-800">Informacije o Cisternu</h4>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Trenutna količina</p>
            <p className="text-base font-semibold text-gray-900">{tank.current_liters.toLocaleString()} L</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Kapacitet</p>
            <p className="text-base font-semibold text-gray-900">{tank.capacity_liters.toLocaleString()} L</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Slobodno</p>
            <p className="text-base font-semibold text-gray-900">{(tank.capacity_liters - tank.current_liters).toLocaleString()} L</p>
          </div>
        </div>
      </motion.div>
      
      <form onSubmit={handleSubmit}>
        {/* Commented out source selection as we're only using fixed tank option */}
        {/* <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Izvor dopune
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => {
                setRefillSourceType('supplier');
                setSelectedFixedTankId(null);
              }}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${refillSourceType === 'supplier' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
            >
              <div className={`p-2 rounded-full mr-3 ${refillSourceType === 'supplier' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                <BuildingStorefrontIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Od dobavljača</div>
                <div className="text-xs text-gray-500">Direktna nabavka goriva</div>
              </div>
              <div className="ml-auto">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${refillSourceType === 'supplier' ? 'border-indigo-500' : 'border-gray-300'}`}>
                  {refillSourceType === 'supplier' && <div className="w-3 h-3 rounded-full bg-indigo-500"></div>}
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => setRefillSourceType('fixedTank')}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${refillSourceType === 'fixedTank' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
            >
              <div className={`p-2 rounded-full mr-3 ${refillSourceType === 'fixedTank' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 10V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Iz fiksnog tanka</div>
                <div className="text-xs text-gray-500">Transfer iz rezervoara</div>
              </div>
              <div className="ml-auto">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${refillSourceType === 'fixedTank' ? 'border-indigo-500' : 'border-gray-300'}`}>
                  {refillSourceType === 'fixedTank' && <div className="w-3 h-3 rounded-full bg-indigo-500"></div>}
                </div>
              </div>
            </div>
          </div>
        </div> */}
        
        <div className="mb-5">
          <div className="flex items-center">
            <div className="p-2 rounded-full mr-3 bg-indigo-100 text-indigo-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 10V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Transfer iz fiksnog tanka</div>
              <div className="text-xs text-gray-500">Odaberite izvorni fiksni tank ispod</div>
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fixedTankId" className="block text-sm font-medium text-gray-700 mb-1">
              Izvorni fiksni tank
            </label>
            <div className="relative">
              <select
                name="fixedTankId"
                id="fixedTankId"
                value={selectedFixedTankId || ''}
                onChange={(e) => setSelectedFixedTankId(parseInt(e.target.value, 10) || null)}
                required
                disabled={loadingFixedTanks}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10 appearance-none"
              >
                <option value="" disabled>
                  {loadingFixedTanks ? 'Učitavanje fiksnih tankova...' : 'Odaberite fiksni tank (sortirano po najstarijem MRN)'}
                </option>
                {fixedTanks.map((ft, index) => (
                  <option 
                    key={ft.id} 
                    value={ft.id}
                    className={index === 0 ? 'font-bold bg-green-50' : ''}
                  >
                    {index === 0 && ft.oldestMrn && '⭐ '}
                    {ft.tank_name || ft.name} ({ft.tank_identifier || ft.identifier}) - 
                    {ft.oldestMrn ? 
                      `MRN: ${ft.oldestMrn} (${ft.oldestMrnDate ? format(new Date(ft.oldestMrnDate), 'dd.MM.yyyy') : 'n/a'})` : 
                      'Nema MRN podataka'} - 
                    Dostupno: {(ft.current_quantity_liters ?? 0).toLocaleString()} L
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {fixedTanks.length > 0 && (
              <div className="mt-2 text-sm text-amber-600 flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>Tankovi su sortirani po najstarijem MRN broju - prvo koristite najstarije zalihe.</span>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Datum Transfera
            </label>
            <input
              type="date"
              name="date"
              id="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="quantity_liters" className="block text-sm font-medium text-gray-700">
              Količina (litara)
            </label>
            <input
              type="number"
              name="quantity_liters"
              id="quantity_liters"
              min="0.1"
              step="0.1"
              value={formData.quantity_liters || ''}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          {selectedFixedTank && (
            <div className="sm:col-span-2 mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex items-center mb-1">
                <svg className="w-4 h-4 text-indigo-600 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="font-medium text-indigo-800 text-sm">{selectedFixedTank.tank_name || selectedFixedTank.name} ({selectedFixedTank.tank_identifier || selectedFixedTank.identifier})</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Tip goriva:</span>
                  <span className="ml-1 text-gray-900 font-medium">{selectedFixedTank.fuel_type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Trenutno stanje:</span>
                  <span className="ml-1 text-gray-900 font-medium">{(selectedFixedTank.current_quantity_liters ?? 0).toLocaleString()} L</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Napomene (opciono)
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </motion.div>
        
        {/* Commented out supplier notes section */}
        {/* {refillSourceType === 'supplier' && (
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Napomene
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        )} */}
        
        <div className="mt-6 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-3 border-t pt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:text-sm transition-colors"
          >
            Odustani
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex justify-center items-center rounded-md border border-white/20 shadow-sm px-4 py-2.5 relative overflow-hidden bg-black/60 backdrop-blur-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors"
          >
            {submitting ? (
              <>
                <div className="relative mr-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
                Evidentiranje...
              </>
            ) : (
              <>
                <ArrowUpCircleIcon className="w-5 h-5 mr-2" />
                Evidentiraj Dopunu
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 