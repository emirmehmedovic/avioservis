'use client';

import React from 'react';
import { ServiceRecord, ServiceItemType } from '@/types';
import { formatDateForDisplay } from './serviceHelpers';
import { FaEye } from 'react-icons/fa';

interface ServiceRecordsByTypeProps {
  serviceRecords: ServiceRecord[];
  isLoading: boolean;
  onViewRecord: (record: ServiceRecord) => void;
  serviceItemTypes: ServiceItemType[];
  title: string;
}

const ServiceRecordsByType: React.FC<ServiceRecordsByTypeProps> = ({
  serviceRecords,
  isLoading,
  onViewRecord,
  serviceItemTypes,
  title
}) => {
  // Filter service records that contain any of the specified service item types
  const filteredRecords = serviceRecords.filter(record => 
    record.serviceItems && 
    record.serviceItems.some(item => serviceItemTypes.includes(item.type as ServiceItemType))
  );

  if (filteredRecords.length === 0) {
    return null; // Don't render anything if there are no records
  }

  return (
    <div className="mt-4 mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip servisa</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.map((record) => {
              // Find the matching service items
              const matchingItems = record.serviceItems?.filter(item => 
                serviceItemTypes.includes(item.type as ServiceItemType)
              ) || [];
              
              return (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatDateForDisplay(record.serviceDate)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {matchingItems.map(item => formatServiceItemType(item.type)).join(', ')}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                    {matchingItems.length > 0 
                      ? matchingItems.map(item => item.description).filter(Boolean).join(', ') || record.description
                      : record.description}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onViewRecord(record)}
                      className="text-indigo-600 hover:text-indigo-900"
                      aria-label="Pregledaj servisni zapis"
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper function to format service item type for display
function formatServiceItemType(type: string): string {
  const typeMap: Record<string, string> = {
    // Hoses
    'HOSE_REPLACEMENT': 'Zamjena crijeva',
    'HOSE_PRESSURE_TEST': 'Test pritiska crijeva',
    
    // Filter
    'FILTER_REPLACEMENT': 'Zamjena filtera',
    'FILTER_CLEANING': 'Čišćenje filtera',
    'FILTER_ANNUAL_INSPECTION': 'Godišnja inspekcija filtera',
    'FILTER_EW_SENSOR_INSPECTION': 'Inspekcija EW senzora',
    
    // Tanker
    'TANKER_PRESSURE_TEST': 'Test pritiska cisterne',
    'TANKER_FIRE_SAFETY_TEST': 'Test sigurnosti od požara',
    'TANKER_CALIBRATION': 'Kalibracija cisterne',
    
    // Calibrations
    'CONDUCTIVITY_METER_CALIBRATION': 'Kalibracija mjerača provodljivosti',
    'HYDROMETER_CALIBRATION': 'Kalibracija hidrometra',
    'MAIN_FLOW_METER_CALIBRATION': 'Kalibracija glavnog mjerača protoka',
    'RESISTANCE_METER_CALIBRATION': 'Kalibracija mjerača otpora',
    'THERMOMETER_CALIBRATION': 'Kalibracija termometra',
    'TORQUE_WRENCH_CALIBRATION': 'Kalibracija moment ključa',
    
    // Other
    'WATER_CHEMICAL_TEST': 'Hemijski test na vodu',
    'TACHOGRAPH_CALIBRATION': 'Kalibracija tahografa',
    'OIL_CHANGE': 'Zamjena ulja',
    'BRAKE_SERVICE': 'Servis kočnica',
    'TIRE_REPLACEMENT': 'Zamjena guma',
    'ENGINE_SERVICE': 'Servis motora',
    'ELECTRICAL_SERVICE': 'Servis elektrike',
    'GENERAL_SERVICE': 'Opšti servis',
    'OTHER': 'Ostalo'
  };
  
  return typeMap[type] || type;
}

export default ServiceRecordsByType;
