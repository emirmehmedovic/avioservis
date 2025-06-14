import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowUpCircleIcon, PencilIcon, TrashIcon, EyeIcon, ExclamationCircleIcon, TruckIcon, BeakerIcon, MapPinIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import TankRefillForm from './TankRefillForm';
import { fetchWithAuth } from '@/lib/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileTankTransaction } from '@/types/fuel';
import { format } from 'date-fns';

interface FuelTank {
  id: number;
  identifier: string;
  name: string;
  location: string;
  location_description?: string;
  capacity_liters: number;
  current_liters: number;
  current_quantity_liters?: number; // Added for compatibility
  fuel_type: string;
  last_refill_date?: string;
  last_maintenance_date?: string;
}

export default function TankManagement() {
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentTank, setCurrentTank] = useState<FuelTank | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<MobileTankTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    identifier: '',
    name: '',
    location: '',
    capacity_liters: '',
    current_liters: '',
    fuel_type: 'Jet A-1'
  });

  useEffect(() => {
    fetchTanks();
  }, []);

  const fetchTanks = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth<FuelTank[]>('/api/fuel/tanks');
      setTanks(data);
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error('Greška pri učitavanju tankera');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      identifier: '',
      name: '',
      location: '',
      capacity_liters: '',
      current_liters: '',
      fuel_type: 'Jet A-1'
    });
  };

  const handleAddTank = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Pretvaranje string vrijednosti u brojeve za API poziv
      const dataToSubmit = {
        ...formData,
        capacity_liters: parseFloat(formData.capacity_liters) || 0,
        current_liters: parseFloat(formData.current_liters) || 0
      };
      
      await fetchWithAuth<FuelTank>('/api/fuel/tanks', {
        method: 'POST',
        body: JSON.stringify(dataToSubmit),
      });
      
      toast.success('Tanker uspješno dodan');
      setShowAddModal(false);
      resetForm();
      fetchTanks();
    } catch (error) {
      console.error('Error adding tank:', error);
      toast.error('Greška pri dodavanju tankera');
    }
  };

  const handleEditTank = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTank) return;
    
    try {
      // Pretvaranje string vrijednosti u brojeve za API poziv
      const dataToSubmit = {
        ...formData,
        capacity_liters: parseFloat(formData.capacity_liters) || 0,
        current_liters: parseFloat(formData.current_liters) || 0
      };
      
      await fetchWithAuth<FuelTank>(`/api/fuel/tanks/${currentTank.id}`, {
        method: 'PUT',
        body: JSON.stringify(dataToSubmit),
      });
      
      toast.success('Tanker uspješno ažuriran');
      setShowEditModal(false);
      resetForm();
      fetchTanks();
    } catch (error) {
      console.error('Error updating tank:', error);
      toast.error('Greška pri ažuriranju tankera');
    }
  };

  const handleDeleteTank = async (id: number) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj tanker?')) return;
    
    try {
      await fetchWithAuth<{ message: string }>(`/api/fuel/tanks/${id}`, {
        method: 'DELETE',
      });
      
      toast.success('Tanker uspješno obrisan');
      fetchTanks();
    } catch (error) {
      console.error('Error deleting tank:', error);
      toast.error('Greška pri brisanju tankera');
    }
  };

  const openEditModal = (tank: FuelTank) => {
    setCurrentTank(tank);
    setFormData({
      identifier: tank.identifier,
      name: tank.name,
      location: tank.location,
      capacity_liters: tank.capacity_liters.toString(),
      current_liters: tank.current_liters.toString(),
      fuel_type: tank.fuel_type
    });
    setShowEditModal(true);
  };

  const openRefillModal = (tank: FuelTank) => {
    setCurrentTank(tank);
    setShowRefillModal(true);
  };
  
  const openHistoryModal = async (tank: FuelTank) => {
    setCurrentTank(tank);
    setShowHistoryModal(true);
    await fetchTankTransactions(tank.id);
  };
  
  const fetchTankTransactions = async (tankId: number) => {
    setLoadingTransactions(true);
    try {
      const data = await fetchWithAuth<MobileTankTransaction[]>(`/api/fuel/tanks/${tankId}/transactions`);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching tank transactions:', error);
      toast.error('Greška pri učitavanju historije transakcija');
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Calculate fill percentage
  const calculateFillPercentage = (current: number, capacity: number) => {
    return Math.min(Math.round((current / capacity) * 100), 100);
  };
  
  // Get status indicator based on fill percentage
  const getStatusIndicator = (percentage: number) => {
    if (percentage < 15) return { label: 'Nizak nivo', color: 'bg-red-500', textColor: 'text-red-800', bgColor: 'bg-red-50' };
    if (percentage < 30) return { label: 'Nizak nivo', color: 'bg-orange-500', textColor: 'text-orange-800', bgColor: 'bg-orange-50' };
    if (percentage < 50) return { label: 'Srednje', color: 'bg-yellow-500', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50' };
    if (percentage < 80) return { label: 'Dobro', color: 'bg-blue-500', textColor: 'text-blue-800', bgColor: 'bg-blue-50' };
    return { label: 'Puno', color: 'bg-green-500', textColor: 'text-green-800', bgColor: 'bg-green-50' };
  };

  // Filter tanks based on search term
  const filteredTanks = tanks.filter(tank => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tank.name.toLowerCase().includes(searchLower) ||
      tank.identifier.toLowerCase().includes(searchLower) ||
      tank.location.toLowerCase().includes(searchLower) ||
      tank.fuel_type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {/* Header with title and action buttons */}
      <div className="hope-gradient p-6 rounded-t-lg shadow-md text-white">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8H21L19 16H5L3 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="17" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Avio Cisterne
            </h2>
            <p className="text-sm opacity-80 mt-1">Pregled i upravljanje mobilnim cisternama za gorivo</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="mt-4 sm:mt-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md backdrop-blur-sm border border-white/20 transition-colors flex items-center font-medium shadow-sm"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-5 w-5" />
            Dodaj Novu Cisternu
          </button>
        </div>
        
        {/* Search and filter bar */}
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-white/60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-white/20 rounded-lg leading-5 bg-white/10 backdrop-blur-sm placeholder-white/60 focus:outline-none focus:bg-white/20 focus:border-white/30 transition duration-150 ease-in-out text-sm text-white shadow-inner"
            placeholder="Pretraži cisterne po nazivu, identifikatoru, lokaciji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-white/40 text-xs">
            {filteredTanks.length} {filteredTanks.length === 1 ? 'rezultat' : 'rezultata'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 p-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 border-opacity-50 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-indigo-700 font-medium">Učitavanje podataka o cisternama...</p>
          </div>
        </div>
      ) : tanks.length === 0 ? (
        <div className="p-8 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto"
          >
            <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
              <ExclamationCircleIcon className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nema unesenih cisterni</h3>
            <p className="text-gray-500 mb-6">Trenutno nema dostupnih podataka o avio cisternama. Dodajte prvu cisternu da započnete.</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white hope-gradient focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <PlusIcon className="-ml-0.5 mr-2 h-5 w-5" />
              Dodaj Prvu Cisternu
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTanks.map((tank, index) => {
              // Use current_quantity_liters if available (for compatibility), otherwise use current_liters
              const currentAmount = tank.current_quantity_liters !== undefined ? tank.current_quantity_liters : tank.current_liters;
              const fillPercentage = calculateFillPercentage(currentAmount, tank.capacity_liters);
              const status = getStatusIndicator(fillPercentage);
              const locationText = tank.location_description || tank.location;
              
              return (
                <motion.div
                  key={tank.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 relative group"
                >
                  {/* Card Header with hope gradient */}
                  <div className="hope-gradient px-5 py-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1 z-10">
                      <button
                        onClick={() => openRefillModal(tank)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                        title="Dopuni cisternu"
                      >
                        <ArrowUpCircleIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(tank)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                        title="Uredi cisternu"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTank(tank.id)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                        title="Obriši cisternu"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Abstract background pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#pattern-${tank.id})" />
                        <defs>
                          <pattern id={`pattern-${tank.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M0 20 L40 20 M20 0 L20 40" stroke="currentColor" strokeWidth="1" fill="none" />
                          </pattern>
                        </defs>
                      </svg>
                    </div>
                    
                    {/* Tank icon */}
                    <div className="absolute right-4 bottom-4 opacity-30">
                      <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8H21L19 16H5L3 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="17" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    
                    {/* Tank name and identifier */}
                    <div className="relative z-10">
                      <div className="flex items-center">
                        <h3 className="text-xl font-bold mr-3">{tank.name}</h3>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                          {tank.identifier}
                        </span>
                      </div>
                      <p className="mt-1 text-sm opacity-90 truncate">{locationText}</p>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-5">
                    {/* Status indicator */}
                    <div className="flex justify-between items-center mb-4">
                      <div className={`${status.bgColor} px-3 py-1 rounded-full flex items-center`}>
                        <span className={`w-2 h-2 rounded-full ${status.color} mr-2`}></span>
                        <span className={`text-xs font-semibold ${status.textColor}`}>{status.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{fillPercentage}%</span>
                        <span className="text-xs text-gray-500 ml-1">popunjenost</span>
                      </div>
                    </div>
                    
                    {/* Fuel gauge visualization */}
                    <div className="mb-6">
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${status.color}`}
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Tank details in a grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Tip Goriva</p>
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
                          <p className="font-medium text-gray-900">{tank.fuel_type}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Kapacitet</p>
                        <p className="font-medium text-gray-900">{tank.capacity_liters.toLocaleString()} L</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Trenutna Količina</p>
                        <p className="font-medium text-gray-900 text-lg">
                          {currentAmount.toLocaleString()} L
                          <span className="text-xs text-gray-500 ml-2">od {tank.capacity_liters.toLocaleString()} L</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="mt-5 flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openRefillModal(tank)}
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white hope-gradient focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
                        >
                          <ArrowUpCircleIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                          Dopuni
                        </button>
                        
                        <button
                          onClick={() => openEditModal(tank)}
                          className="flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
                        >
                          <PencilIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                          Uredi
                        </button>
                        
                        <button
                          onClick={() => handleDeleteTank(tank.id)}
                          className="flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
                        >
                          <TrashIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                          Obriši
                        </button>
                      </div>
                      
                      <button
                        onClick={() => openHistoryModal(tank)}
                        className="flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
                      >
                        <ClockIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Historija Transakcija
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Tank Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="hope-gradient p-5 rounded-t-lg text-white relative overflow-hidden">
                {/* Abstract background pattern */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#add-pattern)" />
                    <defs>
                      <pattern id="add-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M0 20 L40 20 M20 0 L20 40" stroke="currentColor" strokeWidth="1" fill="none" />
                      </pattern>
                    </defs>
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold flex items-center relative z-10">
                  <PlusIcon className="w-6 h-6 mr-2" />
                  Dodaj Novu Cisternu
                </h3>
                <p className="mt-1 text-sm opacity-90 relative z-10">Unos podataka o novoj avio cisterni</p>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleAddTank}>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2"
                  >
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                      <div className="flex items-center mb-3">
                        <BeakerIcon className="w-5 h-5 text-indigo-600 mr-2" />
                        <h4 className="font-medium text-indigo-800">Osnovne Informacije</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                            Identifikator
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="text"
                              name="identifier"
                              id="identifier"
                              value={formData.identifier}
                              onChange={handleInputChange}
                              required
                              placeholder="npr. AV-001"
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Naziv
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              placeholder="npr. Cisterna 1"
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                      <div className="flex items-center mb-3">
                        <MapPinIcon className="w-5 h-5 text-indigo-600 mr-2" />
                        <h4 className="font-medium text-indigo-800">Lokacija</h4>
                      </div>
                      
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                          Lokacija Cisterne
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="text"
                            name="location"
                            id="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            required
                            placeholder="npr. Aerodrom Sarajevo"
                            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-indigo-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 14C19 16.7614 16.7614 19 14 19H10C7.23858 19 5 16.7614 5 14V10C5 7.23858 7.23858 5 10 5H14C16.7614 5 19 7.23858 19 10V14Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h4 className="font-medium text-indigo-800">Kapacitet i Gorivo</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="capacity_liters" className="block text-sm font-medium text-gray-700">
                            Kapacitet (litara)
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="number"
                              name="capacity_liters"
                              id="capacity_liters"
                              min="0"
                              step="0.1"
                              value={formData.capacity_liters || ''}
                              onChange={handleInputChange}
                              required
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">L</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="current_liters" className="block text-sm font-medium text-gray-700">
                            Trenutna Količina
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="number"
                              name="current_liters"
                              id="current_liters"
                              min="0"
                              step="0.1"
                              value={formData.current_liters || ''}
                              onChange={handleInputChange}
                              required
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">L</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label htmlFor="fuel_type" className="block text-sm font-medium text-gray-700">
                            Tip Goriva
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <select
                              id="fuel_type"
                              name="fuel_type"
                              value={formData.fuel_type}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10 appearance-none"
                            >
                              <option value="Jet A-1">Jet A-1</option>
                              <option value="Avgas 100LL">Avgas 100LL</option>
                              <option value="Druga vrsta goriva">Druga vrsta goriva</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  <div className="mt-6 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:text-sm transition-colors"
                    >
                      Odustani
                    </button>
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2.5 hope-gradient text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Dodaj Cisternu
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tank Modal */}
      {showEditModal && currentTank && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="hope-gradient p-5 rounded-t-lg text-white relative overflow-hidden">
                {/* Abstract background pattern */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#edit-pattern)" />
                    <defs>
                      <pattern id="edit-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M0 20 L40 20 M20 0 L20 40" stroke="currentColor" strokeWidth="1" fill="none" />
                      </pattern>
                    </defs>
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold flex items-center relative z-10">
                  <PencilIcon className="w-6 h-6 mr-2" />
                  Uredi Cisternu
                </h3>
                <p className="mt-1 text-sm opacity-90 relative z-10">{currentTank.name} ({currentTank.identifier})</p>
              </div>
              
              <div className="p-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-lg border border-indigo-100 shadow-sm"
                >
                  <div className="flex items-center mb-3">
                    <TruckIcon className="w-5 h-5 text-indigo-600 mr-2" />
                    <h4 className="font-medium text-indigo-800">Informacije o Cisternu</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Trenutna količina</p>
                      <p className="text-base font-semibold text-gray-900">{currentTank.current_liters.toLocaleString()} L</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Kapacitet</p>
                      <p className="text-base font-semibold text-gray-900">{currentTank.capacity_liters.toLocaleString()} L</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Slobodno</p>
                      <p className="text-base font-semibold text-gray-900">{(currentTank.capacity_liters - currentTank.current_liters).toLocaleString()} L</p>
                    </div>
                  </div>
                </motion.div>
                
                <form onSubmit={handleEditTank}>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2"
                  >
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                      <div className="flex items-center mb-3">
                        <BeakerIcon className="w-5 h-5 text-indigo-600 mr-2" />
                        <h4 className="font-medium text-indigo-800">Osnovne Informacije</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="edit-identifier" className="block text-sm font-medium text-gray-700">
                            Identifikator
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="text"
                              name="identifier"
                              id="edit-identifier"
                              value={formData.identifier}
                              onChange={handleInputChange}
                              required
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                            Naziv
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="text"
                              name="name"
                              id="edit-name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                      <div className="flex items-center mb-3">
                        <MapPinIcon className="w-5 h-5 text-indigo-600 mr-2" />
                        <h4 className="font-medium text-indigo-800">Lokacija</h4>
                      </div>
                      
                      <div>
                        <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700">
                          Lokacija Cisterne
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="text"
                            name="location"
                            id="edit-location"
                            value={formData.location}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="npr. Aerodrom Sarajevo"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-indigo-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 14C19 16.7614 16.7614 19 14 19H10C7.23858 19 5 16.7614 5 14V10C5 7.23858 7.23858 5 10 5H14C16.7614 5 19 7.23858 19 10V14Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h4 className="font-medium text-indigo-800">Kapacitet i Gorivo</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="edit-capacity_liters" className="block text-sm font-medium text-gray-700">
                            Kapacitet (litara)
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="number"
                              name="capacity_liters"
                              id="edit-capacity_liters"
                              min="0"
                              step="0.1"
                              value={formData.capacity_liters || ''}
                              onChange={handleInputChange}
                              required
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">L</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="edit-current_liters" className="block text-sm font-medium text-gray-700">
                            Trenutna Količina
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="number"
                              name="current_liters"
                              id="edit-current_liters"
                              min="0"
                              step="0.1"
                              value={formData.current_liters || ''}
                              onChange={handleInputChange}
                              required
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">L</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label htmlFor="edit-fuel_type" className="block text-sm font-medium text-gray-700">
                            Tip Goriva
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <select
                              id="edit-fuel_type"
                              name="fuel_type"
                              value={formData.fuel_type}
                              onChange={handleInputChange}
                              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10 appearance-none"
                            >
                              <option value="Jet A-1">Jet A-1</option>
                              <option value="Avgas 100LL">Avgas 100LL</option>
                              <option value="Druga vrsta goriva">Druga vrsta goriva</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  <div className="mt-6 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:text-sm transition-colors"
                    >
                      Odustani
                    </button>
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2.5 hope-gradient text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-colors"
                    >
                      <PencilIcon className="w-5 h-5 mr-2" />
                      Spremi Promjene
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refill Tank Modal */}
      {showRefillModal && currentTank && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <TankRefillForm 
                tankId={currentTank.id} 
                onSuccess={() => {
                  setShowRefillModal(false);
                  fetchTanks();
                }}
                onCancel={() => setShowRefillModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction History Modal */}
      {showHistoryModal && currentTank && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="hope-gradient p-5 rounded-t-lg text-white relative overflow-hidden">
                {/* Abstract background pattern */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#history-pattern)" />
                    <defs>
                      <pattern id="history-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M0 20 L40 20 M20 0 L20 40" stroke="currentColor" strokeWidth="1" fill="none" />
                      </pattern>
                    </defs>
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold flex items-center relative z-10">
                  <ClockIcon className="w-6 h-6 mr-2" />
                  Historija Transakcija
                </h3>
                <p className="mt-1 text-sm opacity-90 relative z-10">
                  Pregled historije dopuna i transfera za cisternu {currentTank.name} ({currentTank.identifier})
                </p>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {loadingTransactions ? (
                  <div className="flex justify-center py-6">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-opacity-50 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                      </div>
                      <p className="mt-4 text-indigo-700 font-medium">Učitavanje transakcija...</p>
                    </div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Nema transakcija</h3>
                    <p className="mt-1 text-sm text-gray-500">Za ovu cisternu još uvijek nema zabilježenih transakcija.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Transakcije</h4>
                      <span className="text-sm text-gray-500">{transactions.length} {transactions.length === 1 ? 'transakcija' : 'transakcija'}</span>
                    </div>
                    
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Datum i vrijeme</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tip transakcije</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Količina (L)</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Izvor/Destinacija</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Napomena</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {transactions.map((transaction) => {
                            // Determine transaction type display and badge color
                            let typeDisplay = '';
                            let badgeColor = '';
                            let sourceDestDisplay = '';
                            
                            switch(transaction.type) {
                              case 'supplier_refill':
                                typeDisplay = 'Dopuna od dobavljača';
                                badgeColor = 'bg-green-100 text-green-800';
                                sourceDestDisplay = transaction.supplier_name || 'N/A';
                                break;
                              case 'fixed_tank_transfer':
                                typeDisplay = 'Transfer iz fiksnog tanka';
                                badgeColor = 'bg-blue-100 text-blue-800';
                                sourceDestDisplay = transaction.source_name || 'N/A';
                                break;
                              case 'aircraft_fueling':
                                typeDisplay = 'Točenje aviona';
                                badgeColor = 'bg-orange-100 text-orange-800';
                                sourceDestDisplay = transaction.destination_name || 'N/A';
                                break;
                              case 'adjustment':
                                typeDisplay = 'Korekcija količine';
                                badgeColor = 'bg-gray-100 text-gray-800';
                                sourceDestDisplay = 'Sistemska korekcija';
                                break;
                              default:
                                typeDisplay = transaction.type;
                                badgeColor = 'bg-gray-100 text-gray-800';
                                sourceDestDisplay = 'N/A';
                            }
                            
                            return (
                              <tr key={transaction.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                  {format(new Date(transaction.transaction_datetime), 'dd.MM.yyyy HH:mm')}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                    {typeDisplay}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {transaction.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {sourceDestDisplay}
                                  {transaction.invoice_number && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      Faktura: {transaction.invoice_number}
                                    </div>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {transaction.notes || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Zatvori
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* End of Modals */}
    </div>
  );
}