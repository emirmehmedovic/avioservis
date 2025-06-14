'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { updateFuelingOperation } from '@/lib/apiService';

interface ExdKNumberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: number;
  currentExdNumber: string | null;
  currentKNumber: string | null;
  onUpdate: (exdNumber: string | null, kNumber: string | null) => void;
}

const ExdKNumberEditModal: React.FC<ExdKNumberEditModalProps> = ({
  isOpen,
  onClose,
  operationId,
  currentExdNumber,
  currentKNumber,
  onUpdate
}) => {
  const [exdNumber, setExdNumber] = useState<string>(currentExdNumber || '');
  const [kNumber, setKNumber] = useState<string>(currentKNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ exdNumber?: string; kNumber?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { exdNumber?: string; kNumber?: string } = {};
    
    // Provjera da EXD broj nije duži od 50 znakova
    if (exdNumber && exdNumber.length > 50) {
      newErrors.exdNumber = 'EXD broj ne može biti duži od 50 karaktera.';
    }
    
    // Provjera da K broj nije duži od 50 znakova
    if (kNumber && kNumber.length > 50) {
      newErrors.kNumber = 'K broj ne može biti duži od 50 karaktera.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Priprema podataka za ažuriranje
      const updateData = {
        exd_number: exdNumber || null,
        k_number: kNumber || null
      };

      // Poziv API-ja za ažuriranje
      await updateFuelingOperation(operationId, updateData);
      
      // Obavještavanje parent komponente
      onUpdate(updateData.exd_number, updateData.k_number);
      
      // Zatvaranje modala
      onClose();
      
      // Prikazivanje poruke o uspjehu
      toast.success('EXD i K brojevi su uspješno ažurirani.');
    } catch (error) {
      console.error('Error updating EXD and K numbers:', error);
      toast.error('Došlo je do greške prilikom ažuriranja EXD i K brojeva.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Uredi EXD i K brojeve</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="exdNumber" className="block text-sm font-medium text-gray-700">EXD BROJ</label>
            <input
              type="text"
              id="exdNumber"
              value={exdNumber}
              onChange={(e) => setExdNumber(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.exdNumber ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              placeholder="Unesite EXD broj"
              maxLength={50}
            />
            {errors.exdNumber && <p className="text-red-500 text-xs mt-1">{errors.exdNumber}</p>}
          </div>

          <div className="mb-6">
            <label htmlFor="kNumber" className="block text-sm font-medium text-gray-700">K BROJ</label>
            <input
              type="text"
              id="kNumber"
              value={kNumber}
              onChange={(e) => setKNumber(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.kNumber ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              placeholder="Unesite K broj"
              maxLength={50}
            />
            {errors.kNumber && <p className="text-red-500 text-xs mt-1">{errors.kNumber}</p>}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Spremanje...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Spremi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExdKNumberEditModal;
