'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, Upload, FileText } from 'lucide-react';
import { CreateRezervoarRequest, UpdateRezervoarRequest, OBLICI_REZERVOARA, Rezervoar } from '@/types/rezervoar';

interface RezervoarFormProps {
  onClose: () => void;
  onSubmit: (data: CreateRezervoarRequest | UpdateRezervoarRequest) => Promise<void>;
  initialData?: Partial<Rezervoar>;
  isEdit?: boolean;
}

export function RezervoarForm({ onClose, onSubmit, initialData, isEdit = false }: RezervoarFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [nazivRezervoara, setNazivRezervoara] = useState(initialData?.naziv_rezervoara || '');
  const [mjestoKoristenja, setMjestoKoristenja] = useState(initialData?.mjesto_koristenja || '');
  const [idBroj, setIdBroj] = useState(initialData?.id_broj || '');
  const [vlasnik, setVlasnik] = useState(initialData?.vlasnik || '');
  const [oblikRezervoara, setOblikRezervoara] = useState(initialData?.oblik_rezervoara || '');
  const [kapacitet, setKapacitet] = useState(initialData?.kapacitet?.toString() || '');
  const [materijalIzgradnje, setMaterijalIzgradnje] = useState(initialData?.materijal_izgradnje || '');
  const [zastitaUnutrasnjegRezervoar, setZastitaUnutrasnjegRezervoar] = useState(initialData?.zastita_unutrasnjeg_rezervoara || '');
  const [datumKalibracije, setDatumKalibracije] = useState(
    initialData?.datum_kalibracije ? new Date(initialData.datum_kalibracije).toISOString().split('T')[0] : ''
  );
  const [dimenzijeL, setDimenzijeL] = useState(initialData?.dimenzije_l?.toString() || '');
  const [dimenzijeW, setDimenzijeW] = useState(initialData?.dimenzije_w?.toString() || '');
  const [dimenzijeH, setDimenzijeH] = useState(initialData?.dimenzije_h?.toString() || '');
  const [napomene, setNapomene] = useState(initialData?.napomene || '');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!nazivRezervoara.trim()) newErrors.naziv_rezervoara = 'Naziv je obavezan';
    if (!mjestoKoristenja.trim()) newErrors.mjesto_koristenja = 'Mjesto korištenja je obavezno';
    if (!idBroj.trim()) newErrors.id_broj = 'ID broj je obavezan';
    if (!vlasnik.trim()) newErrors.vlasnik = 'Vlasnik je obavezan';
    if (!oblikRezervoara) newErrors.oblik_rezervoara = 'Oblik je obavezan';
    if (!kapacitet || parseFloat(kapacitet) <= 0) newErrors.kapacitet = 'Kapacitet mora biti pozitivan broj';
    if (!materijalIzgradnje.trim()) newErrors.materijal_izgradnje = 'Materijal je obavezan';
    if (!zastitaUnutrasnjegRezervoar.trim()) newErrors.zastita_unutrasnjeg_rezervoara = 'Zaštita je obavezna';
    if (!datumKalibracije) newErrors.datum_kalibracije = 'Datum kalibracije je obavezan';
    if (!dimenzijeL || parseFloat(dimenzijeL) <= 0) newErrors.dimenzije_l = 'Dužina mora biti pozitivna';
    if (!dimenzijeW || parseFloat(dimenzijeW) <= 0) newErrors.dimenzije_w = 'Širina mora biti pozitivna';
    if (!dimenzijeH || parseFloat(dimenzijeH) <= 0) newErrors.dimenzije_h = 'Visina mora biti pozitivna';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const submitData: CreateRezervoarRequest | UpdateRezervoarRequest = {
        naziv_rezervoara: nazivRezervoara.trim(),
        mjesto_koristenja: mjestoKoristenja.trim(),
        id_broj: idBroj.trim(),
        vlasnik: vlasnik.trim(),
        oblik_rezervoara: oblikRezervoara,
        kapacitet: parseFloat(kapacitet),
        materijal_izgradnje: materijalIzgradnje.trim(),
        zastita_unutrasnjeg_rezervoara: zastitaUnutrasnjegRezervoar.trim(),
        datum_kalibracije: datumKalibracije,
        dimenzije_l: parseFloat(dimenzijeL),
        dimenzije_w: parseFloat(dimenzijeW),
        dimenzije_h: parseFloat(dimenzijeH),
        napomene: napomene.trim() || undefined,
      };
      
      if (selectedFile) {
        (submitData as CreateRezervoarRequest).dokument = selectedFile;
      }
      
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('Fajl je prevelik. Maksimalna veličina je 10MB.');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('dokument') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl">
            {isEdit ? 'Uredi Rezervoar' : 'Novi Rezervoar'}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Osnovni podaci */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Osnovni podaci</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="naziv_rezervoara">Naziv Rezervoara *</Label>
                  <Input 
                    id="naziv_rezervoara"
                    value={nazivRezervoara}
                    onChange={(e) => setNazivRezervoara(e.target.value)}
                    className={errors.naziv_rezervoara ? 'border-red-500' : ''}
                  />
                  {errors.naziv_rezervoara && (
                    <p className="text-red-500 text-sm mt-1">{errors.naziv_rezervoara}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="id_broj">ID Broj *</Label>
                  <Input 
                    id="id_broj"
                    value={idBroj}
                    onChange={(e) => setIdBroj(e.target.value)}
                    className={errors.id_broj ? 'border-red-500' : ''}
                  />
                  {errors.id_broj && (
                    <p className="text-red-500 text-sm mt-1">{errors.id_broj}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="mjesto_koristenja">Mjesto Korištenja *</Label>
                  <Input 
                    id="mjesto_koristenja"
                    value={mjestoKoristenja}
                    onChange={(e) => setMjestoKoristenja(e.target.value)}
                    className={errors.mjesto_koristenja ? 'border-red-500' : ''}
                  />
                  {errors.mjesto_koristenja && (
                    <p className="text-red-500 text-sm mt-1">{errors.mjesto_koristenja}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vlasnik">Vlasnik *</Label>
                  <Input 
                    id="vlasnik"
                    value={vlasnik}
                    onChange={(e) => setVlasnik(e.target.value)}
                    className={errors.vlasnik ? 'border-red-500' : ''}
                  />
                  {errors.vlasnik && (
                    <p className="text-red-500 text-sm mt-1">{errors.vlasnik}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="oblik_rezervoara">Oblik Rezervoara *</Label>
                  <select 
                    id="oblik_rezervoara"
                    value={oblikRezervoara}
                    onChange={(e) => setOblikRezervoara(e.target.value)}
                    className={`w-full p-2 border rounded-md ${errors.oblik_rezervoara ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Odaberite oblik</option>
                    {OBLICI_REZERVOARA.map(oblik => (
                      <option key={oblik.value} value={oblik.value}>
                        {oblik.label}
                      </option>
                    ))}
                  </select>
                  {errors.oblik_rezervoara && (
                    <p className="text-red-500 text-sm mt-1">{errors.oblik_rezervoara}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="kapacitet">Kapacitet (L) *</Label>
                  <Input 
                    id="kapacitet"
                    type="number" 
                    step="0.001"
                    value={kapacitet}
                    onChange={(e) => setKapacitet(e.target.value)}
                    className={errors.kapacitet ? 'border-red-500' : ''}
                  />
                  {errors.kapacitet && (
                    <p className="text-red-500 text-sm mt-1">{errors.kapacitet}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="materijal_izgradnje">Materijal Izgradnje *</Label>
                  <Input 
                    id="materijal_izgradnje"
                    value={materijalIzgradnje}
                    onChange={(e) => setMaterijalIzgradnje(e.target.value)}
                    className={errors.materijal_izgradnje ? 'border-red-500' : ''}
                  />
                  {errors.materijal_izgradnje && (
                    <p className="text-red-500 text-sm mt-1">{errors.materijal_izgradnje}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="zastita_unutrasnjeg_rezervoara">Zaštita Unutrašnjeg Rezervoara *</Label>
                  <Input 
                    id="zastita_unutrasnjeg_rezervoara"
                    value={zastitaUnutrasnjegRezervoar}
                    onChange={(e) => setZastitaUnutrasnjegRezervoar(e.target.value)}
                    className={errors.zastita_unutrasnjeg_rezervoara ? 'border-red-500' : ''}
                  />
                  {errors.zastita_unutrasnjeg_rezervoara && (
                    <p className="text-red-500 text-sm mt-1">{errors.zastita_unutrasnjeg_rezervoara}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="datum_kalibracije">Datum Kalibracije *</Label>
                  <Input 
                    id="datum_kalibracije"
                    type="date" 
                    value={datumKalibracije}
                    onChange={(e) => setDatumKalibracije(e.target.value)}
                    className={errors.datum_kalibracije ? 'border-red-500' : ''}
                  />
                  {errors.datum_kalibracije && (
                    <p className="text-red-500 text-sm mt-1">{errors.datum_kalibracije}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dimenzije */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Dimenzije</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dimenzije_l">Dužina (m) *</Label>
                  <Input 
                    id="dimenzije_l"
                    type="number" 
                    step="0.001"
                    value={dimenzijeL}
                    onChange={(e) => setDimenzijeL(e.target.value)}
                    className={errors.dimenzije_l ? 'border-red-500' : ''}
                  />
                  {errors.dimenzije_l && (
                    <p className="text-red-500 text-sm mt-1">{errors.dimenzije_l}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dimenzije_w">Širina (m) *</Label>
                  <Input 
                    id="dimenzije_w"
                    type="number" 
                    step="0.001"
                    value={dimenzijeW}
                    onChange={(e) => setDimenzijeW(e.target.value)}
                    className={errors.dimenzije_w ? 'border-red-500' : ''}
                  />
                  {errors.dimenzije_w && (
                    <p className="text-red-500 text-sm mt-1">{errors.dimenzije_w}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dimenzije_h">Visina (m) *</Label>
                  <Input 
                    id="dimenzije_h"
                    type="number" 
                    step="0.001"
                    value={dimenzijeH}
                    onChange={(e) => setDimenzijeH(e.target.value)}
                    className={errors.dimenzije_h ? 'border-red-500' : ''}
                  />
                  {errors.dimenzije_h && (
                    <p className="text-red-500 text-sm mt-1">{errors.dimenzije_h}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Upload dokumenta */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Dokumentacija</h3>
              <div>
                <Label htmlFor="dokument">Dokument</Label>
                <div className="mt-1">
                  {!selectedFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <label htmlFor="dokument" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Odaberite fajl ili povucite ovdje
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG, PDF, DOC, DOCX do 10MB
                          </span>
                        </label>
                        <Input
                          id="dokument"
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {isEdit && initialData?.dokument_url && !selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Trenutno priložen dokument ostaje isti ako ne odaberete novi.
                  </p>
                )}
              </div>
            </div>

            {/* Napomene */}
            <div>
              <Label htmlFor="napomene">Napomene</Label>
              <textarea 
                id="napomene"
                value={napomene}
                onChange={(e) => setNapomene(e.target.value)}
                rows={3} 
                placeholder="Dodatne napomene o rezervoaru..."
                className="w-full p-2 border border-gray-300 rounded-md resize-vertical"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Otkaži
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Spremam...' : (isEdit ? 'Ažuriraj' : 'Kreiraj')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 