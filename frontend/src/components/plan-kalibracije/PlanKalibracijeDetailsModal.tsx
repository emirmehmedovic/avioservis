'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  Settings2,
  Shield,
  Zap,
  Users
} from 'lucide-react';
import { PlanKalibracije } from '@/types/planKalibracije';

interface PlanKalibracijeDetailsModalProps {
  plan: PlanKalibracije | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CalibrationItem {
  name: string;
  category: string;
  icon: React.ReactNode;
  fromDate: Date | string | null;
  toDate: Date | string | null;
  status: 'valid' | 'expiring' | 'expired' | 'not_set';
  daysUntilExpiry?: number;
}

const PlanKalibracijeDetailsModal: React.FC<PlanKalibracijeDetailsModalProps> = ({
  plan,
  isOpen,
  onClose
}) => {
  const [calibrationItems, setCalibrationItems] = useState<CalibrationItem[]>([]);

  useEffect(() => {
    if (plan) {
      const items: CalibrationItem[] = [
        // Osnovni instrumenti
        {
          name: 'Volumetar',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.volumetar_kalibracija_od,
          toDate: plan.volumetar_kalibracija_do,
          status: getStatus(plan.volumetar_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.volumetar_kalibracija_do)
        },
        {
          name: 'Glavni volumetar',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.glavni_volumetar_kalibracija_od,
          toDate: plan.glavni_volumetar_kalibracija_do,
          status: getStatus(plan.glavni_volumetar_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.glavni_volumetar_kalibracija_do)
        },
        {
          name: 'Manometri',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.manometri_kalibracija_od,
          toDate: plan.manometri_kalibracija_do,
          status: getStatus(plan.manometri_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.manometri_kalibracija_do)
        },
        {
          name: 'Crijevo za punjenje',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.crijevo_punjenje_kalibracija_od,
          toDate: plan.crijevo_punjenje_kalibracija_do,
          status: getStatus(plan.crijevo_punjenje_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.crijevo_punjenje_kalibracija_do)
        },
        {
          name: 'Glavni manometar',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.glavni_manometar_kalibracija_od,
          toDate: plan.glavni_manometar_kalibracija_do,
          status: getStatus(plan.glavni_manometar_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.glavni_manometar_kalibracija_do)
        },
        {
          name: 'Termometar',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.termometar_kalibracija_od,
          toDate: plan.termometar_kalibracija_do,
          status: getStatus(plan.termometar_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.termometar_kalibracija_do)
        },
        {
          name: 'Hidrometar',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.hidrometar_kalibracija_od,
          toDate: plan.hidrometar_kalibracija_do,
          status: getStatus(plan.hidrometar_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.hidrometar_kalibracija_do)
        },
        {
          name: 'Električni denziometar',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.elektricni_denziometar_kalibracija_od,
          toDate: plan.elektricni_denziometar_kalibracija_do,
          status: getStatus(plan.elektricni_denziometar_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.elektricni_denziometar_kalibracija_do)
        },
        {
          name: 'Mjerač provodljivosti',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.mjerac_provodljivosti_kalibracija_od,
          toDate: plan.mjerac_provodljivosti_kalibracija_do,
          status: getStatus(plan.mjerac_provodljivosti_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.mjerac_provodljivosti_kalibracija_do)
        },
        {
          name: 'Mjerač otpora provoda',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.mjerac_otpora_provoda_kalibracija_od,
          toDate: plan.mjerac_otpora_provoda_kalibracija_do,
          status: getStatus(plan.mjerac_otpora_provoda_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.mjerac_otpora_provoda_kalibracija_do)
        },
        {
          name: 'Moment ključ',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.moment_kljuc_kalibracija_od,
          toDate: plan.moment_kljuc_kalibracija_do,
          status: getStatus(plan.moment_kljuc_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.moment_kljuc_kalibracija_do)
        },
        {
          name: 'Shal detector',
          category: 'Osnovni instrumenti',
          icon: <Settings2 className="h-4 w-4" />,
          fromDate: plan.shal_detector_kalibracija_od,
          toDate: plan.shal_detector_kalibracija_do,
          status: getStatus(plan.shal_detector_kalibracija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.shal_detector_kalibracija_do)
        },
        // Sigurnosni instrumenti
        {
          name: 'Kalibraža vatro dojava',
          category: 'Sigurnosni instrumenti',
          icon: <Shield className="h-4 w-4" />,
          fromDate: plan.kalibraza_vatro_dojava_od,
          toDate: plan.kalibraza_vatro_dojava_do,
          status: getStatus(plan.kalibraza_vatro_dojava_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.kalibraza_vatro_dojava_do)
        },
        {
          name: 'Kalibraža PP aparata',
          category: 'Sigurnosni instrumenti',
          icon: <Shield className="h-4 w-4" />,
          fromDate: plan.kalibraza_pp_aparata_od,
          toDate: plan.kalibraza_pp_aparata_do,
          status: getStatus(plan.kalibraza_pp_aparata_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.kalibraza_pp_aparata_do)
        },
        {
          name: 'Vatro dojava',
          category: 'Sigurnosni instrumenti',
          icon: <Shield className="h-4 w-4" />,
          fromDate: plan.vatro_dojava_od,
          toDate: plan.vatro_dojava_do,
          status: getStatus(plan.vatro_dojava_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.vatro_dojava_do)
        },
        // Radni dokumenti
        {
          name: 'Stručne licence radnika',
          category: 'Radni dokumenti',
          icon: <Users className="h-4 w-4" />,
          fromDate: plan.strucne_licence_radnika_od,
          toDate: plan.strucne_licence_radnika_do,
          status: getStatus(plan.strucne_licence_radnika_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.strucne_licence_radnika_do)
        },
        {
          name: 'ADR dozvole za radnike',
          category: 'Radni dokumenti',
          icon: <Users className="h-4 w-4" />,
          fromDate: plan.adr_dozvole_radnika_od,
          toDate: plan.adr_dozvole_radnika_do,
          status: getStatus(plan.adr_dozvole_radnika_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.adr_dozvole_radnika_do)
        },
        // Električni instrumenti
        {
          name: 'Mjerenje otpora uzemljenja',
          category: 'Električni instrumenti',
          icon: <Zap className="h-4 w-4" />,
          fromDate: plan.mjerenje_otpora_uzemljenja_od,
          toDate: plan.mjerenje_otpora_uzemljenja_do,
          status: getStatus(plan.mjerenje_otpora_uzemljenja_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.mjerenje_otpora_uzemljenja_do)
        },
        {
          name: 'Ispitivanje elektro instalacija',
          category: 'Električni instrumenti',
          icon: <Zap className="h-4 w-4" />,
          fromDate: plan.ispitivanje_elektro_instalacija_od,
          toDate: plan.ispitivanje_elektro_instalacija_do,
          status: getStatus(plan.ispitivanje_elektro_instalacija_do),
          daysUntilExpiry: getDaysUntilExpiry(plan.ispitivanje_elektro_instalacija_do)
        }
      ];

      setCalibrationItems(items);
    }
  }, [plan]);

  const getStatus = (expiryDate: Date | string | null): 'valid' | 'expiring' | 'expired' | 'not_set' => {
    if (!expiryDate) return 'not_set';
    
    const date = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    if (isNaN(date.getTime())) return 'not_set';
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    if (date < today) return 'expired';
    if (date <= thirtyDaysFromNow) return 'expiring';
    return 'valid';
  };

  const getDaysUntilExpiry = (expiryDate: Date | string | null): number | undefined => {
    if (!expiryDate) return undefined;
    
    const date = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    if (isNaN(date.getTime())) return undefined;
    
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Nije postavljeno';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Nevaljan datum';
    
    return dateObj.toLocaleDateString('bs-BA');
  };

  const getStatusBadge = (status: string, daysUntilExpiry?: number) => {
    switch (status) {
      case 'valid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Važeći ({daysUntilExpiry} dana)
          </Badge>
        );
      case 'expiring':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Ističe ({daysUntilExpiry} dana)
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Istekao
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <FileText className="h-3 w-3 mr-1" />
            Nije postavljeno
          </Badge>
        );
    }
  };

  const groupedItems = calibrationItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CalibrationItem[]>);

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden border border-white/20 backdrop-blur-xl bg-white/95 shadow-2xl rounded-2xl relative">
        {/* Glassmorphism background effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full filter blur-3xl opacity-30 -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full filter blur-3xl opacity-30 -ml-36 -mb-36"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-cyan-500/10 rounded-full filter blur-3xl opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
        
        <CardHeader className="relative z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  {plan.naziv_opreme}
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  ID: {plan.identifikacijski_broj} | Vlasnik: {plan.vlasnik_opreme}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Važeći</p>
                  <p className="text-2xl font-bold text-green-900">
                    {calibrationItems.filter(item => item.status === 'valid').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Ističe</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {calibrationItems.filter(item => item.status === 'expiring').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Istekao</p>
                  <p className="text-2xl font-bold text-red-900">
                    {calibrationItems.filter(item => item.status === 'expired').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Nije postavljeno</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {calibrationItems.filter(item => item.status === 'not_set').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calibration Details by Category */}
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  {items[0].icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800">{category}</h3>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Instrument</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Od datuma</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Do datuma</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center">
                                {item.icon}
                              </div>
                              <span className="font-medium text-gray-800">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(item.fromDate)}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(item.toDate)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(item.status, item.daysUntilExpiry)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Additional Info */}
          {plan.napomene && (
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Napomene</h3>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6">
                <p className="text-gray-700 leading-relaxed">{plan.napomene}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanKalibracijeDetailsModal;