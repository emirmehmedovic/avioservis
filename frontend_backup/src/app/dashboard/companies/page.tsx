'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Company } from '@/types';
import { getCompanies, deleteCompany } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/common/ConfirmModal'; 

const CompaniesPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const data = await getCompanies();
        setCompanies(data);
        setFilteredCompanies(data);
      } catch (err) {
        console.error('Failed to fetch companies', err);
        let errorMessage = 'Greška prilikom dobavljanja firmi.';
        if (err instanceof Error && err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    const results = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(results);
  }, [searchTerm, companies]);

  const openDeleteModal = (company: Company) => {
    setCompanyToDelete(company);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteCompany(companyToDelete.id);
      setCompanies(prevCompanies => prevCompanies.filter(comp => comp.id !== companyToDelete.id));
      toast.success(`Firma "${companyToDelete.name}" uspješno obrisana.`);
    } catch (err) {
      console.error('Failed to delete company', err);
      let errorMessage = 'Greška prilikom brisanja firme.';
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
      setShowConfirmModal(false);
      setCompanyToDelete(null);
    }
  };

  if (loading && companies.length === 0) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Firme</h1>
        <Link href="/dashboard/companies/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center transition duration-150 ease-in-out">
          <FaPlus className="mr-2" /> Dodaj Novu Firmu
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Greška! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Pretraži firme po nazivu..."
          className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out pr-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {searchTerm ? (
            <FaTimesCircle 
              className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={() => setSearchTerm('')}
            />
          ) : (
            <FaSearch className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {filteredCompanies.length === 0 && !loading ? (
         <div className="text-center py-10 bg-white shadow-md rounded-lg">
            <p className="text-xl text-gray-500">Nema pronađenih firmi.</p>
            {companies.length > 0 && searchTerm && (
                <p className="text-sm text-gray-400 mt-2">Pokušajte sa drugim terminom pretrage.</p>
            )}
            {companies.length === 0 && !searchTerm && (
                 <p className="text-sm text-gray-400 mt-2">Nema unesenih firmi. Kliknite na dugme iznad da dodate novu.</p>
            )}
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6">Naziv Firme</th>
                <th className="py-3 px-6 text-center">Broj Vozila</th>
                <th className="py-3 px-6 text-center">Akcije</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="border-b border-gray-200 hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="py-4 px-6">
                     {/* Link to company details page can be added here later */}
                    <span className='font-medium'>{company.name}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {company.vehicles ? company.vehicles.length : '-'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Link 
                      href={`/dashboard/companies/edit/${company.id}`} 
                      className="text-blue-600 hover:text-blue-800 mr-3 transition duration-150 ease-in-out" 
                      title="Uredi"
                    >
                      <FaEdit size={18} />
                    </Link>
                    <button
                      onClick={() => openDeleteModal(company)}
                      className="text-red-500 hover:text-red-700 transition duration-150 ease-in-out" 
                      title="Obriši"
                      // Add check for ADMIN role here if needed, or handle in withAuth
                    >
                      <FaTrash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showConfirmModal && companyToDelete && (
        <ConfirmModal
          title={`Potvrdi Brisanje Firme`}
          message={`Da li ste sigurni da želite obrisati firmu "${companyToDelete.name}"? Ova akcija je nepovratna.`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmModal(false)}
          confirmButtonText="Obriši"
          cancelButtonText="Otkaži"
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
};

// Protect page and specify allowed roles (e.g., ADMIN for full access, others for view only)
// For now, allowing ADMIN, SERVICER, FUEL_USER to view. Edit/Delete/Add will be ADMIN only on respective pages/actions.
export default withAuth(CompaniesPage, ['ADMIN', 'SERVICER', 'FUEL_USER']);
