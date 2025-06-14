'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createVehicle } from '@/lib/apiService';
import { Company, Location, VehicleStatus, CreateVehiclePayload } from '@/types';
import { getCompanies, getLocations } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'; 
import { 
  FaCar, FaSave, FaTimes, FaBuilding, FaMapMarkerAlt, FaShieldAlt, FaCog, FaStickyNote, FaFilter, FaCalendarAlt, FaUserCircle, FaIdCard, FaBarcode, FaRulerCombined, FaTools, FaBell, FaFileAlt, FaShippingFast, FaWeightHanging, FaUserTie, FaGasPump, FaWarehouse, FaMicrochip, FaCalendarCheck, FaBolt, FaTag
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
  // New fields
  kapacitet_cisterne: string;
  tip_filtera: string;
  crijeva_za_tocenje: string;
  registrovano_do: string;
  adr_vazi_do: string;
  periodicni_pregled_vazi_do?: string;
  // Enhanced Filter Information
  filter_vessel_number?: string;
  filter_annual_inspection_date?: string;
  filter_next_annual_inspection_date?: string;
  filter_ew_sensor_inspection_date?: string;
  // Hose Details HD63
  broj_crijeva_hd63?: string;
  godina_proizvodnje_crijeva_hd63?: string;
  datum_testiranja_pritiska_crijeva_hd63?: string;
  // Hose Details HD38
  broj_crijeva_hd38?: string;
  godina_proizvodnje_crijeva_hd38?: string;
  datum_testiranja_pritiska_crijeva_hd38?: string;
  // Hose Details TW75
  broj_crijeva_tw75?: string;
  godina_proizvodnje_crijeva_tw75?: string;
  datum_testiranja_pritiska_crijeva_tw75?: string;
  // Calibration Dates
  datum_kalibracije_moment_kljuca?: string;
  datum_kalibracije_termometra?: string;
  datum_kalibracije_hidrometra?: string;
  datum_kalibracije_uredjaja_elektricne_provodljivosti?: string;
  // CWD Expiry Date
  datum_isteka_cwd?: string;
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
  // New fields initial state
  kapacitet_cisterne: '',
  tip_filtera: '',
  crijeva_za_tocenje: '', 
  registrovano_do: '',
  adr_vazi_do: '',
  periodicni_pregled_vazi_do: '',
  // Enhanced Filter Information
  filter_vessel_number: '',
  filter_annual_inspection_date: '',
  filter_next_annual_inspection_date: '',
  filter_ew_sensor_inspection_date: '',
  // Hose Details HD63
  broj_crijeva_hd63: '',
  godina_proizvodnje_crijeva_hd63: '',
  datum_testiranja_pritiska_crijeva_hd63: '',
  // Hose Details HD38
  broj_crijeva_hd38: '',
  godina_proizvodnje_crijeva_hd38: '',
  datum_testiranja_pritiska_crijeva_hd38: '',
  // Hose Details TW75
  broj_crijeva_tw75: '',
  godina_proizvodnje_crijeva_tw75: '',
  datum_testiranja_pritiska_crijeva_tw75: '',
  // Calibration Dates
  datum_kalibracije_moment_kljuca: '',
  datum_kalibracije_termometra: '',
  datum_kalibracije_hidrometra: '',
  datum_kalibracije_uredjaja_elektricne_provodljivosti: '',
  // CWD Expiry Date
  datum_isteka_cwd: '',
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
      filter_validity_period_months: formData.filter_validity_period_months ? parseInt(formData.filter_validity_period_months, 10) : undefined,
      kapacitet_cisterne: formData.kapacitet_cisterne ? parseFloat(formData.kapacitet_cisterne) : undefined,
      tip_filtera: formData.tip_filtera || null,
      crijeva_za_tocenje: formData.crijeva_za_tocenje || null,
      registrovano_do: formData.registrovano_do ? new Date(formData.registrovano_do) : null,
      adr_vazi_do: formData.adr_vazi_do ? new Date(formData.adr_vazi_do) : null,
      periodicni_pregled_vazi_do: formData.periodicni_pregled_vazi_do ? new Date(formData.periodicni_pregled_vazi_do) : null,
      filter_installation_date: formData.filter_installation_date ? new Date(formData.filter_installation_date) : null,
      filter_vessel_number: formData.filter_vessel_number || null,
      filter_annual_inspection_date: formData.filter_annual_inspection_date ? new Date(formData.filter_annual_inspection_date) : null,
      filter_next_annual_inspection_date: formData.filter_next_annual_inspection_date ? new Date(formData.filter_next_annual_inspection_date) : null,
      filter_ew_sensor_inspection_date: formData.filter_ew_sensor_inspection_date ? new Date(formData.filter_ew_sensor_inspection_date) : null,
        // Hose Details HD63
        broj_crijeva_hd63: formData.broj_crijeva_hd63 || null,
        godina_proizvodnje_crijeva_hd63: formData.godina_proizvodnje_crijeva_hd63 ? parseInt(formData.godina_proizvodnje_crijeva_hd63, 10) : undefined,
        datum_testiranja_pritiska_crijeva_hd63: formData.datum_testiranja_pritiska_crijeva_hd63 ? new Date(formData.datum_testiranja_pritiska_crijeva_hd63) : null,
        // Hose Details HD38
        broj_crijeva_hd38: formData.broj_crijeva_hd38 || null,
        godina_proizvodnje_crijeva_hd38: formData.godina_proizvodnje_crijeva_hd38 ? parseInt(formData.godina_proizvodnje_crijeva_hd38, 10) : undefined,
        datum_testiranja_pritiska_crijeva_hd38: formData.datum_testiranja_pritiska_crijeva_hd38 ? new Date(formData.datum_testiranja_pritiska_crijeva_hd38) : null,
        // Hose Details TW75
        broj_crijeva_tw75: formData.broj_crijeva_tw75 || null,
        godina_proizvodnje_crijeva_tw75: formData.godina_proizvodnje_crijeva_tw75 ? parseInt(formData.godina_proizvodnje_crijeva_tw75, 10) : undefined,
        datum_testiranja_pritiska_crijeva_tw75: formData.datum_testiranja_pritiska_crijeva_tw75 ? new Date(formData.datum_testiranja_pritiska_crijeva_tw75) : null,
        // Calibration Dates
        datum_kalibracije_moment_kljuca: formData.datum_kalibracije_moment_kljuca ? new Date(formData.datum_kalibracije_moment_kljuca) : null,
        datum_kalibracije_termometra: formData.datum_kalibracije_termometra ? new Date(formData.datum_kalibracije_termometra) : null,
        datum_kalibracije_hidrometra: formData.datum_kalibracije_hidrometra ? new Date(formData.datum_kalibracije_hidrometra) : null,
        datum_kalibracije_uredjaja_elektricne_provodljivosti: formData.datum_kalibracije_uredjaja_elektricne_provodljivosti ? new Date(formData.datum_kalibracije_uredjaja_elektricne_provodljivosti) : null,
        // CWD Expiry Date
        datum_isteka_cwd: formData.datum_isteka_cwd ? new Date(formData.datum_isteka_cwd) : null,
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
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Došlo je do nepoznate greške prilikom dodavanja vozila.';
      setError(message);
      console.error('Error in handleSubmit:', err);
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
                <div>
                  <label htmlFor="vessel_plate_no" className={labelClass}>Broj Pločice Posude</label>
                  <input type="text" name="vessel_plate_no" id="vessel_plate_no" value={formData.vessel_plate_no || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="responsible_person_contact" className={labelClass}>Kontakt Odgovorne Osobe</label>
                  <input type="text" name="responsible_person_contact" id="responsible_person_contact" value={formData.responsible_person_contact} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Section: Tanker Specifične Informacije */}
            <section>
              <h2 className={sectionTitleClass}><FaGasPump className="mr-3 text-indigo-500"/>Tanker Specifične Informacije</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="kapacitet_cisterne" className={labelClass}>Kapacitet Cisterne (L)</label>
                  <input type="number" name="kapacitet_cisterne" id="kapacitet_cisterne" value={formData.kapacitet_cisterne || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="crijeva_za_tocenje" className={labelClass}>Crijeva za Točenje</label>
                  <select name="crijeva_za_tocenje" id="crijeva_za_tocenje" value={formData.crijeva_za_tocenje} onChange={handleChange} className={inputClass}>
                    <option value="">Odaberi tip crijeva</option>
                    <option value="HD63">HD63</option>
                    <option value="HD38">HD38</option>
                    <option value="TW75">TW75</option>
                    <option value="Kombinovano">Kombinovano</option>
                    <option value="Ostalo">Ostalo</option>
                  </select>
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
                  <label htmlFor="filter_type_plate_no" className={labelClass}><FaTag className="inline mr-2 mb-1" />Broj Pločice Tipa Filtera</label>
                  <input type="text" name="filter_type_plate_no" id="filter_type_plate_no" value={formData.filter_type_plate_no || ''} onChange={handleChange} className={inputClass} />
                </div>
                {/* Enhanced Filter Information Start */}
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="filter_vessel_number" className={labelClass}><FaBarcode className="inline mr-2 mb-1" />Broj Posude za Filtriranje</label>
                  <input type="text" name="filter_vessel_number" id="filter_vessel_number" value={formData.filter_vessel_number || ''} onChange={handleChange} className={inputClass} />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum Isteka Filtera (Automatski)</label>
                  <div className="mt-1 p-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 min-h-[42px]">
                    {formData.filter_installation_date && formData.filter_validity_period_months ? 
                      new Date(new Date(formData.filter_installation_date).setMonth(new Date(formData.filter_installation_date).getMonth() + parseInt(formData.filter_validity_period_months))).toLocaleDateString('hr-HR') : 
                      <span className="italic text-gray-400">Unesite datum instalacije i validnost</span>}
                  </div>
                </div>

                <div className="col-span-1">
                  <label htmlFor="filter_annual_inspection_date" className={labelClass}><FaCalendarCheck className="inline mr-2 mb-1" />Datum Godišnjeg Pregleda Filtera</label>
                  <input type="date" name="filter_annual_inspection_date" id="filter_annual_inspection_date" value={formData.filter_annual_inspection_date || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="filter_next_annual_inspection_date" className={labelClass}><FaCalendarAlt className="inline mr-2 mb-1" />Datum Sljedećeg Godišnjeg Pregleda Filtera</label>
                  <input type="date" name="filter_next_annual_inspection_date" id="filter_next_annual_inspection_date" value={formData.filter_next_annual_inspection_date || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="filter_ew_sensor_inspection_date" className={labelClass}><FaBolt className="inline mr-2 mb-1" />Datum Pregleda E/W Senzora</label>
                  <input type="date" name="filter_ew_sensor_inspection_date" id="filter_ew_sensor_inspection_date" value={formData.filter_ew_sensor_inspection_date || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="tip_filtera" className={labelClass}>Tip Filtera</label>
                  <input type="text" name="tip_filtera" id="tip_filtera" value={formData.tip_filtera || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="sensor_technology" className={labelClass}>Tehnologija Senzora</label>
                  <input type="text" name="sensor_technology" id="sensor_technology" value={formData.sensor_technology || ''} onChange={handleChange} className={inputClass} />
                </div>
                {/* Enhanced Filter Information End */}
              </div>
            </section>

            {/* Section: Tehnički Detalji i Inspekcije */}
            <section>
              <h2 className={sectionTitleClass}><FaTools className="mr-3 text-indigo-500"/>Tehnički Detalji i Inspekcije</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* This div was previously for vessel_plate_no, now removed as per prior diff. If it's needed, it should be re-added. For now, ensuring structure. */}
                {/* Add vessel_plate_no back if it was unintentionally removed and is still part of the form state */}
                {/* <div>
                  <label htmlFor="vessel_plate_no" className={labelClass}>Broj Pločice Posude</label>
                  <input type="text" name="vessel_plate_no" id="vessel_plate_no" value={formData.vessel_plate_no || ''} onChange={handleChange} className={inputClass} />
                </div> */}
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
                {/* New Field: Registrovano do */}
                <div>
                  <label htmlFor="registrovano_do" className={labelClass}><FaIdCard className="inline mr-2 mb-1" />Vozilo Registrovano Do</label>
                  <input type="date" name="registrovano_do" id="registrovano_do" value={formData.registrovano_do} onChange={handleChange} className={inputClass} />
                </div>
                {/* New Field: ADR Važi Do */}
                <div>
                  <label htmlFor="adr_vazi_do" className={labelClass}><FaShieldAlt className="inline mr-2 mb-1" />ADR Certifikat Važi Do</label>
                  <input type="date" name="adr_vazi_do" id="adr_vazi_do" value={formData.adr_vazi_do} onChange={handleChange} className={inputClass} />
                </div>
                {/* New Field: Periodični Pregled Važi Do */}
                <div>
                  <label htmlFor="periodicni_pregled_vazi_do" className={labelClass}><FaFileAlt className="inline mr-2 mb-1" />Periodični Pregled Važi Do</label>
                  <input type="date" name="periodicni_pregled_vazi_do" id="periodicni_pregled_vazi_do" value={formData.periodicni_pregled_vazi_do} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Section: Detalji o Crijevima */}
            <section>
              <h2 className={sectionTitleClass}><FaShippingFast className="mr-3 text-indigo-500"/>Detalji o Crijevima</h2>
              {/* HD63 */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-3">HD63 Crijevo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="broj_crijeva_hd63" className={labelClass}>Broj Crijeva HD63</label>
                    <input type="text" name="broj_crijeva_hd63" id="broj_crijeva_hd63" value={formData.broj_crijeva_hd63 || ''} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="godina_proizvodnje_crijeva_hd63" className={labelClass}>Godina Proizvodnje Crijeva HD63</label>
                    <input type="number" name="godina_proizvodnje_crijeva_hd63" id="godina_proizvodnje_crijeva_hd63" value={formData.godina_proizvodnje_crijeva_hd63 || ''} onChange={handleChange} className={inputClass} placeholder="YYYY" />
                  </div>
                  <div>
                    <label htmlFor="datum_testiranja_pritiska_crijeva_hd63" className={labelClass}>Datum Testiranja Pritiska Crijeva HD63</label>
                    <input type="date" name="datum_testiranja_pritiska_crijeva_hd63" id="datum_testiranja_pritiska_crijeva_hd63" value={formData.datum_testiranja_pritiska_crijeva_hd63 || ''} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>
              {/* HD38 */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-3">HD38 Crijevo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="broj_crijeva_hd38" className={labelClass}>Broj Crijeva HD38</label>
                    <input type="text" name="broj_crijeva_hd38" id="broj_crijeva_hd38" value={formData.broj_crijeva_hd38 || ''} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="godina_proizvodnje_crijeva_hd38" className={labelClass}>Godina Proizvodnje Crijeva HD38</label>
                    <input type="number" name="godina_proizvodnje_crijeva_hd38" id="godina_proizvodnje_crijeva_hd38" value={formData.godina_proizvodnje_crijeva_hd38 || ''} onChange={handleChange} className={inputClass} placeholder="YYYY" />
                  </div>
                  <div>
                    <label htmlFor="datum_testiranja_pritiska_crijeva_hd38" className={labelClass}>Datum Testiranja Pritiska Crijeva HD38</label>
                    <input type="date" name="datum_testiranja_pritiska_crijeva_hd38" id="datum_testiranja_pritiska_crijeva_hd38" value={formData.datum_testiranja_pritiska_crijeva_hd38 || ''} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>
              {/* TW75 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-3">TW75 Crijevo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="broj_crijeva_tw75" className={labelClass}>Broj Crijeva TW75</label>
                    <input type="text" name="broj_crijeva_tw75" id="broj_crijeva_tw75" value={formData.broj_crijeva_tw75 || ''} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="godina_proizvodnje_crijeva_tw75" className={labelClass}>Godina Proizvodnje Crijeva TW75</label>
                    <input type="number" name="godina_proizvodnje_crijeva_tw75" id="godina_proizvodnje_crijeva_tw75" value={formData.godina_proizvodnje_crijeva_tw75 || ''} onChange={handleChange} className={inputClass} placeholder="YYYY" />
                  </div>
                  <div>
                    <label htmlFor="datum_testiranja_pritiska_crijeva_tw75" className={labelClass}>Datum Testiranja Pritiska Crijeva TW75</label>
                    <input type="date" name="datum_testiranja_pritiska_crijeva_tw75" id="datum_testiranja_pritiska_crijeva_tw75" value={formData.datum_testiranja_pritiska_crijeva_tw75 || ''} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Datumi Kalibracije */}
            <section>
              <h2 className={sectionTitleClass}><FaTools className="mr-3 text-indigo-500"/>Datumi Kalibracije</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="datum_kalibracije_moment_kljuca" className={labelClass}>Moment Ključa</label>
                  <input type="date" name="datum_kalibracije_moment_kljuca" id="datum_kalibracije_moment_kljuca" value={formData.datum_kalibracije_moment_kljuca || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="datum_kalibracije_termometra" className={labelClass}>Termometra</label>
                  <input type="date" name="datum_kalibracije_termometra" id="datum_kalibracije_termometra" value={formData.datum_kalibracije_termometra || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="datum_kalibracije_hidrometra" className={labelClass}>Hidrometra</label>
                  <input type="date" name="datum_kalibracije_hidrometra" id="datum_kalibracije_hidrometra" value={formData.datum_kalibracije_hidrometra || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="datum_kalibracije_uredjaja_elektricne_provodljivosti" className={labelClass}>Uređaja El. Provodljivosti</label>
                  <input type="date" name="datum_kalibracije_uredjaja_elektricne_provodljivosti" id="datum_kalibracije_uredjaja_elektricne_provodljivosti" value={formData.datum_kalibracije_uredjaja_elektricne_provodljivosti || ''} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </section>

            {/* Section: Datum Isteka CWD */}
            <section>
              <h2 className={sectionTitleClass}><FaTag className="mr-3 text-indigo-500"/>Datum Isteka CWD</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <label htmlFor="datum_isteka_cwd" className={labelClass}>Datum Isteka CWD</label>
                  <input type="date" name="datum_isteka_cwd" id="datum_isteka_cwd" value={formData.datum_isteka_cwd || ''} onChange={handleChange} className={inputClass} />
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
