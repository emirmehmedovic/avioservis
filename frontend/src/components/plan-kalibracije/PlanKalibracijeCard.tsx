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

interface StatusInfo {
  status: 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';
  message: string;
  expiredInstruments: string[];
  expiringSoonInstruments: string[];
}

type StatusType = 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';

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
      message: `${expiredInstruments.length} instrument(a) je isteklo`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiringSoonInstruments.length > 0) {
    return {
      status: 'uskoro_istice',
      message: `${expiringSoonInstruments.length} instrument(a) uskoro ističe`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  return {
    status: 'aktivan',
    message: 'Svi instrumenti su aktuelni',
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
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-600' };
      case 'istekao':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' };
      case 'uskoro_istice':
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'text-yellow-600' };
      case 'nepotpun':
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: 'text-gray-600' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: 'text-gray-600' };
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
    <Card className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
      
      {/* Subtle background patterns */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full filter blur-3xl opacity-30 -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full filter blur-3xl opacity-30 -ml-20 -mb-20"></div>
      
      <CardHeader className="relative z-10 pb-4 border-b border-gray-100">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-lg font-bold text-gray-900 truncate">{plan.naziv_opreme}</span>
              <span className="text-sm text-gray-500">#{plan.identifikacijski_broj}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text} ${statusColors.border} border flex-shrink-0 shadow-sm`}>
            <span className={statusColors.icon}>{getStatusIcon(statusInfo.status)}</span>
            {statusInfo.status.replace('_', ' ').toUpperCase()}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10 p-6 space-y-6">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group/item relative p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-100 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2 group-hover/item:bg-blue-200 transition-colors duration-200"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover/item:bg-blue-200 transition-colors duration-200">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Vlasnik</span>
                <p className="text-gray-900 font-semibold truncate" title={plan.vlasnik_opreme}>
                  {plan.vlasnik_opreme}
                </p>
              </div>
            </div>
          </div>
          
          <div className="group/item relative p-4 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200">
            <div className="absolute top-0 right-0 w-8 h-8 bg-green-100 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2 group-hover/item:bg-green-200 transition-colors duration-200"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 group-hover/item:bg-green-200 transition-colors duration-200">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Mjesto</span>
                <p className="text-gray-900 font-semibold truncate" title={plan.mjesto_koristenja_opreme}>
                  {plan.mjesto_koristenja_opreme}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="relative p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-100 rounded-full filter blur-xl opacity-50 -mr-4 -mt-4"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-600" />
                Status kalibracija
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{statusInfo.message}</p>
            
            {statusInfo.expiredInstruments.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Istekli instrumenti:
                </p>
                <p className="text-xs text-red-600">{statusInfo.expiredInstruments.join(', ')}</p>
              </div>
            )}
            
            {statusInfo.expiringSoonInstruments.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-700 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Uskoro ističu:
                </p>
                <p className="text-xs text-yellow-600">{statusInfo.expiringSoonInstruments.join(', ')}</p>
              </div>
            )}

            {isExpanded && (
              <div className="mt-5 space-y-3">
                <h5 className="text-sm font-semibold text-gray-800">Detaljne kalibracije:</h5>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {instruments.map((instrument, index) => (
                    <div key={index} className="flex justify-between items-center text-xs p-3 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <span className="text-gray-700 font-medium">{instrument.name}</span>
                      <div className="text-right">
                        <div className="text-gray-500">
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

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Kreiran: {formatDate(plan.kreiran)}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(plan)}
              className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 shadow-sm"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGeneratePDF(plan.id)}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800 shadow-sm"
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
              className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 shadow-sm"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 