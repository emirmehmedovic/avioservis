'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Filter, Settings2, Loader2, FileText, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { OstalaOpremaForm } from '@/components/ostala-oprema/OstalaOpremaForm';
import { OstalaOpremaCard } from '@/components/ostala-oprema/OstalaOpremaCard';
import { 
  OstalaOprema, 
  CreateOstalaOpremaData, 
  UpdateOstalaOpremaData,
  OstalaOpremaSearchParams
} from '@/types/ostalaOprema';
import { ostalaOpremaService } from '@/services/ostalaOpremaService';
import { toast } from 'sonner';

export default function OstalaOpremaPage() {
  const [opremaList, setOpremaList] = useState<OstalaOprema[]>([]);
  const [filteredOprema, setFilteredOprema] = useState<OstalaOprema[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOprema, setSelectedOprema] = useState<OstalaOprema | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVlasnik, setFilterVlasnik] = useState('');
  const [summary, setSummary] = useState({ ukupno: 0 });
  const [generateReportLoading, setGenerateReportLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: OstalaOpremaSearchParams = {
        limit: 100 // Load all for client-side filtering
      };
      const response = await ostalaOpremaService.getAll(params);
      setOpremaList(response.oprema);
      setFilteredOprema(response.oprema);
      setSummary(response.summary);
    } catch (error) {
      console.error('Error loading ostala oprema:', error);
      toast.error('Greška pri učitavanju ostale opreme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter effect
  useEffect(() => {
    let filtered = opremaList;

    if (searchTerm) {
      filtered = filtered.filter(o =>
        o.naziv.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.vlasnik && o.vlasnik.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.mesto_koristenja && o.mesto_koristenja.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.standard_opreme && o.standard_opreme.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterVlasnik) {
      filtered = filtered.filter(o =>
        o.vlasnik && o.vlasnik.toLowerCase().includes(filterVlasnik.toLowerCase())
      );
    }

    setFilteredOprema(filtered);
  }, [opremaList, searchTerm, filterVlasnik]);

  const handleCreate = async (data: CreateOstalaOpremaData, file?: File) => {
    try {
      const createdOprema = await ostalaOpremaService.create(data);
      
      // If there's a file, upload it
      if (file && createdOprema.id) {
        await ostalaOpremaService.uploadDocument(createdOprema.id, file);
      }
      
      toast.success('Oprema je uspješno kreirana');
      setIsFormOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating oprema:', error);
      toast.error(error.message || 'Greška pri kreiranju opreme');
    }
  };

  const handleUpdate = async (data: UpdateOstalaOpremaData, file?: File) => {
    if (!selectedOprema) return;

    try {
      await ostalaOpremaService.update(selectedOprema.id, data);
      
      // If there's a file, upload it
      if (file) {
        await ostalaOpremaService.uploadDocument(selectedOprema.id, file);
      }
      
      toast.success('Oprema je uspješno ažurirana');
      setSelectedOprema(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating oprema:', error);
      toast.error(error.message || 'Greška pri ažuriranju opreme');
    }
  };

  const handleEdit = (oprema: OstalaOprema) => {
    setSelectedOprema(oprema);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu opremu?')) {
      return;
    }

    try {
      await ostalaOpremaService.delete(id);
      toast.success('Oprema je uspješno obrisana');
      loadData();
    } catch (error: any) {
      console.error('Error deleting oprema:', error);
      toast.error(error.message || 'Greška pri brisanju opreme');
    }
  };

  const handleGeneratePDF = async (id: number) => {
    try {
      const blob = await ostalaOpremaService.generatePDF(id);
      const oprema = opremaList.find(o => o.id === id);
      const filename = `oprema_${oprema?.naziv.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      ostalaOpremaService.downloadPDF(blob, filename);
      toast.success('PDF izvještaj je uspješno generiran');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(error.message || 'Greška pri generiranju PDF-a');
    }
  };

  const handleGenerateFullReport = async () => {
    if (opremaList.length === 0) {
      toast.error('Nema opreme za generiranje izvještaja');
      return;
    }

    try {
      setGenerateReportLoading(true);
      const blob = await ostalaOpremaService.generateFullReport();
      ostalaOpremaService.downloadPDF(blob, 'ukupni_izvjestaj_ostala_oprema.pdf');
      toast.success('Ukupni izvještaj je uspješno generiran');
    } catch (error: any) {
      console.error('Error generating full report:', error);
      toast.error(error.message || 'Greška pri generiranju ukupnog izvještaja');
    } finally {
      setGenerateReportLoading(false);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedOprema(null);
  };

  const handleFormSubmit = async (data: CreateOstalaOpremaData | UpdateOstalaOpremaData, file?: File) => {
    if (selectedOprema) {
      await handleUpdate(data as UpdateOstalaOpremaData, file);
    } else {
      await handleCreate(data as CreateOstalaOpremaData, file);
    }
  };

  // Get unique owners for filter dropdown
  const uniqueVlasnici = Array.from(
    new Set(opremaList.map(o => o.vlasnik).filter(Boolean))
  ).sort();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center space-x-3 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-700 font-medium">Učitavanje opreme...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen"
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
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent z-0"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                  <Wrench className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Ostala Oprema
                  </h1>
                  <p className="text-gray-300">
                    Upravljanje i praćenje ostale opreme
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nova Oprema</span>
                </Button>

                <Button
                  onClick={handleGenerateFullReport}
                  disabled={generateReportLoading || opremaList.length === 0}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                >
                  {generateReportLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                  <span>Ukupni Izvještaj</span>
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
                  <p className="text-gray-500 text-sm font-medium">Ukupno Opreme</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.ukupno}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Prikazano</p>
                  <p className="text-2xl font-bold text-gray-800">{filteredOprema.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Filter className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Vlasnici</p>
                  <p className="text-2xl font-bold text-gray-800">{uniqueVlasnici.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Settings2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Sa Dokumentima</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {opremaList.filter(o => o.dokument_url).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search" className="text-gray-700 text-sm font-medium">
              Pretraži opremu
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="Naziv, vlasnik, mjesto korištenja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="filterVlasnik" className="text-gray-700 text-sm font-medium">
              Vlasnik
            </Label>
            <select
              id="filterVlasnik"
              value={filterVlasnik}
              onChange={(e) => setFilterVlasnik(e.target.value)}
              className="w-full mt-1 p-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
            >
              <option value="">Svi vlasnici</option>
              {uniqueVlasnici.map((vlasnik) => (
                <option key={vlasnik} value={vlasnik || ''}>
                  {vlasnik}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilterVlasnik('');
              }}
              variant="outline"
              className="w-full bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm"
            >
              Resetuj filtere
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Results */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredOprema.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
            <Wrench className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nema pronađene opreme</h3>
            <p className="text-gray-500 text-center">
              {searchTerm || filterVlasnik 
                ? 'Pokušajte sa drugačijim kriterijuma pretrage'
                : 'Dodajte novu opremu klikom na dugme "Nova Oprema"'
              }
            </p>
          </div>
        ) : (
          filteredOprema.map((oprema, index) => (
            <motion.div key={oprema.id} variants={itemVariants}>
              <OstalaOpremaCard
                oprema={oprema}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGeneratePDF={handleGeneratePDF}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Form Modal */}
      <OstalaOpremaForm
        isOpen={isFormOpen || !!selectedOprema}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        oprema={selectedOprema}
      />
    </motion.div>
  );
} 