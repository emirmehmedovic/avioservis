'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit, Trash, Download, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, Settings2, User, MapPin, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { PlanKalibracije } from '@/types/planKalibracije';

interface PlanKalibracijeCardProps {
  plan: PlanKalibracije;
  onEdit: (plan: PlanKalibracije) => void;
  onDelete: (id: number) => void;
  onGeneratePDF: (id: number) => void;
  onGenerateIndividualReport: (id: number) => void;
  onViewDetails: (plan: PlanKalibracije) => void;
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
    { name: 'Kalibraža vatro dojava', date: plan.kalibraza_vatro_dojava_do },
    { name: 'Kalibraža PP aparata', date: plan.kalibraza_pp_aparata_do },
    { name: 'Stručne licence radnika', date: plan.strucne_licence_radnika_do },
    { name: 'ADR dozvole za radnike', date: plan.adr_dozvole_radnika_do },
    { name: 'Mjerenje otpora uzemljenja', date: plan.mjerenje_otpora_uzemljenja_do },
    { name: 'Vatro dojava', date: plan.vatro_dojava_do },
    { name: 'Ispitivanje elektro instalacija', date: plan.ispitivanje_elektro_instalacija_do },
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

export function PlanKalibracijeCard({ plan, onEdit, onDelete, onGeneratePDF, onGenerateIndividualReport, onViewDetails }: PlanKalibracijeCardProps) {
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
    { name: 'Kalibraža vatro dojava', od: plan.kalibraza_vatro_dojava_od, do: plan.kalibraza_vatro_dojava_do },
    { name: 'Kalibraža PP aparata', od: plan.kalibraza_pp_aparata_od, do: plan.kalibraza_pp_aparata_do },
    { name: 'Stručne licence radnika', od: plan.strucne_licence_radnika_od, do: plan.strucne_licence_radnika_do },
    { name: 'ADR dozvole za radnike', od: plan.adr_dozvole_radnika_od, do: plan.adr_dozvole_radnika_do },
    { name: 'Mjerenje otpora uzemljenja', od: plan.mjerenje_otpora_uzemljenja_od, do: plan.mjerenje_otpora_uzemljenja_do },
    { name: 'Vatro dojava', od: plan.vatro_dojava_od, do: plan.vatro_dojava_do },
    { name: 'Ispitivanje elektro instalacija', od: plan.ispitivanje_elektro_instalacija_od, do: plan.ispitivanje_elektro_instalacija_do },
  ];

  return (
    <Card
      className="group relative bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(plan)}
    >
      {/* Subtle accent bar */}
      <div className="absolute top-0 left-0 h-1 bg-blue-600" style={{ width: '4px' }}></div>
      
      <CardHeader className="relative z-10 pb-4 border-b border-gray-100">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <span className="block text-lg font-bold text-gray-900 truncate">{plan.naziv_opreme}</span>
              <span className="text-xs text-gray-500 font-medium">#{plan.identifikacijski_broj}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${statusColors.bg} ${statusColors.text} ${statusColors.border} border flex-shrink-0`}>
            <span className={statusColors.icon}>{getStatusIcon(statusInfo.status)}</span>
            {statusInfo.status.replace('_', ' ').toUpperCase()}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10 p-6 space-y-6">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100/80 hover:shadow-sm transition-all">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-medium text-gray-500 uppercase">Vlasnik</span>
                <p className="text-gray-900 font-medium text-sm truncate" title={plan.vlasnik_opreme}>
                  {plan.vlasnik_opreme}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100/80 hover:shadow-sm transition-all">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-medium text-gray-500 uppercase">Mjesto</span>
                <p className="text-gray-900 font-medium text-sm truncate" title={plan.mjesto_koristenja_opreme}>
                  {plan.mjesto_koristenja_opreme}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="p-5 rounded-lg border border-gray-200 bg-gray-50 hover:shadow-sm transition-all">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-600" />
                Status kalibracija
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
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
              onClick={(e) => {
                e.stopPropagation();
                onEdit(plan);
              }}
              className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 shadow-sm"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onGeneratePDF(plan.id);
              }}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800 shadow-sm"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateIndividualReport(plan.id);
              }}
              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800 shadow-sm"
              title="Generiraj individualni izvještaj"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
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