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
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1 text-gray-800">Historija servisa</h3>
            <p className="text-sm text-gray-600">Upravljanje servisnim zapisima, radnim nalozima i testovima</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('service')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl backdrop-blur-md transition-all duration-200 ${
              activeTab === 'service' 
                ? 'bg-gradient-to-r from-[#4FC3C7]/30 to-[#4FC3C7]/10 text-[#4FC3C7] border border-[#4FC3C7]/30 shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <FaFileAlt className="mr-2" size={16} />
            Servisni zapisi
          </button>
          <button
            onClick={() => setActiveTab('workorder')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl backdrop-blur-md transition-all duration-200 ${
              activeTab === 'workorder' 
                ? 'bg-gradient-to-r from-[#F08080]/30 to-[#F08080]/10 text-[#F08080] border border-[#F08080]/30 shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <FileText className="mr-2" size={16} />
            Radni nalozi
          </button>
          <button
            onClick={() => setActiveTab('valvetest')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl backdrop-blur-md transition-all duration-200 ${
              activeTab === 'valvetest' 
                ? 'bg-gradient-to-r from-[#8B5CF6]/30 to-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30 shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <FaVial className="mr-2" size={16} />
            Test ILPCV HEPC
          </button>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create Actions */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                <FaPlus size={16} className="text-[#10B981]" />
              </div>
              <h4 className="text-sm font-medium text-gray-800">Kreiranje</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onAddRecord}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-[#10B981] border border-[#10B981] rounded-xl hover:bg-[#10B981]/90 transition-all duration-200"
              >
                <FaPlus className="mr-2" size={14} />
                Servisni zapis
              </button>
              {onAddWorkOrder && (
                <button
                  onClick={onAddWorkOrder}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-[#3B82F6] border border-[#3B82F6] rounded-xl hover:bg-[#3B82F6]/90 transition-all duration-200"
                >
                  <FileText className="mr-2" size={14} />
                  Radni nalog
                </button>
              )}
              {activeTab === 'valvetest' && (
                <button
                  onClick={() => {
                    setSelectedValveTest(null);
                    setIsEditingValveTest(false);
                    setIsValveTestModalOpen(true);
                  }}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-[#8B5CF6] border border-[#8B5CF6] rounded-xl hover:bg-[#8B5CF6]/90 transition-all duration-200"
                >
                  <FaPlus className="mr-2" size={14} />
                  Test ventila
                </button>
              )}
            </div>
          </div>

          {/* Export Actions */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                <FaFileDownload size={16} className="text-[#EF4444]" />
              </div>
              <h4 className="text-sm font-medium text-gray-800">Izvoz PDF</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generatePdfReport('bs')}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-[#EF4444] border border-[#EF4444] rounded-xl hover:bg-[#EF4444]/90 transition-all duration-200"
                title="Preuzmi PDF na bosanskom"
              >
                <FileText className="mr-2" size={14} />
                PDF (BS)
              </button>
              <button
                onClick={() => generatePdfReport('en')}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-[#3B82F6] border border-[#3B82F6] rounded-xl hover:bg-[#3B82F6]/90 transition-all duration-200"
                title="Preuzmi PDF na engleskom"
              >
                <FileText className="mr-2" size={14} />
                PDF (EN)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-[#4FC3C7] animate-spin" />
              <p className="text-gray-600 text-sm">Učitavanje podataka...</p>
            </div>
          </div>
        ) : serviceRecords.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <FaFileMedical className="h-12 w-12 text-gray-400" />
              <p className="text-gray-600">Nema servisnih zapisa za ovo vozilo.</p>
            </div>
          </div>
        ) : activeTab === 'service' ? (
          <div className="overflow-x-auto">
            {regularServiceRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <FaFileAlt className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-600">Nema servisnih zapisa za ovo vozilo.</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategorija</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {regularServiceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateForDisplay(record.serviceDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#4FC3C7]/20 text-[#4FC3C7] border border-[#4FC3C7]/30">
                          {formatServiceCategory(record.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.documentUrl ? (
                          <a 
                            href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${record.documentUrl}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#3B82F6] hover:text-[#3B82F6]/80 transition-colors"
                          >
                            Preuzmi
                          </a>
                        ) : (
                          <span className="text-gray-400">Nema</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewRecord(record)}
                            className="p-2 text-[#3B82F6] hover:text-[#3B82F6]/80 hover:bg-[#3B82F6]/10 rounded-lg transition-all duration-200"
                            aria-label="Pregledaj servisni zapis"
                          >
                            <FaEye size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteServiceRecord(record.id)}
                            className="p-2 text-[#EF4444] hover:text-[#EF4444]/80 hover:bg-[#EF4444]/10 rounded-lg transition-all duration-200"
                            aria-label="Obriši servisni zapis"
                            disabled={deletingRecordId === record.id}
                          >
                            {deletingRecordId === record.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FaTrash size={16} />
                            )}
                          </button>
                        </div>
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
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-600">Nema radnih naloga za ovo vozilo.</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workOrders.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateForDisplay(record.serviceDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#F08080]/20 text-[#F08080] border border-[#F08080]/30">
                          Radni nalog
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.documentUrl ? (
                          <a 
                            href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${record.documentUrl}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#3B82F6] hover:text-[#3B82F6]/80 transition-colors"
                          >
                            Preuzmi
                          </a>
                        ) : (
                          <span className="text-gray-400">Nema</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewRecord(record)}
                            className="p-2 text-[#3B82F6] hover:text-[#3B82F6]/80 hover:bg-[#3B82F6]/10 rounded-lg transition-all duration-200"
                            aria-label="Pregledaj radni nalog"
                          >
                            <FaEye size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteServiceRecord(record.id)}
                            className="p-2 text-[#EF4444] hover:text-[#EF4444]/80 hover:bg-[#EF4444]/10 rounded-lg transition-all duration-200"
                            aria-label="Obriši radni nalog"
                            disabled={deletingRecordId === record.id}
                          >
                            {deletingRecordId === record.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FaTrash size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="p-6">
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
          </div>
        )}
      </div>

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
