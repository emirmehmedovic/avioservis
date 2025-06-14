'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { createCompany, CreateCompanyPayload } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import toast from 'react-hot-toast';
import { FaBuilding, FaSave, FaTimes, FaHashtag, FaCity, FaMapMarkerAlt, FaUserTie, FaPhone } from 'react-icons/fa';

// Proširujemo CreateCompanyPayload lokalno ako nije ažuriran u apiService
// Idealno bi bilo ažurirati CreateCompanyPayload u @/lib/apiService ili types/index.ts
interface ExtendedCreateCompanyPayload extends CreateCompanyPayload {
  taxId?: string;
  city?: string;
  address?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
}

const NewCompanyPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<ExtendedCreateCompanyPayload>({
    name: '',
    taxId: '',
    city: '',
    address: '',
    contactPersonName: '',
    contactPersonPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Naziv firme je obavezan.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Šaljemo cijeli formData koji sada uključuje nova polja
      await createCompany(formData as CreateCompanyPayload); // Type assertion ako createCompany očekuje strogi CreateCompanyPayload
      toast.success(`Firma "${formData.name}" uspješno kreirana.`);
      router.push('/dashboard/companies'); 
    } catch (err: any) {
      console.error('Failed to create company:', err);
      const errorMessage = err.message || 'Greška prilikom kreiranja firme. Provjerite da li firma sa tim imenom već postoji.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white shadow-xl rounded-lg p-8 md:p-10">
        <div className="flex items-center mb-8">
          <FaBuilding className="text-3xl text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Dodaj Novu Firmu</h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Greška</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Naziv Firme <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="Unesite naziv firme"
            />
          </div>

          {/* PDV Broj */}
          <div>
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
              PDV Broj (ID)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaHashtag className="text-gray-400 h-5 w-5" />
              </div>
              <input
                type="text"
                name="taxId"
                id="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Unesite PDV broj"
              />
            </div>
          </div>

          {/* Grad */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              Grad
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCity className="text-gray-400 h-5 w-5" />
              </div>
              <input
                type="text"
                name="city"
                id="city"
                value={formData.city}
                onChange={handleChange}
                className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Unesite grad"
              />
            </div>
          </div>

          {/* Adresa */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Adresa
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaMapMarkerAlt className="text-gray-400 h-5 w-5" />
              </div>
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleChange}
                className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Unesite adresu firme"
              />
            </div>
          </div>

          {/* Kontakt Osoba */}
          <div>
            <label htmlFor="contactPersonName" className="block text-sm font-medium text-gray-700 mb-1">
              Kontakt Osoba
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUserTie className="text-gray-400 h-5 w-5" />
              </div>
              <input
                type="text"
                name="contactPersonName"
                id="contactPersonName"
                value={formData.contactPersonName}
                onChange={handleChange}
                className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Ime i prezime kontakt osobe"
              />
            </div>
          </div>

          {/* Telefon Kontakt Osobe */}
          <div>
            <label htmlFor="contactPersonPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefon Kontakt Osobe
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaPhone className="text-gray-400 h-5 w-5" />
              </div>
              <input
                type="text" // Može biti i type="tel"
                name="contactPersonPhone"
                id="contactPersonPhone"
                value={formData.contactPersonPhone}
                onChange={handleChange}
                className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Broj telefona"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/companies')}
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-150 ease-in-out disabled:opacity-50"
            >
              <FaTimes className="mr-2" /> Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSave className="mr-2" /> {loading ? 'Spremanje...' : 'Spremi Firmu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default withAuth(NewCompanyPage, ['ADMIN']); // Only ADMIN can access this page
