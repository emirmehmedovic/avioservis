'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, Save, FileText, Wrench } from 'lucide-react';
import { 
  OstalaOprema, 
  CreateOstalaOpremaData, 
  UpdateOstalaOpremaData 
} from '@/types/ostalaOprema';

interface OstalaOpremaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateOstalaOpremaData | UpdateOstalaOpremaData, file?: File) => Promise<void>;
  oprema?: OstalaOprema | null;
}

export function OstalaOpremaForm({ isOpen, onClose, onSubmit, oprema }: OstalaOpremaFormProps) {
  const [naziv, setNaziv] = useState('');
  const [mestoKoristenja, setMestoKoristenja] = useState('');
  const [vlasnik, setVlasnik] = useState('');
  const [standardOpreme, setStandardOpreme] = useState('');
  const [snaga, setSnaga] = useState('');
  const [protokKapacitet, setProtokKapacitet] = useState('');
  const [sigurnosneSklopke, setSigurnosneSklopke] = useState('');
  const [prinudnoZaustavljanje, setPrinudnoZaustavljanje] = useState('');
  const [napomena, setNapomena] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening/closing or changing oprema
  useEffect(() => {
    if (isOpen) {
      if (oprema) {
        // Edit mode - populate with existing data
        setNaziv(oprema.naziv || '');
        setMestoKoristenja(oprema.mesto_koristenja || '');
        setVlasnik(oprema.vlasnik || '');
        setStandardOpreme(oprema.standard_opreme || '');
        setSnaga(oprema.snaga || '');
        setProtokKapacitet(oprema.protok_kapacitet || '');
        setSigurnosneSklopke(oprema.sigurnosne_sklopke || '');
        setPrinudnoZaustavljanje(oprema.prinudno_zaustavljanje || '');
        setNapomena(oprema.napomena || '');
      } else {
        // Create mode - reset all fields
        setNaziv('');
        setMestoKoristenja('');
        setVlasnik('');
        setStandardOpreme('');
        setSnaga('');
        setProtokKapacitet('');
        setSigurnosneSklopke('');
        setPrinudnoZaustavljanje('');
        setNapomena('');
      }
      setSelectedFile(null);
      setErrors({});
    }
  }, [isOpen, oprema]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Naziv je obavezno polje
    if (!naziv.trim()) {
      newErrors.naziv = 'Naziv opreme je obavezan';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData: CreateOstalaOpremaData | UpdateOstalaOpremaData = {
        naziv: naziv.trim(),
        mesto_koristenja: mestoKoristenja.trim() || undefined,
        vlasnik: vlasnik.trim() || undefined,
        standard_opreme: standardOpreme.trim() || undefined,
        snaga: snaga.trim() || undefined,
        protok_kapacitet: protokKapacitet.trim() || undefined,
        sigurnosne_sklopke: sigurnosneSklopke.trim() || undefined,
        prinudno_zaustavljanje: prinudnoZaustavljanje.trim() || undefined,
        napomena: napomena.trim() || undefined,
      };

      if (oprema) {
        (submitData as UpdateOstalaOpremaData).id = oprema.id;
      }

      await onSubmit(submitData, selectedFile || undefined);
    } catch (error) {
      console.error('Error submitting oprema:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                {oprema ? 'Uredi Opremu' : 'Nova Oprema'}
              </span>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Osnovni podaci */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Osnovni podaci
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="naziv" className="text-gray-700 font-medium text-sm">
                    Naziv opreme *
                  </Label>
                  <Input
                    id="naziv"
                    type="text"
                    value={naziv}
                    onChange={(e) => setNaziv(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Unesite naziv opreme"
                  />
                  {errors.naziv && (
                    <p className="text-red-600 text-sm font-medium">{errors.naziv}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vlasnik" className="text-gray-700 font-medium text-sm">
                    Vlasnik
                  </Label>
                  <Input
                    id="vlasnik"
                    type="text"
                    value={vlasnik}
                    onChange={(e) => setVlasnik(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Unesite vlasnika opreme"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mestoKoristenja" className="text-gray-700 font-medium text-sm">
                    Mjesto korištenja
                  </Label>
                  <Input
                    id="mestoKoristenja"
                    type="text"
                    value={mestoKoristenja}
                    onChange={(e) => setMestoKoristenja(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Unesite mjesto korištenja"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standardOpreme" className="text-gray-700 font-medium text-sm">
                    Standard opreme
                  </Label>
                  <Input
                    id="standardOpreme"
                    type="text"
                    value={standardOpreme}
                    onChange={(e) => setStandardOpreme(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Unesite standard opreme"
                  />
                </div>
              </div>
            </div>

            {/* Specifikacije */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Specifikacije
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="snaga" className="text-gray-700 font-medium text-sm">
                    Snaga
                  </Label>
                  <Input
                    id="snaga"
                    type="text"
                    value={snaga}
                    onChange={(e) => setSnaga(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Unesite snagu (npr. 5kW, 10HP)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protokKapacitet" className="text-gray-700 font-medium text-sm">
                    Protok/kapacitet
                  </Label>
                  <Input
                    id="protokKapacitet"
                    type="text"
                    value={protokKapacitet}
                    onChange={(e) => setProtokKapacitet(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Unesite protok ili kapacitet"
                  />
                </div>
              </div>
            </div>

            {/* Sigurnosni podaci */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Sigurnosni podaci
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sigurnosneSklopke" className="text-gray-700 font-medium text-sm">
                    Sigurnosne sklopke
                  </Label>
                  <Input
                    id="sigurnosneSklopke"
                    type="text"
                    value={sigurnosneSklopke}
                    onChange={(e) => setSigurnosneSklopke(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Opis sigurnosnih sklopki"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prinudnoZaustavljanje" className="text-gray-700 font-medium text-sm">
                    Prinudno zaustavljanje
                  </Label>
                  <Input
                    id="prinudnoZaustavljanje"
                    type="text"
                    value={prinudnoZaustavljanje}
                    onChange={(e) => setPrinudnoZaustavljanje(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
                    placeholder="Opis prinudnog zaustavljanja"
                  />
                </div>
              </div>
            </div>

            {/* Napomene */}
            <div className="space-y-2">
              <Label htmlFor="napomena" className="text-gray-700 font-medium text-sm">
                Napomene
              </Label>
              <textarea
                id="napomena"
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all resize-none"
                placeholder="Unesite dodatne napomene..."
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-gray-700 font-medium text-sm">
                Priloži dokument
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm file:bg-blue-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:cursor-pointer"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-green-600">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-xs">
                Podržani formati: PDF, Word, slike (max 10MB)
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium"
                disabled={isSubmitting}
              >
                Otkaži
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Snimanje...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    <span>{oprema ? 'Ažuriraj' : 'Kreiraj'}</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 