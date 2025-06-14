'use client';

import React, { useState } from 'react';
import { ServiceRecordCategory, ServiceItemType, CreateServiceRecordPayload, ServiceItem } from '@/types';
import { toast } from 'react-toastify';

interface ServiceRecordFormProps {
  vehicleId: number;
  onSubmit: (formData: CreateServiceRecordPayload, documentFile?: File | null) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateServiceRecordPayload>; // For editing later, if needed
}

// Helper function to determine if a service item type has associated date fields
const hasDateFields = (type: ServiceItemType): boolean => {
  // Almost all service items have date fields except for a few basic ones
  const typesWithoutDates = [
    ServiceItemType.ENGINE,
    ServiceItemType.BRAKES,
    ServiceItemType.TRANSMISSION,
    ServiceItemType.ELECTRICAL,
    ServiceItemType.TIRES,
    ServiceItemType.OTHER
  ];
  return !typesWithoutDates.includes(type);
};

// Helper function to get human-readable labels for date fields based on service item type
const getDateFieldLabels = (type: ServiceItemType): { current: string, next: string } => {
  // Define default labels
  const defaultLabels = { current: 'Datum servisa', next: 'Datum sljedećeg servisa' };
  
  // Define specific labels for each service item type
  switch (type) {
    // Hose related
    case ServiceItemType.HOSE_HD63:
      return { current: 'Datum zamjene HD63 crijeva', next: 'Datum sljedeće zamjene HD63 crijeva' };
    case ServiceItemType.HOSE_HD38:
      return { current: 'Datum zamjene HD38 crijeva', next: 'Datum sljedeće zamjene HD38 crijeva' };
    case ServiceItemType.HOSE_TW75:
      return { current: 'Datum zamjene TW75 crijeva', next: 'Datum sljedeće zamjene TW75 crijeva' };
    case ServiceItemType.HOSE_LEAK_TEST:
      return { current: 'Datum testa curenja crijeva', next: 'Datum sljedećeg testa curenja crijeva' };
    case ServiceItemType.HD38_PRESSURE_TEST:
      return { current: 'Datum testiranja pritiska HD38 crijeva', next: 'Datum sljedećeg testiranja pritiska HD38 crijeva' };
    case ServiceItemType.HD63_PRESSURE_TEST:
      return { current: 'Datum testiranja pritiska HD63 crijeva', next: 'Datum sljedećeg testiranja pritiska HD63 crijeva' };
    case ServiceItemType.TW75_PRESSURE_TEST:
      return { current: 'Datum testiranja pritiska TW75 crijeva', next: 'Datum sljedećeg testiranja pritiska TW75 crijeva' };
    case ServiceItemType.OVERWING_HOSE_TEST:
      return { current: 'Datum testa overwing crijeva', next: 'Datum sljedećeg testa overwing crijeva' };
    case ServiceItemType.UNDERWING_HOSE_TEST:
      return { current: 'Datum testa underwing crijeva', next: 'Datum sljedećeg testa underwing crijeva' };
    
    // Calibration items
    case ServiceItemType.VOLUMETER:
      return { current: 'Datum kalibracije volumetra', next: 'Datum sljedeće kalibracije volumetra' };
    case ServiceItemType.MANOMETER:
      return { current: 'Datum kalibracije manometra', next: 'Datum sljedeće kalibracije manometra' };
    case ServiceItemType.HECPV_ILCPV:
      return { current: 'Datum HECPV/ILCPV testa', next: 'Datum sljedećeg HECPV/ILCPV testa' };
    case ServiceItemType.SIX_MONTH_CHECK:
      return { current: 'Datum šestomjesečnog pregleda', next: 'Datum sljedećeg šestomjesečnog pregleda' };
    case ServiceItemType.QUARTERLY_INSPECTION:
      return { current: 'Datum tromjesečnog pregleda', next: 'Datum sljedećeg tromjesečnog pregleda' };
    
    // Filter related
    case ServiceItemType.FILTER:
      return { current: 'Datum zamjene filtera', next: 'Datum sljedeće zamjene filtera' };
    case ServiceItemType.FILTER_ANNUAL_INSPECTION:
      return { current: 'Datum godišnjeg pregleda filtera', next: 'Datum sljedećeg godišnjeg pregleda filtera' };
    case ServiceItemType.FILTER_EW_SENSOR_INSPECTION:
      return { current: 'Datum pregleda EW senzora filtera', next: 'Datum sljedećeg pregleda EW senzora filtera' };
    
    // Tanker related
    case ServiceItemType.TANKER_PRESSURE_TEST:
      return { current: 'Datum testa pritiska cisterne', next: 'Datum sljedećeg testa pritiska cisterne' };
    case ServiceItemType.TANKER_FIRE_SAFETY_TEST:
      return { current: 'Datum testa protupožarne zaštite cisterne', next: 'Datum sljedećeg testa protupožarne zaštite cisterne' };
    case ServiceItemType.TANKER_CALIBRATION:
      return { current: 'Datum kalibracije cisterne', next: 'Datum sljedeće kalibracije cisterne' };
    
    // Meter calibrations
    case ServiceItemType.CONDUCTIVITY_METER_CALIBRATION:
      return { current: 'Datum kalibracije uređaja električne provodljivosti', next: 'Datum sljedeće kalibracije uređaja električne provodljivosti' };
    case ServiceItemType.HYDROMETER_CALIBRATION:
      return { current: 'Datum kalibracije hidrometra', next: 'Datum sljedeće kalibracije hidrometra' };
    case ServiceItemType.MAIN_FLOW_METER_CALIBRATION:
      return { current: 'Datum kalibracije glavnog mjerača protoka', next: 'Datum sljedeće kalibracije glavnog mjerača protoka' };
    case ServiceItemType.RESISTANCE_METER_CALIBRATION:
      return { current: 'Datum kalibracije mjerača otpora', next: 'Datum sljedeće kalibracije mjerača otpora' };
    case ServiceItemType.THERMOMETER_CALIBRATION:
      return { current: 'Datum kalibracije termometra', next: 'Datum sljedeće kalibracije termometra' };
    case ServiceItemType.TORQUE_WRENCH_CALIBRATION:
      return { current: 'Datum kalibracije moment ključa', next: 'Datum sljedeće kalibracije moment ključa' };
    
    // Regular checks
    case ServiceItemType.WATER_CHEMICAL_TEST:
      return { current: 'Datum kemijskog testa vode', next: 'Datum sljedećeg kemijskog testa vode' };
    
    // Vehicle components
    case ServiceItemType.TACHOGRAPH_CALIBRATION:
      return { current: 'Datum kalibracije tahografa', next: 'Datum sljedeće kalibracije tahografa' };
    case ServiceItemType.ADR_CERTIFICATION:
      return { current: 'Datum ADR certifikacije', next: 'Datum isteka ADR certifikacije' };
    case ServiceItemType.CWD_EXPIRY:
      return { current: 'Datum CWD certifikacije', next: 'Datum isteka CWD certifikacije' };
    
    // Standard vehicle service items and fallback
    default:
      return defaultLabels;
  }
};

const ServiceRecordForm = ({ vehicleId, onSubmit, onCancel, initialData }: ServiceRecordFormProps): React.ReactNode => {
  const [serviceDate, setServiceDate] = useState<string>(initialData?.serviceDate ? new Date(initialData.serviceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [category, setCategory] = useState<ServiceRecordCategory>(initialData?.category || ServiceRecordCategory.REGULAR_MAINTENANCE);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(initialData?.serviceItems || [{ 
    type: ServiceItemType.OTHER, 
    description: '', 
    replaced: false,
    currentDate: null,
    nextDate: null
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = () => {
    setServiceItems([...serviceItems, { 
      type: ServiceItemType.OTHER, 
      description: '', 
      replaced: false,
      currentDate: null,
      nextDate: null
    }]);
  };

  const handleItemChange = (index: number, field: keyof ServiceItem, value: any) => {
    const updatedItems = [...serviceItems];
    
    // If changing the type, reset date fields based on whether the new type has date fields
    if (field === 'type') {
      const newType = value as ServiceItemType;
      updatedItems[index] = { 
        ...updatedItems[index], 
        type: newType,
        // Reset date fields if changing type
        currentDate: null,
        nextDate: null
      };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }
    
    setServiceItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    if (serviceItems.length > 1) {
      const updatedItems = serviceItems.filter((_, i) => i !== index);
      setServiceItems(updatedItems);
    } else {
      toast.warn("Morate imati barem jednu servisnu stavku.");
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setDocumentFile(event.target.files[0]);
    } else {
      setDocumentFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!serviceDate) {
      toast.error('Molimo unesite datum servisa.');
      return;
    }
    if (!category) {
      toast.error('Molimo odaberite kategoriju servisa.');
      return;
    }
    if (serviceItems.length === 0) {
      toast.error('Molimo dodajte barem jednu stavku servisa.');
      return;
    }
    
    // Validate date fields for items that have them
    for (const item of serviceItems) {
      if (hasDateFields(item.type)) {
        if (item.currentDate && item.nextDate) {
          const currentDate = new Date(item.currentDate);
          const nextDate = new Date(item.nextDate);
          
          if (nextDate <= currentDate) {
            toast.error(`Datum sljedećeg servisa mora biti nakon trenutnog datuma za stavku ${formatEnumLabel(item.type)}`);
            return;
          }
        }
      }
    }
    
    // Set submitting state
    setIsSubmitting(true);
    
    try {
      const formData: CreateServiceRecordPayload = {
        vehicleId,
        serviceDate: new Date(serviceDate),
        description,
        category,
        serviceItems: serviceItems.map(item => ({
          type: item.type,
          description: item.description,
          replaced: item.replaced,
          currentDate: item.currentDate,
          nextDate: item.nextDate
        }))
      };
      
      await onSubmit(formData, documentFile);
      toast.success('Servisni zapis uspješno spremljen!');
    } catch (error) {
      console.error('Greška pri spremanju servisnog zapisa:', error);
      toast.error('Došlo je do greške pri spremanju servisnog zapisa.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to format enum keys to readable labels
  const formatEnumLabel = (enumValue: string) => {
    return enumValue.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <div>
        <label htmlFor="serviceDate" className="block text-sm font-medium text-gray-700 mb-1">
          Datum Servisa
        </label>
        <input
          type="date"
          id="serviceDate"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Opis Servisa
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Unesite detaljan opis servisa..."
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Kategorija Servisa
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ServiceRecordCategory)}
          required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
        >
          {Object.values(ServiceRecordCategory).map(cat => (
            <option key={cat} value={cat}>{formatEnumLabel(cat)}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-800">Servisne Stavke</h3>
        {serviceItems.map((item, index) => (
          <div key={index} className="p-3 border border-gray-200 rounded-md space-y-3 bg-gray-50/50 relative">
            {serviceItems.length > 1 && (
                 <button 
                 type="button" 
                 onClick={() => handleRemoveItem(index)}
                 className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                 aria-label="Ukloni stavku"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            )}
            <div className="mb-4 border-b pb-4">
              <div>
                <label htmlFor={`item-type-${index}`} className="block text-xs font-medium text-gray-600 mb-0.5">Tip Stavke</label>
                <select
                  id={`item-type-${index}`}
                  value={item.type}
                  onChange={(e) => handleItemChange(index, 'type', e.target.value as ServiceItemType)}
                  className="mt-0.5 block w-full pl-3 pr-10 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white"
                >
                  {Object.values(ServiceItemType).map(type => (
                    <option key={type} value={type}>{formatEnumLabel(type)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`item-description-${index}`} className="block text-xs font-medium text-gray-600 mb-0.5">Opis Stavke</label>
                <textarea
                  id={`item-description-${index}`}
                  rows={2}
                  value={item.description || ''}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="mt-0.5 block w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Npr. Zamjena uljnog filtera, dolivanje ulja..."
                />
              </div>
              <div className="flex items-center">
                <input
                  id={`item-replaced-${index}`}
                  type="checkbox"
                  checked={item.replaced || false}
                  onChange={(e) => handleItemChange(index, 'replaced', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor={`item-replaced-${index}`} className="ml-2 block text-sm text-gray-700">
                  Stavka zamijenjena/izvršena
                </label>
              </div>
              
              {/* Date fields for service items that have associated dates */}
              {hasDateFields(item.type) && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`item-current-date-${index}`} className="block text-xs font-medium text-gray-600 mb-0.5">
                      {getDateFieldLabels(item.type).current}
                    </label>
                    <input
                      id={`item-current-date-${index}`}
                      type="date"
                      className="mt-0.5 block w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={item.currentDate ? (typeof item.currentDate === 'string' ? item.currentDate.split('T')[0] : new Date(item.currentDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => handleItemChange(index, 'currentDate', e.target.value ? new Date(e.target.value) : null)}
                    />
                  </div>
                  <div>
                    <label htmlFor={`item-next-date-${index}`} className="block text-xs font-medium text-gray-600 mb-0.5">
                      {getDateFieldLabels(item.type).next}
                    </label>
                    <input
                      id={`item-next-date-${index}`}
                      type="date"
                      className="mt-0.5 block w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={item.nextDate ? (typeof item.nextDate === 'string' ? item.nextDate.split('T')[0] : new Date(item.nextDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => handleItemChange(index, 'nextDate', e.target.value ? new Date(e.target.value) : null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <button 
          type="button" 
          onClick={handleAddItem}
          className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md border border-indigo-200 transition-colors"
        >
          + Dodaj Stavku
        </button>
      </div>

      <div>
        <label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-1">
          Priloži Dokument (Opciono)
        </label>
        <input
          type="file"
          id="document"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {documentFile && <p className="text-xs text-gray-500 mt-1">Odabrana datoteka: {documentFile.name}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Odustani
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-indigo-400"
        >
          {isSubmitting ? 'Spremanje...' : 'Spremi Servisni Zapis'}
        </button>
      </div>
    </form>
  );
};

export default ServiceRecordForm; 