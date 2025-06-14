'use client';

import React from 'react';
import { ServiceRecord, ServiceItemType } from '@/types';
import { formatDateForDisplay } from './serviceHelpers';
import { FaEye } from 'react-icons/fa';

interface CalibrationServiceRecordsProps {
  serviceRecords: ServiceRecord[];
  isLoading: boolean;
  onViewRecord: (record: ServiceRecord) => void;
  calibrationType: ServiceItemType;
  title: string;
}

const CalibrationServiceRecords: React.FC<CalibrationServiceRecordsProps> = ({
  serviceRecords,
  isLoading,
  onViewRecord,
  calibrationType,
  title
}) => {
  // Filter service records that contain the specified calibration type
  const filteredRecords = serviceRecords.filter(record => 
    record.serviceItems && 
    record.serviceItems.some(item => item.type === calibrationType)
  );

  if (filteredRecords.length === 0) {
    return null; // Don't render anything if there are no records
  }

  return (
    <div className="mt-4 mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title} - Historija servisa</h4>
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.map((record) => {
              // Find the specific service item of this type
              const serviceItem = record.serviceItems?.find(item => item.type === calibrationType);
              
              return (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatDateForDisplay(record.serviceDate)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                    {serviceItem?.description || record.description}
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

export default CalibrationServiceRecords;
