'use client';

import React, { useState } from 'react';
import ServiceRecordDetailsModal from './ServiceRecordDetailsModal';
import { ServiceRecord, ServiceItemType } from '@/types';
import { ValveTestRecord, ValveTestType } from '@/types/valve';
import { FaEye, FaTrash, FaPlus, FaFileMedical, FaFileAlt, FaFileDownload, FaVial } from 'react-icons/fa';
import { formatServiceCategory, formatDateForDisplay } from './serviceHelpers';
import Card from '@/components/vehicles/details/Card';
import { toast } from 'react-toastify';
import { deleteServiceRecord } from '@/lib/apiService';
import { Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { notoSansRegularBase64 } from '@/lib/fonts';
import { notoSansBoldBase64 } from '@/lib/notoSansBoldBase64';
import ValveTestSection from './ValveTestSection';
import ValveTestDetailsModal from './ValveTestDetailsModal';

interface ServiceRecordsSectionProps {
  vehicleId: number;
  serviceRecords: ServiceRecord[];
  isLoading: boolean;
  onViewRecord: (record: ServiceRecord) => void;
  onAddRecord: () => void;
  onRecordDeleted: () => void;
  onAddWorkOrder?: () => void;
}

const FONT_NAME = 'NotoSans';

const ServiceRecordsSection: React.FC<ServiceRecordsSectionProps> = ({
  vehicleId,
  serviceRecords,
  isLoading,
  onViewRecord,
  onAddRecord,
  onRecordDeleted,
  onAddWorkOrder
}) => {
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'workorder' | 'valvetest'>('service');
  const [selectedValveTest, setSelectedValveTest] = useState<ValveTestRecord | null>(null);
  const [isValveTestModalOpen, setIsValveTestModalOpen] = useState<boolean>(false);
  const [isEditingValveTest, setIsEditingValveTest] = useState<boolean>(false);
  
  // Filtriranje servisnih zapisa i radnih naloga
  const workOrders = serviceRecords.filter(record => 
    record.serviceItems.some(item => item.type === ServiceItemType.WORK_ORDER)
  );
  
  const regularServiceRecords = serviceRecords.filter(record => 
    !record.serviceItems.some(item => item.type === ServiceItemType.WORK_ORDER)
  );

  // Register Noto Sans font for proper Bosnian character support
  const registerFont = (doc: jsPDF) => {
    const stripPrefix = (base64String: string) => {
      const prefix = 'data:font/ttf;base64,';
      if (base64String.startsWith(prefix)) {
        return base64String.substring(prefix.length);
      }
      return base64String;
    };

    if (notoSansRegularBase64) {
      const cleanedRegular = stripPrefix(notoSansRegularBase64);
      doc.addFileToVFS('NotoSans-Regular.ttf', cleanedRegular);
      doc.addFont('NotoSans-Regular.ttf', FONT_NAME, 'normal');
    } else {
      console.error('Noto Sans Regular font data not loaded.');
    }

    if (notoSansBoldBase64) {
      const cleanedBold = stripPrefix(notoSansBoldBase64);
      doc.addFileToVFS('NotoSans-Bold.ttf', cleanedBold);
      doc.addFont('NotoSans-Bold.ttf', FONT_NAME, 'bold');
    } else {
      console.error('Noto Sans Bold font data not loaded.');
    }
  };
  
  // Format service item type for PDF
  const formatServiceItemType = (type: string, language: 'bs' | 'en' = 'bs'): string => {
    const typeMapBS: Record<string, string> = {
      'FILTER': 'Filter',
      'HOSE_HD63': 'Crijevo HD63',
      'HOSE_HD38': 'Crijevo HD38',
      'HOSE_TW75': 'Crijevo TW75',
      'HOSE_LEAK_TEST': 'Test curenja crijeva',
      'VOLUMETER': 'Volumetar',
      'MANOMETER': 'Manometar',
      'HECPV_ILCPV': 'HECPV/ILCPV',
      'SIX_MONTH_CHECK': 'Šestomjesečni pregled',
      'ENGINE': 'Motor',
      'BRAKES': 'Kočnice',
      'TRANSMISSION': 'Transmisija',
      'ELECTRICAL': 'Električni sistem',
      'TIRES': 'Gume',
      'WORK_ORDER': 'Radni nalog',
      'OTHER': 'Ostalo'
    };
    
    const typeMapEN: Record<string, string> = {
      'FILTER': 'Filter',
      'HOSE_HD63': 'Hose HD63',
      'HOSE_HD38': 'Hose HD38',
      'HOSE_TW75': 'Hose TW75',
      'HOSE_LEAK_TEST': 'Hose Leak Test',
      'VOLUMETER': 'Volumeter',
      'MANOMETER': 'Manometer',
      'HECPV_ILCPV': 'HECPV/ILCPV',
      'SIX_MONTH_CHECK': 'Six Month Check',
      'ENGINE': 'Engine',
      'BRAKES': 'Brakes',
      'TRANSMISSION': 'Transmission',
      'ELECTRICAL': 'Electrical System',
      'TIRES': 'Tires',
      'WORK_ORDER': 'Work Order',
      'OTHER': 'Other'
    };
    
    return language === 'bs' ? (typeMapBS[type] || type) : (typeMapEN[type] || type);
  };

  // Generate PDF report for service records
  const generatePdfReport = (language: 'bs' | 'en' = 'bs') => {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Register Noto Sans font for proper Bosnian character support
      registerFont(doc);
      
      // Set default font
      doc.setFont(FONT_NAME, 'normal');
      
      // Add title
      doc.setFontSize(18);
      doc.setFont(FONT_NAME, 'bold');
      doc.setTextColor(44, 62, 80); // #2c3e50 - Professional dark blue
      doc.text(language === 'bs' 
        ? `Pregled servisnih zapisa` 
        : `Service Records Overview`, 14, 22);
      
      // Add subtitle with date
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.setFont(FONT_NAME, 'normal');
      const currentDate = format(new Date(), 'dd.MM.yyyy');
      doc.text(language === 'bs' 
        ? `Datum izvještaja: ${currentDate}` 
        : `Report date: ${currentDate}`, 14, 30);
      
      // Add table headers and data
      const tableColumn = language === 'bs' 
        ? ['Datum', 'Tip', 'Opis'] 
        : ['Date', 'Type', 'Description'];
      
      const records = activeTab === 'service' ? regularServiceRecords : workOrders;
      
      const tableRows = records.map(record => [
        formatDateForDisplay(record.serviceDate),
        record.serviceItems.map(item => formatServiceItemType(item.type, language)).join(', '),
        record.description.substring(0, 50) + (record.description.length > 50 ? '...' : '')
      ]);
      
      // Add the table to the PDF
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: {
          font: FONT_NAME,
          fontSize: 10,
          cellPadding: 3,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: 40 }
      });
      
      // Save the PDF with appropriate filename
      doc.save(language === 'bs' 
        ? `Servisni_zapisi_${new Date().toISOString().split('T')[0]}.pdf`
        : `Service_records_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(language === 'bs' 
        ? 'Došlo je do greške prilikom generisanja PDF izvještaja.'
        : 'An error occurred while generating the PDF report.');
    }
  };

  const handleDeleteServiceRecord = async (recordId: number) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj servisni zapis?')) {
      return;
    }
    
    setDeletingRecordId(recordId);
    try {
      await deleteServiceRecord(vehicleId.toString(), recordId.toString());
      toast.success('Servisni zapis uspješno obrisan!');
      onRecordDeleted();
    } catch (error) {
      console.error("Greška pri brisanju servisnog zapisa:", error);
      toast.error('Greška pri brisanju servisnog zapisa.');
    } finally {
      setDeletingRecordId(null);
    }
  };

  return (
    <Card title="Servisni zapisi" icon={<FaFileMedical />} className="mb-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-700">Historija servisa</h3>
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('service')}
                className={`px-3 py-2 text-sm font-medium rounded-xl backdrop-blur-md ${activeTab === 'service' 
                  ? 'bg-gradient-to-r from-[#4FC3C7]/20 to-[#4FC3C7]/5 text-[#4FC3C7] border-b-2 border-[#4FC3C7]' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
              >
                <div className="flex items-center">
                  <FaFileAlt className={`mr-2 ${activeTab === 'service' ? 'text-[#4FC3C7]' : ''}`} />
                  Servisni zapisi
                </div>
              </button>
              <button
                onClick={() => setActiveTab('workorder')}
                className={`px-3 py-2 text-sm font-medium rounded-xl backdrop-blur-md ${activeTab === 'workorder' 
                  ? 'bg-gradient-to-r from-[#F08080]/20 to-[#F08080]/5 text-[#F08080] border-b-2 border-[#F08080]' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
              >
                <div className="flex items-center">
                  <FileText className={`mr-2 ${activeTab === 'workorder' ? 'text-[#F08080]' : ''}`} size={16} />
                  Radni nalozi
                </div>
              </button>
              <button
                onClick={() => setActiveTab('valvetest')}
                className={`px-3 py-2 text-sm font-medium rounded-xl backdrop-blur-md ${activeTab === 'valvetest' 
                  ? 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#8B5CF6]/5 text-[#8B5CF6] border-b-2 border-[#8B5CF6]' 
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
              >
                <div className="flex items-center">
                  <FaVial className={`mr-2 ${activeTab === 'valvetest' ? 'text-[#8B5CF6]' : ''}`} />
                  TEST ILPCV HEPC
                </div>
              </button>
            </div>
            <div className="flex space-x-2">
              <div className="flex space-x-2 mr-2">
                <button
                  onClick={() => generatePdfReport('bs')}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                  title="Preuzmi PDF na bosanskom"
                >
                  <FileText size={16} className="mr-1.5" /> PDF (BS)
                </button>
                <button
                  onClick={() => generatePdfReport('en')}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
                  title="Preuzmi PDF na engleskom"
                >
                  <FileText size={16} className="mr-1.5" /> PDF (EN)
                </button>
              </div>
              {onAddWorkOrder && (
                <button
                  onClick={onAddWorkOrder}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-700 rounded-xl hover:bg-green-700 transition-colors shadow-lg"
                >
                  <FaFileAlt className="mr-1.5" /> Radni nalog
                </button>
              )}
              <button
                onClick={onAddRecord}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-indigo-700 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <FaPlus className="mr-1.5" /> Servisni zapis
              </button>
              {activeTab === 'valvetest' && (
                <button
                  onClick={() => {
                    setSelectedValveTest(null);
                    setIsEditingValveTest(false);
                    setIsValveTestModalOpen(true);
                  }}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 border border-purple-700 rounded-xl hover:bg-purple-700 transition-colors shadow-lg ml-2"
                >
                  <FaPlus className="mr-1.5" /> Test ventila
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : serviceRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nema servisnih zapisa za ovo vozilo.
        </div>
      ) : activeTab === 'service' ? (
        <div className="overflow-x-auto">
          {regularServiceRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nema servisnih zapisa za ovo vozilo.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategorija</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {regularServiceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateForDisplay(record.serviceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatServiceCategory(record.category)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {record.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.documentUrl ? (
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${record.documentUrl}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Preuzmi
                        </a>
                      ) : (
                        <span className="text-gray-400">Nema</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onViewRecord(record)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        aria-label="Pregledaj servisni zapis"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleDeleteServiceRecord(record.id)}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Obriši servisni zapis"
                        disabled={deletingRecordId === record.id}
                      >
                        {deletingRecordId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'workorder' ? (
        <div className="overflow-x-auto">
          {workOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nema radnih naloga za ovo vozilo.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workOrders.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateForDisplay(record.serviceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Radni nalog
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {record.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.documentUrl ? (
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${record.documentUrl}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Preuzmi
                        </a>
                      ) : (
                        <span className="text-gray-400">Nema</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onViewRecord(record)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        aria-label="Pregledaj radni nalog"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleDeleteServiceRecord(record.id)}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Obriši radni nalog"
                        disabled={deletingRecordId === record.id}
                      >
                        {deletingRecordId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <ValveTestSection
          vehicleId={vehicleId}
          onViewTest={(test) => {
            setSelectedValveTest(test);
            setIsEditingValveTest(true);
            setIsValveTestModalOpen(true);
          }}
          onAddTest={() => {
            setSelectedValveTest(null);
            setIsEditingValveTest(false);
            setIsValveTestModalOpen(true);
          }}
          onTestDeleted={() => {
            // This will be called when a test is deleted
            // No specific action needed as ValveTestSection handles its own refresh
          }}
        />
      )}

      {/* Valve Test Details Modal */}
      {isValveTestModalOpen && (
        <ValveTestDetailsModal
          isOpen={isValveTestModalOpen}
          onClose={() => setIsValveTestModalOpen(false)}
          test={selectedValveTest || undefined}
          vehicleId={vehicleId}
          onSave={() => {
            setIsValveTestModalOpen(false);
            // Force the ValveTestSection to refresh by toggling the activeTab
            // This is a workaround to trigger a re-render
            if (activeTab === 'valvetest') {
              const currentTab = activeTab;
              setActiveTab('service');
              setTimeout(() => setActiveTab(currentTab), 10);
            }
          }}
          isEdit={isEditingValveTest}
        />
      )}
    </Card>
  );
};

export default ServiceRecordsSection;
