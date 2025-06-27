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

  return (
    <Card className="h-full flex flex-col overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c]/60 to-[#1a1a1a]/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080]/20 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10 z-0"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full filter blur-3xl opacity-20 -ml-10 -mb-10 z-0"></div>
      
      <CardHeader className="relative z-10 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#F08080]/20 flex items-center justify-center flex-shrink-0">
              <Container className="w-6 h-6 text-[#F08080]" />
            </div>
            <span className="truncate text-xl font-bold text-white">{rezervoar.naziv_rezervoara}</span>
          </div>
          <span className="text-sm font-medium text-[#F08080] bg-[#F08080]/10 px-3 py-1 rounded-full border border-[#F08080]/20 flex-shrink-0">
            #{rezervoar.id_broj}
          </span>
        </CardTitle>
      </CardHeader>
      
            <CardContent className="flex-grow flex flex-col space-y-5 p-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Mjesto:</span>
                <p className="text-white/90 truncate text-sm font-medium" title={rezervoar.mjesto_koristenja}>
                  {rezervoar.mjesto_koristenja}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Vlasnik:</span>
                <p className="text-white/90 truncate text-sm font-medium" title={rezervoar.vlasnik}>
                  {rezervoar.vlasnik}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-purple-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                <Container className="w-3 h-3 text-purple-400" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Oblik:</span>
                <p className="text-white/90 capitalize text-sm font-medium">{rezervoar.oblik_rezervoara}</p>
              </div>
            </div>
          </div>
          
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-orange-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Kapacitet:</span>
                <p className="text-[#F08080] font-bold text-sm">
                  {Number(rezervoar.kapacitet).toLocaleString()} L
                </p>
              </div>
            </div>
          </div>

          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-gray-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-gray-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Materijal:</span>
                <p className="text-white/90 text-sm font-medium" title={rezervoar.materijal_izgradnje}>
                  {rezervoar.materijal_izgradnje}
                </p>
              </div>
            </div>
          </div>

          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Ruler className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Dimenzije:</span>
                <p className="text-white/90 text-sm font-medium">
                  {Number(rezervoar.dimenzije_l)} × {Number(rezervoar.dimenzije_w)} × {Number(rezervoar.dimenzije_h)} m
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3 h-3 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Kalibracija:</span>
                <p className="text-white/90 text-sm font-medium">{formatDate(rezervoar.datum_kalibracije)}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2 relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Volumen:</span>
                <p className="text-cyan-400 font-bold text-base">
                  {calculateVolume().toFixed(2)} m³
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-2 relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Zaštita unutrašnjeg rezervoara:</span>
                <p className="text-white/90 text-sm font-medium" title={rezervoar.zastita_unutrasnjeg_rezervoara}>
                  {rezervoar.zastita_unutrasnjeg_rezervoara}
                </p>
              </div>
            </div>
          </div>

          {rezervoar.dokument_url && (
            <div className="col-span-2 relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
              <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-grow">
                  <span className="font-semibold text-white text-xs">Dokument:</span>
                  <button 
                    onClick={handleDownloadDocument}
                    className="ml-2 text-emerald-400 hover:text-emerald-300 transition-colors text-sm underline font-medium"
                  >
                    Preuzmi dokument
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>



        {rezervoar.napomene && (
          <div className="text-sm bg-white/5 p-3 rounded-lg border border-white/10">
            <span className="font-semibold text-white block mb-2">Napomene:</span>
            <p className="text-white/80 line-clamp-2" title={rezervoar.napomene}>
              {rezervoar.napomene}
            </p>
          </div>
        )}

        <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/20">
          <div className="flex space-x-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(rezervoar)}
              title="Uredi rezervoar"
              className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 h-10 w-10 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(rezervoar.id)}
              title="Obriši rezervoar"
              className="h-10 w-10 p-0 text-red-400 hover:text-red-300 border border-white/10 hover:bg-red-500/10 transition-all duration-200"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            onClick={() => onGeneratePDF(rezervoar.id)}
            title="Generiraj PDF izvještaj"
            className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium text-sm h-10 px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 