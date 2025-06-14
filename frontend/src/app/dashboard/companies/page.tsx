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
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div className="flex items-center">
            <div className="mr-4 p-3 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <FaBuilding className="h-8 w-8 text-[#e53e3e]" />
            </div>
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
          </div>
          <Link href="/dashboard/companies/new">
            <Button 
              variant="default"
              className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2"
            >
              <FaPlus className="h-4 w-4" />
              Dodaj Novu Firmu
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-[#e53e3e]/20 backdrop-blur-md border border-white/10 shadow-lg p-4 rounded-xl">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <FaExclamationTriangle className="text-[#e53e3e]" />
            </div>
            <p className="text-white">{error}</p>
          </div>
        </div>
      )}

      {/* Search Box */}
      <div className="relative overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-md rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-white/70" />
            </div>
            <input
              type="text"
              placeholder="Pretraži firme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-white/20 rounded-xl backdrop-blur-md bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#e53e3e] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white"
              >
                <FaTimesCircle />
              </button>
            )}
          </div>
          <Link href="/dashboard/companies/add">
            <Button className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2">
              <FaPlus size={16} />
              <span>Dodaj Firmu</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Companies List */}
      <div className="relative overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] shadow-lg rounded-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          {filteredCompanies.length === 0 && !loading ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg flex items-center justify-center mb-6">
                <FaBuilding className="h-10 w-10 text-[#e53e3e]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Nema pronađenih firmi
              </h3>
              {companies.length > 0 && searchTerm && (
                <p className="text-white/70 max-w-md mx-auto mb-4">
                  Pokušajte sa drugim terminom pretrage.
                </p>
              )}
              {companies.length === 0 && !searchTerm && (
                <p className="text-white/70 max-w-md mx-auto mb-4">
                  Nema unesenih firmi. Kliknite na dugme ispod da dodate novu.
                </p>
              )}
              
              <Link href="/dashboard/companies/new" className="inline-block mt-2">
                <Button 
                  variant="default"
                  className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2"
                >
                  <FaPlus className="h-4 w-4" />
                  Dodaj Novu Firmu
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Naziv Firme</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">ID Broj</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Grad</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Adresa</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Kontakt Osoba</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Telefon</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider text-center">Broj Vozila</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider text-center">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company, index) => (
                    <motion.tr 
                      key={company.id} 
                      className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="mr-3 p-1.5 bg-[#4FC3C7]/20 backdrop-blur-md rounded-lg border border-white/10 shadow-sm">
                            <FaBuilding className="text-[#4FC3C7]" />
                          </div>
                          <span className="font-medium text-white">{company.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/80">{company.taxId || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/80">{company.city || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/80">{company.address || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/80">{company.contactPersonName || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/80">{company.contactPersonPhone || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className="backdrop-blur-sm bg-[#e53e3e]/20 border border-white/20 rounded-full px-3 py-1 inline-flex items-center">
                            <FaCar className="mr-2 text-[#e53e3e] h-3 w-3" />
                            <span className="text-white">{company.vehicles ? company.vehicles.length : '0'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Link href={`/dashboard/companies/edit/${company.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#4FC3C7] hover:text-[#4FC3C7] border border-white/10 hover:bg-[#4FC3C7]/20 backdrop-blur-md"
                              aria-label="Uredi firmu"
                            >
                              <FaEdit size={16} />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#e53e3e] hover:text-[#e53e3e] border border-white/10 hover:bg-[#e53e3e]/20 backdrop-blur-md"
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
