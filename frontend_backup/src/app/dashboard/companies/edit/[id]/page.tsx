'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCompanyById, updateCompany, UpdateCompanyPayload } from '@/lib/apiService';
import { Company } from '@/types';
import withAuth from '@/components/auth/withAuth';
import toast from 'react-hot-toast';
import { FaBuilding, FaSave, FaTimes, FaSpinner } from 'react-icons/fa';

const EditCompanyPage = () => {
  const router = useRouter();
  const params = useParams();
  // Ensure params and params.id are not null/undefined before using them
  const id = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<UpdateCompanyPayload>({ name: '' });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchCompany = async () => {
        setPageLoading(true);
        try {
          const companyData = await getCompanyById(Number(id));
          setCompany(companyData);
          setFormData({ name: companyData.name });
        } catch (err) {
          console.error('Failed to fetch company:', err);
          let errorMessage = 'Greška prilikom dobavljanja podataka o firmi.';
          if (err instanceof Error && err.message) {
            errorMessage = err.message;
          }
          setError(errorMessage);
          toast.error(errorMessage);
          // It's important to check if router is available before pushing
          if (router) {
            router.push('/dashboard/companies'); // Redirect if company not found or error
          }
        } finally {
          setPageLoading(false);
        }
      };
      fetchCompany();
    } else if (params && !params.id && router) {
      // Handle the case where id is not present in params, perhaps redirect or show error
      toast.error('ID firme nije pronađen.');
      router.push('/dashboard/companies');
    }
  }, [id, params, router]);

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
      await updateCompany(Number(id), formData);
      toast.success(`Firma "${formData.name}" uspješno ažurirana.`);
      router.push('/dashboard/companies');
    } catch (err) {
      console.error('Failed to update company:', err);
      let errorMessage = 'Greška prilikom ažuriranja firme. Provjerite da li firma sa tim imenom već postoji.';
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return (
    <div className="flex justify-center items-center h-screen">
      <FaSpinner className="animate-spin text-4xl text-blue-600" />
      <p className="ml-3 text-lg text-gray-700">Učitavanje podataka o firmi...</p>
    </div>
  );

  if (error && !company) return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <p className="text-red-500 text-xl">{error}</p>
        <button 
            onClick={() => router.push('/dashboard/companies')}
            className='mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
        >
            Nazad na Firme
        </button>
    </div>
  );

  if (!company) return null; // Should be handled by error state or redirect

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white shadow-xl rounded-lg p-8 md:p-10">
        <div className="flex items-center mb-8">
          <FaBuilding className="text-3xl text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Uredi Firmu: {company.name}</h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Greška prilikom ažuriranja</p>
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
              disabled={loading || pageLoading}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSave className="mr-2" /> {loading ? 'Spremanje...' : 'Spremi Izmjene'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default withAuth(EditCompanyPage, ['ADMIN']); // Only ADMIN can access this page
