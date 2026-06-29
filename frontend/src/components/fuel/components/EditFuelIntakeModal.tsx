'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import { FuelIntakeRecord, FuelCategory, Currency, FuelIntakeDocument } from '@/types/fuel';
import { updateFuelIntakeRecord, uploadFuelIntakeDocument, fetchWithAuth } from '@/lib/apiService';

interface EditFuelIntakeModalProps {
  record: FuelIntakeRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRecord: FuelIntakeRecord) => void;
}

interface EditFormData {
  intake_datetime: string;
  fuel_category: string;
  delivery_vehicle_driver_name: string;
  delivery_vehicle_plate: string;
  refinery_name: string;
  total_price: string;
  price_per_kg: string;
  currency: string;
  supplier_name: string;
}

const EditFuelIntakeModal: React.FC<EditFuelIntakeModalProps> = ({
  record,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState<EditFormData>({
    intake_datetime: '',
    fuel_category: '',
    delivery_vehicle_driver_name: '',
    delivery_vehicle_plate: '',
    refinery_name: '',
    total_price: '',
    price_per_kg: '',
    currency: '',
    supplier_name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('otpremnica');
  const [existingDocuments, setExistingDocuments] = useState<FuelIntakeDocument[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Initialize form data when record changes
  useEffect(() => {
    if (record) {
      setFormData({
        intake_datetime: dayjs(record.intake_datetime).format('YYYY-MM-DDTHH:mm'),
        fuel_category: record.fuel_category || '',
        delivery_vehicle_driver_name: record.delivery_vehicle_driver_name || '',
        delivery_vehicle_plate: record.delivery_vehicle_plate || '',
        refinery_name: record.refinery_name || '',
        total_price: record.total_price?.toString() || '',
        price_per_kg: record.price_per_kg?.toString() || '',
        currency: record.currency || '',
        supplier_name: record.supplier_name || ''
      });
      setErrors({});
      setSelectedFile(null);

      // Fetch existing documents
      fetchExistingDocuments(record.id);
    }
  }, [record]);

  // Fetch existing documents for this intake record
  const fetchExistingDocuments = async (recordId: number) => {
    setLoadingDocuments(true);
    try {
      const docs = await fetchWithAuth<FuelIntakeDocument[]>(`/api/fuel/intakes/${recordId}/documents`);
      setExistingDocuments(docs || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setExistingDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload document
  const handleDocumentUpload = async () => {
    if (!selectedFile) {
      toast.error('Molimo odaberite dokument');
      return;
    }

    setIsUploadingDocument(true);
    try {
      await uploadFuelIntakeDocument(record.id, selectedFile, documentType);
      toast.success('Dokument uspješno učitan');
      setSelectedFile(null);
      // Refresh documents list
      fetchExistingDocuments(record.id);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Greška pri učitavanju dokumenta');
    } finally {
      setIsUploadingDocument(false);
    }
  };

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

    // Auto-calculate price_per_kg when total_price changes
    if (name === 'total_price' && value && record.quantity_kg_received) {
      const totalPrice = parseFloat(value);
      const quantityKg = parseFloat(record.quantity_kg_received.toString());
      if (!isNaN(totalPrice) && !isNaN(quantityKg) && quantityKg > 0) {
        const calculatedPricePerKg = totalPrice / quantityKg;
        setFormData(prev => ({
          ...prev,
          price_per_kg: calculatedPricePerKg.toFixed(5)
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.intake_datetime) {
      newErrors.intake_datetime = 'Datum i vrijeme su obavezni';
    }

    if (!formData.delivery_vehicle_plate) {
      newErrors.delivery_vehicle_plate = 'Registracija vozila je obavezna';
    }

    if (formData.total_price && parseFloat(formData.total_price) < 0) {
      newErrors.total_price = 'Ukupna cijena mora biti pozitivna';
    }

    if (formData.price_per_kg && parseFloat(formData.price_per_kg) < 0) {
      newErrors.price_per_kg = 'Cijena po kg mora biti pozitivna';
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
      if (formData.intake_datetime !== dayjs(record.intake_datetime).format('YYYY-MM-DDTHH:mm')) {
        updatePayload.intake_datetime = new Date(formData.intake_datetime).toISOString();
      }

      if (formData.fuel_category !== (record.fuel_category || '')) {
        updatePayload.fuel_category = formData.fuel_category;
      }

      if (formData.delivery_vehicle_driver_name !== (record.delivery_vehicle_driver_name || '')) {
        updatePayload.delivery_vehicle_driver_name = formData.delivery_vehicle_driver_name;
      }

      if (formData.delivery_vehicle_plate !== (record.delivery_vehicle_plate || '')) {
        updatePayload.delivery_vehicle_plate = formData.delivery_vehicle_plate;
      }

      if (formData.refinery_name !== (record.refinery_name || '')) {
        updatePayload.refinery_name = formData.refinery_name;
      }

      if (formData.total_price !== (record.total_price?.toString() || '')) {
        updatePayload.total_price = parseFloat(formData.total_price);
      }

      if (formData.price_per_kg !== (record.price_per_kg?.toString() || '')) {
        updatePayload.price_per_kg = parseFloat(formData.price_per_kg);
      }

      if (formData.currency !== (record.currency || '')) {
        updatePayload.currency = formData.currency;
      }

      if (formData.supplier_name !== (record.supplier_name || '')) {
        updatePayload.supplier_name = formData.supplier_name;
      }

      // Only make API call if there are changes
      if (Object.keys(updatePayload).length > 0) {
        const updatedRecord = await updateFuelIntakeRecord(record.id, updatePayload);
        onUpdate(updatedRecord);
        toast.success('Zapis o prijemu goriva uspješno ažuriran');
        onClose();
      } else {
        toast('Nema promjena za ažuriranje');
        onClose();
      }
    } catch (error) {
      console.error('Error updating fuel intake record:', error);
      toast.error('Greška pri ažuriranju zapisa o prijemu goriva');
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
              Uredi Zapis o Prijemu Goriva
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
                name="intake_datetime"
                value={formData.intake_datetime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.intake_datetime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.intake_datetime && (
                <p className="text-red-500 text-sm mt-1">{errors.intake_datetime}</p>
              )}
            </div>

            {/* Kategorija */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategorija
              </label>
              <select
                name="fuel_category"
                value={formData.fuel_category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Odaberite kategoriju</option>
                <option value="Izvoz">Izvoz</option>
                <option value="Domaće tržište">Domaće tržište</option>
              </select>
            </div>

            {/* Vozač */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vozač
              </label>
              <input
                type="text"
                name="delivery_vehicle_driver_name"
                value={formData.delivery_vehicle_driver_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ime i prezime vozača"
              />
            </div>

            {/* Registracija vozila */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registracija vozila *
              </label>
              <input
                type="text"
                name="delivery_vehicle_plate"
                value={formData.delivery_vehicle_plate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.delivery_vehicle_plate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Npr. T-123-AB"
              />
              {errors.delivery_vehicle_plate && (
                <p className="text-red-500 text-sm mt-1">{errors.delivery_vehicle_plate}</p>
              )}
            </div>

            {/* Rafinerija */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rafinerija
              </label>
              <input
                type="text"
                name="refinery_name"
                value={formData.refinery_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Naziv rafinerije"
              />
            </div>

            {/* Dobavljač */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dobavljač
              </label>
              <input
                type="text"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Naziv dobavljača"
              />
            </div>

            {/* Valuta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valuta
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Odaberite valutu</option>
                <option value="BAM">BAM</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {/* Ukupna cijena */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ukupna cijena
              </label>
              <input
                type="number"
                name="total_price"
                value={formData.total_price}
                onChange={handleInputChange}
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.total_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.total_price && (
                <p className="text-red-500 text-sm mt-1">{errors.total_price}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Cijena po kg će se automatski izračunati na osnovu ukupne cijene i količine ({record.quantity_kg_received} kg)
              </p>
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
                readOnly
              />
              {errors.price_per_kg && (
                <p className="text-red-500 text-sm mt-1">{errors.price_per_kg}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Ovo polje se automatski izračunava na osnovu ukupne cijene
              </p>
            </div>

            {/* Document Upload Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Dokumenti</h4>

              {/* Existing Documents */}
              {loadingDocuments ? (
                <p className="text-sm text-gray-500 mb-3">Učitavanje dokumenata...</p>
              ) : existingDocuments.length > 0 ? (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">Postojeći dokumenti:</p>
                  <ul className="space-y-1">
                    {existingDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center text-xs text-gray-700 bg-white p-2 rounded border">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="flex-1">{doc.document_name}</span>
                        <span className="text-gray-400 ml-2">({doc.document_type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-3">Nema učitanih dokumenata</p>
              )}

              {/* Upload New Document */}
              <div className="space-y-2">
                <p className="text-xs text-gray-600">Dodaj novi dokument:</p>
                <div className="flex gap-2">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="otpremnica">Otpremnica</option>
                    <option value="faktura">Faktura</option>
                    <option value="certifikat">Certifikat kvaliteta</option>
                    <option value="carinska_deklaracija">Carinska deklaracija</option>
                    <option value="ostalo">Ostalo</option>
                  </select>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="flex-1 text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                    <span className="text-xs text-gray-700">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={handleDocumentUpload}
                      disabled={isUploadingDocument}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isUploadingDocument ? 'Učitavanje...' : 'Učitaj'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Read-only fields info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Polja koja se ne mogu editovati:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Količina (kg): {record.quantity_kg_received} kg</p>
                <p>• Količina (litri): {record.quantity_liters_received} L</p>
                <p>• Gustoća: {record.specific_gravity}</p>
                <p>• Tip goriva: {record.fuel_type}</p>
                <p>• Raspodjela po tankovima: {record.fixedTankTransfers?.length || 0} tankova</p>
              </div>
            </div>

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

export default EditFuelIntakeModal;
