import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { processExcessFuel, ProcessExcessFuelPayload, clearMobileTankCustomsCache } from '@/lib/apiService';
import { FuelTank } from './types';

// Export these interfaces to ensure type consistency across components
export interface CustomsBreakdownItem {
  id: number;
  quantity: number;
  customs_declaration_number: string;
  density_at_intake?: number;
  [key: string]: any;
}

// Use the same interface structure as in TankManagement.tsx
export type TankCustomsMap = { [tankId: number]: CustomsBreakdownItem[] };

interface ExcessFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  tank: FuelTank | null;
  tanksCustomsData: TankCustomsMap;
  fetchTanks: (forceRefresh?: boolean) => void;
  fetchTankCustomsData: (tankId: number) => void;
}

export default function ExcessFuelModal({ 
  isOpen, 
  onClose, 
  tank, 
  tanksCustomsData, 
  fetchTanks, 
  fetchTankCustomsData 
}: ExcessFuelModalProps) {
  if (!isOpen || !tank) return null;
  
  const excessLiters = Number(tank.current_liters) - 
    (tanksCustomsData[tank.id] || []).reduce(
      (sum, item) => sum + (item.quantity || 0), 0
    );
    
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: ProcessExcessFuelPayload = {
      mobileTankId: tank.id,
      litersQuantity: Number(excessLiters),
      notes: document.getElementById('excess-fuel-notes') ? 
        (document.getElementById('excess-fuel-notes') as HTMLTextAreaElement).value : 
        'Automatska obrada viška goriva'
    };
    
    processExcessFuel(payload)
      .then((response) => {
        toast.success('Višak goriva uspješno obrađen!');
        onClose();
        fetchTanks(true); // Forsiraj potpuno osvježavanje svih tankova
        clearMobileTankCustomsCache(tank.id); // Očisti cache
        fetchTankCustomsData(tank.id); // Osvježi MRN podatke za ovaj tank
      })
      .catch((error) => {
        console.error('Greška pri obradi viška goriva:', error);
        toast.error('Greška pri obradi viška goriva. Pokušajte ponovno.');
      });
  };
  
  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationCircleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Obrada viška goriva</h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  {tank.name} ({tank.identifier}) ima višak goriva bez MRN-a. Trenutno stanje:
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-100 p-2 rounded">
                    <div className="text-xs text-gray-600">Ukupna količina u tanku</div>
                    <div className="text-sm font-semibold">{Number(tank.current_liters).toFixed(1)} L</div>
                  </div>
                  <div className="bg-gray-100 p-2 rounded">
                    <div className="text-xs text-gray-600">Ukupno s MRN</div>
                    <div className="text-sm font-semibold">
                      {(tanksCustomsData[tank.id] || []).reduce(
                        (sum, item) => sum + (item.quantity || 0), 0
                      ).toFixed(1)} L
                    </div>
                  </div>
                  <div className="col-span-2 bg-yellow-100 p-2 rounded">
                    <div className="text-xs text-yellow-800">Višak goriva bez MRN</div>
                    <div className="text-sm font-semibold text-yellow-900">
                      {Number(excessLiters).toFixed(1)} L
                    </div>
                  </div>
                </div>
                
                {/* Obrazac za obradu viška goriva */}
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="excess-fuel-notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Napomena o obradi
                      </label>
                      <textarea
                        id="excess-fuel-notes"
                        name="notes"
                        rows={3}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                        placeholder="Unesite napomenu o obradi viška goriva..."
                        defaultValue="Evidentiranje viška goriva bez MRN-a"
                      />
                    </div>
                    
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Obradi višak
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                      >
                        Odustani
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
