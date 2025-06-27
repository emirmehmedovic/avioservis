'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { X, Calendar, Upload, Save, FileText } from 'lucide-react';
import { PlanKalibracije, CreatePlanKalibracijeRequest, UpdatePlanKalibracijeRequest } from '@/types/planKalibracije';

interface PlanKalibracijeFormProps {
  onClose: () => void;
  onSubmit: (data: CreatePlanKalibracijeRequest | UpdatePlanKalibracijeRequest, file?: File) => Promise<void>;
  initialData?: Partial<PlanKalibracije>;
  isEdit?: boolean;
}

export function PlanKalibracijeForm({ onClose, onSubmit, initialData, isEdit = false }: PlanKalibracijeFormProps) {
  // Osnovni podaci
  const [nazivOpreme, setNazivOpreme] = useState(initialData?.naziv_opreme || '');
  const [identifikacijskiBroj, setIdentifikacijskiBroj] = useState(initialData?.identifikacijski_broj || '');
  const [vlasnikOpreme, setVlasnikOpreme] = useState(initialData?.vlasnik_opreme || '');
  const [mjestoKoristenjaOpreme, setMjestoKoristenjaOpreme] = useState(initialData?.mjesto_koristenja_opreme || '');
  const [napomene, setNapomene] = useState(initialData?.napomene || '');
  
  // Kalibracija datumi - "od"
  const [volumetarOd, setVolumetarOd] = useState(initialData?.volumetar_kalibracija_od ? new Date(initialData.volumetar_kalibracija_od).toISOString().split('T')[0] : '');
  const [glavniVolumetarOd, setGlavniVolumetarOd] = useState(initialData?.glavni_volumetar_kalibracija_od ? new Date(initialData.glavni_volumetar_kalibracija_od).toISOString().split('T')[0] : '');
  const [manometriOd, setManometriOd] = useState(initialData?.manometri_kalibracija_od ? new Date(initialData.manometri_kalibracija_od).toISOString().split('T')[0] : '');
  const [crijevoOd, setCrijevoOd] = useState(initialData?.crijevo_punjenje_kalibracija_od ? new Date(initialData.crijevo_punjenje_kalibracija_od).toISOString().split('T')[0] : '');
  const [glavniManometarOd, setGlavniManometarOd] = useState(initialData?.glavni_manometar_kalibracija_od ? new Date(initialData.glavni_manometar_kalibracija_od).toISOString().split('T')[0] : '');
  const [termometarOd, setTermometarOd] = useState(initialData?.termometar_kalibracija_od ? new Date(initialData.termometar_kalibracija_od).toISOString().split('T')[0] : '');
  const [hidrometarOd, setHidrometarOd] = useState(initialData?.hidrometar_kalibracija_od ? new Date(initialData.hidrometar_kalibracija_od).toISOString().split('T')[0] : '');
  const [elektricniDenziometarOd, setElektricniDenziometarOd] = useState(initialData?.elektricni_denziometar_kalibracija_od ? new Date(initialData.elektricni_denziometar_kalibracija_od).toISOString().split('T')[0] : '');
  const [mjeracProvodljivostiOd, setMjeracProvodljivostiOd] = useState(initialData?.mjerac_provodljivosti_kalibracija_od ? new Date(initialData.mjerac_provodljivosti_kalibracija_od).toISOString().split('T')[0] : '');
  const [mjeracOtporaOd, setMjeracOtporaOd] = useState(initialData?.mjerac_otpora_provoda_kalibracija_od ? new Date(initialData.mjerac_otpora_provoda_kalibracija_od).toISOString().split('T')[0] : '');
  const [momentKljucOd, setMomentKljucOd] = useState(initialData?.moment_kljuc_kalibracija_od ? new Date(initialData.moment_kljuc_kalibracija_od).toISOString().split('T')[0] : '');
  const [shalDetectorOd, setShalDetectorOd] = useState(initialData?.shal_detector_kalibracija_od ? new Date(initialData.shal_detector_kalibracija_od).toISOString().split('T')[0] : '');
  
  // Kalibracija datumi - "do"
  const [volumetarDo, setVolumetarDo] = useState(initialData?.volumetar_kalibracija_do ? new Date(initialData.volumetar_kalibracija_do).toISOString().split('T')[0] : '');
  const [glavniVolumetarDo, setGlavniVolumetarDo] = useState(initialData?.glavni_volumetar_kalibracija_do ? new Date(initialData.glavni_volumetar_kalibracija_do).toISOString().split('T')[0] : '');
  const [manometriDo, setManometriDo] = useState(initialData?.manometri_kalibracija_do ? new Date(initialData.manometri_kalibracija_do).toISOString().split('T')[0] : '');
  const [crijevojeDo, setCrijevojeDo] = useState(initialData?.crijevo_punjenje_kalibracija_do ? new Date(initialData.crijevo_punjenje_kalibracija_do).toISOString().split('T')[0] : '');
  const [glavniManometarDo, setGlavniManometarDo] = useState(initialData?.glavni_manometar_kalibracija_do ? new Date(initialData.glavni_manometar_kalibracija_do).toISOString().split('T')[0] : '');
  const [termometarDo, setTermometarDo] = useState(initialData?.termometar_kalibracija_do ? new Date(initialData.termometar_kalibracija_do).toISOString().split('T')[0] : '');
  const [hidrometarDo, setHidrometarDo] = useState(initialData?.hidrometar_kalibracija_do ? new Date(initialData.hidrometar_kalibracija_do).toISOString().split('T')[0] : '');
  const [elektricniDenziometarDo, setElektricniDenziometarDo] = useState(initialData?.elektricni_denziometar_kalibracija_do ? new Date(initialData.elektricni_denziometar_kalibracija_do).toISOString().split('T')[0] : '');
  const [mjeracProvodljivostiDo, setMjeracProvodljivostiDo] = useState(initialData?.mjerac_provodljivosti_kalibracija_do ? new Date(initialData.mjerac_provodljivosti_kalibracija_do).toISOString().split('T')[0] : '');
  const [mjeracOtporaDo, setMjeracOtporaDo] = useState(initialData?.mjerac_otpora_provoda_kalibracija_do ? new Date(initialData.mjerac_otpora_provoda_kalibracija_do).toISOString().split('T')[0] : '');
  const [momentKljucDo, setMomentKljucDo] = useState(initialData?.moment_kljuc_kalibracija_do ? new Date(initialData.moment_kljuc_kalibracija_do).toISOString().split('T')[0] : '');
  const [shalDetectorDo, setShalDetectorDo] = useState(initialData?.shal_detector_kalibracija_do ? new Date(initialData.shal_detector_kalibracija_do).toISOString().split('T')[0] : '');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Obvezna polja
    if (!nazivOpreme.trim()) {
      newErrors.naziv_opreme = 'Naziv opreme je obvezan';
    }
    if (!identifikacijskiBroj.trim()) {
      newErrors.identifikacijski_broj = 'Identifikacijski broj je obvezan';
    }
    if (!vlasnikOpreme.trim()) {
      newErrors.vlasnik_opreme = 'Vlasnik opreme je obvezan';
    }
    if (!mjestoKoristenjaOpreme.trim()) {
      newErrors.mjesto_koristenja_opreme = 'Mjesto korištenja opreme je obvezno';
    }

    // Date validation helper
    const validateDatePair = (odDate: string, doDate: string, instrument: string) => {
      if ((odDate && !doDate) || (!odDate && doDate)) {
        newErrors[`${instrument}_pair`] = `Za ${instrument} moraju biti uneti i "od" i "do" datum`;
      } else if (odDate && doDate && new Date(odDate) >= new Date(doDate)) {
        newErrors[`${instrument}_order`] = `Za ${instrument} datum "od" mora biti prije datuma "do"`;
      }
    };

    // Validacija parova datuma
    validateDatePair(volumetarOd, volumetarDo, 'Volumetar');
    validateDatePair(glavniVolumetarOd, glavniVolumetarDo, 'Glavni volumetar');
    validateDatePair(manometriOd, manometriDo, 'Manometri');
    validateDatePair(crijevoOd, crijevojeDo, 'Crijevo za punjenje');
    validateDatePair(glavniManometarOd, glavniManometarDo, 'Glavni manometar');
    validateDatePair(termometarOd, termometarDo, 'Termometar');
    validateDatePair(hidrometarOd, hidrometarDo, 'Hidrometar');
    validateDatePair(elektricniDenziometarOd, elektricniDenziometarDo, 'Električni denziometar');
    validateDatePair(mjeracProvodljivostiOd, mjeracProvodljivostiDo, 'Mjerač provodljivosti');
    validateDatePair(mjeracOtporaOd, mjeracOtporaDo, 'Mjerač otpora provoda');
    validateDatePair(momentKljucOd, momentKljucDo, 'Moment ključ');
    validateDatePair(shalDetectorOd, shalDetectorDo, 'Shal detector');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData: CreatePlanKalibracijeRequest | UpdatePlanKalibracijeRequest = {
        naziv_opreme: nazivOpreme.trim(),
        identifikacijski_broj: identifikacijskiBroj.trim(),
        vlasnik_opreme: vlasnikOpreme.trim(),
        mjesto_koristenja_opreme: mjestoKoristenjaOpreme.trim(),
        napomene: napomene.trim() || undefined,
        
        // Volumetar
        volumetar_kalibracija_od: volumetarOd || undefined,
        volumetar_kalibracija_do: volumetarDo || undefined,
        
        // Glavni volumetar
        glavni_volumetar_kalibracija_od: glavniVolumetarOd || undefined,
        glavni_volumetar_kalibracija_do: glavniVolumetarDo || undefined,
        
        // Manometri
        manometri_kalibracija_od: manometriOd || undefined,
        manometri_kalibracija_do: manometriDo || undefined,
        
        // Crijevo za punjenje
        crijevo_punjenje_kalibracija_od: crijevoOd || undefined,
        crijevo_punjenje_kalibracija_do: crijevojeDo || undefined,
        
        // Glavni manometar
        glavni_manometar_kalibracija_od: glavniManometarOd || undefined,
        glavni_manometar_kalibracija_do: glavniManometarDo || undefined,
        
        // Termometar
        termometar_kalibracija_od: termometarOd || undefined,
        termometar_kalibracija_do: termometarDo || undefined,
        
        // Hidrometar
        hidrometar_kalibracija_od: hidrometarOd || undefined,
        hidrometar_kalibracija_do: hidrometarDo || undefined,
        
        // Električni denziometar
        elektricni_denziometar_kalibracija_od: elektricniDenziometarOd || undefined,
        elektricni_denziometar_kalibracija_do: elektricniDenziometarDo || undefined,
        
        // Mjerač provodljivosti
        mjerac_provodljivosti_kalibracija_od: mjeracProvodljivostiOd || undefined,
        mjerac_provodljivosti_kalibracija_do: mjeracProvodljivostiDo || undefined,
        
        // Mjerač otpora provoda
        mjerac_otpora_provoda_kalibracija_od: mjeracOtporaOd || undefined,
        mjerac_otpora_provoda_kalibracija_do: mjeracOtporaDo || undefined,
        
        // Moment ključ
        moment_kljuc_kalibracija_od: momentKljucOd || undefined,
        moment_kljuc_kalibracija_do: momentKljucDo || undefined,
        
        // Shal detector
        shal_detector_kalibracija_od: shalDetectorOd || undefined,
        shal_detector_kalibracija_do: shalDetectorDo || undefined,
      };

      await onSubmit(submitData, selectedFile || undefined);
      onClose();
    } catch (error) {
      console.error('Error submitting plan:', error);
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

  const DatePairInput = ({ 
    label, 
    odValue, 
    doValue, 
    onOdChange, 
    onDoChange, 
    instrumentKey 
  }: {
    label: string;
    odValue: string;
    doValue: string;
    onOdChange: (value: string) => void;
    onDoChange: (value: string) => void;
    instrumentKey: string;
  }) => (
    <div className="relative p-4 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg">
      <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
      <div className="relative z-10">
        <Label className="text-white font-medium mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          {label}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-white/80 text-xs">Od</Label>
            <Input
              type="date"
              value={odValue}
              onChange={(e) => onOdChange(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <div>
            <Label className="text-white/80 text-xs">Do</Label>
            <Input
              type="date"
              value={doValue}
              onChange={(e) => onDoChange(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
        </div>
        {errors[`${instrumentKey}_pair`] && (
          <p className="text-red-400 text-xs mt-1">{errors[`${instrumentKey}_pair`]}</p>
        )}
        {errors[`${instrumentKey}_order`] && (
          <p className="text-red-400 text-xs mt-1">{errors[`${instrumentKey}_order`]}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c]/90 to-[#1a1a1a]/90 shadow-2xl rounded-xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full filter blur-3xl opacity-20 -ml-20 -mb-20"></div>
        
        <CardHeader className="relative z-10 border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-400" />
              {isEdit ? 'Uredi Plan Kalibracije' : 'Novi Plan Kalibracije'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Osnovni podaci */}
            <div className="relative p-4 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/20 rounded-full filter blur-xl opacity-50 -mr-4 -mt-4"></div>
              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-4">Osnovni podaci</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Naziv opreme *</Label>
                    <Input
                      value={nazivOpreme}
                      onChange={(e) => setNazivOpreme(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Unesite naziv opreme"
                    />
                    {errors.naziv_opreme && <p className="text-red-400 text-xs mt-1">{errors.naziv_opreme}</p>}
                  </div>
                  
                  <div>
                    <Label className="text-white/80">Identifikacijski broj *</Label>
                    <Input
                      value={identifikacijskiBroj}
                      onChange={(e) => setIdentifikacijskiBroj(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Unesite identifikacijski broj"
                    />
                    {errors.identifikacijski_broj && <p className="text-red-400 text-xs mt-1">{errors.identifikacijski_broj}</p>}
                  </div>
                  
                  <div>
                    <Label className="text-white/80">Vlasnik opreme *</Label>
                    <Input
                      value={vlasnikOpreme}
                      onChange={(e) => setVlasnikOpreme(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Unesite vlasnika opreme"
                    />
                    {errors.vlasnik_opreme && <p className="text-red-400 text-xs mt-1">{errors.vlasnik_opreme}</p>}
                  </div>
                  
                  <div>
                    <Label className="text-white/80">Mjesto korištenja opreme *</Label>
                    <Input
                      value={mjestoKoristenjaOpreme}
                      onChange={(e) => setMjestoKoristenjaOpreme(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Unesite mjesto korištenja"
                    />
                    {errors.mjesto_koristenja_opreme && <p className="text-red-400 text-xs mt-1">{errors.mjesto_koristenja_opreme}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Kalibracije */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Datumi kalibracije</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePairInput
                  label="Volumetar"
                  odValue={volumetarOd}
                  doValue={volumetarDo}
                  onOdChange={setVolumetarOd}
                  onDoChange={setVolumetarDo}
                  instrumentKey="Volumetar"
                />
                
                <DatePairInput
                  label="Glavni volumetar"
                  odValue={glavniVolumetarOd}
                  doValue={glavniVolumetarDo}
                  onOdChange={setGlavniVolumetarOd}
                  onDoChange={setGlavniVolumetarDo}
                  instrumentKey="Glavni volumetar"
                />
                
                <DatePairInput
                  label="Manometri"
                  odValue={manometriOd}
                  doValue={manometriDo}
                  onOdChange={setManometriOd}
                  onDoChange={setManometriDo}
                  instrumentKey="Manometri"
                />
                
                <DatePairInput
                  label="Crijevo za punjenje"
                  odValue={crijevoOd}
                  doValue={crijevojeDo}
                  onOdChange={setCrijevoOd}
                  onDoChange={setCrijevojeDo}
                  instrumentKey="Crijevo za punjenje"
                />
                
                <DatePairInput
                  label="Glavni manometar"
                  odValue={glavniManometarOd}
                  doValue={glavniManometarDo}
                  onOdChange={setGlavniManometarOd}
                  onDoChange={setGlavniManometarDo}
                  instrumentKey="Glavni manometar"
                />
                
                <DatePairInput
                  label="Termometar"
                  odValue={termometarOd}
                  doValue={termometarDo}
                  onOdChange={setTermometarOd}
                  onDoChange={setTermometarDo}
                  instrumentKey="Termometar"
                />
                
                <DatePairInput
                  label="Hidrometar"
                  odValue={hidrometarOd}
                  doValue={hidrometarDo}
                  onOdChange={setHidrometarOd}
                  onDoChange={setHidrometarDo}
                  instrumentKey="Hidrometar"
                />
                
                <DatePairInput
                  label="Električni denziometar"
                  odValue={elektricniDenziometarOd}
                  doValue={elektricniDenziometarDo}
                  onOdChange={setElektricniDenziometarOd}
                  onDoChange={setElektricniDenziometarDo}
                  instrumentKey="Električni denziometar"
                />
                
                <DatePairInput
                  label="Mjerač provodljivosti"
                  odValue={mjeracProvodljivostiOd}
                  doValue={mjeracProvodljivostiDo}
                  onOdChange={setMjeracProvodljivostiOd}
                  onDoChange={setMjeracProvodljivostiDo}
                  instrumentKey="Mjerač provodljivosti"
                />
                
                <DatePairInput
                  label="Mjerač otpora provoda"
                  odValue={mjeracOtporaOd}
                  doValue={mjeracOtporaDo}
                  onOdChange={setMjeracOtporaOd}
                  onDoChange={setMjeracOtporaDo}
                  instrumentKey="Mjerač otpora provoda"
                />
                
                <DatePairInput
                  label="Moment ključ"
                  odValue={momentKljucOd}
                  doValue={momentKljucDo}
                  onOdChange={setMomentKljucOd}
                  onDoChange={setMomentKljucDo}
                  instrumentKey="Moment ključ"
                />
                
                <DatePairInput
                  label="Shal detector"
                  odValue={shalDetectorOd}
                  doValue={shalDetectorDo}
                  onOdChange={setShalDetectorOd}
                  onDoChange={setShalDetectorDo}
                  instrumentKey="Shal detector"
                />
              </div>
            </div>

            {/* Napomene i dokument */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative p-4 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg">
                <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
                <div className="relative z-10">
                  <Label className="text-white/80">Napomene</Label>
                                     <textarea
                     value={napomene}
                     onChange={(e) => setNapomene(e.target.value)}
                     className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-blue-500/50 focus:border-blue-500/50 min-h-[100px] w-full rounded-md p-3 resize-vertical"
                     placeholder="Unesite dodatne napomene..."
                     rows={4}
                   />
                </div>
              </div>
              
              <div className="relative p-4 rounded-lg border border-white/10 backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 shadow-lg">
                <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/20 rounded-full filter blur-xl opacity-50 -mr-3 -mt-3"></div>
                <div className="relative z-10">
                  <Label className="text-white/80 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-orange-400" />
                    Dokument
                  </Label>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="bg-white/10 border-white/20 text-white file:bg-white/20 file:border-0 file:text-white file:rounded file:px-3 file:py-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                  {selectedFile && (
                    <p className="text-green-400 text-xs mt-1">
                      Odabran fajl: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white"
              >
                Odustani
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEdit ? 'Ažuriranje...' : 'Kreiranje...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEdit ? 'Ažuriraj' : 'Kreiraj'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 