'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Filter, Settings2, Loader2, AlertTriangle, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlanKalibracijeForm } from '@/components/plan-kalibracije/PlanKalibracijeForm';
import { PlanKalibracijeCard } from '@/components/plan-kalibracije/PlanKalibracijeCard';
import PlanKalibracijeDetailsModal from '@/components/plan-kalibracije/PlanKalibracijeDetailsModal';
import { PlanKalibracije, CreatePlanKalibracijeRequest, UpdatePlanKalibracijeRequest } from '@/types/planKalibracije';
import planKalibracijeService from '@/services/planKalibracijeService';
import { toast } from 'sonner';

// Status tipovi
type StatusType = 'aktivan' | 'istekao' | 'uskoro_istice' | 'nepotpun';

// Helper funkcija za provjeru statusa
const getStatusInfo = (plan: PlanKalibracije) => {
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
      status: 'nepotpun' as StatusType,
      message: 'Nedostaju podaci o kalibraciji',
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiredInstruments.length > 0) {
    return {
      status: 'istekao' as StatusType,
      message: `Istekli instrumenti: ${expiredInstruments.join(', ')}`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  if (expiringSoonInstruments.length > 0) {
    return {
      status: 'uskoro_istice' as StatusType,
      message: `Uskoro ističu: ${expiringSoonInstruments.join(', ')}`,
      expiredInstruments,
      expiringSoonInstruments
    };
  }

  return {
    status: 'aktivan' as StatusType,
    message: 'Svi instrumenti su važeći',
    expiredInstruments,
    expiringSoonInstruments
  };
};

export default function PlanKalibracjePage() {
  const [planovi, setPlanovi] = useState<PlanKalibracije[]>([]);
  const [filteredPlanovi, setFilteredPlanovi] = useState<PlanKalibracije[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKalibracije | null>(null);
  const [detailsModalPlan, setDetailsModalPlan] = useState<PlanKalibracije | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVlasnik, setFilterVlasnik] = useState('');
  const [reportLanguage, setReportLanguage] = useState<'bs' | 'en'>('bs');

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await planKalibracijeService.getAllPlanKalibracije();
      setPlanovi(response.planovi);
      setFilteredPlanovi(response.planovi);
    } catch (error) {
      console.error('Error loading plan kalibracije:', error);
      toast.error('Greška pri učitavanju planova kalibracije');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter effect
  useEffect(() => {
    let filtered = planovi;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.naziv_opreme.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.identifikacijski_broj.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vlasnik_opreme.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mjesto_koristenja_opreme.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(p => {
        const statusInfo = getStatusInfo(p);
        return statusInfo.status === filterStatus;
      });
    }

    if (filterVlasnik) {
      filtered = filtered.filter(p =>
        p.vlasnik_opreme.toLowerCase().includes(filterVlasnik.toLowerCase())
      );
    }

    setFilteredPlanovi(filtered);
  }, [planovi, searchTerm, filterStatus, filterVlasnik]);

  const handleCreate = async (data: CreatePlanKalibracijeRequest, file?: File) => {
    try {
      const createdPlan = await planKalibracijeService.createPlanKalibracije(data);
      
      // If there's a file, upload it
      if (file && createdPlan.id) {
        await planKalibracijeService.uploadDocument(createdPlan.id, file);
      }
      
      toast.success('Plan kalibracije je uspješno kreiran');
      setIsFormOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast.error(error.message || 'Greška pri kreiranju plana kalibracije');
    }
  };

  const handleUpdate = async (data: UpdatePlanKalibracijeRequest, file?: File) => {
    if (!selectedPlan) return;

    try {
      await planKalibracijeService.updatePlanKalibracije(selectedPlan.id, data);
      
      // If there's a file, upload it
      if (file) {
        await planKalibracijeService.uploadDocument(selectedPlan.id, file);
      }
      
      toast.success('Plan kalibracije je uspješno ažuriran');
      setSelectedPlan(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast.error(error.message || 'Greška pri ažuriranju plana kalibracije');
    }
  };

  const handleEdit = (plan: PlanKalibracije) => {
    setSelectedPlan(plan);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj plan kalibracije?')) {
      return;
    }

    try {
      await planKalibracijeService.deletePlanKalibracije(id);
      toast.success('Plan kalibracije je uspješno obrisan');
      loadData();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error(error.message || 'Greška pri brisanju plana kalibracije');
    }
  };

  const handleGeneratePDF = async (id: number) => {
    try {
      const plan = planovi.find(p => p.id === id);
      if (!plan) return;

      await planKalibracijeService.downloadPDF(id, plan.identifikacijski_broj);
      toast.success('PDF je uspješno generiran');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Greška pri generiranju PDF-a');
    }
  };

  const handleGenerateFullReport = async () => {
    try {
      if (filteredPlanovi.length === 0) {
        toast.error('Nema planova za uključivanje u izvještaj');
        return;
      }

      toast.loading('Generiranje ukupnog izvještaja...', { id: 'full-report' });
      
      const planIds = filteredPlanovi.map(plan => plan.id);
      await planKalibracijeService.generateFullReport(planIds, reportLanguage);
      
      toast.success('Ukupni izvještaj je uspješno generiran', { id: 'full-report' });
    } catch (error: any) {
      console.error('Error generating full report:', error);
      toast.error('Greška pri generiranju ukupnog izvještaja', { id: 'full-report' });
    }
  };

  const handleGenerateIndividualReport = async (id: number) => {
    try {
      toast.loading('Generiranje individualnog izvještaja...', { id: `individual-report-${id}` });
      
      await planKalibracijeService.generateIndividualReport(id, reportLanguage);
      
      toast.success('Individualni izvještaj je uspješno generiran', { id: `individual-report-${id}` });
    } catch (error: any) {
      console.error('Error generating individual report:', error);
      toast.error('Greška pri generiranju individualnog izvještaja', { id: `individual-report-${id}` });
    }
  };

  const handleViewDetails = (plan: PlanKalibracije) => {
    setDetailsModalPlan(plan);
    setIsDetailsModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedPlan(null);
  };

  const handleFormSubmit = async (data: CreatePlanKalibracijeRequest | UpdatePlanKalibracijeRequest, file?: File) => {
    if (selectedPlan) {
      // Edit mode
      await handleUpdate(data as UpdatePlanKalibracijeRequest, file);
    } else {
      // Create mode
      await handleCreate(data as CreatePlanKalibracijeRequest, file);
    }
  };

  // Get unique values for filters
  const uniqueVlasnici = [...new Set(planovi.map(p => p.vlasnik_opreme))];

  // Calculate summary statistics
  const summary = planovi.reduce((acc, plan) => {
    const statusInfo = getStatusInfo(plan);
    acc[statusInfo.status] = (acc[statusInfo.status] || 0) + 1;
    return acc;
  }, {} as Record<StatusType, number>);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-150px)]">
        <motion.div 
          className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-lg font-medium text-muted-foreground mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Učitavanje planova kalibracije...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
        <div className="relative overflow-hidden p-6 rounded-xl shadow-lg text-white">
          {/* Black gradient with subtle blue corners */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-md border border-white/10 z-0"></div>
          {/* Subtle blue shadows in corners */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-800 rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
          
          {/* Glass highlight effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Plan Kalibracije
              </h1>
              <p className="text-gray-300 mt-1">Upravljajte planovima kalibracije instrumenata</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full sm:w-auto">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Pretraži planove..."
                  className="pl-10 pr-4 py-2 border border-white/20 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/10 backdrop-blur-md text-white placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2">
                  <select
                    value={reportLanguage}
                    onChange={(e) => setReportLanguage(e.target.value as 'bs' | 'en')}
                    className="px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="bs">🇧🇦 Bosanski</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                  <Button
                    onClick={handleGenerateFullReport}
                    disabled={filteredPlanovi.length === 0}
                    className="bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ukupni Izvještaj
                  </Button>
                </div>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novi Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Aktivni</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.aktivan || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Uskoro ističu</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.uskoro_istice || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Istekli</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.istekao || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-500 to-slate-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Nepotpuni</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.nepotpun || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50 z-0"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full filter blur-2xl -translate-y-1/2 translate-x-1/4 z-0"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/20 to-blue-500/20 rounded-full filter blur-xl translate-y-1/2 -translate-x-1/4 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium text-gray-800 text-lg">Filteri</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-700 text-sm font-medium">Status</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                >
                  <option value="">Svi statusi</option>
                  <option value="aktivan">Aktivni</option>
                  <option value="uskoro_istice">Uskoro ističu</option>
                  <option value="istekao">Istekli</option>
                  <option value="nepotpun">Nepotpuni</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-700 text-sm font-medium">Vlasnik</Label>
                <select
                  value={filterVlasnik}
                  onChange={(e) => setFilterVlasnik(e.target.value)}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                >
                  <option value="">Svi vlasnici</option>
                  {uniqueVlasnici.map(vlasnik => (
                    <option key={vlasnik} value={vlasnik}>{vlasnik}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('');
                    setFilterVlasnik('');
                  }}
                  className="w-full bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm"
                >
                  Resetuj filtere
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredPlanovi.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Settings2 className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nema planova kalibracije</h3>
            <p className="text-gray-500 text-center">
              {searchTerm || filterStatus || filterVlasnik
                ? 'Nema rezultata koji odgovaraju vašim kriterijumima pretrage.'
                : 'Počnite kreiranjem novog plana kalibracije.'}
            </p>
          </div>
        ) : (
          filteredPlanovi.map(plan => (
            <motion.div key={plan.id} variants={itemVariants}>
              <PlanKalibracijeCard
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGeneratePDF={handleGeneratePDF}
                onGenerateIndividualReport={handleGenerateIndividualReport}
                onViewDetails={handleViewDetails}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Form Modal */}
      {(isFormOpen || selectedPlan) && (
        <PlanKalibracijeForm
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialData={selectedPlan || undefined}
          isEdit={!!selectedPlan}
        />
      )}

      {/* Details Modal */}
      <PlanKalibracijeDetailsModal
        plan={detailsModalPlan}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsModalPlan(null);
        }}
      />
    </motion.div>
  );
} 