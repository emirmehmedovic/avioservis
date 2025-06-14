import React from 'react';
import { FuelingOperation } from '../types';
import { formatDate, API_BASE_URL, generatePDFInvoice } from '../utils/helpers';

interface OperationDetailsModalProps {
  operation: FuelingOperation;
  onClose: () => void;
}

const OperationDetailsModal: React.FC<OperationDetailsModalProps> = ({ operation, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient background */}
        <div className="hope-gradient p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex flex-col space-y-1">
              <h2 className="text-2xl font-bold flex items-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 14C20 14 18 10 12 10C6 10 4 14 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Detalji Operacije Točenja
              </h2>
              <p className="text-sm opacity-80">
                Pregled informacija o operaciji točenja goriva
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">ID: {operation.id}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Osnovni Podaci */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12H15M9 16H15M9 8H15M5 21H19C20.1046 21 21 20.1046 21 19V9.41421C21 9.149 20.8946 8.89464 20.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Osnovni Podaci
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Datum i Vrijeme:</span>
                  <span className="font-medium text-gray-900">{formatDate(operation.dateTime)}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Registracija Aviona:</span>
                  <span className="font-medium text-gray-900">{operation.aircraft_registration || 'N/A (Sistemska letjelica)'}</span>
                </div>
                {operation.aircraft && (
                  <div className="flex items-start">
                    <span className="text-gray-500 w-40 flex-shrink-0">Sistemska Letjelica:</span>
                    <span className="font-medium text-gray-900">{operation.aircraft.vehicle_name} ({operation.aircraft.license_plate})</span>
                  </div>
                )}
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Avio Kompanija:</span>
                  <span className="font-medium text-gray-900">{operation.airline.name}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Destinacija:</span>
                  <span className="font-medium text-gray-900">{operation.destination}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Broj Leta:</span>
                  <span className="font-medium text-gray-900">{operation.flight_number || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Količina (L):</span>
                  <span className="font-medium text-gray-900">{(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Gustoća:</span>
                  <span className="font-medium text-gray-900">{(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Količina (kg):</span>
                  <span className="font-medium text-gray-900">{(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Cijena po kg:</span>
                  <span className="font-medium text-gray-900">{(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} {operation.currency || 'BAM'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Ukupan iznos:</span>
                  <span className="font-medium text-gray-900">{(operation.total_amount || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} {operation.currency || 'BAM'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Avio Cisterna:</span>
                  <span className="font-medium text-gray-900">{operation.tank?.identifier || 'N/A'} - {operation.tank?.name || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Tip Saobraćaja:</span>
                  {operation.tip_saobracaja ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {operation.tip_saobracaja}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Operater:</span>
                  <span className="font-medium text-gray-900">{operation.operator_name}</span>
                </div>
              </div>
            </div>
          </section>
          
          {/* Napomene */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12H15M9 16H15M9 8H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Napomene
              </h3>
            </div>
            <div className="p-4">
              {operation.notes ? (
                <p className="text-gray-700">{operation.notes}</p>
              ) : (
                <p className="text-gray-500 italic">Nema napomena za ovu operaciju.</p>
              )}
            </div>
          </section>
          
          {/* Priloženi Dokument */}
          {operation.documents && operation.documents.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center text-gray-800">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
                    <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Priloženi Dokumenti ({operation.documents?.length || 0})
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {operation.documents?.map((doc) => (
                    <div key={doc.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center">
                          <svg className="w-8 h-8 text-indigo-500 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
                            <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate" title={doc.originalFilename}>
                              {doc.originalFilename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(doc.sizeBytes / (1024*1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <a 
                          href={`${API_BASE_URL}/uploads/fueling_documents/${doc.storagePath.split('/').pop()}`} 
                          download={doc.originalFilename}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors rounded-md flex items-center justify-center shadow-sm self-center sm:self-end" 
                          title="Preuzmi dokument"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 10V17M12 17L9 14M12 17L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 17V19C17 20.1046 16.1046 21 15 21H9C7.89543 21 7 20.1046 7 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 3V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={() => generatePDFInvoice(operation)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center font-medium shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
              <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Generiši PDF Fakturu
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center font-medium shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationDetailsModal;
