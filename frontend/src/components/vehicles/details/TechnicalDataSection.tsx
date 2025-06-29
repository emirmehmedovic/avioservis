'use client';

import React, { useState } from 'react';
import { Vehicle, TechnicalDocument } from '@/types';
import { 
  FaTools, 
  FaTruck, 
  FaIndustry, 
  FaHashtag, 
  FaBolt, 
  FaTint, 
  FaCalendarAlt,
  FaFileUpload,
  FaFileAlt,
  FaDownload,
  FaTrash,
  FaPlus
} from 'react-icons/fa';
import Card from './Card';
import { toast } from 'react-toastify';
import DatePairItem from './DatePairItem';
import { uploadTechnicalDocument, deleteTechnicalDocument } from '@/lib/apiService';

interface TechnicalDataSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
}

const TechnicalDataSection: React.FC<TechnicalDataSectionProps> = ({ vehicle, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('technical_inspection');
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
      await uploadTechnicalDocument(
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
      await deleteTechnicalDocument(vehicle.id, documentId);
      
      toast.success('Dokument uspješno obrisan');
      onUpdate(); // Osvježavanje podataka
    } catch (error) {
      console.error('Greška prilikom brisanja dokumenta:', error);
      toast.error('Greška prilikom brisanja dokumenta');
    }
  };

  return (
    <Card title="Tehnički podaci i dokumentacija" icon={<FaTools />} className="mb-6">
      <div className="space-y-6">
        {/* Osnovni tehnički podaci */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaTruck className="inline-block mr-2 text-indigo-500" /> 
            Osnovni tehnički podaci
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaTruck className="mr-2 text-indigo-500" /> Tip kamiona
              </div>
              <div className="font-medium">{vehicle.truck_type || 'Nije postavljeno'}</div>
            </div>
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaIndustry className="mr-2 text-indigo-500" /> Proizvođač
              </div>
              <div className="font-medium">{vehicle.chassis_manufacturer || 'Nije postavljeno'}</div>
            </div>
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaHashtag className="mr-2 text-indigo-500" /> Broj šasije
              </div>
              <div className="font-medium">{vehicle.chassis_number || 'Nije postavljeno'}</div>
            </div>
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaBolt className="mr-2 text-indigo-500" /> Snaga motora
              </div>
              <div className="font-medium">{vehicle.engine_power_kw ? `${vehicle.engine_power_kw} kW` : 'Nije postavljeno'}</div>
            </div>
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaTint className="mr-2 text-indigo-500" /> Kapacitet
              </div>
              <div className="font-medium">{vehicle.kapacitet_cisterne ? `${vehicle.kapacitet_cisterne} L` : 'Nije postavljeno'}</div>
            </div>
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaCalendarAlt className="mr-2 text-indigo-500" /> Godina proizvodnje
              </div>
              <div className="font-medium">{vehicle.year_of_manufacture || 'Nije postavljeno'}</div>
            </div>
          </div>
        </div>

        {/* Datumi pregleda i licence */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaCalendarAlt className="inline-block mr-2 text-indigo-500" /> 
            Pregledi i licence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePairItem 
              title="Šestomjesečni pregled"
              lastDate={vehicle.last_6_month_check_date}
              nextDate={vehicle.next_6_month_check_date}
              icon={<FaCalendarAlt />}
            />
            <DatePairItem 
              title="Tromjesečni pregled"
              lastDate={vehicle.tromjesecni_pregled_datum}
              nextDate={vehicle.tromjesecni_pregled_vazi_do}
              icon={<FaCalendarAlt />}
            />
            <DatePairItem 
              title="ADR"
              lastDate={null}
              nextDate={vehicle.adr_vazi_do}
              icon={<FaCalendarAlt />}
              showLastDate={false}
              nextDateLabel="Važi do"
            />
            <DatePairItem 
              title="Licenca"
              lastDate={vehicle.licenca_datum_izdavanja}
              nextDate={vehicle.licenca_vazi_do}
              icon={<FaCalendarAlt />}
              lastDateLabel="Izdana"
              nextDateLabel="Važi do"
            />
            <DatePairItem 
              title="Kalibracija volumetra"
              lastDate={vehicle.volumeter_kalibracija_datum}
              nextDate={vehicle.volumeter_kalibracija_vazi_do}
              icon={<FaCalendarAlt />}
            />
          </div>
        </div>

        {/* Pregledi */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaCalendarAlt className="inline-block mr-2 text-indigo-500" /> 
            Pregledi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaCalendarAlt className="mr-2 text-indigo-500" /> Tromjesečni pregled - datum
              </div>
              <div className="font-medium">{vehicle.tromjesecni_pregled_datum ? formatDate(vehicle.tromjesecni_pregled_datum) : 'Nije postavljeno'}</div>
            </div>
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <FaCalendarAlt className="mr-2 text-indigo-500" /> Tromjesečni pregled - važi do
              </div>
              <div className="font-medium">{vehicle.tromjesecni_pregled_vazi_do ? formatDate(vehicle.tromjesecni_pregled_vazi_do) : 'Nije postavljeno'}</div>
            </div>
          </div>
        </div>

        {/* Upload dokumentacije */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaFileUpload className="inline-block mr-2 text-indigo-500" /> 
            Upload dokumentacije
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
                  <option value="technical_inspection">Tehnički pregled</option>
                  <option value="adr_certificate">ADR certifikat</option>
                  <option value="license">Licenca</option>
                  <option value="calibration">Kalibracija</option>
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
                {vehicle.technicalDocuments && vehicle.technicalDocuments.length > 0 ? (
                  vehicle.technicalDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <FaFileAlt className="mr-2 text-indigo-500" /> {doc.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.documentType === 'vehicle_manual' && 'Uputstvo za vozilo'}
                        {doc.documentType === 'registration' && 'Registracija'}
                        {doc.documentType === 'insurance' && 'Osiguranje'}
                        {doc.documentType === 'technical_inspection' && 'Tehnički pregled'}
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
      </div>
    </Card>
  );
};

export default TechnicalDataSection;
