import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { getAirlines, clearAirlinesCache, fetchWithAuth } from '@/lib/apiService';
import { useAuth } from '@/contexts/AuthContext';

interface Airline {
  id: number;
  name: string;
  contact_details?: string;
  taxId?: string;
  address?: string;
  isForeign?: boolean;
  operatingDestinations?: string[];
}

export default function AirlineManagement() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentAirline, setCurrentAirline] = useState<Airline | null>(null);

  // Check if user has permission to edit
  const canEdit = authUser?.role === 'ADMIN' || authUser?.role === 'KONTROLA';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_details: '',
    taxId: '',
    address: '',
    isForeign: false,
    operatingDestinations: '' // Will be a comma-separated string in the form
  });

  useEffect(() => {
    // Only fetch if user is authenticated
    if (authUser) {
      fetchAirlines();
    } else {
      // If not authenticated, redirect to login
      router.push('/login');
    }
  }, [authUser, router]);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      const data = await getAirlines(); // Use cached function
      setAirlines(data);
    } catch (error) {
      console.error('Error fetching airlines:', error);
      toast.error('Greška pri učitavanju avio kompanija');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'isForeign') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLSelectElement).value === 'true'
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_details: '',
      taxId: '',
      address: '',
      isForeign: false,
      operatingDestinations: ''
    });
  };

  const prepareSubmitData = () => {
    return {
      ...formData,
      operatingDestinations: formData.operatingDestinations.split(',').map(d => d.trim()).filter(d => d !== ''),
      isForeign: Boolean(formData.isForeign) // Ensure isForeign is a boolean
    };
  };

  const handleAddAirline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit) {
      toast.error('Nemate ovlaštenje za dodavanje avio kompanija');
      return;
    }
    
    try {
      if (!formData.name.trim()) {
        toast.error('Naziv avio kompanije je obavezan');
        return;
      }
      const submitData = prepareSubmitData();
      await fetchWithAuth<Airline>('/api/fuel/airlines', { // fetchWithAuth is still correct for POST/PUT/DELETE
        method: 'POST',
        body: JSON.stringify(submitData),
      });
      
      toast.success('Avio kompanija uspješno dodana');
      setShowAddModal(false);
      resetForm();
      await getAirlines(true); // Force refresh cache
      fetchAirlines(); // Re-fetch to update local state
    } catch (error) {
      console.error('Error adding airline:', error);
      toast.error('Greška pri dodavanju avio kompanije');
    }
  };

  const handleEditAirline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAirline) return;
    
    try {
      if (!formData.name.trim()) {
        toast.error('Naziv avio kompanije je obavezan');
        return;
      }
      const submitData = prepareSubmitData();
      await fetchWithAuth<Airline>(`/api/fuel/airlines/${currentAirline.id}`, {
        method: 'PUT',
        body: JSON.stringify(submitData),
      });
      
      toast.success('Avio kompanija uspješno ažurirana');
      setShowEditModal(false);
      resetForm();
      await getAirlines(true); // Force refresh cache
      fetchAirlines(); // Re-fetch to update local state
    } catch (error) {
      console.error('Error updating airline:', error);
      toast.error('Greška pri ažuriranju avio kompanije');
    }
  };

  const handleDeleteAirline = async (id: number) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovu avio kompaniju?')) return;
    
    try {
      await fetchWithAuth<{ message: string }>(`/api/fuel/airlines/${id}`, {
        method: 'DELETE',
      });
      
      toast.success('Avio kompanija uspješno obrisana');
      await getAirlines(true); // Force refresh cache
      fetchAirlines(); // Re-fetch to update local state
    } catch (error) {
      console.error('Error deleting airline:', error);
      // Check if the error is due to foreign key constraint
      if (error instanceof Error && error.message.includes('P2003')) { // Or a more specific check
        toast.error('Nije moguće obrisati avio kompaniju koja se koristi u operacijama točenja.');
      } else {
        toast.error('Greška pri brisanju avio kompanije');
      }
    }
  };

  const openEditModal = (airline: Airline) => {
    setCurrentAirline(airline);
    setFormData({
      name: airline.name,
      contact_details: airline.contact_details || '',
      taxId: airline.taxId || '',
      address: airline.address || '',
      isForeign: airline.isForeign || false,
      operatingDestinations: airline.operatingDestinations?.join(', ') || '' // Join for display
    });
    setShowEditModal(true);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19L13 4.00001L20 14.5L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 4L9.04401 13.1224C9.01443 13.1921 9.01443 13.2685 9.04401 13.3382L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 19L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Avio Kompanije
            </h2>
            <p className="text-gray-300 mt-1 ml-8">
              Upravljanje avio kompanijama i njihovim podacima
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Dodaj Avio Kompaniju</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : airlines.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">Nema unesenih avio kompanija.</p>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Dodaj Prvu Avio Kompaniju
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Naziv</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kontakt</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ID/PDV</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Adresa</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tip</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Destinacije</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Akcije</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {airlines.map((airline) => (
                <tr key={airline.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{airline.name}</td>
                  <td className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-500">{airline.contact_details || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{airline.taxId || '-'}</td>
                  <td className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-500">{airline.address || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{airline.isForeign ? 'Strana' : 'Domaća'}</td>
                  <td className="whitespace-pre-wrap px-3 py-4 text-sm text-gray-500">{airline.operatingDestinations?.join(', ') || '-'}</td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => openEditModal(airline)}
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" /> Uredi
                    </button>
                    <button
                      onClick={() => handleDeleteAirline(airline.id)}
                      className="inline-flex items-center text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" /> Obriši
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Airline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dodaj Avio Kompaniju</h3>
              <form onSubmit={handleAddAirline}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Naziv <span className="text-red-500">*</span></label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">ID/PDV broj</label>
                    <input type="text" name="taxId" id="taxId" value={formData.taxId} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresa Kompanije</label>
                    <textarea name="address" id="address" rows={3} value={formData.address} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
                  </div>
                  <div>
                    <label htmlFor="isForeign" className="block text-sm font-medium text-gray-700">Tip Kompanije</label>
                    <select name="isForeign" id="isForeign" value={formData.isForeign ? 'true' : 'false'} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md">
                      <option value="false">Domaća</option>
                      <option value="true">Strana</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="contact_details" className="block text-sm font-medium text-gray-700">Kontakt Informacije</label>
                    <textarea name="contact_details" id="contact_details" rows={3} value={formData.contact_details} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="operatingDestinations" className="block text-sm font-medium text-gray-700">Destinacije (odvojene zarezom)</label>
                    <textarea name="operatingDestinations" id="operatingDestinations" rows={3} value={formData.operatingDestinations} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="Npr. London, Pariz, Rim"></textarea>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Odustani</button>
                  <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Spremi</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Airline Modal */}
      {showEditModal && currentAirline && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Uredi Avio Kompaniju</h3>
              <form onSubmit={handleEditAirline}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Naziv <span className="text-red-500">*</span></label>
                    <input type="text" name="name" id="edit-name" value={formData.name} onChange={handleInputChange} required className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label htmlFor="edit-taxId" className="block text-sm font-medium text-gray-700">ID/PDV broj</label>
                    <input type="text" name="taxId" id="edit-taxId" value={formData.taxId} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700">Adresa Kompanije</label>
                    <textarea name="address" id="edit-address" rows={3} value={formData.address} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
                  </div>
                  <div>
                    <label htmlFor="edit-isForeign" className="block text-sm font-medium text-gray-700">Tip Kompanije</label>
                    <select name="isForeign" id="edit-isForeign" value={formData.isForeign ? 'true' : 'false'} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md">
                      <option value="false">Domaća</option>
                      <option value="true">Strana</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="edit-contact_details" className="block text-sm font-medium text-gray-700">Kontakt Informacije</label>
                    <textarea name="contact_details" id="edit-contact_details" rows={3} value={formData.contact_details} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"></textarea>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="edit-operatingDestinations" className="block text-sm font-medium text-gray-700">Destinacije (odvojene zarezom)</label>
                    <textarea name="operatingDestinations" id="edit-operatingDestinations" rows={3} value={formData.operatingDestinations} onChange={handleInputChange} className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" placeholder="Npr. London, Pariz, Rim"></textarea>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Odustani</button>
                  <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Spremi Promjene</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 