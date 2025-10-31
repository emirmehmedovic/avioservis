'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit, Trash, Download, Wrench, User, MapPin, Settings, FileText, Calendar, Building } from 'lucide-react';
import { OstalaOprema } from '@/types/ostalaOprema';

interface OstalaOpremaCardProps {
  oprema: OstalaOprema;
  onEdit: (oprema: OstalaOprema) => void;
  onDelete: (id: number) => void;
  onGeneratePDF: (id: number) => void;
}

export function OstalaOpremaCard({ oprema, onEdit, onDelete, onGeneratePDF }: OstalaOpremaCardProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('bs-BA');
  };

  const hasDocument = !!oprema.dokument_url;

  return (
    <Card className="relative bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Subtle accent bar */}
      <div className="absolute top-0 left-0 h-1 bg-blue-600 rounded-tl-xl" style={{ width: '4px' }}></div>

      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-blue-200/50">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <span className="truncate font-semibold text-gray-900">{oprema.naziv}</span>
          </div>
          {hasDocument && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-600 border border-green-200 flex-shrink-0">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dokument</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col space-y-3 p-6">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 gap-3">
          {oprema.vlasnik && (
            <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 font-semibold uppercase">Vlasnik</span>
              </div>
              <p className="text-gray-900 font-medium text-sm truncate" title={oprema.vlasnik}>
                {oprema.vlasnik}
              </p>
            </div>
          )}

          {oprema.mesto_koristenja && (
            <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 font-semibold uppercase">Mjesto</span>
              </div>
              <p className="text-gray-900 font-medium text-sm truncate" title={oprema.mesto_koristenja}>
                {oprema.mesto_koristenja}
              </p>
            </div>
          )}

          {oprema.standard_opreme && (
            <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 font-semibold uppercase">Standard</span>
              </div>
              <p className="text-gray-900 font-medium text-sm truncate" title={oprema.standard_opreme}>
                {oprema.standard_opreme}
              </p>
            </div>
          )}

          {(oprema.snaga || oprema.protok_kapacitet) && (
            <div className="bg-gray-50 hover:bg-gray-100/80 rounded-lg p-3.5 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 font-semibold uppercase">Specifikacije</span>
              </div>
              <div className="space-y-1">
                {oprema.snaga && (
                  <p className="text-gray-900 font-medium text-sm truncate" title={`Snaga: ${oprema.snaga}`}>
                    Snaga: {oprema.snaga}
                  </p>
                )}
                {oprema.protok_kapacitet && (
                  <p className="text-gray-900 font-medium text-sm truncate" title={`Protok: ${oprema.protok_kapacitet}`}>
                    Protok: {oprema.protok_kapacitet}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Safety Information */}
        {(oprema.sigurnosne_sklopke || oprema.prinudno_zaustavljanje) && (
          <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600 font-semibold uppercase">Sigurnost</span>
            </div>
            <div className="space-y-1">
              {oprema.sigurnosne_sklopke && (
                <p className="text-amber-900 font-medium text-sm" title={`Sigurnosne sklopke: ${oprema.sigurnosne_sklopke}`}>
                  Sklopke: {oprema.sigurnosne_sklopke}
                </p>
              )}
              {oprema.prinudno_zaustavljanje && (
                <p className="text-amber-900 font-medium text-sm" title={`Prinudno zaustavljanje: ${oprema.prinudno_zaustavljanje}`}>
                  Zaustavljanje: {oprema.prinudno_zaustavljanje}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {oprema.napomena && (
          <div className="bg-blue-50 rounded-lg p-3.5 border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-semibold uppercase">Napomene</span>
            </div>
            <p className="text-blue-900 text-sm line-clamp-3" title={oprema.napomena}>{oprema.napomena}</p>
          </div>
        )}

        {/* Creation Date */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Calendar className="h-3 w-3" />
            <span>Kreiran: {formatDate(oprema.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-2 pt-5 border-t border-gray-100">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(oprema)}
              title="Uredi opremu"
              className="h-9 px-3 border border-gray-300 hover:border-gray-400 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-200 font-medium hover:shadow-sm"
            >
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(oprema.id)}
              title="Obriši opremu"
              className="h-9 px-3 border border-red-300 hover:border-red-400 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 font-medium hover:shadow-sm"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => onGeneratePDF(oprema.id)}
            title="Generiraj PDF"
            className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 font-medium text-sm h-9 px-4 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 