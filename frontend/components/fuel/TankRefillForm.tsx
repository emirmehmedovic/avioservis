import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/apiService';
import { ArrowUpCircleIcon, TruckIcon, BuildingStorefrontIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

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
  name: string;
  identifier: string;
  capacity_liters: number;
  current_quantity_liters: number;
  fuel_type: string;
}

export default function TankRefillForm({ tankId, onSuccess, onCancel }: TankRefillFormProps) {
  const [tank, setTank] = useState<FuelTank | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refillSourceType, setRefillSourceType] = useState<'supplier' | 'fixedTank'>('supplier');
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
          const data = await fetchWithAuth<FixedStorageTank[]>('/api/fuel/fixed-tanks');
          console.log('Fetched fixed tanks raw data FROM API:', JSON.stringify(data, null, 2));
          setFixedTanks(data);
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
        ? parseFloat(value) || 0 
        : value,
      // Ensure supplier-specific fields are reset if switching away from supplier
      ...(refillSourceType !== 'supplier' && name === 'refillSourceType' && { supplier: '', invoice_number: '', price_per_liter: 0 })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tank) return;
    
    if (formData.quantity_liters <= 0) {
      toast.error('Količina mora biti pozitivan broj');
      return;
    }
    
    const newTotalAmountInMobileTank = tank.current_liters + formData.quantity_liters;
    if (newTotalAmountInMobileTank > tank.capacity_liters) {
      toast.error(`Dopuna prekoračuje kapacitet mobilnog tankera za ${(newTotalAmountInMobileTank - tank.capacity_liters).toFixed(2)} litara`);
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

      } else { // refillSourceType === 'supplier'
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
      }
      
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
      <div className="hope-gradient p-5 rounded-t-lg text-white mb-6 -m-6">
        <h3 className="text-xl font-bold flex items-center">
          <ArrowUpCircleIcon className="w-6 h-6 mr-2" />
          Dopuna Cisterne
        </h3>
        <p className="mt-1 text-sm opacity-90">{tank.name} ({tank.identifier})</p>
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
        <div className="mb-5">
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
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              {refillSourceType === 'supplier' ? 'Datum' : 'Datum Transfera'}
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
          
          {refillSourceType === 'supplier' && (
            <>
              <div className="sm:col-span-2">
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                  Dobavljač
                </label>
                <input
                  type="text"
                  name="supplier"
                  id="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}
          
          {refillSourceType === 'fixedTank' && (
            <>
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
                      {loadingFixedTanks ? 'Učitavanje fiksnih tankova...' : 'Odaberite fiksni tank'}
                    </option>
                    {fixedTanks.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.name} ({ft.identifier}) - Dostupno: {(ft.current_quantity_liters ?? 0).toLocaleString()} L / Kapacitet: {(ft.capacity_liters ?? 0).toLocaleString()} L
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {selectedFixedTank && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center mb-1">
                      <svg className="w-4 h-4 text-indigo-600 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 10V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V10M20 10V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V10M20 10H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="font-medium text-indigo-800 text-sm">{selectedFixedTank.name} ({selectedFixedTank.identifier})</span>
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
              </div>
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
            </>
          )}
          
          {refillSourceType === 'supplier' && (
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
          )}
        </motion.div>
        
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
            className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2.5 hope-gradient text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors"
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