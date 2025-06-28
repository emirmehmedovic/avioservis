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
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 backdrop-blur-md bg-gradient-to-br from-gray-900/95 to-gray-800/95 shadow-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                {oprema ? 'Uredi Opremu' : 'Nova Oprema'}
              </span>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Osnovni podaci */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Osnovni podaci
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="naziv" className="text-white font-medium">
                    Naziv opreme *
                  </Label>
                  <Input
                    id="naziv"
                    type="text"
                    value={naziv}
                    onChange={(e) => setNaziv(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite naziv opreme"
                  />
                  {errors.naziv && (
                    <p className="text-red-400 text-sm">{errors.naziv}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vlasnik" className="text-white font-medium">
                    Vlasnik
                  </Label>
                  <Input
                    id="vlasnik"
                    type="text"
                    value={vlasnik}
                    onChange={(e) => setVlasnik(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite vlasnika opreme"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mestoKoristenja" className="text-white font-medium">
                    Mjesto korištenja
                  </Label>
                  <Input
                    id="mestoKoristenja"
                    type="text"
                    value={mestoKoristenja}
                    onChange={(e) => setMestoKoristenja(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite mjesto korištenja"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standardOpreme" className="text-white font-medium">
                    Standard opreme
                  </Label>
                  <Input
                    id="standardOpreme"
                    type="text"
                    value={standardOpreme}
                    onChange={(e) => setStandardOpreme(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite standard opreme"
                  />
                </div>
              </div>
            </div>

            {/* Specifikacije */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Specifikacije
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="snaga" className="text-white font-medium">
                    Snaga
                  </Label>
                  <Input
                    id="snaga"
                    type="text"
                    value={snaga}
                    onChange={(e) => setSnaga(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite snagu (npr. 5kW, 10HP)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protokKapacitet" className="text-white font-medium">
                    Protok/kapacitet
                  </Label>
                  <Input
                    id="protokKapacitet"
                    type="text"
                    value={protokKapacitet}
                    onChange={(e) => setProtokKapacitet(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite protok ili kapacitet"
                  />
                </div>
              </div>
            </div>

            {/* Sigurnosni podaci */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Sigurnosni podaci
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sigurnosneSklopke" className="text-white font-medium">
                    Sigurnosne sklopke
                  </Label>
                  <Input
                    id="sigurnosneSklopke"
                    type="text"
                    value={sigurnosneSklopke}
                    onChange={(e) => setSigurnosneSklopke(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Opis sigurnosnih sklopki"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prinudnoZaustavljanje" className="text-white font-medium">
                    Prinudno zaustavljanje
                  </Label>
                  <Input
                    id="prinudnoZaustavljanje"
                    type="text"
                    value={prinudnoZaustavljanje}
                    onChange={(e) => setPrinudnoZaustavljanje(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                    placeholder="Opis prinudnog zaustavljanja"
                  />
                </div>
              </div>
            </div>

            {/* Napomene */}
            <div className="space-y-2">
              <Label htmlFor="napomena" className="text-white font-medium">
                Napomene
              </Label>
              <textarea
                id="napomena"
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Unesite dodatne napomene..."
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-white font-medium">
                Priloži dokument
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="bg-gray-700/50 border-gray-600 text-white file:bg-blue-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-green-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-xs">
                Podržani formati: PDF, Word, slike (max 10MB)
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Otkaži
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
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