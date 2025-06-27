'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit, Trash, Download, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, Settings2, User, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { PlanKalibracije } from '@/types/planKalibracije';

interface PlanKalibracijeCardProps {
  plan: PlanKalibracije;
  onEdit: (plan: PlanKalibracije) => void;
  onDelete: (id: number) => void;
  onGeneratePDF: (id: number) => void;
}

// Status tipovi
type StatusType = 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';

interface StatusInfo {
  status: StatusType;
  message: string;
  expiredInstruments: string[];
  expiringSoonInstruments: string[];
}

// Helper funkcija za provjeru statusa
const getStatusInfo = (plan: PlanKalibracije): StatusInfo => {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const instruments = [
    { name: 'Volumetar', date: plan.volumetar_kalibracija_do },
    { name: 'Glavni volumetar', date: plan.glavni_volumetar_kalibracija_do },
    { name: 'Manometri', date: plan.manometri_kalibracija_do },
    { name: 'Crijevo za punjenje', date: plan.crijevo_punjenje_kalibracija_do },
    { name: 'Glavni manometar', date: plan.glavni_manometar_kalibracija_do },
    { name: 'Termometar', date: plan.termometar_kalibracija_do },
    { name: 'Hidrometar', date: plan.hidrometar_kalibracija_do },
    { name: 'Električni denziometar', date: plan.elektricni_denziometar_kalibracija_do },
    { name: 'Mjerač provodljivosti', date: plan.mjerac_provodljivosti_kalibracija_do },
    { name: 'Mjerač otpora provoda', date: plan.mjerac_otpora_provoda_kalibracija_do },
    { name: 'Moment ključ', date: plan.moment_kljuc_kalibracija_do },
    { name: 'Shal detector', date: plan.shal_detector_kalibracija_do },
  ];

  const expiredInstruments: string[] = [];
  const expiringSoonInstruments: string[] = [];
  let hasValidDates = false;

  instruments.forEach(instrument => {
    if (instrument.date) {
      hasValidDates = true;
      const expiryDate = new Date(instrument.date);
      
      if (expiryDate < today) {
        expiredInstruments.push(instrument.name);
      } else if (expiryDate <= thirtyDaysFromNow) {
        expiringSoonInstruments.push(instrument.name);
      }
    }
  });

  if (!hasValidDates) {
    return {
      status: 'nepotpun',
      message: 'Nedostaju podaci o kalibraciji',
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiredInstruments.length > 0) {
    return {
      status: 'istekao',
      message: `Istekli instrumenti: ${expiredInstruments.join(', ')}`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiringSoonInstruments.length > 0) {
    return {
      status: 'uskoro_istice',
      message: `Uskoro ističu: ${expiringSoonInstruments.join(', ')}`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  return {
    status: 'aktivan',
    message: 'Svi instrumenti su važeći',
    expiredInstruments,
    expiringSoonInstruments
  };
};

export function PlanKalibracijeCard({ plan, onEdit, onDelete, onGeneratePDF }: PlanKalibracijeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = getStatusInfo(plan);

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'aktivan':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/20' };
      case 'istekao':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/20' };
      case 'uskoro_istice':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/20' };
      case 'nepotpun':
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/20' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/20' };
    }
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'aktivan':
        return <CheckCircle className="h-4 w-4" />;
      case 'istekao':
        return <XCircle className="h-4 w-4" />;
      case 'uskoro_istice':
        return <Clock className="h-4 w-4" />;
      case 'nepotpun':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('bs-BA');
  };

  const statusColors = getStatusColor(statusInfo.status);

  const instruments = [
    { name: 'Volumetar', od: plan.volumetar_kalibracija_od, do: plan.volumetar_kalibracija_do },
    { name: 'Glavni volumetar', od: plan.glavni_volumetar_kalibracija_od, do: plan.glavni_volumetar_kalibracija_do },
    { name: 'Manometri', od: plan.manometri_kalibracija_od, do: plan.manometri_kalibracija_do },
    { name: 'Crijevo za punjenje', od: plan.crijevo_punjenje_kalibracija_od, do: plan.crijevo_punjenje_kalibracija_do },
    { name: 'Glavni manometar', od: plan.glavni_manometar_kalibracija_od, do: plan.glavni_manometar_kalibracija_do },
    { name: 'Termometar', od: plan.termometar_kalibracija_od, do: plan.termometar_kalibracija_do },
    { name: 'Hidrometar', od: plan.hidrometar_kalibracija_od, do: plan.hidrometar_kalibracija_do },
    { name: 'Električni denziometar', od: plan.elektricni_denziometar_kalibracija_od, do: plan.elektricni_denziometar_kalibracija_do },
    { name: 'Mjerač provodljivosti', od: plan.mjerac_provodljivosti_kalibracija_od, do: plan.mjerac_provodljivosti_kalibracija_do },
    { name: 'Mjerač otpora provoda', od: plan.mjerac_otpora_provoda_kalibracija_od, do: plan.mjerac_otpora_provoda_kalibracija_do },
    { name: 'Moment ključ', od: plan.moment_kljuc_kalibracija_od, do: plan.moment_kljuc_kalibracija_do },
    { name: 'Shal detector', od: plan.shal_detector_kalibracija_od, do: plan.shal_detector_kalibracija_do },
  ];

  return (
    <Card className="h-full flex flex-col overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c]/60 to-[#1a1a1a]/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10 z-0"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full filter blur-3xl opacity-20 -ml-10 -mb-10 z-0"></div>
      
      <CardHeader className="relative z-10 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-6 h-6 text-blue-400" />
            </div>
            <span className="truncate text-xl font-bold text-white">{plan.naziv_opreme}</span>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border} border flex-shrink-0`}>
            {getStatusIcon(statusInfo.status)}
            {statusInfo.status.replace('_', ' ').toUpperCase()}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col space-y-5 p-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3v-7h6v7h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">ID Broj:</span>
                <p className="text-blue-400 truncate text-sm font-bold" title={plan.identifikacijski_broj}>
                  #{plan.identifikacijski_broj}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-green-400" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Vlasnik:</span>
                <p className="text-white/90 truncate text-sm font-medium" title={plan.vlasnik_opreme}>
                  {plan.vlasnik_opreme}
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-span-2 relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
            <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-purple-400" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-xs">Mjesto korištenja:</span>
                <p className="text-white/90 text-sm font-medium" title={plan.mjesto_koristenja_opreme}>
                  {plan.mjesto_koristenja_opreme}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative p-4 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/20 rounded-full filter blur-xl opacity-50 -mr-4 -mt-4"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                Status kalibracija
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            <p className="text-sm text-white/80 mb-3">{statusInfo.message}</p>
            
            {statusInfo.expiredInstruments.length > 0 && (
              <div className="mb-2 p-2 rounded bg-red-500/20 border border-red-500/30">
                <p className="text-xs font-medium text-red-400 mb-1">Istekli instrumenti:</p>
                <p className="text-xs text-red-300">{statusInfo.expiredInstruments.join(', ')}</p>
              </div>
            )}
            
            {statusInfo.expiringSoonInstruments.length > 0 && (
              <div className="p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
                <p className="text-xs font-medium text-yellow-400 mb-1">Uskoro ističu:</p>
                <p className="text-xs text-yellow-300">{statusInfo.expiringSoonInstruments.join(', ')}</p>
              </div>
            )}

            {isExpanded && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-white/90">Detaljne kalibracije:</h5>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {instruments.map((instrument, index) => (
                    <div key={index} className="flex justify-between items-center text-xs p-2 rounded bg-white/5 border border-white/10">
                      <span className="text-white/80">{instrument.name}</span>
                      <div className="text-right">
                        <div className="text-white/60">
                          {formatDate(instrument.od)} - {formatDate(instrument.do)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="text-xs text-white/60">
            Kreiran: {formatDate(plan.kreiran)}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(plan)}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGeneratePDF(plan.id)}
              className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-400 hover:text-blue-300"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm(`Da li ste sigurni da želite obrisati plan kalibracije za "${plan.naziv_opreme}"?`)) {
                  onDelete(plan.id);
                }
              }}
              className="bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400 hover:text-red-300"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 