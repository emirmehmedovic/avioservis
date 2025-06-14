'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ServiceItemType, ServiceRecordCategory } from '@/types';
import { createServiceRecord, uploadServiceRecordDocument } from '@/lib/apiService';
import { FaCalendarAlt, FaFileAlt, FaTools, FaUpload, FaSpinner } from 'react-icons/fa';

interface WorkOrderFormProps {
  vehicleId: number;
  onSubmit: () => void;
  onClose: () => void;
}

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ vehicleId, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    // Zaglavlje radnog naloga
    nazivFirme: '',
    adresaFirme: '',
    telefonFirme: '',
    // Osnovni podaci
    serviceDate: new Date().toISOString().split('T')[0],
    description: '',
    marka: '',
    registracija: '',
    godiste: '',
    motTip: '',
    kilometraza: '',
    vlasnikPrimjedbe: '',
    otklonjeniKvarovi: '',
    ugradjeniDijelovi: '',
    uoceniKvarovi: '',
    napomena: '',
  });
  
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Kreiraj opis radnog naloga koji sadrži sve unesene podatke
      const workOrderDescription = `
RADNI NALOG

<!-- ZAGLAVLJE -->
<!-- NazivFirme: ${formData.nazivFirme} -->
<!-- AdresaFirme: ${formData.adresaFirme} -->
<!-- TelefonFirme: ${formData.telefonFirme} -->

Datum: ${formData.serviceDate}
Marka vozila/tip: ${formData.marka}
Reg.: ${formData.registracija}
God.: ${formData.godiste}
Mot.tip.: ${formData.motTip}
Km.: ${formData.kilometraza}

Primjedbe vlasnika vozila:
${formData.vlasnikPrimjedbe}

Otklonjeni kvarovi:
${formData.otklonjeniKvarovi}

Popis ugrađenih dijelova:
${formData.ugradjeniDijelovi}

Uočeni kvarovi ili nedostaci:
${formData.uoceniKvarovi}

Napomena:
${formData.napomena}

${formData.description}
      `.trim();

      // Kreiraj servisni zapis sa tipom WORK_ORDER
      const serviceRecordData = {
        serviceDate: formData.serviceDate,
        description: workOrderDescription,
        category: ServiceRecordCategory.REGULAR_MAINTENANCE,
        serviceItems: [
          {
            type: ServiceItemType.WORK_ORDER,
            description: 'Radni nalog',
          }
        ]
      };

      // Pošalji servisni zapis
      const response = await createServiceRecord(vehicleId.toString(), {
        ...serviceRecordData,
        vehicleId
      });

      // Ako je dodan dokument, uploadaj ga
      if (documentFile && response.id) {
        await uploadServiceRecordDocument(
          vehicleId.toString(), 
          response.id.toString(), 
          documentFile
        );
      }

      toast.success('Radni nalog uspješno kreiran!');
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Greška pri kreiranju radnog naloga:', error);
      toast.error('Došlo je do greške pri kreiranju radnog naloga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Zaglavlje radnog naloga */}
      <div className="p-4 bg-gray-50 rounded-lg mb-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Zaglavlje radnog naloga</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Naziv firme
            </label>
            <input
              type="text"
              name="nazivFirme"
              value={formData.nazivFirme}
              onChange={handleChange}
              placeholder="Unesite naziv firme"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adresa
            </label>
            <input
              type="text"
              name="adresaFirme"
              value={formData.adresaFirme}
              onChange={handleChange}
              placeholder="Unesite adresu"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <input
              type="text"
              name="telefonFirme"
              value={formData.telefonFirme}
              onChange={handleChange}
              placeholder="Unesite telefon"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Datum <FaCalendarAlt className="inline-block ml-1 text-gray-500" />
          </label>
          <input
            type="date"
            name="serviceDate"
            value={formData.serviceDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Marka vozila/tip
          </label>
          <input
            type="text"
            name="marka"
            value={formData.marka}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Registracija
          </label>
          <input
            type="text"
            name="registracija"
            value={formData.registracija}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Godište
          </label>
          <input
            type="text"
            name="godiste"
            value={formData.godiste}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mot.tip.
          </label>
          <input
            type="text"
            name="motTip"
            value={formData.motTip}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Kilometraža
        </label>
        <input
          type="text"
          name="kilometraza"
          value={formData.kilometraza}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Primjedbe vlasnika vozila
        </label>
        <textarea
          name="vlasnikPrimjedbe"
          value={formData.vlasnikPrimjedbe}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Otklonjeni kvarovi
        </label>
        <textarea
          name="otklonjeniKvarovi"
          value={formData.otklonjeniKvarovi}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Popis ugrađenih dijelova
        </label>
        <textarea
          name="ugradjeniDijelovi"
          value={formData.ugradjeniDijelovi}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Uočeni kvarovi ili nedostaci
        </label>
        <textarea
          name="uoceniKvarovi"
          value={formData.uoceniKvarovi}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Napomena
        </label>
        <textarea
          name="napomena"
          value={formData.napomena}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Dodatni opis <FaFileAlt className="inline-block ml-1 text-gray-500" />
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Dokument <FaUpload className="inline-block ml-1 text-gray-500" />
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Odustani
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <FaSpinner className="mr-2 h-4 w-4 animate-spin" /> Kreiranje...
            </>
          ) : (
            <>
              <FaTools className="mr-2 h-4 w-4" /> Kreiraj radni nalog
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default WorkOrderForm;
