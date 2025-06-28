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
    <Card className="h-full flex flex-col overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c]/60 to-[#1a1a1a]/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10 z-0"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full filter blur-3xl opacity-20 -ml-10 -mb-10 z-0"></div>
      
      <CardHeader className="relative z-10 pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>
            <span className="truncate text-xl font-bold text-white">{oprema.naziv}</span>
          </div>
          {hasDocument && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20 flex-shrink-0">
              <FileText className="h-4 w-4" />
              DOKUMENT
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col space-y-4 p-6 relative z-10">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 gap-3">
          {oprema.vlasnik && (
            <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
              <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-green-400" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white text-xs">Vlasnik:</span>
                  <p className="text-green-400 truncate text-sm font-bold" title={oprema.vlasnik}>
                    {oprema.vlasnik}
                  </p>
                </div>
              </div>
            </div>
          )}

          {oprema.mesto_koristenja && (
            <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
              <div className="absolute top-0 right-0 w-8 h-8 bg-purple-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3 h-3 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white text-xs">Mjesto korištenja:</span>
                  <p className="text-purple-400 truncate text-sm font-bold" title={oprema.mesto_koristenja}>
                    {oprema.mesto_koristenja}
                  </p>
                </div>
              </div>
            </div>
          )}

          {oprema.standard_opreme && (
            <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
              <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-3 h-3 text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white text-xs">Standard:</span>
                  <p className="text-yellow-400 truncate text-sm font-bold" title={oprema.standard_opreme}>
                    {oprema.standard_opreme}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(oprema.snaga || oprema.protok_kapacitet) && (
            <div className="relative p-3 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:shadow-xl hover:bg-gradient-to-br hover:from-white/15 hover:to-white/8 transition-all duration-200">
              <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 rounded-full filter blur-xl opacity-50 -mr-2 -mt-2"></div>
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Building className="w-3 h-3 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white text-xs">Specifikacije:</span>
                  <div className="space-y-1">
                    {oprema.snaga && (
                      <p className="text-blue-400 truncate text-sm font-bold" title={`Snaga: ${oprema.snaga}`}>
                        Snaga: {oprema.snaga}
                      </p>
                    )}
                    {oprema.protok_kapacitet && (
                      <p className="text-blue-400 truncate text-sm font-bold" title={`Protok/kapacitet: ${oprema.protok_kapacitet}`}>
                        Protok: {oprema.protok_kapacitet}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Safety Information */}
        {(oprema.sigurnosne_sklopke || oprema.prinudno_zaustavljanje) && (
          <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <h4 className="text-orange-400 font-semibold text-sm mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Sigurnosni podaci
            </h4>
            <div className="space-y-1">
              {oprema.sigurnosne_sklopke && (
                <p className="text-orange-300 text-xs">
                  <span className="font-medium">Sigurnosne sklopke:</span> {oprema.sigurnosne_sklopke}
                </p>
              )}
              {oprema.prinudno_zaustavljanje && (
                <p className="text-orange-300 text-xs">
                  <span className="font-medium">Prinudno zaustavljanje:</span> {oprema.prinudno_zaustavljanje}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {oprema.napomena && (
          <div className="p-3 rounded-lg border border-gray-500/30 bg-gray-500/10">
            <h4 className="text-gray-400 font-semibold text-sm mb-2">Napomene</h4>
            <p className="text-gray-300 text-xs line-clamp-3">{oprema.napomena}</p>
          </div>
        )}

        {/* Creation Date */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Calendar className="h-3 w-3" />
            <span>Kreiran: {formatDate(oprema.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => onEdit(oprema)}
            variant="outline"
            size="sm"
            className="flex-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 hover:border-blue-500/50"
          >
            <Edit className="h-4 w-4 mr-1" />
            Uredi
          </Button>
          <Button
            onClick={() => onGeneratePDF(oprema.id)}
            variant="outline"
            size="sm"
            className="flex-1 bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30 hover:border-green-500/50"
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button
            onClick={() => onDelete(oprema.id)}
            variant="outline"
            size="sm"
            className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/50"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 