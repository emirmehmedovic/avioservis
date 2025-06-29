'use client';

import React, { useState } from 'react';
import { Vehicle, HoseDocument, ServiceRecord, ServiceItemType } from '@/types';
import { 
  FaShippingFast, 
  FaCalendarAlt,
  FaRuler,
  FaRulerHorizontal,
  FaRulerVertical,
  FaIndustry,
  FaTools,
  FaTag,
  FaCalendarDay,
  FaCalendarCheck,
  FaHourglass,
  FaWrench,
  FaCheckCircle,
  FaPlane,
  FaPlaneArrival,
  FaFileUpload,
  FaFileAlt,
  FaDownload,
  FaTrash,
  FaPlus
} from 'react-icons/fa';
import Card from './Card';
import DatePairItem from './DatePairItem';
import EditableItem from './EditableItem';
import { toast } from 'react-toastify';
import { uploadHoseDocument, deleteHoseDocument } from '@/lib/apiService';
import ServiceRecordsByType from './ServiceRecordsByType';

interface HosesSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
  serviceRecords?: ServiceRecord[];
  isLoadingServiceRecords?: boolean;
  onViewRecord?: (record: ServiceRecord) => void;
}

const HosesSection: React.FC<HosesSectionProps> = ({ 
  vehicle, 
  onUpdate, 
  serviceRecords = [], 
  isLoadingServiceRecords = false, 
  onViewRecord = () => {}
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('hose_manual');
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
      await uploadHoseDocument(
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
      await deleteHoseDocument(vehicle.id, documentId);
      
      toast.success('Dokument uspješno obrisan');
      onUpdate(); // Osvježavanje podataka
    } catch (error) {
      console.error('Greška prilikom brisanja dokumenta:', error);
      toast.error('Greška prilikom brisanja dokumenta');
    }
  };
  return (
    <Card title="Crijeva i testovi" icon={<FaShippingFast />} className="mb-6">
      {/* Sekcija za podkrilno punjenje */}
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaPlane className="mr-2 text-blue-500" /> Crijeva podkrilno punjenje
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EditableItem 
            label="Standard" 
            value={vehicle.underwing_hose_standard} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_standard" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Tip" 
            value={vehicle.underwing_hose_type} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_type" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Veličina" 
            value={vehicle.underwing_hose_size} 
            icon={<FaRuler />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_size" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Dužina" 
            value={vehicle.underwing_hose_length} 
            icon={<FaRulerHorizontal />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_length" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Prečnik" 
            value={vehicle.underwing_hose_diameter} 
            icon={<FaRulerVertical />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_diameter" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum proizvodnje" 
            value={vehicle.underwing_hose_production_date} 
            icon={<FaIndustry />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_production_date" 
            type="date"
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum ugradnje" 
            value={vehicle.underwing_hose_installation_date} 
            icon={<FaTools />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_installation_date" 
            type="date"
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Životni vijek" 
            value={vehicle.underwing_hose_lifespan} 
            icon={<FaHourglass />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_lifespan" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum testiranja" 
            value={vehicle.underwing_hose_test_date} 
            icon={<FaCheckCircle />} 
            vehicleId={vehicle.id} 
            fieldName="underwing_hose_test_date" 
            type="date"
            onUpdate={onUpdate} 
          />
        </div>
      </div>

      {/* Sekcija za nadkrilno punjenje */}
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaPlaneArrival className="mr-2 text-blue-500" /> Crijeva nadkrilno punjenje
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EditableItem 
            label="Standard" 
            value={vehicle.overwing_hose_standard} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_standard" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Tip" 
            value={vehicle.overwing_hose_type} 
            icon={<FaTag />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_type" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Veličina" 
            value={vehicle.overwing_hose_size} 
            icon={<FaRuler />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_size" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Dužina" 
            value={vehicle.overwing_hose_length} 
            icon={<FaRulerHorizontal />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_length" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Prečnik" 
            value={vehicle.overwing_hose_diameter} 
            icon={<FaRulerVertical />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_diameter" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum proizvodnje" 
            value={vehicle.overwing_hose_production_date} 
            icon={<FaIndustry />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_production_date" 
            type="date"
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum ugradnje" 
            value={vehicle.overwing_hose_installation_date} 
            icon={<FaTools />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_installation_date" 
            type="date"
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Životni vijek" 
            value={vehicle.overwing_hose_lifespan} 
            icon={<FaHourglass />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_lifespan" 
            onUpdate={onUpdate} 
          />
          <EditableItem 
            label="Datum testiranja" 
            value={vehicle.overwing_hose_test_date} 
            icon={<FaCheckCircle />} 
            vehicleId={vehicle.id} 
            fieldName="overwing_hose_test_date" 
            type="date"
            onUpdate={onUpdate} 
          />
        </div>
      </div>

      {/* Sekcija za testove */}
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaWrench className="mr-2 text-blue-500" /> Testovi i kalibracije
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="HECPV/ILCPV test" 
            lastDate={vehicle.last_hecpv_ilcpv_test_date} 
            nextDate={vehicle.next_hecpv_ilcpv_test_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_hecpv_ilcpv_test_date" 
            nextDateFieldName="next_hecpv_ilcpv_test_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarCheck />} 
          />
          <DatePairItem 
            baseLabel="6-mjesečna provjera" 
            lastDate={vehicle.last_6_month_check_date} 
            nextDate={vehicle.next_6_month_check_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_6_month_check_date" 
            nextDateFieldName="next_6_month_check_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarCheck />} 
          />
          <DatePairItem 
            baseLabel="Umjeravanje manometrom" 
            lastDate={vehicle.manometer_calibration_date} 
            nextDate={vehicle.manometer_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="manometer_calibration_date" 
            nextDateFieldName="manometer_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaCalendarCheck />} 
          />
          <DatePairItem 
            baseLabel="Test curenja crijeva" 
            lastDate={vehicle.last_hose_leak_test_date} 
            nextDate={vehicle.next_hose_leak_test_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_hose_leak_test_date" 
            nextDateFieldName="next_hose_leak_test_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
        </div>
      </div>

      {/* Sekcija za zamjene crijeva */}
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaCalendarDay className="mr-2 text-blue-500" /> Zamjene crijeva
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="Zamjena crijeva HD63" 
            lastDate={vehicle.last_hose_hd63_replacement_date} 
            nextDate={vehicle.next_hose_hd63_replacement_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_hose_hd63_replacement_date" 
            nextDateFieldName="next_hose_hd63_replacement_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
          <DatePairItem 
            baseLabel="Zamjena crijeva HD38" 
            lastDate={vehicle.last_hose_hd38_replacement_date} 
            nextDate={vehicle.next_hose_hd38_replacement_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_hose_hd38_replacement_date" 
            nextDateFieldName="next_hose_hd38_replacement_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
          <DatePairItem 
            baseLabel="Zamjena crijeva TW75" 
            lastDate={vehicle.last_hose_tw75_replacement_date} 
            nextDate={vehicle.next_hose_tw75_replacement_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_hose_tw75_replacement_date" 
            nextDateFieldName="next_hose_tw75_replacement_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
        </div>
      </div>

      {/* Sekcija za detalje HD38, HD63, TW75 crijeva */}
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaWrench className="mr-2 text-blue-500" /> Detalji specifičnih crijeva
        </h3>
        
        {/* HD63 Crijeva */}
        <div className="mb-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 px-1">HD63 Crijeva</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <EditableItem 
              label="Broj crijeva HD63" 
              value={vehicle.broj_crijeva_hd63} 
              icon={<FaTag />} 
              vehicleId={vehicle.id} 
              fieldName="broj_crijeva_hd63" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Godina proizvodnje" 
              value={vehicle.godina_proizvodnje_crijeva_hd63} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="godina_proizvodnje_crijeva_hd63" 
              type="number"
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Datum testiranja pritiska" 
              value={vehicle.datum_testiranja_pritiska_crijeva_hd63} 
              icon={<FaWrench />} 
              vehicleId={vehicle.id} 
              fieldName="datum_testiranja_pritiska_crijeva_hd63" 
              type="date"
              onUpdate={onUpdate} 
            />
          </div>
        </div>

        {/* HD38 Crijeva */}
        <div className="mb-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 px-1">HD38 Crijeva</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <EditableItem 
              label="Broj crijeva HD38" 
              value={vehicle.broj_crijeva_hd38} 
              icon={<FaTag />} 
              vehicleId={vehicle.id} 
              fieldName="broj_crijeva_hd38" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Godina proizvodnje" 
              value={vehicle.godina_proizvodnje_crijeva_hd38} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="godina_proizvodnje_crijeva_hd38" 
              type="number"
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Datum testiranja pritiska" 
              value={vehicle.datum_testiranja_pritiska_crijeva_hd38} 
              icon={<FaWrench />} 
              vehicleId={vehicle.id} 
              fieldName="datum_testiranja_pritiska_crijeva_hd38" 
              type="date"
              onUpdate={onUpdate} 
            />
          </div>
        </div>

        {/* TW75 Crijeva */}
        <div className="mb-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 px-1">TW75 Crijeva</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <EditableItem 
              label="Broj crijeva TW75" 
              value={vehicle.broj_crijeva_tw75} 
              icon={<FaTag />} 
              vehicleId={vehicle.id} 
              fieldName="broj_crijeva_tw75" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Godina proizvodnje" 
              value={vehicle.godina_proizvodnje_crijeva_tw75} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="godina_proizvodnje_crijeva_tw75" 
              type="number"
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Datum testiranja pritiska" 
              value={vehicle.datum_testiranja_pritiska_crijeva_tw75} 
              icon={<FaWrench />} 
              vehicleId={vehicle.id} 
              fieldName="datum_testiranja_pritiska_crijeva_tw75" 
              type="date"
              onUpdate={onUpdate} 
            />
          </div>
        </div>
      </div>

      {/* Upload dokumentacije */}
      <div className="mt-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1 flex items-center">
          <FaFileUpload className="mr-2 text-blue-500" /> Upload dokumentacije
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
                <option value="hose_manual">Uputstvo za crijevo</option>
                <option value="hose_certificate">Certifikat crijeva</option>
                <option value="hose_inspection">Izvještaj o pregledu</option>
                <option value="hose_test">Test crijeva</option>
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
              {vehicle.hoseDocuments && vehicle.hoseDocuments.length > 0 ? (
                vehicle.hoseDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <FaFileAlt className="mr-2 text-indigo-500" /> {doc.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.documentType === 'hose_manual' && 'Uputstvo za crijevo'}
                      {doc.documentType === 'hose_certificate' && 'Certifikat crijeva'}
                      {doc.documentType === 'hose_inspection' && 'Izvještaj o pregledu'}
                      {doc.documentType === 'hose_test' && 'Test crijeva'}
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

      {/* Zasebna sekcija za prikaz servisnih zapisa crijeva */}
      {serviceRecords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
            Historija servisnih zapisa crijeva
          </h3>
          
          <ServiceRecordsByType
            serviceRecords={serviceRecords}
            isLoading={isLoadingServiceRecords}
            onViewRecord={onViewRecord}
            serviceItemTypes={[
              ServiceItemType.HOSE_HD63,
              ServiceItemType.HOSE_HD38,
              ServiceItemType.HOSE_TW75,
              ServiceItemType.HOSE_LEAK_TEST,
              ServiceItemType.OVERWING_HOSE_TEST,
              ServiceItemType.UNDERWING_HOSE_TEST,
              ServiceItemType.HD38_PRESSURE_TEST,
              ServiceItemType.HD63_PRESSURE_TEST,
              ServiceItemType.TW75_PRESSURE_TEST
            ]}
            title="Servisni zapisi crijeva"
          />
        </div>
      )}
    </Card>
  );
};

export default HosesSection;
