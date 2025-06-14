'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createVehicle } from '@/lib/apiService';
import { Company, Location, VehicleStatus, CreateVehiclePayload } from '@/types';
import { getCompanies, getLocations } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'; 
import { 
  FaCar, FaSave, FaTimes, FaBuilding, FaMapMarkerAlt, FaShieldAlt, FaCog, FaStickyNote, FaFilter, FaCalendarAlt, FaUserCircle, FaIdCard, FaBarcode, FaRulerCombined, FaTools, FaBell, FaFileAlt 
} from 'react-icons/fa'; 

interface NewVehicleFormState {
  vehicle_name: string;
  license_plate: string;
  status: VehicleStatus; 
  companyId: string; 
  locationId: string; 
  filter_installed: string; 
  chassis_number: string;
  notes: string;
  filter_installation_date: string; 
  filter_validity_period_months: string; 
  last_annual_inspection_date: string;
  vessel_plate_no: string;
  filter_type_plate_no: string;
  sensor_technology: string;
  last_hose_hd63_replacement_date: string;
  last_hose_hd38_replacement_date: string;
  last_hose_tw75_replacement_date: string;
  last_hose_leak_test_date: string;
  last_volumeter_calibration_date: string;
  last_manometer_calibration_date: string;
  last_hecpv_ilcpv_test_date: string;
  last_6_month_check_date: string;
  responsible_person_contact: string;
}

const initialFormData: NewVehicleFormState = {
  vehicle_name: '',
  license_plate: '',
  status: VehicleStatus.ACTIVE, 
  companyId: '',
  locationId: '',
  filter_installed: 'false', 
  chassis_number: '',
  notes: '',
  filter_installation_date: '',
  filter_validity_period_months: '',
  last_annual_inspection_date: '',
  vessel_plate_no: '',
  filter_type_plate_no: '',
  sensor_technology: '',
  last_hose_hd63_replacement_date: '',
  last_hose_hd38_replacement_date: '',
  last_hose_tw75_replacement_date: '',
  last_hose_leak_test_date: '',
  last_volumeter_calibration_date: '',
  last_manometer_calibration_date: '',
  last_hecpv_ilcpv_test_date: '',
  last_6_month_check_date: '',
  responsible_person_contact: '',
};

const inputClass = "mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionTitleClass = "text-xl font-semibold text-gray-800 mb-6 border-b pb-2 flex items-center";

function NewVehiclePageComponent() {
  const router = useRouter();
  const [formData, setFormData] = useState<NewVehicleFormState>(initialFormData);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [companiesData, locationsData] = await Promise.all([
          getCompanies(),
          getLocations(),
        ]);
        setCompanies(companiesData);
        setLocations(locationsData);
      } catch (err) {
        setError('Greška pri učitavanju kompanija ili lokacija.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked ? 'true' : 'false' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload: CreateVehiclePayload = {
      ...formData,
      companyId: parseInt(formData.companyId, 10),
      locationId: parseInt(formData.locationId, 10),
      filter_installed: formData.filter_installed === 'true',
      filter_validity_period_months: formData.filter_validity_period_months ? parseInt(formData.filter_validity_period_months, 10) : null,
      filter_installation_date: formData.filter_installation_date ? new Date(formData.filter_installation_date) : null,
      last_annual_inspection_date: formData.last_annual_inspection_date ? new Date(formData.last_annual_inspection_date) : null,
      last_hose_hd63_replacement_date: formData.last_hose_hd63_replacement_date ? new Date(formData.last_hose_hd63_replacement_date) : null,
      last_hose_hd38_replacement_date: formData.last_hose_hd38_replacement_date ? new Date(formData.last_hose_hd38_replacement_date) : null,
      last_hose_tw75_replacement_date: formData.last_hose_tw75_replacement_date ? new Date(formData.last_hose_tw75_replacement_date) : null,
      last_hose_leak_test_date: formData.last_hose_leak_test_date ? new Date(formData.last_hose_leak_test_date) : null,
      last_volumeter_calibration_date: formData.last_volumeter_calibration_date ? new Date(formData.last_volumeter_calibration_date) : null,
      last_manometer_calibration_date: formData.last_manometer_calibration_date ? new Date(formData.last_manometer_calibration_date) : null,
      last_hecpv_ilcpv_test_date: formData.last_hecpv_ilcpv_test_date ? new Date(formData.last_hecpv_ilcpv_test_date) : null,
      last_6_month_check_date: formData.last_6_month_check_date ? new Date(formData.last_6_month_check_date) : null,
    };

    try {
      await createVehicle(payload);
      router.push('/dashboard/vehicles'); 
    } catch (err) {
      setError('Greška pri dodavanju vozila. Molimo pokušajte ponovo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && (!companies.length || !locations.length)) {
    return <div className="flex justify-center items-center h-screen"><FaCog className="animate-spin text-4xl text-indigo-600" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
        <FaCar className="mr-3 text-indigo-600" /> Dodaj Novo Vozilo
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Greška!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl flex items-center">
            <FaFileAlt className="mr-3 text-indigo-600" /> Unesite Podatke o Vozilu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8 p-6">
            
            {/* Section: Osnovni Podaci Vozila */}
            <section>
              <h2 className={sectionTitleClass}><FaIdCard className="mr-3 text-indigo-500"/>Osnovni Podaci Vozila</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label htmlFor="vehicle_name" className={labelClass}>Naziv Vozila</label>
                  <input type="text" name="vehicle_name" id="vehicle_name" value={formData.vehicle_name} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="license_plate" className={labelClass}>Registarska Oznaka</label>
                  <input type="text" name="license_plate" id="license_plate" value={formData.license_plate} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="status" className={labelClass}>Status Vozila</label>
                  <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputClass}>
                    {Object.values(VehicleStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="companyId" className={labelClass}>Kompanija</label>
                  <select name="companyId" id="companyId" value={formData.companyId} onChange={handleChange} className={inputClass} required>
                    <option value="">Odaberi kompaniju</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="locationId" className={labelClass}>Lokacija</label>
                  <select name="locationId" id="locationId" value={formData.locationId} onChange={handleChange} className={inputClass} required>
                    <option value="">Odaberi lokaciju</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="chassis_number" className={labelClass}>Broj Šasije</label>
                  <input type="text" name="chassis_number" id="chassis_number" value={formData.chassis_number} onChange={handleChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="responsible_person_contact" className={labelClass}>Kontakt Odgovorne Osobe</label>
                  <input type="text" name="responsible_person_contact" id="responsible_person_contact" value={formData.responsible_person_contact} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Section: Informacije o Filteru */}
            <section>
              <h2 className={sectionTitleClass}><FaFilter className="mr-3 text-indigo-500"/>Informacije o Filteru</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center mt-6 md:mt-8">
                  <input 
                    type="checkbox" 
                    name="filter_installed" 
                    id="filter_installed" 
                    checked={formData.filter_installed === 'true'} 
                    onChange={handleChange} 
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
                  />
                  <label htmlFor="filter_installed" className="text-sm font-medium text-gray-700">Filter Instaliran?</label>
                </div>
                <div>
                  <label htmlFor="filter_installation_date" className={labelClass}>Datum Instalacije Filtera</label>
                  <input type="date" name="filter_installation_date" id="filter_installation_date" value={formData.filter_installation_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="filter_validity_period_months" className={labelClass}>Validnost Filtera (mjeseci)</label>
                  <input type="number" name="filter_validity_period_months" id="filter_validity_period_months" value={formData.filter_validity_period_months} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="filter_type_plate_no" className={labelClass}>Broj Pločice Tipa Filtera</label>
                  <input type="text" name="filter_type_plate_no" id="filter_type_plate_no" value={formData.filter_type_plate_no} onChange={handleChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="sensor_technology" className={labelClass}>Tehnologija Senzora</label>
                  <input type="text" name="sensor_technology" id="sensor_technology" value={formData.sensor_technology} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Section: Tehnički Detalji i Inspekcije */}
            <section>
              <h2 className={sectionTitleClass}><FaTools className="mr-3 text-indigo-500"/>Tehnički Detalji i Inspekcije</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label htmlFor="vessel_plate_no" className={labelClass}>Broj Pločice Posude</label>
                  <input type="text" name="vessel_plate_no" id="vessel_plate_no" value={formData.vessel_plate_no} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_annual_inspection_date" className={labelClass}>Zadnja Godišnja Inspekcija</label>
                  <input type="date" name="last_annual_inspection_date" id="last_annual_inspection_date" value={formData.last_annual_inspection_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_hose_hd63_replacement_date" className={labelClass}>Zadnja Zamjena Crijeva HD63</label>
                  <input type="date" name="last_hose_hd63_replacement_date" id="last_hose_hd63_replacement_date" value={formData.last_hose_hd63_replacement_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_hose_hd38_replacement_date" className={labelClass}>Zadnja Zamjena Crijeva HD38</label>
                  <input type="date" name="last_hose_hd38_replacement_date" id="last_hose_hd38_replacement_date" value={formData.last_hose_hd38_replacement_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_hose_tw75_replacement_date" className={labelClass}>Zadnja Zamjena Crijeva TW75</label>
                  <input type="date" name="last_hose_tw75_replacement_date" id="last_hose_tw75_replacement_date" value={formData.last_hose_tw75_replacement_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_hose_leak_test_date" className={labelClass}>Zadnji Test Curenja Crijeva</label>
                  <input type="date" name="last_hose_leak_test_date" id="last_hose_leak_test_date" value={formData.last_hose_leak_test_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_volumeter_calibration_date" className={labelClass}>Zadnja Kalibracija Volumetra</label>
                  <input type="date" name="last_volumeter_calibration_date" id="last_volumeter_calibration_date" value={formData.last_volumeter_calibration_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_manometer_calibration_date" className={labelClass}>Zadnja Kalibracija Manometra</label>
                  <input type="date" name="last_manometer_calibration_date" id="last_manometer_calibration_date" value={formData.last_manometer_calibration_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_hecpv_ilcpv_test_date" className={labelClass}>Zadnji Test HECPV/ILCPV</label>
                  <input type="date" name="last_hecpv_ilcpv_test_date" id="last_hecpv_ilcpv_test_date" value={formData.last_hecpv_ilcpv_test_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="last_6_month_check_date" className={labelClass}>Zadnja Polugodišnja Provjera</label>
                  <input type="date" name="last_6_month_check_date" id="last_6_month_check_date" value={formData.last_6_month_check_date} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Section: Napomene */}
            <section>
              <h2 className={sectionTitleClass}><FaStickyNote className="mr-3 text-indigo-500"/>Napomene</h2>
              <div>
                <label htmlFor="notes" className={labelClass}>Dodatne Napomene</label>
                <textarea name="notes" id="notes" rows={4} value={formData.notes} onChange={handleChange} className={inputClass} />
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
                {isLoading ? <FaCog className="animate-spin mr-2" /> : <FaSave className="mr-2" />} 
                {isLoading ? 'Spremanje...' : 'Dodaj Vozilo'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(NewVehiclePageComponent);
