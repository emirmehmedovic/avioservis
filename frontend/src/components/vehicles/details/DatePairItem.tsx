'use client';

import React, { useState } from 'react';
import { updateVehicle } from '@/lib/apiService';
import { Vehicle } from '@/types';
import { toast } from 'react-toastify';
import { FaEdit, FaSave, FaTimes, FaCalendarAlt } from 'react-icons/fa';

interface DatePairItemProps {
  // Možemo koristiti ili baseLabel ili title za naslov
  baseLabel?: string;
  title?: string;
  lastDate?: Date | string | null;
  nextDate?: Date | string | null;
  vehicleId?: number;
  lastDateFieldName?: keyof Vehicle;
  nextDateFieldName?: keyof Vehicle;
  onUpdate?: () => void;
  icon?: React.ReactNode;
  // Dodatna svojstva za prilagođavanje prikaza
  showLastDate?: boolean;
  lastDateLabel?: string;
  nextDateLabel?: string;
}

const DatePairItem: React.FC<DatePairItemProps> = ({
  baseLabel,
  title,
  lastDate,
  nextDate,
  vehicleId,
  lastDateFieldName,
  nextDateFieldName,
  onUpdate,
  icon,
  showLastDate = true,
  lastDateLabel = "Zadnji",
  nextDateLabel = "Sljedeći"
}) => {
  // Koristimo title ako je proslijeđen, inače baseLabel
  const displayLabel = title || baseLabel || "";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastDateValue, setLastDateValue] = useState(lastDate ? new Date(lastDate).toISOString().split('T')[0] : '');
  const [nextDateValue, setNextDateValue] = useState(nextDate ? new Date(nextDate).toISOString().split('T')[0] : '');

  // Helper function for displaying dates in the component
  const formatDateForDisplay = (date: Date | string | null | undefined) => {
    if (!date) return <span className="text-gray-400 italic">Nema podatka</span>;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return <span className="text-gray-400 italic">Neispravan datum</span>; 
    return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
  };

  const handleOpenModal = () => {
    setLastDateValue(lastDate ? new Date(lastDate).toISOString().split('T')[0] : '');
    setNextDateValue(nextDate ? new Date(nextDate).toISOString().split('T')[0] : '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveDates = async () => {
    try {
      // Ako nemamo vehicleId, lastDateFieldName, nextDateFieldName ili onUpdate, samo zatvorimo modal
      if (!vehicleId || !lastDateFieldName || !nextDateFieldName || !onUpdate) {
        setIsModalOpen(false);
        return;
      }
      
      // Create update payload with both date fields
      const updatePayload = {
        [lastDateFieldName]: lastDateValue ? new Date(lastDateValue) : null,
        [nextDateFieldName]: nextDateValue ? new Date(nextDateValue) : null
      };

      // Call API to update vehicle
      await updateVehicle(vehicleId, updatePayload);
      
      // Close modal and refresh data
      setIsModalOpen(false);
      onUpdate();
      
      // Show success message
      toast.success(`${displayLabel} datumi uspješno ažurirani!`);
    } catch (error) {
      console.error(`Greška pri ažuriranju ${displayLabel} datuma:`, error);
      toast.error(`Greška pri ažuriranju ${displayLabel} datuma.`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          {icon && <span className="text-indigo-500 mr-2">{icon}</span>}
          <span className="text-sm font-medium text-gray-700">{displayLabel}</span>
        </div>
        {vehicleId && lastDateFieldName && nextDateFieldName && onUpdate && (
          <button
            onClick={handleOpenModal}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            aria-label={`Uredi ${displayLabel} datume`}
          >
            <FaEdit />
          </button>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {showLastDate && (
          <div className="flex items-center text-sm">
            <span className="text-gray-600 mr-2">{lastDateLabel}:</span>
            <span className="text-gray-800">{formatDateForDisplay(lastDate)}</span>
          </div>
        )}
        <div className="flex items-center text-sm">
          <span className="text-gray-600 mr-2">{nextDateLabel}:</span>
          <span className="text-gray-800">{formatDateForDisplay(nextDate)}</span>
        </div>
      </div>

      {/* Modal for editing dates */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Uredi {displayLabel} datume</h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Zatvori"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zadnji datum {baseLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaCalendarAlt className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={lastDateValue}
                    onChange={(e) => setLastDateValue(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sljedeći datum {baseLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaCalendarAlt className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={nextDateValue}
                    onChange={(e) => setNextDateValue(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Otkaži
              </button>
              <button
                onClick={handleSaveDates}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <FaSave className="inline mr-1" /> Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePairItem;
