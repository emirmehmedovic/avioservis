'use client';

import React, { useState } from 'react';
import { Vehicle, FilterDocument, ServiceRecord, ServiceItemType } from '@/types';
import { 
  FaFilter, 
  FaCheckSquare, 
  FaCalendarAlt, 
  FaMicrochip, 
  FaClock, 
  FaTag,
  FaFileUpload,
  FaFileAlt,
  FaDownload,
  FaTrash,
  FaPlus,
  FaShieldAlt,
  FaWrench,
  FaExchangeAlt,
  FaWind,
  FaBell
} from 'react-icons/fa';
import Card from './Card';
import EditableItem from './EditableItem';
import DatePairItem from './DatePairItem';
import { toast } from 'react-toastify';
import { uploadFilterDocument, deleteFilterDocument } from '@/lib/apiService';
import ServiceRecordsByType from './ServiceRecordsByType';

interface FilterDataSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
  serviceRecords?: ServiceRecord[];
  isLoadingServiceRecords?: boolean;
  onViewRecord?: (record: ServiceRecord) => void;
}

const FilterDataSection: React.FC<FilterDataSectionProps> = ({ 
  vehicle, 
  onUpdate, 
  serviceRecords = [], 
  isLoadingServiceRecords = false, 
  onViewRecord = () => {}
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('filter_manual');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Funkcija za formatiranje datuma
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Nije postavljeno';
    return new Date(date).toLocaleDateString('bs-BA');
  };

  // Funkcija za upload dokumenta
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Funkcija za slanje dokumenta na server
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !documentTitle) {
      toast.error('Molimo odaberite fajl i unesite naslov dokumenta');
      return;
    }

    setIsUploading(true);
    try {
      // Poziv API funkcije za upload dokumenta
      await uploadFilterDocument(
        vehicle.id,
        documentTitle,
        documentType,
        selectedFile
      );
      
      toast.success('Dokument uspješno uploadan');
      setDocumentTitle('');
      setSelectedFile(null);
      onUpdate(); // Osvježavanje podataka
    } catch (error) {
      console.error('Greška prilikom uploada dokumenta:', error);
      toast.error('Greška prilikom uploada dokumenta');
    } finally {
      setIsUploading(false);
    }
  };

  // Funkcija za brisanje dokumenta
  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj dokument?')) {
      return;
    }

    try {
      // Poziv API funkcije za brisanje dokumenta
      await deleteFilterDocument(vehicle.id, documentId);
      
      toast.success('Dokument uspješno obrisan');
      onUpdate(); // Osvježavanje podataka
    } catch (error) {
      console.error('Greška prilikom brisanja dokumenta:', error);
      toast.error('Greška prilikom brisanja dokumenta');
    }
  };
  return (
    <Card title="Oprema za filtriranje" icon={<FaFilter />} className="mb-6">
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaFilter className="mr-2 text-blue-500" /> Osnovne informacije
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EditableItem 
            label="Filter instaliran" 
            value={vehicle.filter_installed} 
            icon={<FaCheckSquare />} 
            vehicleId={vehicle.id} 
            fieldName="filter_installed" 
            type="boolean" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum instalacije" 
            value={vehicle.filter_installation_date} 
            icon={<FaCalendarAlt />} 
            vehicleId={vehicle.id} 
            fieldName="filter_installation_date" 
            type="date" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum isteka" 
            value={vehicle.filter_expiry_date} 
            icon={<FaCalendarAlt />} 
            vehicleId={vehicle.id} 
            fieldName="filter_expiry_date" 
            type="date" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Standard filtriranja" 
            value={vehicle.filter_standard} 
            icon={<FaShieldAlt />} 
            vehicleId={vehicle.id} 
            fieldName="filter_standard" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum zamjene" 
            value={vehicle.filter_replacement_date} 
            icon={<FaCalendarAlt />} 
            vehicleId={vehicle.id} 
            fieldName="filter_replacement_date" 
            type="date" 
            onUpdate={onUpdate} 
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaMicrochip className="mr-2 text-blue-500" /> Informacije o filteru
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EditableItem 
            label="Broj pločice" 
            value={vehicle.filter_type_plate_no} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="filter_type_plate_no" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Broj posude" 
            value={vehicle.vessel_plate_no} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="vessel_plate_no" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Tip posude" 
            value={vehicle.filter_vessel_type} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="filter_vessel_type" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Tip filtera" 
            value={vehicle.tip_filtera} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="tip_filtera" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Tip uložaka" 
            value={vehicle.filter_cartridge_type} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="filter_cartridge_type" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Tip separatora" 
            value={vehicle.filter_separator_type} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="filter_separator_type" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="EWS" 
            value={vehicle.filter_ews} 
            icon={<FaBell />} 
            vehicleId={vehicle.id} 
            fieldName="filter_ews" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Sigurnosni ventil" 
            value={vehicle.filter_safety_valve} 
            icon={<FaShieldAlt />} 
            vehicleId={vehicle.id} 
            fieldName="filter_safety_valve" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Ventil ozrake" 
            value={vehicle.filter_vent_valve} 
            icon={<FaWind />} 
            vehicleId={vehicle.id} 
            fieldName="filter_vent_valve" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Senzor tehnologija" 
            value={vehicle.sensor_technology} 
            icon={<FaMicrochip />} 
            vehicleId={vehicle.id} 
            fieldName="sensor_technology" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Period važenja (mjeseci)" 
            value={vehicle.filter_validity_period_months} 
            icon={<FaClock />} 
            vehicleId={vehicle.id} 
            fieldName="filter_validity_period_months" 
            type="number" 
            onUpdate={onUpdate} 
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaCalendarAlt className="mr-2 text-blue-500" /> Održavanje filtera
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="Šestomjesečni pregled" 
            lastDate={vehicle.last_6_month_check_date} 
            nextDate={vehicle.next_6_month_check_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_6_month_check_date" 
            nextDateFieldName="next_6_month_check_date" 
            onUpdate={onUpdate} 
            icon={<FaFilter />} 
          />
          <DatePairItem 
            baseLabel="HECPV/ILCPV test" 
            lastDate={vehicle.last_hecpv_ilcpv_test_date} 
            nextDate={vehicle.next_hecpv_ilcpv_test_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_hecpv_ilcpv_test_date" 
            nextDateFieldName="next_hecpv_ilcpv_test_date" 
            onUpdate={onUpdate} 
            icon={<FaFilter />} 
          />
        </div>
      </div>
      
      {/* Upload dokumentacije */}
      <div>
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaFileUpload className="mr-2 text-blue-500" /> Dokumentacija filtera
        </h3>
        <form onSubmit={handleUploadDocument} className="mb-6 p-4 border rounded-md bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naslov dokumenta</label>
              <input 
                type="text" 
                value={documentTitle} 
                onChange={(e) => setDocumentTitle(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Unesite naslov dokumenta"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip dokumenta</label>
              <select 
                value={documentType} 
                onChange={(e) => setDocumentType(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="filter_manual">Uputstvo za filter</option>
                <option value="filter_certificate">Certifikat filtera</option>
                <option value="filter_inspection">Izvještaj o pregledu</option>
                <option value="filter_test">Test filtera</option>
                <option value="other">Ostalo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dokument</label>
              <input 
                type="file" 
                onChange={handleFileChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span> Uploading...
                </>
              ) : (
                <>
                  <FaPlus className="mr-2" /> Dodaj dokument
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lista dokumenata */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum uploada</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicle.filterDocuments && vehicle.filterDocuments.length > 0 ? (
                vehicle.filterDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <FaFileAlt className="mr-2 text-indigo-500" /> {doc.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.documentType === 'filter_manual' && 'Uputstvo za filter'}
                      {doc.documentType === 'filter_certificate' && 'Certifikat filtera'}
                      {doc.documentType === 'filter_inspection' && 'Izvještaj o pregledu'}
                      {doc.documentType === 'filter_test' && 'Test filtera'}
                      {doc.documentType === 'other' && 'Ostalo'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${doc.fileUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <FaDownload className="mr-1" /> Preuzmi
                        </a>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <FaTrash className="mr-1" /> Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Nema dokumenata za prikaz
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zasebna sekcija za prikaz servisnih zapisa filtera */}
      {serviceRecords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
            Historija servisnih zapisa filtera
          </h3>
          
          <ServiceRecordsByType
            serviceRecords={serviceRecords}
            isLoading={isLoadingServiceRecords}
            onViewRecord={onViewRecord}
            serviceItemTypes={[
              ServiceItemType.FILTER,
              ServiceItemType.FILTER_ANNUAL_INSPECTION,
              ServiceItemType.FILTER_EW_SENSOR_INSPECTION
            ]}
            title="Servisni zapisi filtera"
          />
        </div>
      )}
    </Card>
  );
};

export default FilterDataSection;
