'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Eye, Edit, Trash, Download, FileText, Container, Ruler, Calendar, MapPin, User, Package, Zap, Hammer, Dimensions, ShieldAlert, FileCheck, AlertCircle } from 'lucide-react';
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
      {/* Card */}
      <div className="relative bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-300">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 h-1 bg-blue-600 rounded-tl-xl" style={{ width: '4px' }}></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-blue-200/50">
              <Container className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{rezervoar.naziv_rezervoara}</h3>
              <p className="text-gray-500 text-xs font-medium">#{rezervoar.id_broj}</p>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Location */}
          <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-semibold uppercase">Mjesto</span>
            </div>
            <p className="text-gray-900 font-medium text-sm truncate" title={rezervoar.mjesto_koristenja}>
              {rezervoar.mjesto_koristenja}
            </p>
          </div>

          {/* Owner */}
          <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-semibold uppercase">Vlasnik</span>
            </div>
            <p className="text-gray-900 font-medium text-sm truncate" title={rezervoar.vlasnik}>
              {rezervoar.vlasnik}
            </p>
          </div>

          {/* Shape */}
          <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-semibold uppercase">Oblik</span>
            </div>
            <p className="text-gray-900 font-medium text-sm capitalize">{rezervoar.oblik_rezervoara}</p>
          </div>

          {/* Capacity */}
          <div className="bg-blue-50 hover:bg-blue-100/60 rounded-lg p-3.5 border border-blue-200 hover:border-blue-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-600 font-semibold uppercase">Kapacitet</span>
            </div>
            <p className="text-blue-900 font-bold text-lg">
              {Number(rezervoar.kapacitet).toLocaleString()} L
            </p>
          </div>

          {/* Material */}
          <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Hammer className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-semibold uppercase">Materijal</span>
            </div>
            <p className="text-gray-900 font-medium text-sm" title={rezervoar.materijal_izgradnje}>
              {rezervoar.materijal_izgradnje}
            </p>
          </div>

          {/* Dimensions */}
          <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-semibold uppercase">Dimenzije</span>
            </div>
            <p className="text-gray-900 font-medium text-sm">
              {Number(rezervoar.dimenzije_l)} × {Number(rezervoar.dimenzije_w)} × {Number(rezervoar.dimenzije_h)} m
            </p>
          </div>

          {/* Calibration */}
          <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-semibold uppercase">Kalibracija</span>
            </div>
            <p className="text-gray-900 font-medium text-sm">{formatDate(rezervoar.datum_kalibracije)}</p>
          </div>

          {/* Volume */}
          <div className="bg-green-50 hover:bg-green-100/60 rounded-lg p-3.5 border border-green-200 hover:border-green-300 transition-all hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Container className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs text-green-600 font-semibold uppercase">Volumen</span>
            </div>
            <p className="text-green-900 font-bold text-lg">
              {calculateVolume().toFixed(2)} m³
            </p>
          </div>
        </div>

        {/* Protection Info */}
        {rezervoar.zastita_unutrasnjeg_rezervoara && (
          <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-200 mb-6 hover:border-amber-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600 font-semibold uppercase">Zaštita</span>
            </div>
            <p className="text-amber-900 font-medium text-sm" title={rezervoar.zastita_unutrasnjeg_rezervoara}>
              {rezervoar.zastita_unutrasnjeg_rezervoara}
            </p>
          </div>
        )}

        {/* Document section */}
        {rezervoar.dokument_url && (
          <div className="bg-emerald-50 rounded-lg p-3.5 border border-emerald-200 mb-6 hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Dokument</span>
              </div>
              <button
                onClick={handleDownloadDocument}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 px-3 py-1 rounded text-sm font-medium transition-all"
              >
                Preuzmi
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        {rezervoar.napomene && (
          <div className="bg-blue-50 rounded-lg p-3.5 mb-6 border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-600 text-xs uppercase">Napomene</span>
            </div>
            <p className="text-blue-900 text-sm line-clamp-2" title={rezervoar.napomene}>
              {rezervoar.napomene}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between items-center gap-2 pt-5 border-t border-gray-100">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              title="Uredi rezervoar"
              className="h-9 px-3 border border-gray-300 hover:border-gray-400 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-200 font-medium hover:shadow-sm"
            >
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              title="Obriši rezervoar"
              className="h-9 px-3 border border-red-300 hover:border-red-400 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 font-medium hover:shadow-sm"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleGeneratePDF}
            title="Generiraj PDF"
            className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-medium text-sm h-9 px-4 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
} 