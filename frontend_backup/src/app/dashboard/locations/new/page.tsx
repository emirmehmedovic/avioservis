'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLocation } from '@/lib/apiService';
import { CreateLocationPayload } from '@/types';
import withAuth from '@/components/auth/withAuth';

const NewLocationPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateLocationPayload>({
    name: '',
    address: '',
    companyTaxId: '', 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: CreateLocationPayload = {
        ...formData,
        companyTaxId: formData.companyTaxId === '' ? null : formData.companyTaxId,
        address: formData.address === '' ? null : formData.address,
      };
      await createLocation(payload);
      setSuccessMessage('Lokacija uspješno kreirana! Bićete preusmjereni.');
      setFormData({ name: '', address: '', companyTaxId: '' }); 
      setTimeout(() => {
        router.push('/dashboard/locations');
      }, 2000);
    } catch (err) {
      console.error('Failed to create location:', err);
      let errorMessage = 'Došlo je do greške prilikom kreiranja lokacije.';
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
    setIsLoading(false);
  };

  const inputClass = "shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out";

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center transition duration-300 ease-in-out"
      >
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
        Nazad
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Dodaj Novu Lokaciju</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4">
        {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
        {successMessage && <p className="mb-4 text-center text-green-500 bg-green-100 p-3 rounded-md">{successMessage}</p>}

        <div className="mb-6">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Naziv Lokacije <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">Adresa</label>
          <input
            type="text"
            name="address"
            id="address"
            value={formData.address || ''}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        
        <div className="mb-8">
          <label htmlFor="companyTaxId" className="block text-gray-700 text-sm font-bold mb-2">PDV Broj Kompanije (Opciono)</label>
          <input
            type="text"
            name="companyTaxId"
            id="companyTaxId"
            value={formData.companyTaxId || ''}
            onChange={handleChange}
            className={inputClass}
            placeholder="Unesite PDV broj"
          />
        </div>

        <div className="flex items-center justify-between">
          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out w-full"
          >
            {isLoading ? 'Kreiranje...' : 'Kreiraj Lokaciju'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default withAuth(NewLocationPage, ['ADMIN']); 
