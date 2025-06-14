'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createVehicle } from '@/lib/apiService';
import { Company, Location, VehicleStatus } from '@/types';
import { getCompanies, getLocations } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'; 
import { 
  FaCar, FaSave, FaTimes, FaBuilding, FaMapMarkerAlt, FaShieldAlt
} from 'react-icons/fa'; 
import { toast } from 'react-toastify';

interface NewVehicleFormState {
  vehicle_name: string;
  license_plate: string;
  status: VehicleStatus; 
  companyId: string; 
  locationId: string; 
  filter_installed: string; 
  chassis_number: string;
  vessel_plate_no: string;
  notes: string;
}

const initialFormData: NewVehicleFormState = {
  vehicle_name: '',
  license_plate: '',
  status: VehicleStatus.ACTIVE, 
  companyId: '',
  locationId: '',
  filter_installed: 'false', 
  chassis_number: '',
  vessel_plate_no: '',
  notes: '',
};

const NewVehiclePageComponent: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<NewVehicleFormState>(initialFormData);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // CSS classes for consistent styling
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm";
  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm";
  const sectionTitleClass = "flex items-center text-lg font-semibold text-gray-800 mb-4";

  // Fetch companies and locations on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesData, locationsData] = await Promise.all([
        getCompanies(),
        getLocations()
      ]);
      setCompanies(companiesData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Greška pri učitavanju podataka.');
    }
  };

  // Handle form input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convert string IDs to numbers
      const payload = {
        ...formData,
        companyId: parseInt(formData.companyId),
        locationId: parseInt(formData.locationId),
        filter_installed: formData.filter_installed === 'true'
      };

      await createVehicle(payload);
      toast.success('Vozilo uspješno dodano!');
      router.push('/dashboard/vehicles');
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error('Greška pri dodavanju vozila.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <FaCar className="mr-3 text-indigo-600" /> Dodaj Novo Vozilo
          </CardTitle>
          <p className="text-gray-500 mt-1">
            Unesite osnovne podatke o vozilu. Ostale detalje možete dodati kasnije kroz uređivanje vozila.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {/* Section: Osnovne Informacije */}
            <section className="mb-8">
              <h2 className={sectionTitleClass}><FaCar className="mr-3 text-indigo-500"/>Osnovne Informacije</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="vehicle_name" className={labelClass}>Naziv Vozila *</label>
                  <input 
                    type="text" 
                    name="vehicle_name" 
                    id="vehicle_name" 
                    value={formData.vehicle_name} 
                    onChange={handleChange} 
                    className={inputClass} 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="license_plate" className={labelClass}>Registarska Oznaka *</label>
                  <input 
                    type="text" 
                    name="license_plate" 
                    id="license_plate" 
                    value={formData.license_plate} 
                    onChange={handleChange} 
                    className={inputClass} 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="chassis_number" className={labelClass}>Broj Šasije</label>
                  <input 
                    type="text" 
                    name="chassis_number" 
                    id="chassis_number" 
                    value={formData.chassis_number} 
                    onChange={handleChange} 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label htmlFor="vessel_plate_no" className={labelClass}>Broj Posude</label>
                  <input 
                    type="text" 
                    name="vessel_plate_no" 
                    id="vessel_plate_no" 
                    value={formData.vessel_plate_no} 
                    onChange={handleChange} 
                    className={inputClass} 
                  />
                </div>
              </div>
            </section>

            {/* Section: Status i Pripadnost */}
            <section className="mb-8">
              <h2 className={sectionTitleClass}><FaShieldAlt className="mr-3 text-indigo-500"/>Status i Pripadnost</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="status" className={labelClass}>Status *</label>
                  <select 
                    name="status" 
                    id="status" 
                    value={formData.status} 
                    onChange={handleChange} 
                    className={selectClass} 
                    required
                  >
                    <option value={VehicleStatus.ACTIVE}>Aktivno</option>
                    <option value={VehicleStatus.MAINTENANCE}>Održavanje</option>
                    <option value={VehicleStatus.OUT_OF_SERVICE}>Van upotrebe</option>
                    <option value={VehicleStatus.INACTIVE}>Neaktivno</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="companyId" className={labelClass}>Kompanija *</label>
                  <select 
                    name="companyId" 
                    id="companyId" 
                    value={formData.companyId} 
                    onChange={handleChange} 
                    className={selectClass} 
                    required
                  >
                    <option value="">Odaberite kompaniju</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="locationId" className={labelClass}>Lokacija *</label>
                  <select 
                    name="locationId" 
                    id="locationId" 
                    value={formData.locationId} 
                    onChange={handleChange} 
                    className={selectClass} 
                    required
                  >
                    <option value="">Odaberite lokaciju</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Filter */}
            <section className="mb-8">
              <h2 className={sectionTitleClass}><FaShieldAlt className="mr-3 text-indigo-500"/>Filter</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="filter_installed" className={labelClass}>Filter Instaliran *</label>
                  <select 
                    name="filter_installed" 
                    id="filter_installed" 
                    value={formData.filter_installed} 
                    onChange={handleChange} 
                    className={selectClass} 
                    required
                  >
                    <option value="true">Da</option>
                    <option value="false">Ne</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Napomene */}
            <section className="mb-8">
              <h2 className={sectionTitleClass}><FaMapMarkerAlt className="mr-3 text-indigo-500"/>Napomene</h2>
              <div>
                <label htmlFor="notes" className={labelClass}>Dodatne Napomene</label>
                <textarea 
                  name="notes" 
                  id="notes" 
                  rows={4} 
                  value={formData.notes} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              </div>
            </section>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end pt-6 border-t border-gray-200 space-x-3">
              <button 
                type="button" 
                onClick={() => router.back()} 
                className="flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50"
                disabled={isLoading}
              >
                <FaTimes className="mr-2" /> Otkaži
              </button>
              <button 
                type="submit" 
                className="flex items-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Spremanje...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" /> Dodaj Vozilo
                  </>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(NewVehiclePageComponent);
