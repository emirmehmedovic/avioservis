'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Company } from '@/types';
import { getCompanies, deleteCompany } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimesCircle, FaBuilding, FaCar, FaExclamationTriangle } from 'react-icons/fa';
import { FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/common/ConfirmModal'; 
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

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
      } catch (err: any) {
        console.error('Failed to fetch companies', err);
        const errorMessage = err.message || 'Greška prilikom dobavljanja firmi.';
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
    } catch (err: any) {
      console.error('Failed to delete company', err);
      const errorMessage = err.message || 'Greška prilikom brisanja firme.';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
      setShowConfirmModal(false);
      setCompanyToDelete(null);
    }
  };

  if (loading && companies.length === 0) return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-150px)]">
      <motion.div 
        className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-lg font-medium text-muted-foreground mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        Učitavanje podataka o firmama...
      </p>
    </div>
  );

  return (
    <motion.div 
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600 rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-800 rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-white"
              >
                Upravljanje Firmama
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-gray-300 mt-1"
              >
                Pregled, dodavanje i uređivanje kompanija u sistemu
              </motion.p>
            </div>
            <Link href="/dashboard/companies/new">
              <Button
                variant="default"
                className="backdrop-blur-md bg-slate-600/80 hover:bg-slate-700 border border-white/20 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-medium duration-200 flex items-center gap-2"
              >
                <FaPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Firma</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 shadow-md p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <FaExclamationTriangle className="text-red-600" />
            </div>
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Search Box */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pretraži firme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-full text-sm transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <FaTimesCircle />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {filteredCompanies.length === 0 && !loading ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-6">
              <FaBuilding className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Nema pronađenih firmi
            </h3>
            {companies.length > 0 && searchTerm && (
              <p className="text-gray-600 max-w-md mx-auto mb-4">
                Pokušajte sa drugim terminom pretrage.
              </p>
            )}
            {companies.length === 0 && !searchTerm && (
              <p className="text-gray-600 max-w-md mx-auto mb-4">
                Nema unesenih firmi. Kliknite na dugme u headeru da dodate novu.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Naziv Firme</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">ID Broj</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Grad</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Adresa</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Kontakt Osoba</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Telefon</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider text-center">Broj Vozila</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider text-center">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company, index) => (
                  <motion.tr
                    key={company.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                          <FaBuilding className="text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.taxId || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.city || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.address || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.contactPersonName || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.contactPersonPhone || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 inline-flex items-center gap-2">
                          <FaCar className="text-blue-600 h-3 w-3" />
                          <span className="text-blue-900 font-medium text-sm">{company.vehicles ? company.vehicles.length : '0'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/companies/edit/${company.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300"
                            aria-label="Uredi firmu"
                          >
                            <FaEdit size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-300"
                          onClick={() => openDeleteModal(company)}
                          aria-label="Obriši firmu"
                        >
                          <FaTrash size={16} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </motion.div>
  );
};

// Protect page and specify allowed roles (e.g., ADMIN for full access, others for view only)
// For now, allowing ADMIN, SERVICER, FUEL_USER to view. Edit/Delete/Add will be ADMIN only on respective pages/actions.
export default withAuth(CompaniesPage, ['ADMIN', 'SERVICER', 'FUEL_USER']);
