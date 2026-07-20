'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import { FuelingOperation, AirlineFE, FuelTankFE } from '../types';
import { updateFuelingOperation } from '@/lib/apiService';

interface EditOperationModalProps {
  operation: any; // Using any to avoid type conflicts
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedOperation: any) => void;
  airlines: AirlineFE[];
  tanks: FuelTankFE[];
}

interface EditFormData {
  dateTime: string;
  aircraft_registration: string;
  airlineId: string;
  destination: string;
  flight_number: string;
  price_per_kg: string;
  currency: string;
  tip_saobracaja: string;
  notes: string;
  delivery_note_number: string;
  usd_exchange_rate: string;
  payment_method: string;
}

const EditOperationModal: React.FC<EditOperationModalProps> = ({
  operation,
  isOpen,
  onClose,
  onUpdate,
  airlines,
  tanks
}) => {
  const [formData, setFormData] = useState<EditFormData>({
    dateTime: '',
    aircraft_registration: '',
    airlineId: '',
    destination: '',
    flight_number: '',
    price_per_kg: '',
    currency: '',
    tip_saobracaja: '',
    notes: '',
    delivery_note_number: '',
    usd_exchange_rate: '',
    payment_method: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Initialize form data when operation changes
  useEffect(() => {
    if (operation) {
      setFormData({
        dateTime: dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm'),
        aircraft_registration: operation.aircraft_registration || '',
        airlineId: operation.airlineId?.toString() || '',
        destination: operation.destination || '',
        flight_number: operation.flight_number || '',
        price_per_kg: operation.price_per_kg?.toString() || '',
        currency: operation.currency || 'EUR',
        tip_saobracaja: operation.tip_saobracaja || '',
        notes: operation.notes || '',
        delivery_note_number: operation.delivery_note_number || '',
        usd_exchange_rate: (operation.usd_exchange_rate !== undefined && operation.usd_exchange_rate !== null) ? String(operation.usd_exchange_rate) : '',
        payment_method: operation.payment_method || ''
      });
      setErrors({});
    }
  }, [operation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dateTime) {
      newErrors.dateTime = 'Datum i vrijeme su obavezni';
    }

    if (!formData.aircraft_registration) {
      newErrors.aircraft_registration = 'Registracija aviona je obavezna';
    }

    if (!formData.airlineId) {
      newErrors.airlineId = 'Avio kompanija je obavezna';
    }

    if (!formData.destination) {
      newErrors.destination = 'Destinacija je obavezna';
    }

    if (formData.price_per_kg && parseFloat(formData.price_per_kg) <= 0) {
      newErrors.price_per_kg = 'Cijena po kg mora biti veća od 0';
    }

    // Kurs validacija (nije obavezan, ali ako je unesen mora biti > 0)
    if (formData.usd_exchange_rate) {
      const val = parseFloat(formData.usd_exchange_rate);
      if (isNaN(val) || val <= 0) {
        newErrors.usd_exchange_rate = 'Kurs mora biti pozitivan broj';
      }
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatePayload: any = {};

      // Only include fields that have changed
      if (formData.dateTime !== dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm')) {
        updatePayload.dateTime = new Date(formData.dateTime).toISOString();
      }

      if (formData.aircraft_registration !== (operation.aircraft_registration || '')) {
        updatePayload.aircraft_registration = formData.aircraft_registration;
      }

      if (formData.airlineId !== operation.airlineId?.toString()) {
        updatePayload.airlineId = parseInt(formData.airlineId);
      }

      if (formData.destination !== (operation.destination || '')) {
        updatePayload.destination = formData.destination;
      }

      if (formData.flight_number !== (operation.flight_number || '')) {
        updatePayload.flight_number = formData.flight_number;
      }

      if (formData.price_per_kg !== (operation.price_per_kg?.toString() || '')) {
        updatePayload.price_per_kg = parseFloat(formData.price_per_kg);
      }

      if (formData.currency !== (operation.currency || 'EUR')) {
        updatePayload.currency = formData.currency;
      }

      if (formData.tip_saobracaja !== (operation.tip_saobracaja || '')) {
        updatePayload.tip_saobracaja = formData.tip_saobracaja;
      }

      if (formData.notes !== (operation.notes || '')) {
        updatePayload.notes = formData.notes;
      }

      if (formData.delivery_note_number !== (operation.delivery_note_number || '')) {
        updatePayload.delivery_note_number = formData.delivery_note_number;
      }

      // Kurs ažuriranje (ako se promijenio)
      const originalRate = (operation.usd_exchange_rate !== undefined && operation.usd_exchange_rate !== null) ? String(operation.usd_exchange_rate) : '';
      if (formData.usd_exchange_rate !== originalRate) {
        updatePayload.usd_exchange_rate = formData.usd_exchange_rate === '' ? null : parseFloat(formData.usd_exchange_rate);
      }

      // Check if there are files to upload
      const hasFiles = selectedFiles.length > 0;
      
      // Only make API call if there are changes or files to upload
      if (Object.keys(updatePayload).length > 0 || hasFiles) {
        let updatedOperation;
        
        if (hasFiles) {
          // Use FormData for file upload
          const submissionFormData = new FormData();
          
          // Add all form data
          Object.keys(updatePayload).forEach(key => {
            const value = updatePayload[key];
            if (value !== undefined && value !== null) {
              submissionFormData.append(key, value.toString());
            }
          });
          
          // Add documents
          selectedFiles.forEach((file) => {
            submissionFormData.append('documents', file);
          });
          
          updatedOperation = await updateFuelingOperation(operation.id, submissionFormData);
        } else {
          // Use regular JSON payload
          updatedOperation = await updateFuelingOperation(operation.id, updatePayload);
        }
        
        onUpdate(updatedOperation);
        toast.success('Operacija uspješno ažurirana');
        onClose();
      } else {
        toast('Nema promjena za ažuriranje');
        onClose();
      }
    } catch (error) {
      console.error('Error updating operation:', error);
      toast.error('Greška pri ažuriranju operacije');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Uredi Operaciju Točenja Goriva
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datum i vrijeme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum i vrijeme *
              </label>
              <input
                type="datetime-local"
                name="dateTime"
                value={formData.dateTime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dateTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dateTime && (
                <p className="text-red-500 text-sm mt-1">{errors.dateTime}</p>
              )}
            </div>

            {/* Registracija aviona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registracija aviona *
              </label>
              <input
                type="text"
                name="aircraft_registration"
                value={formData.aircraft_registration}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.aircraft_registration ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Npr. 9A-ABC"
              />
              {errors.aircraft_registration && (
                <p className="text-red-500 text-sm mt-1">{errors.aircraft_registration}</p>
              )}
            </div>

            {/* Avio kompanija */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avio kompanija *
              </label>
              <select
                name="airlineId"
                value={formData.airlineId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.airlineId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Odaberite avio kompaniju</option>
                {airlines.map((airline) => (
                  <option key={airline.id} value={airline.id}>
                    {airline.name}
                  </option>
                ))}
              </select>
              {errors.airlineId && (
                <p className="text-red-500 text-sm mt-1">{errors.airlineId}</p>
              )}
            </div>

            {/* Destinacija */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destinacija *
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.destination ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Npr. Sarajevo"
              />
              {errors.destination && (
                <p className="text-red-500 text-sm mt-1">{errors.destination}</p>
              )}
            </div>

            {/* Broj leta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broj leta
              </label>
              <input
                type="text"
                name="flight_number"
                value={formData.flight_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Npr. W6-1234"
              />
            </div>

            {/* Broj dostavnice */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broj dostavnice
              </label>
              <input
                type="text"
                name="delivery_note_number"
                value={formData.delivery_note_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Npr. DN-2024-001"
              />
            </div>

            {/* Cijena po kg */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cijena po kg
              </label>
              <input
                type="number"
                name="price_per_kg"
                value={formData.price_per_kg}
                onChange={handleInputChange}
                step="0.00001"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price_per_kg ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00000"
              />
              {errors.price_per_kg && (
                <p className="text-red-500 text-sm mt-1">{errors.price_per_kg}</p>
              )}
            </div>

            {/* Valuta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valuta fakture
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="BAM">BAM</option>
              </select>
            </div>

            {/* Kurs za valute (USD/EUR) */}
            {formData.currency && formData.currency !== 'BAM' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kurs ({formData.currency} → BAM)
                </label>
                <input
                  type="number"
                  name="usd_exchange_rate"
                  value={formData.usd_exchange_rate}
                  onChange={handleInputChange}
                  step="0.00001"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.usd_exchange_rate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={formData.currency === 'EUR' ? '1.95583 (preporučeno)' : 'npr. 1.80'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unesite kurs za dan transakcije. Ako ostavite prazno, koristi se postojeća vrijednost ({operation.usd_exchange_rate ?? (formData.currency === 'EUR' ? '1.95583' : 'n/a')}).
                </p>
                {errors.usd_exchange_rate && (
                  <p className="text-red-500 text-sm mt-1">{errors.usd_exchange_rate}</p>
                )}
              </div>
            )}



            {/* Tip saobraćaja */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip saobraćaja
              </label>
              <select
                name="tip_saobracaja"
                value={formData.tip_saobracaja}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Odaberite tip saobraćaja</option>
                <option value="Izvoz">Izvoz</option>
                <option value="Unutarnji saobraćaj">Unutarnji saobraćaj</option>
                <option value="Domaće tržište">Domaće tržište</option>
              </select>
            </div>

            {/* Način plaćanja */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Način plaćanja
              </label>
              <select
                name="payment_method"
                value={formData.payment_method || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Odaberite način plaćanja</option>
                <option value="VIRMAN">Virman</option>
                <option value="POS_APARAT">POS aparat</option>
                <option value="GOTOVINA">Gotovina</option>
              </select>
            </div>

            {/* Napomene */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Napomene
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dodatne napomene..."
              />
            </div>

            {/* Dokumenti */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dodaj Dokumente (Opcionalno)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-300 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="document" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Odaberite datoteke</span>
                      <input
                        type="file"
                        name="document"
                        id="document"
                        onChange={handleFileChange}
                        className="sr-only"
                        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                        multiple
                      />
                    </label>
                    <p className="pl-1">ili ih prevucite ovdje</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, Word, TXT, PNG, JPG do 10MB</p>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Možete odabrati više dokumenata odjednom</p>
            </div>

            {/* Prikaz odabranih dokumenata */}
            {selectedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Odabrani dokumenti:</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded mb-1 hover:bg-indigo-50 transition-colors">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-indigo-500 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
                          <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                          <p className="text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
                        }}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Ažuriranje...' : 'Ažuriraj'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditOperationModal; 