'use client';

import React, { useRef } from 'react';
import { ServiceRecord } from '@/types';
import { FaCalendarAlt, FaDownload, FaFileAlt, FaTools } from 'react-icons/fa';

// Funkcija za formatiranje datuma
const formatDate = (date: Date | string, format: string = 'dd.MM.yyyy'): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString());
};

// Koristimo HTML2Canvas i jsPDF za printanje umjesto react-to-print
const useReactToPrint = (config: { content: () => HTMLElement | null; documentTitle?: string }) => {
  return async () => {
    const content = config.content();
    if (!content) return;
    
    // Koristimo window.print za jednostavno printanje
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${config.documentTitle || 'Print'}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .print-header { text-align: center; margin-bottom: 20px; }
            .border { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .font-medium { font-weight: 500; }
            .whitespace-pre-line { white-space: pre-line; }
            .min-h-\\[50px\\] { min-height: 50px; }
            .min-h-\\[150px\\] { min-height: 150px; }
            .text-center { text-align: center; }
            .border-t { border-top: 1px solid #ccc; padding-top: 5px; }
            .text-sm { font-size: 0.875rem; }
            .text-gray-500 { color: #6b7280; }
            .mt-4 { margin-top: 1rem; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
};

interface WorkOrderViewProps {
  serviceRecord: ServiceRecord;
  onClose: () => void;
}

const WorkOrderView: React.FC<WorkOrderViewProps> = ({ serviceRecord, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Funkcija za parsiranje sadržaja radnog naloga
  const parseWorkOrderContent = () => {
    const content = serviceRecord.description;
    const lines = content.split('\n');
    
    const data: Record<string, string> = {
      nazivFirme: '',
      adresaFirme: '',
      telefonFirme: '',
      datum: '',
      marka: '',
      registracija: '',
      godiste: '',
      motTip: '',
      kilometraza: '',
      vlasnikPrimjedbe: '',
      otklonjeniKvarovi: '',
      ugradjeniDijelovi: '',
      uoceniKvarovi: '',
      napomena: '',
      dodatniOpis: ''
    };
    
    let currentSection = '';
    let inZaglavljeSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '' || line === 'RADNI NALOG') continue;
      
      // Check for zaglavlje section in HTML comments
      if (line === '<!-- ZAGLAVLJE -->') {
        inZaglavljeSection = true;
        continue;
      }
      
      // Parse zaglavlje data from HTML comments
      if (inZaglavljeSection) {
        if (line.includes('<!-- NazivFirme:')) {
          data.nazivFirme = line.replace('<!-- NazivFirme:', '').replace('-->', '').trim();
          continue;
        }
        if (line.includes('<!-- AdresaFirme:')) {
          data.adresaFirme = line.replace('<!-- AdresaFirme:', '').replace('-->', '').trim();
          continue;
        }
        if (line.includes('<!-- TelefonFirme:')) {
          data.telefonFirme = line.replace('<!-- TelefonFirme:', '').replace('-->', '').trim();
          inZaglavljeSection = false; // End of zaglavlje section
          continue;
        }
      }
      
      if (line.startsWith('Datum:')) {
        data.datum = line.replace('Datum:', '').trim();
      } else if (line.startsWith('Marka vozila/tip:')) {
        data.marka = line.replace('Marka vozila/tip:', '').trim();
      } else if (line.startsWith('Reg.:')) {
        data.registracija = line.replace('Reg.:', '').trim();
      } else if (line.startsWith('God.:')) {
        data.godiste = line.replace('God.:', '').trim();
      } else if (line.startsWith('Mot.tip.:')) {
        data.motTip = line.replace('Mot.tip.:', '').trim();
      } else if (line.startsWith('Km.:')) {
        data.kilometraza = line.replace('Km.:', '').trim();
      } else if (line === 'Primjedbe vlasnika vozila:') {
        currentSection = 'vlasnikPrimjedbe';
      } else if (line === 'Otklonjeni kvarovi:') {
        if (currentSection === 'vlasnikPrimjedbe') {
          data.vlasnikPrimjedbe = lines.slice(i - 1).join('\n');
        }
        currentSection = 'otklonjeniKvarovi';
      } else if (line === 'Popis ugrađenih dijelova:') {
        if (currentSection === 'otklonjeniKvarovi') {
          data.otklonjeniKvarovi = lines.slice(i - 1).join('\n');
        }
        currentSection = 'ugradjeniDijelovi';
      } else if (line === 'Uočeni kvarovi ili nedostaci:') {
        if (currentSection === 'ugradjeniDijelovi') {
          data.ugradjeniDijelovi = lines.slice(i - 1).join('\n');
        }
        currentSection = 'uoceniKvarovi';
      } else if (line === 'Napomena:') {
        if (currentSection === 'uoceniKvarovi') {
          data.uoceniKvarovi = lines.slice(i - 1).join('\n');
        }
        currentSection = 'napomena';
      } else if (currentSection) {
        if (currentSection === 'napomena') {
          data.napomena = lines.slice(i).join('\n');
        }
      }
    }
    
    return data;
  };
  
  const workOrderData = parseWorkOrderContent();
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Radni_nalog_${formatDate(serviceRecord.serviceDate, 'dd.MM.yyyy')}`,
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <FaTools className="mr-2 text-indigo-600" /> 
          Radni nalog
          <span className="ml-2 text-sm text-gray-500">
            <FaCalendarAlt className="inline-block mr-1" />
            {formatDate(serviceRecord.serviceDate, 'dd.MM.yyyy')}
          </span>
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaDownload className="mr-1" /> Preuzmi PDF
          </button>
        </div>
      </div>
      
      {/* Sadržaj za printanje */}
      <div 
        ref={printRef} 
        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="print-header text-center mb-6">
          <div className="flex flex-col items-center justify-center border-b border-gray-300 pb-4 mb-4">
            <h1 className="text-2xl font-bold">RADNI NALOG</h1>
            <div className="text-center">
              <p className="font-semibold">{workOrderData.nazivFirme || 'Avioservis d.o.o.'}</p>
              <p>{workOrderData.adresaFirme || 'Aerodrom Sarajevo, 71210 Ilidža'}</p>
              <p>Tel: {workOrderData.telefonFirme || '+387 33 789 000'}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="border border-gray-300 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Dana: </span>
                {workOrderData.datum}
              </div>
              <div>
                <span className="font-medium">Marka vozila/tip: </span>
                {workOrderData.marka}
              </div>
              <div>
                <span className="font-medium">Reg.: </span>
                {workOrderData.registracija}
              </div>
              <div>
                <span className="font-medium">God.: </span>
                {workOrderData.godiste}
              </div>
              <div>
                <span className="font-medium">Mot.tip.: </span>
                {workOrderData.motTip}
              </div>
              <div>
                <span className="font-medium">Km.: </span>
                {workOrderData.kilometraza}
              </div>
            </div>
          </div>
          
          <div className="border border-gray-300 p-3">
            <div className="font-medium mb-1">Primjedbe vlasnika vozila:</div>
            <div className="whitespace-pre-line min-h-[50px]">{workOrderData.vlasnikPrimjedbe}</div>
          </div>
          
          <div className="border border-gray-300 p-3">
            <div className="font-medium mb-1">Otklonjeni kvarovi:</div>
            <div className="whitespace-pre-line min-h-[50px]">{workOrderData.otklonjeniKvarovi}</div>
          </div>
          
          <div className="border border-gray-300 p-3">
            <div className="font-medium mb-1">Popis ugrađenih dijelova:</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="whitespace-pre-line min-h-[150px]">{workOrderData.ugradjeniDijelovi}</div>
              <div></div>
            </div>
          </div>
          
          <div className="border border-gray-300 p-3">
            <div className="font-medium mb-1">Uočeni kvarovi ili nedostaci:</div>
            <div className="whitespace-pre-line min-h-[50px]">{workOrderData.uoceniKvarovi}</div>
          </div>
          
          <div className="border border-gray-300 p-3">
            <div className="font-medium mb-1">Napomena:</div>
            <div className="whitespace-pre-line min-h-[50px]">{workOrderData.napomena}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-1">Nalogodavac</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-1">Serviser</div>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-4">
            radni nalog - kopirni blok A4 -
          </div>
        </div>
      </div>
      
      {/* Gumb za zatvaranje */}
      <div className="flex justify-end mt-4">
        <button
          onClick={onClose}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Zatvori
        </button>
      </div>
    </div>
  );
};

export default WorkOrderView;
