'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { X, Calendar, Upload, Save, FileText, Settings2, Shield, Zap } from 'lucide-react';
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
  const [kalibrazaVatroDojavaOd, setKalibrazaVatroDojavaOd] = useState(initialData?.kalibraza_vatro_dojava_od ? new Date(initialData.kalibraza_vatro_dojava_od).toISOString().split('T')[0] : '');
  const [kalibrazaPpAparataOd, setKalibrazaPpAparataOd] = useState(initialData?.kalibraza_pp_aparata_od ? new Date(initialData.kalibraza_pp_aparata_od).toISOString().split('T')[0] : '');
  const [strucneLicenceRadnikaOd, setStrucneLicenceRadnikaOd] = useState(initialData?.strucne_licence_radnika_od ? new Date(initialData.strucne_licence_radnika_od).toISOString().split('T')[0] : '');
  const [adrDozvoleRadnikaOd, setAdrDozvoleRadnikaOd] = useState(initialData?.adr_dozvole_radnika_od ? new Date(initialData.adr_dozvole_radnika_od).toISOString().split('T')[0] : '');
  const [mjerenjeOtporaUzemljenjaOd, setMjerenjeOtporaUzemljenjaOd] = useState(initialData?.mjerenje_otpora_uzemljenja_od ? new Date(initialData.mjerenje_otpora_uzemljenja_od).toISOString().split('T')[0] : '');
  const [vatroDojavaOd, setVatroDojavaOd] = useState(initialData?.vatro_dojava_od ? new Date(initialData.vatro_dojava_od).toISOString().split('T')[0] : '');
  const [ispitivanjeElektroInstalacijaOd, setIspitivanjeElektroInstalacijaOd] = useState(initialData?.ispitivanje_elektro_instalacija_od ? new Date(initialData.ispitivanje_elektro_instalacija_od).toISOString().split('T')[0] : '');
  
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
  const [kalibrazaVatroDojavaDo, setKalibrazaVatroDojavaDo] = useState(initialData?.kalibraza_vatro_dojava_do ? new Date(initialData.kalibraza_vatro_dojava_do).toISOString().split('T')[0] : '');
  const [kalibrazaPpAparataDo, setKalibrazaPpAparataDo] = useState(initialData?.kalibraza_pp_aparata_do ? new Date(initialData.kalibraza_pp_aparata_do).toISOString().split('T')[0] : '');
  const [strucneLicenceRadnikaDo, setStrucneLicenceRadnikaDo] = useState(initialData?.strucne_licence_radnika_do ? new Date(initialData.strucne_licence_radnika_do).toISOString().split('T')[0] : '');
  const [adrDozvoleRadnikaDo, setAdrDozvoleRadnikaDo] = useState(initialData?.adr_dozvole_radnika_do ? new Date(initialData.adr_dozvole_radnika_do).toISOString().split('T')[0] : '');
  const [mjerenjeOtporaUzemljenjaDo, setMjerenjeOtporaUzemljenjaDo] = useState(initialData?.mjerenje_otpora_uzemljenja_do ? new Date(initialData.mjerenje_otpora_uzemljenja_do).toISOString().split('T')[0] : '');
  const [vatroDojavaDo, setVatroDojavaDo] = useState(initialData?.vatro_dojava_do ? new Date(initialData.vatro_dojava_do).toISOString().split('T')[0] : '');
  const [ispitivanjeElektroInstalacijaDo, setIspitivanjeElektroInstalacijaDo] = useState(initialData?.ispitivanje_elektro_instalacija_do ? new Date(initialData.ispitivanje_elektro_instalacija_do).toISOString().split('T')[0] : '');

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
    validateDatePair(kalibrazaVatroDojavaOd, kalibrazaVatroDojavaDo, 'Kalibraža vatro dojava');
    validateDatePair(kalibrazaPpAparataOd, kalibrazaPpAparataDo, 'Kalibraža PP aparata');
    validateDatePair(strucneLicenceRadnikaOd, strucneLicenceRadnikaDo, 'Stručne licence radnika');
    validateDatePair(adrDozvoleRadnikaOd, adrDozvoleRadnikaDo, 'ADR dozvole za radnike');
    validateDatePair(mjerenjeOtporaUzemljenjaOd, mjerenjeOtporaUzemljenjaDo, 'Mjerenje otpora uzemljenja');
    validateDatePair(vatroDojavaOd, vatroDojavaDo, 'Vatro dojava');
    validateDatePair(ispitivanjeElektroInstalacijaOd, ispitivanjeElektroInstalacijaDo, 'Ispitivanje elektro instalacija');

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
        
        // Kalibraža vatro dojava
        kalibraza_vatro_dojava_od: kalibrazaVatroDojavaOd || undefined,
        kalibraza_vatro_dojava_do: kalibrazaVatroDojavaDo || undefined,
        
        // Kalibraža PP aparata
        kalibraza_pp_aparata_od: kalibrazaPpAparataOd || undefined,
        kalibraza_pp_aparata_do: kalibrazaPpAparataDo || undefined,
        
        // Stručne licence radnika
        strucne_licence_radnika_od: strucneLicenceRadnikaOd || undefined,
        strucne_licence_radnika_do: strucneLicenceRadnikaDo || undefined,
        
        // ADR dozvole za radnike
        adr_dozvole_radnika_od: adrDozvoleRadnikaOd || undefined,
        adr_dozvole_radnika_do: adrDozvoleRadnikaDo || undefined,
        
        // Mjerenje otpora uzemljenja
        mjerenje_otpora_uzemljenja_od: mjerenjeOtporaUzemljenjaOd || undefined,
        mjerenje_otpora_uzemljenja_do: mjerenjeOtporaUzemljenjaDo || undefined,
        
        // Vatro dojava
        vatro_dojava_od: vatroDojavaOd || undefined,
        vatro_dojava_do: vatroDojavaDo || undefined,
        
        // Ispitivanje elektro instalacija
        ispitivanje_elektro_instalacija_od: ispitivanjeElektroInstalacijaOd || undefined,
        ispitivanje_elektro_instalacija_do: ispitivanjeElektroInstalacijaDo || undefined,
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
    <div className="relative p-5 rounded-xl border border-gray-200/50 backdrop-blur-sm bg-white/70 shadow-md hover:shadow-lg transition-all duration-300">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full filter blur-xl opacity-60 -mr-4 -mt-4"></div>
      <div className="relative z-10">
        <Label className="text-gray-700 font-medium flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-blue-500" />
          {label}
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-600 text-sm font-medium">Od</Label>
            <Input
              type="date"
              value={odValue}
              onChange={(e) => onOdChange(e.target.value)}
              className="bg-white/90 border-gray-200 text-gray-800 focus:ring-blue-500 focus:border-blue-500 rounded-lg h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-600 text-sm font-medium">Do</Label>
            <Input
              type="date"
              value={doValue}
              onChange={(e) => onDoChange(e.target.value)}
              className="bg-white/90 border-gray-200 text-gray-800 focus:ring-blue-500 focus:border-blue-500 rounded-lg h-10"
            />
          </div>
        </div>
        {errors[`${instrumentKey}_pair`] && (
          <p className="text-red-500 text-sm mt-2">{errors[`${instrumentKey}_pair`]}</p>
        )}
        {errors[`${instrumentKey}_order`] && (
          <p className="text-red-500 text-sm mt-2">{errors[`${instrumentKey}_order`]}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden border border-white/20 backdrop-blur-xl bg-white/95 shadow-2xl rounded-2xl relative">
        {/* Glassmorphism background effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full filter blur-3xl opacity-30 -mr-36 -mt-36"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full filter blur-3xl opacity-30 -ml-36 -mb-36"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-cyan-500/10 rounded-full filter blur-3xl opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
        
        <CardHeader className="relative z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              {isEdit ? 'Uredi Plan Kalibracije' : 'Novi Plan Kalibracije'}
            </CardTitle>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Osnovni podaci */}
            <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Settings2 className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Osnovni podaci</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Naziv opreme *</Label>
                    <Input
                      value={nazivOpreme}
                      onChange={(e) => setNazivOpreme(e.target.value)}
                      className="bg-white/90 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 rounded-xl h-12"
                      placeholder="Unesite naziv opreme"
                    />
                    {errors.naziv_opreme && <p className="text-red-500 text-sm mt-1">{errors.naziv_opreme}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Identifikacijski broj *</Label>
                    <Input
                      value={identifikacijskiBroj}
                      onChange={(e) => setIdentifikacijskiBroj(e.target.value)}
                      className="bg-white/90 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 rounded-xl h-12"
                      placeholder="Unesite identifikacijski broj"
                    />
                    {errors.identifikacijski_broj && <p className="text-red-500 text-sm mt-1">{errors.identifikacijski_broj}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Vlasnik opreme *</Label>
                    <Input
                      value={vlasnikOpreme}
                      onChange={(e) => setVlasnikOpreme(e.target.value)}
                      className="bg-white/90 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 rounded-xl h-12"
                      placeholder="Unesite vlasnika opreme"
                    />
                    {errors.vlasnik_opreme && <p className="text-red-500 text-sm mt-1">{errors.vlasnik_opreme}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Mjesto korištenja opreme *</Label>
                    <Input
                      value={mjestoKoristenjaOpreme}
                      onChange={(e) => setMjestoKoristenjaOpreme(e.target.value)}
                      className="bg-white/90 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 rounded-xl h-12"
                      placeholder="Unesite mjesto korištenja"
                    />
                    {errors.mjesto_koristenja_opreme && <p className="text-red-500 text-sm mt-1">{errors.mjesto_koristenja_opreme}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Kalibracije - Osnovni instrumenti */}
            <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Settings2 className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Osnovni instrumenti</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Sigurnosni instrumenti */}
            <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Sigurnosni instrumenti</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DatePairInput
                    label="Kalibraža vatro dojava"
                    odValue={kalibrazaVatroDojavaOd}
                    doValue={kalibrazaVatroDojavaDo}
                    onOdChange={setKalibrazaVatroDojavaOd}
                    onDoChange={setKalibrazaVatroDojavaDo}
                    instrumentKey="Kalibraža vatro dojava"
                  />
                  
                  <DatePairInput
                    label="Kalibraža PP aparata"
                    odValue={kalibrazaPpAparataOd}
                    doValue={kalibrazaPpAparataDo}
                    onOdChange={setKalibrazaPpAparataOd}
                    onDoChange={setKalibrazaPpAparataDo}
                    instrumentKey="Kalibraža PP aparata"
                  />
                  
                  <DatePairInput
                    label="Vatro dojava"
                    odValue={vatroDojavaOd}
                    doValue={vatroDojavaDo}
                    onOdChange={setVatroDojavaOd}
                    onDoChange={setVatroDojavaDo}
                    instrumentKey="Vatro dojava"
                  />
                </div>
              </div>
            </div>

            {/* Radni dokumenti */}
            <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Radni dokumenti</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DatePairInput
                    label="Stručne licence radnika"
                    odValue={strucneLicenceRadnikaOd}
                    doValue={strucneLicenceRadnikaDo}
                    onOdChange={setStrucneLicenceRadnikaOd}
                    onDoChange={setStrucneLicenceRadnikaDo}
                    instrumentKey="Stručne licence radnika"
                  />
                  
                  <DatePairInput
                    label="ADR dozvole za radnike"
                    odValue={adrDozvoleRadnikaOd}
                    doValue={adrDozvoleRadnikaDo}
                    onOdChange={setAdrDozvoleRadnikaOd}
                    onDoChange={setAdrDozvoleRadnikaDo}
                    instrumentKey="ADR dozvole za radnike"
                  />
                </div>
              </div>
            </div>

            {/* Električni instrumenti */}
            <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Električni instrumenti</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DatePairInput
                    label="Mjerenje otpora uzemljenja"
                    odValue={mjerenjeOtporaUzemljenjaOd}
                    doValue={mjerenjeOtporaUzemljenjaDo}
                    onOdChange={setMjerenjeOtporaUzemljenjaOd}
                    onDoChange={setMjerenjeOtporaUzemljenjaDo}
                    instrumentKey="Mjerenje otpora uzemljenja"
                  />
                  
                  <DatePairInput
                    label="Ispitivanje elektro instalacija"
                    odValue={ispitivanjeElektroInstalacijaOd}
                    doValue={ispitivanjeElektroInstalacijaDo}
                    onOdChange={setIspitivanjeElektroInstalacijaOd}
                    onDoChange={setIspitivanjeElektroInstalacijaDo}
                    instrumentKey="Ispitivanje elektro instalacija"
                  />
                </div>
              </div>
            </div>

            {/* Napomene i dokument */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <Label className="text-gray-700 font-medium text-lg">Napomene</Label>
                  </div>
                  <textarea
                    value={napomene}
                    onChange={(e) => setNapomene(e.target.value)}
                    className="bg-white/90 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] w-full rounded-xl p-4 resize-vertical"
                    placeholder="Unesite dodatne napomene..."
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="relative p-6 rounded-2xl border border-gray-200/50 backdrop-blur-sm bg-white/80 shadow-lg">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full filter blur-xl opacity-60 -mr-5 -mt-5"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    <Label className="text-gray-700 font-medium text-lg">Dokument</Label>
                  </div>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="bg-white/90 border-gray-200 text-gray-800 file:bg-blue-500 file:border-0 file:text-white file:rounded-lg file:px-4 file:py-2 file:mr-3 focus:ring-blue-500 focus:border-blue-500 rounded-xl h-12"
                  />
                  {selectedFile && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-700 text-sm font-medium">
                        ✓ Odabran fajl: {selectedFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm -mx-6 px-6 -mb-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="bg-white/80 hover:bg-white border-gray-300 text-gray-700 hover:text-gray-800 rounded-xl h-12 px-6 font-medium"
              >
                Odustani
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg rounded-xl h-12 px-8 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEdit ? 'Ažuriranje...' : 'Kreiranje...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEdit ? 'Ažuriraj Plan' : 'Kreiraj Plan'}
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