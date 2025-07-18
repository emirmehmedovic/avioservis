'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Eye, Edit, Trash, Download, FileText, Container, Ruler, Calendar } from 'lucide-react';
import { Rezervoar } from '@/types/rezervoar';
import { API_BASE_URL } from '@/components/fuel/utils/helpers';

interface RezervoarCardProps {
  rezervoar: Rezervoar;
  onEdit: (rezervoar: Rezervoar) => void;
  onDelete: (id: number) => void;
  onGeneratePDF: (id: number) => void;
}

export function RezervoarCard({ rezervoar, onEdit, onDelete, onGeneratePDF }: RezervoarCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bs-BA');
  };

  const calculateVolume = () => {
    return Number(rezervoar.dimenzije_l) * Number(rezervoar.dimenzije_w) * Number(rezervoar.dimenzije_h);
  };

  const handleDownloadDocument = () => {
    if (rezervoar.dokument_url) {
      // Kreiraj link koji vodi na backend URL za dokument
      const documentUrl = `${API_BASE_URL}/api/rezervoari/${rezervoar.id}/dokument`;
      
      // Kreiraj privremeni link element za download
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = `rezervoar_${rezervoar.naziv_rezervoara}_dokument`;
      link.target = '_blank';
      
      // Dodaj link u DOM, klikni ga i ukloni
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEdit = () => {
    console.log('Edit button clicked for rezervoar:', rezervoar.id);
    onEdit(rezervoar);
  };

  const handleDelete = () => {
    console.log('Delete button clicked for rezervoar:', rezervoar.id);
    onDelete(rezervoar.id);
  };

  const handleGeneratePDF = () => {
    console.log('PDF button clicked for rezervoar:', rezervoar.id);
    onGeneratePDF(rezervoar.id);
  };

  return (
    <div className="group relative">
      {/* Card with gradient border */}
      <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <Container className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-xl">{rezervoar.naziv_rezervoara}</h3>
              <p className="text-gray-500 text-sm">Rezervoar #{rezervoar.id_broj}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-semibold shadow-sm">
            #{rezervoar.id_broj}
          </span>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Location */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Mjesto</span>
            </div>
            <p className="text-gray-800 font-medium text-sm truncate" title={rezervoar.mjesto_koristenja}>
              {rezervoar.mjesto_koristenja}
            </p>
          </div>

          {/* Owner */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Vlasnik</span>
            </div>
            <p className="text-gray-800 font-medium text-sm truncate" title={rezervoar.vlasnik}>
              {rezervoar.vlasnik}
            </p>
          </div>

          {/* Shape */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Container className="w-3 h-3 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Oblik</span>
            </div>
            <p className="text-gray-800 font-medium text-sm capitalize">{rezervoar.oblik_rezervoara}</p>
          </div>

          {/* Capacity */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Kapacitet</span>
            </div>
            <p className="text-orange-600 font-bold text-lg">
              {Number(rezervoar.kapacitet).toLocaleString()} L
            </p>
          </div>

          {/* Material */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Materijal</span>
            </div>
            <p className="text-gray-800 font-medium text-sm" title={rezervoar.materijal_izgradnje}>
              {rezervoar.materijal_izgradnje}
            </p>
          </div>

          {/* Dimensions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <Ruler className="w-3 h-3 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Dimenzije</span>
            </div>
            <p className="text-gray-800 font-medium text-sm">
              {Number(rezervoar.dimenzije_l)} × {Number(rezervoar.dimenzije_w)} × {Number(rezervoar.dimenzije_h)} m
            </p>
          </div>

          {/* Calibration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="w-3 h-3 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Kalibracija</span>
            </div>
            <p className="text-gray-800 font-medium text-sm">{formatDate(rezervoar.datum_kalibracije)}</p>
          </div>
        </div>

        {/* Volume and Protection - Full width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Volume */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Volumen</span>
            </div>
            <p className="text-cyan-700 font-bold text-xl">
              {calculateVolume().toFixed(2)} m³
            </p>
          </div>

          {/* Protection */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Zaštita</span>
            </div>
            <p className="text-red-700 font-medium text-sm" title={rezervoar.zastita_unutrasnjeg_rezervoara}>
              {rezervoar.zastita_unutrasnjeg_rezervoara}
            </p>
          </div>
        </div>

        {/* Document section */}
        {rezervoar.dokument_url && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Dokument</span>
              </div>
              <button 
                onClick={handleDownloadDocument}
                className="text-emerald-600 hover:text-emerald-700 transition-colors text-sm font-medium underline"
              >
                Preuzmi dokument
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        {rezervoar.napomene && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <span className="font-semibold text-gray-700 block mb-2 text-sm">Napomene:</span>
            <p className="text-gray-600 text-sm line-clamp-2" title={rezervoar.napomene}>
              {rezervoar.napomene}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 relative z-10">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              title="Uredi rezervoar"
              className="h-9 w-9 p-0 border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900 cursor-pointer relative z-20 pointer-events-auto transition-all duration-200 hover:scale-105"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              title="Obriši rezervoar"
              className="h-9 w-9 p-0 border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 cursor-pointer relative z-20 pointer-events-auto transition-all duration-200 hover:scale-105"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            onClick={handleGeneratePDF}
            title="Generiraj PDF izvještaj"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg transition-all font-medium text-sm h-9 px-4 cursor-pointer relative z-20 pointer-events-auto hover:scale-105"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
} 