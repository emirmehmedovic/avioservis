import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FuelingOperation } from '../types';
import ExdKNumberEditModal from './ExdKNumberEditModal';

// Prošireni tip za FuelingOperation koji uključuje usd_exchange_rate
interface ExtendedFuelingOperation extends FuelingOperation {
  usd_exchange_rate?: string;
  exd_number?: string | null; // EXD broj za avio gorivo
  k_number?: string | null; // K broj za avio gorivo
}

import { formatDate, API_BASE_URL, generatePDFInvoice } from '../utils/helpers';
import { generateXMLInvoice, downloadXML } from '../utils/xmlInvoice';
import { generateDomesticPDFInvoice } from '../utils/domesticInvoice';
import { downloadDocument } from '@/lib/apiService';
import { toast } from 'react-hot-toast';

interface OperationDetailsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  operation: ExtendedFuelingOperation;
}

const OperationDetailsModal: React.FC<OperationDetailsModalProps> = ({ operation, onClose }) => {
  // State for ExdKNumber edit modal
  const [isExdKNumberModalOpen, setIsExdKNumberModalOpen] = useState(false);
  const [updatedOperation, setUpdatedOperation] = useState<ExtendedFuelingOperation>(operation);
  
  // Function to handle EXD and K number updates
  const handleExdKNumberUpdate = (exdNumber: string | null, kNumber: string | null) => {
    setUpdatedOperation(prev => ({
      ...prev,
      exd_number: exdNumber,
      k_number: kNumber
    }));
  };
  
  // Helper function to get the exchange rate
  const getExchangeRate = useMemo(() => {
    console.log('DEBUG - Currency:', operation.currency);
    console.log('DEBUG - USD Exchange Rate raw value:', operation.usd_exchange_rate);
    console.log('DEBUG - USD Exchange Rate type:', typeof operation.usd_exchange_rate);
    
    // Check if the exchange rate is a valid number
    const hasValidExchangeRate = operation.usd_exchange_rate && 
      !isNaN(parseFloat(operation.usd_exchange_rate)) && 
      parseFloat(operation.usd_exchange_rate) > 0;
    
    console.log('DEBUG - Has valid exchange rate:', hasValidExchangeRate);
    
    if (operation.currency === 'EUR') {
      // For EUR, use fixed exchange rate if not provided
      if (hasValidExchangeRate) {
        const rate = parseFloat(operation.usd_exchange_rate!);
        console.log('DEBUG - EUR using backend rate:', rate);
        return rate;
      } else {
        console.log('DEBUG - EUR using fixed rate: 1.95583');
        return 1.95583;
      }
    } else if (operation.currency === 'USD') {
      // For USD, use provided exchange rate or default to 1.8 if not available
      if (hasValidExchangeRate) {
        const rate = parseFloat(operation.usd_exchange_rate!);
        console.log('DEBUG - USD using backend rate:', rate);
        return rate;
      } else {
        console.log('DEBUG - USD using default rate: 1.8');
        return 1.8;
      }
    }
    return 1; // Default for BAM
  }, [operation.currency, operation.usd_exchange_rate]);
  
  // Debugging podataka
  useEffect(() => {
    console.log('OperationDetailsModal received operation:', operation);
    console.log('Currency:', operation.currency);
    console.log('USD Exchange Rate:', operation.usd_exchange_rate);
    console.log('Calculated Exchange Rate:', getExchangeRate);
    
    // Dodatni debugging za izračun BAM ekvivalenta
    if (operation.currency === 'USD' || operation.currency === 'EUR') {
      console.log('Exchange rate used:', getExchangeRate);
      console.log('Price per kg in original currency:', operation.price_per_kg || 0);
      console.log('Price per kg in BAM:', (operation.price_per_kg || 0) * getExchangeRate);
      console.log('Total amount in original currency:', operation.total_amount || 0);
      console.log('Total amount in BAM:', (operation.total_amount || 0) * getExchangeRate);
    }
  }, [operation, getExchangeRate]);
  // Pomoćna funkcija za renderiranje MRN tablice
  const renderMrnTable = (mrnData: any[]) => {
    if (!mrnData || !Array.isArray(mrnData) || mrnData.length === 0) {
      return null;
    }
    
    // Provjeri strukturu svakog elementa i format podataka
    let formattedData: Array<{mrnNumber: string, quantityKg: number}> = [];
    
    mrnData.forEach((item) => {
      // Format 1: { mrn: '24BA010304000120D6', quantity: 6648.00 } ili { mrn: '24BA010304000120D6', quantity_kg: 5318.40 }
      if (item && typeof item === 'object') {
        let mrnNumber = 'N/A';
        let quantityKg = 0;
        
        // Određivanje MRN broja
        if ('mrn' in item && item.mrn) {
          mrnNumber = item.mrn;
        }
        
        // Preferiramo quantity_kg ako postoji, inače računamo iz količine i gustoće
        if ('quantity_kg' in item && item.quantity_kg !== undefined && item.quantity_kg !== null) {
          // Koristimo punu preciznost iz quantity_kg bez zaokruživanja
          quantityKg = typeof item.quantity_kg === 'number' ? item.quantity_kg : parseFloat(item.quantity_kg) || 0;
        } else if ('quantity' in item) {
          const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
          // Koristimo gustoću iz zapisa, zapisa operacije, ili aktualnu gustoću kao točniju vrijednost
          let density = 0.8; // Default samo kao fallback
          
          if ('density' in item && item.density) {
            density = Number(item.density);
          } else if ('density_at_intake' in item && item.density_at_intake) { 
            density = Number(item.density_at_intake);
          } else if (operation && operation.specific_density) {
            // Koristimo specifičnu gustoću same operacije ako je dostupna
            density = operation.specific_density;
          }
          
          // Množimo bez zaokruživanja za maksimalnu preciznost
          quantityKg = quantity * density;
        }
        
        // Format 2: { '24BA010304000120D6': 6648.00 } - ključ je MRN, vrijednost je količina
        // Ako nemamo mrn ili quantity polja, provjeravamo je li objekt u formatu {mrn: quantity}
        if (!('mrn' in item) && !('quantity' in item) && !('quantity_kg' in item)) {
          const keys = Object.keys(item);
          if (keys.length === 1) {
            const key = keys[0];
            const value = item[key];
            
            // Ako ključ nije neki od poznatih atributa, tretiramo ga kao MRN
            if (!['quantity', 'quantity_kg', 'density_at_intake'].includes(key.toLowerCase())) {
              mrnNumber = key;
              // Pretpostavka: vrijednost je u litrama, trebamo konvertirati u kg
              const quantity = typeof value === 'number' ? value : parseFloat(value) || 0;
              quantityKg = quantity * 0.8; // Pretpostavljamo defaultnu gustoću
            }
          }
        }
        
        formattedData.push({ mrnNumber, quantityKg });
      }
    });
    
    // Ako nema formatiranih podataka, ne prikazuj tablicu
    if (formattedData.length === 0) {
      return null;
    }

    return (
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            MRN Podaci
          </h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MRN Broj</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {formattedData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.mrnNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };
  
  // Pomoćna funkcija za renderiranje MRN sekcije
  const renderMrnSection = () => {
    // Debug: ispiši sve podatke o operaciji
    console.log('Operation data:', operation);
    console.log('MRN Breakdown:', operation.mrnBreakdown);
    console.log('Parsed MRN Breakdown:', operation.parsedMrnBreakdown);
    
    // Pripremi podatke za prikaz
    let mrnDataToDisplay: any[] = [];
    
    try {
      // Prvo provjeri parsedMrnBreakdown koji dolazi direktno s backenda
      if (operation.parsedMrnBreakdown && Array.isArray(operation.parsedMrnBreakdown)) {
        console.log('Using parsedMrnBreakdown:', operation.parsedMrnBreakdown);
        mrnDataToDisplay = operation.parsedMrnBreakdown;
      }
      // Ako nema parsedMrnBreakdown, pokušaj parsirati mrnBreakdown string
      else if (typeof operation.mrnBreakdown === 'string') {
        console.log('Parsing mrnBreakdown string:', operation.mrnBreakdown);
        const parsedData = JSON.parse(operation.mrnBreakdown);
        if (Array.isArray(parsedData)) {
          mrnDataToDisplay = parsedData;
        }
      }
    } catch (e) {
      console.error('Error parsing MRN data:', e);
      // Nastavi s praznim nizom ako je došlo do greške
    }
    
    // Uvijek prikaži MRN sekciju, čak i ako nema podataka
    return (
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            MRN Podaci
          </h3>
        </div>
        <div className="p-4">
          {mrnDataToDisplay.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MRN Broj</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {mrnDataToDisplay.map((item, index) => {
                    const mrnNumber = item.mrn || (Object.keys(item).length === 1 ? Object.keys(item)[0] : 'N/A');
                    // Preferiramo quantity_kg ako postoji, inače računamo iz količine i gustoće
                    let quantityKg = item.quantity_kg;
                    
                    if (quantityKg === undefined) {
                      // Ako nemamo quantity_kg, izračunaj iz quantity i density ako je moguće
                      const quantity = item.quantity || (Object.keys(item).length === 1 ? item[Object.keys(item)[0]] : 0);
                      const density = item.density_at_intake || 0.8; // Koristi defaultnu gustoću ako nije definirana
                      quantityKg = Number(quantity) * Number(density);
                    }
                    
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{mrnNumber}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2">Nema dostupnih MRN podataka za ovu operaciju</p>
            </div>
          )}
        </div>
      </section>
    );
  };
  
  // Create a portal to render the modal outside of the current component hierarchy
  // This ensures the modal is displayed over the entire viewport regardless of parent containers
  
  // Create modal container if it doesn't exist
  useEffect(() => {
    // Check if we need to create the modal container
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }
    
    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  return createPortal(
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0">
        {/* Header with black glassmorphism effect */}
        <div className="p-6 text-white relative overflow-hidden">
          {/* Black glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/60 to-black/40 backdrop-blur-xl border border-white/20 z-0"></div>
          {/* Glass highlight effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex flex-col space-y-1">
              <h2 className="text-2xl font-bold flex items-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 14C20 14 18 10 12 10C6 10 4 14 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Detalji Operacije Točenja
              </h2>
              <p className="text-sm opacity-80">
                Pregled informacija o operaciji točenja goriva
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">ID: {operation.id}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* MRN Podaci - Prikazuje se samo ako postoje MRN podaci */}
          {renderMrnSection()}
          
          {/* Osnovni Podaci */}
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200">
                <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12H15M9 16H15M9 8H15M5 21H19C20.1046 21 21 20.1046 21 19V9.41421C21 9.149 20.8946 8.89464 20.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Osnovni Podaci
              </h3>
            </div>
            <div className="p-5">
              {/* Flight Information Card */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.55 19.09L12 13.5L20.45 19.09C20.2726 19.3176 20.0216 19.4726 19.7341 19.5348C19.4466 19.597 19.1468 19.5626 18.88 19.44L12 16.24L5.12 19.44C4.85323 19.5626 4.55336 19.597 4.26588 19.5348C3.97839 19.4726 3.72736 19.3176 3.55 19.09ZM12 3C10.9 3 9.9 3.9 9.9 5L9.9 5.1L3 10.46V14.5H5V11.58L12 6.5L19 11.58V14.5H21V10.46L14.1 5.1C14.1 3.9 13.1 3 12 3Z" fill="currentColor"/>
                  </svg>
                  Informacije o letu
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tip Saobraćaja</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{operation.tip_saobracaja || 'N/A'}</div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registracija Aviona</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{operation.aircraft_registration || 'N/A'}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Broj Leta</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{operation.flight_number || 'N/A'}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Destinacija</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="currentColor"/>
                      </svg>
                      {operation.destination}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Datum i Vrijeme</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM16.2 16.2L11 13V7H12.5V12.2L17 14.9L16.2 16.2Z" fill="currentColor"/>
                      </svg>
                      {formatDate(operation.dateTime)}
                    </div>
                  </div>
                </div>
                {operation.aircraft && (
                  <div className="mt-3 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sistemska Letjelica</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{operation.aircraft.type || 'N/A'} ({operation.aircraft.registration || 'N/A'})</div>
                  </div>
                )}
              </div>
              
              {/* Fueling Information Card */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.77 7.23L19.78 7.22L16.06 3.5L15 4.56L17.11 6.67C16.17 7.03 15.5 7.93 15.5 9C15.5 10.38 16.62 11.5 18 11.5C18.36 11.5 18.69 11.42 19 11.29V18.5C19 19.05 18.55 19.5 18 19.5C17.45 19.5 17 19.05 17 18.5V14C17 12.9 16.1 12 15 12H14V5C14 3.9 13.1 3 12 3H6C4.9 3 4 3.9 4 5V21H14V13.5H15.5V18.5C15.5 19.88 16.62 21 18 21C19.38 21 20.5 19.88 20.5 18.5V9C20.5 8.31 20.22 7.68 19.77 7.23ZM12 10H6V5H12V10Z" fill="currentColor"/>
                  </svg>
                  Informacije o točenju
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tip Goriva</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      {operation.tank?.fuel_type?.toLowerCase() === 'jet a-1'.toLowerCase() ? (
                        <>
                          <img 
                            src="/JET A-1.svg" 
                            alt="JET A-1" 
                            className="w-8 h-8 object-contain mr-2" 
                          />
                          JET A-1
                        </>
                      ) : (
                        operation.tank?.fuel_type || 'N/A'
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Količina (L)</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Količina (kg)</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gustoća</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })} kg/L
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Broj dostavnice</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{operation.delivery_note_number || 'N/A'}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cijena po kg</span>
                      <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })} {operation.currency || 'BAM'}
                      </span>
                      {(operation.currency === 'USD' || operation.currency === 'EUR') && (
                        <div className="mt-2 flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">BAM:</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {((operation.price_per_kg || 0) * getExchangeRate).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {(operation.discount_percentage && operation.discount_percentage > 0) && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">× (1 - {operation.discount_percentage}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* EXD i K brojevi */}
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">EXD i K brojevi</h4>
                    <button
                      onClick={() => setIsExdKNumberModalOpen(true)}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Uredi
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">EXD BROJ</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {updatedOperation.exd_number || 'Nije unesen'}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">K BROJ</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {updatedOperation.k_number || 'Nije unesen'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Total Price Calculation Section */}
          <section className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold flex items-center text-gray-700 dark:text-gray-300">
                <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Detalji Obračuna
              </h3>
            </div>
            <div className="p-5">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Obračun po formuli</h4>
                      <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <span>{(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg</span>
                        <span>×</span>
                        <span>{(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })} {operation.currency || 'BAM'}</span>
                        {operation.discount_percentage && operation.discount_percentage > 0 && (
                          <>
                            <span>×</span>
                            <span>(1 - {operation.discount_percentage}%)</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-700 dark:bg-gray-800 rounded-lg p-4 border border-gray-600 dark:border-gray-700 shadow-sm text-white">
                      <h4 className="text-sm font-medium text-gray-200 mb-2">Ukupna cijena</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="text-2xl font-bold">
                            {(operation.total_amount || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} {operation.currency || 'BAM'}
                          </div>
                          {(operation.currency === 'USD' || operation.currency === 'EUR') && (
                            <div className="flex items-center mt-2 bg-gray-600 px-3 py-1.5 rounded-md">
                              <span className="text-sm text-gray-200 mr-2">BAM:</span>
                              <span className="text-lg font-bold text-white">
                                {((operation.total_amount || 0) * getExchangeRate).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs bg-gray-600 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {operation.tip_saobracaja || 'Standardni saobraćaj'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional pricing information */}
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                  <p className="flex items-center mb-2">
                    <svg className="w-4 h-4 mr-1 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Cijena je obračunata na osnovu količine u kilogramima i cijene po kilogramu{operation.discount_percentage && operation.discount_percentage > 0 ? ', uz primijenjeni rabat' : ''}.
                  </p>
                  
                  {(operation.currency === 'USD' || operation.currency === 'EUR') && (
                    <p className="flex items-center mt-2">
                      <svg className="w-4 h-4 mr-1 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      BAM ekvivalent je izračunat po kursu {getExchangeRate.toLocaleString('hr-HR', { minimumFractionDigits: 5 })} za 1 {operation.currency}.
                      {operation.usd_exchange_rate && !isNaN(parseFloat(operation.usd_exchange_rate)) && parseFloat(operation.usd_exchange_rate) > 0 ? (
                        <span className="ml-1 text-green-600">(Kurs iz sistema)</span>
                      ) : operation.currency === 'EUR' ? (
                        <span className="ml-1 text-amber-600">(Korišten fiksni kurs za EUR)</span>
                      ) : (
                        <span className="ml-1 text-amber-600">(Korišten procijenjeni kurs za USD)</span>
                      )}
                    </p>
                  )}

                </div>
              </div>
            </div>
          </section>
          
          {/* Napomene */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12H15M9 16H15M9 8H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Napomene
              </h3>
            </div>
            <div className="p-4">
              {operation.notes ? (
                <p className="text-gray-700">{operation.notes}</p>
              ) : (
                <p className="text-gray-500 italic">Nema napomena za ovu operaciju.</p>
              )}
            </div>
          </section>
          
          {/* Priloženi Dokument */}
          {operation.documents && operation.documents.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center text-gray-800">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
                    <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Priloženi Dokumenti ({operation.documents?.length || 0})
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {operation.documents?.map((doc: any) => (
                    <div key={doc.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center">
                          <svg className="w-8 h-8 text-indigo-500 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
                            <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate" title={doc.originalFilename}>
                              {doc.originalFilename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(doc.sizeBytes / (1024*1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            let relativePath = '';
                            const storagePath = doc.storagePath as string; // Assuming storagePath is always a string if present

                            if (storagePath) {
                              const privateUploadsMarker = 'private_uploads/';
                              const startIndex = storagePath.indexOf(privateUploadsMarker);
                              if (startIndex !== -1) {
                                relativePath = storagePath.substring(startIndex + privateUploadsMarker.length);
                              } else {
                                console.error('Could not find "private_uploads/" in storagePath:', storagePath);
                                toast.error('Greška: Neispravna putanja do dokumenta.');
                                return; // Prekini ako je putanja neispravna
                              }
                            } else {
                              console.error('doc.storagePath is missing for doc:', doc);
                              toast.error('Greška: Putanja do dokumenta nedostaje.');
                              return; // Prekini ako putanja nedostaje
                            }

                            toast.promise(
                              downloadDocument(relativePath, doc.originalFilename),
                              {
                                loading: 'Preuzimanje dokumenta...',
                                success: 'Dokument preuzet uspješno',
                                error: 'Greška pri preuzimanju dokumenta'
                              }
                            );
                          }}
                          className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors rounded-md flex items-center justify-center shadow-sm self-center sm:self-end" 
                          title="Preuzmi dokument"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 10V17M12 17L9 14M12 17L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 17V19C17 20.1046 16.1046 21 15 21H9C7.89543 21 7 20.1046 7 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 3V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer with document generation options */}
        <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generisanje Dokumenata
            </h3>
            <p className="text-xs text-gray-500">Izaberite tip dokumenta koji želite generisati za ovu operaciju točenja</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Export PDF Invoice Card */}
            <button
              type="button"
              onClick={() => {
                // Prepare operation data for PDF invoice to ensure MRN quantities are in KG
                const operationForInvoice = JSON.parse(JSON.stringify(updatedOperation)); // Deep copy

                let mrnDataForPdf: { mrn: string; quantity_kg?: number; quantity?: number; density_at_intake?: number }[] = [];

                try {
                  let rawMrnData: any[] = [];
                  if (operationForInvoice.parsedMrnBreakdown && Array.isArray(operationForInvoice.parsedMrnBreakdown)) {
                    rawMrnData = operationForInvoice.parsedMrnBreakdown;
                  } else if (typeof operationForInvoice.mrnBreakdown === 'string') {
                    rawMrnData = JSON.parse(operationForInvoice.mrnBreakdown);
                  }

                  if (Array.isArray(rawMrnData)) {
                    mrnDataForPdf = rawMrnData.map(item => {
                      let mrn = item.mrn || 'N/A';
                      let quantity_kg = item.quantity_kg;
                      let quantity = item.quantity;
                      let density_at_intake = item.density_at_intake;

                      // Handle cases where MRN might be the key of the object
                      if (typeof item === 'object' && !item.mrn && Object.keys(item).length === 1) {
                        mrn = Object.keys(item)[0];
                        const val = item[mrn];
                        if (typeof val === 'number') { // Assuming this value is liters if not specified
                          quantity = val;
                        }
                      }
                      
                      // If quantity_kg is not present, but quantity (liters) and density are, calculate it
                      if (quantity_kg === undefined && quantity !== undefined && density_at_intake !== undefined) {
                        quantity_kg = Number(quantity) * Number(density_at_intake);
                      }
                      // Fallback if only quantity (liters) is present, use default density (less accurate)
                      else if (quantity_kg === undefined && quantity !== undefined) {
                        quantity_kg = Number(quantity) * (operationForInvoice.specific_density || 0.8); 
                      }

                      return {
                        mrn,
                        quantity_kg: quantity_kg !== undefined ? Number(quantity_kg) : undefined,
                        quantity: quantity !== undefined ? Number(quantity) : undefined,
                        density_at_intake: density_at_intake !== undefined ? Number(density_at_intake) : undefined
                      };
                    });
                  }
                } catch (e) {
                  console.error('Error processing MRN data for PDF invoice:', e);
                  // Fallback to original parsedMrnBreakdown if processing fails
                  mrnDataForPdf = operationForInvoice.parsedMrnBreakdown || [];
                }
                
                operationForInvoice.parsedMrnBreakdown = mrnDataForPdf;
                generatePDFInvoice(operationForInvoice);
              }}
              className="group relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col h-full"
              title="Standardna faktura za izvoz"
            >
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">PDF Faktura</h4>
                  <p className="text-xs text-gray-500">Za izvoz</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2 flex-grow">Standardna faktura bez PDV-a za izvozne operacije točenja goriva</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-xs font-medium text-green-600 group-hover:text-green-700">
                  Generiši
                  <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </button>

            {/* Domestic PDF Invoice Card */}
            <button
              type="button"
              onClick={() => {
                // Prepare operation data for Domestic PDF invoice to ensure MRN quantities are in Kilograms
                const operationForDomesticInvoice = JSON.parse(JSON.stringify(updatedOperation)); // Deep copy

                let mrnDataForDomesticPdf: { mrn: string; quantity?: number; quantity_kg?: number; density_at_intake?: number }[] = [];

                try {
                  let rawMrnData: any[] = [];
                  if (operationForDomesticInvoice.parsedMrnBreakdown && Array.isArray(operationForDomesticInvoice.parsedMrnBreakdown)) {
                    rawMrnData = operationForDomesticInvoice.parsedMrnBreakdown;
                  } else if (typeof operationForDomesticInvoice.mrnBreakdown === 'string') {
                    rawMrnData = JSON.parse(operationForDomesticInvoice.mrnBreakdown);
                  }

                  if (Array.isArray(rawMrnData)) {
                    mrnDataForDomesticPdf = rawMrnData.map(item => {
                      let mrn = item.mrn || 'N/A';
                      let quantityLiters = item.quantity;
                      let quantity_kg = item.quantity_kg; // Prioritize kg
                      let density_at_intake = item.density_at_intake;
                      const operationDensity = operationForDomesticInvoice.specific_density || 0.8;

                      // Handle cases where MRN might be the key of the object
                      if (typeof item === 'object' && !item.mrn && Object.keys(item).length === 1) {
                        mrn = Object.keys(item)[0];
                        const val = item[mrn];
                        // If old format value is number and no kg, assume it's liters and convert
                        if (typeof val === 'number' && quantity_kg === undefined) {
                           quantity_kg = Number(val) * (density_at_intake || operationDensity);
                        }
                      }
                      
                      // If quantity_kg is not present, but quantity (liters) and density are, calculate kg
                      if (quantity_kg === undefined && quantityLiters !== undefined && (density_at_intake || operationDensity) > 0) {
                        const densityToUse = density_at_intake || operationDensity;
                        quantity_kg = Number(quantityLiters) * Number(densityToUse);
                      }

                      return {
                        mrn,
                        quantity: quantityLiters !== undefined ? Number(quantityLiters) : undefined,
                        quantity_kg: quantity_kg !== undefined ? Number(quantity_kg) : undefined,
                        density_at_intake: density_at_intake !== undefined ? Number(density_at_intake) : undefined
                      };
                    });
                  }
                } catch (e) {
                  console.error('Error processing MRN data for domestic PDF invoice (kg):', e);
                  mrnDataForDomesticPdf = operationForDomesticInvoice.parsedMrnBreakdown || [];
                }
                
                operationForDomesticInvoice.parsedMrnBreakdown = mrnDataForDomesticPdf;
                generateDomesticPDFInvoice(operationForDomesticInvoice);
              }}
              className="group relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col h-full"
              title="Faktura za unutarnji saobraćaj sa PDV-om"
            >
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V9" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12h-6" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Domaća Faktura</h4>
                  <p className="text-xs text-gray-500">Sa PDV-om</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2 flex-grow">Faktura sa obračunatim PDV-om za unutarnji saobraćaj</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-xs font-medium text-purple-600 group-hover:text-purple-700">
                  Generiši
                  <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </button>

            {/* XML Invoice Card */}
            <button
              type="button"
              onClick={() => {
                const xmlContent = generateXMLInvoice(operation);
                downloadXML(xmlContent, `Faktura-XML-${operation.id}.xml`);
              }}
              className="group relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col h-full"
              title="XML faktura za sistemsku integraciju"
            >
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">XML Faktura</h4>
                  <p className="text-xs text-gray-500">Za integraciju</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2 flex-grow">Strukturirani XML dokument za integraciju sa drugim sistemima</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-xs font-medium text-blue-600 group-hover:text-blue-700">
                  Preuzmi
                  <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </span>
              </div>
            </button>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center font-medium shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Zatvori
            </button>
          </div>
        </div>
      </div>
      
      {/* ExdKNumberEditModal Component */}
      {isExdKNumberModalOpen && (
        <ExdKNumberEditModal
          isOpen={isExdKNumberModalOpen}
          onClose={() => setIsExdKNumberModalOpen(false)}
          operationId={updatedOperation.id}
          currentExdNumber={updatedOperation.exd_number || null}
          currentKNumber={updatedOperation.k_number || null}
          onUpdate={handleExdKNumberUpdate}
        />
      )}
    </div>,
    document.body
  );
};

export default OperationDetailsModal;
