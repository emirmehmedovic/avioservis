'use client';

import React, { useState, useEffect } from 'react';
import { updateVehicle } from '@/lib/apiService';
import { Vehicle } from '@/types';
import { toast } from 'react-toastify';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';

interface EditableItemProps {
  label: string;
  value?: string | number | boolean | Date | null; 
  icon?: React.ReactNode;
  vehicleId: number;
  fieldName: keyof Vehicle; 
  onUpdate: () => void; 
  type?: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
}

const EditableItem: React.FC<EditableItemProps> = ({
  label,
  value,
  icon,
  vehicleId,
  fieldName,
  onUpdate,
  type = 'text',
  options,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(
    (value === null || value === undefined) && (type === 'text' || type === 'number' || type === 'textarea') 
    ? '' 
    : value
  );

  useEffect(() => {
    setSelectedValue(
      (value === null || value === undefined) && (type === 'text' || type === 'number' || type === 'textarea') 
      ? '' 
      : value
    );
  }, [value, type]);

  // Format date for display
  const formatDateForDisplay = (date: Date | null | undefined) => {
    if (!date) return <span className="text-gray-400 italic">Nema podatka</span>;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return <span className="text-gray-400 italic">Neispravan datum</span>; 
    return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
  };

  // Format date for input
  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return ''; 
    return dateObj.toISOString().split('T')[0];
  };

  // Handle opening modal
  const handleOpenModal = () => {
    // For boolean type, convert to actual boolean if it's a string
    if (type === 'boolean' && typeof selectedValue === 'string') {
      setSelectedValue(selectedValue === 'true');
    }
    // For date type, ensure it's in the correct format for the input
    if (type === 'date' && selectedValue) {
      setSelectedValue(formatDateForInput(selectedValue as Date));
    }
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle saving item
  const handleSaveItem = async () => {
    try {
      let valueToSave = selectedValue;
      
      // Convert to appropriate types based on the field type
      if (type === 'number' && typeof selectedValue === 'string') {
        valueToSave = selectedValue === '' ? null : Number(selectedValue);
      } else if (type === 'boolean' && typeof selectedValue === 'string') {
        valueToSave = selectedValue === 'true';
      } else if (type === 'date' && typeof selectedValue === 'string') {
        valueToSave = selectedValue ? new Date(selectedValue) : null;
      }

      // Create update payload with just the field being updated
      const updatePayload = {
        [fieldName]: valueToSave
      };

      console.log(`Ažuriranje polja ${fieldName} za vozilo ID ${vehicleId}:`, updatePayload);

      // Call API to update vehicle
      await updateVehicle(vehicleId, updatePayload);
      
      // Close modal and refresh data
      setIsModalOpen(false);
      onUpdate();
      
      // Show success message
      toast.success(`${label} uspješno ažuriran!`);
    } catch (error: any) {
      const errorMessage = error.message || 'Nepoznata greška';
      console.error(`Greška pri ažuriranju ${label}:`, error);
      toast.error(`Greška pri ažuriranju ${label}: ${errorMessage}`);
    }
  };

  // Display value based on type
  const displayValue = () => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Nema podatka</span>;
    }
    if (type === 'boolean') {
      return value ? 'Da' : 'Ne';
    }
    if (type === 'date') {
      return formatDateForDisplay(value as Date);
    }
    return value.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          {icon && <span className="text-indigo-500 mr-2">{icon}</span>}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <button
          onClick={handleOpenModal}
          className="text-gray-400 hover:text-indigo-600 transition-colors"
          aria-label={`Uredi ${label}`}
        >
          <FaEdit />
        </button>
      </div>
      <div className="mt-1.5 text-sm text-gray-800">{displayValue()}</div>

      {/* Modal for editing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Uredi {label}</h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Zatvori"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4">
              {type === 'textarea' ? (
                <textarea
                  value={selectedValue as string}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                />
              ) : type === 'select' && options ? (
                <select
                  value={selectedValue as string}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Odaberite...</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : type === 'boolean' ? (
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={selectedValue === true}
                      onChange={() => setSelectedValue(true)}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Da</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      checked={selectedValue === false}
                      onChange={() => setSelectedValue(false)}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Ne</span>
                  </label>
                </div>
              ) : (
                <input
                  type={type}
                  value={selectedValue === null ? '' : selectedValue as string}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Otkaži
              </button>
              <button
                onClick={handleSaveItem}
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

export default EditableItem;
