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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Učitavanje...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-sm border border-white/20 rounded-3xl p-8 mb-8 shadow-2xl"
        >
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <Card className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Ukupno Opreme</p>
                    <p className="text-2xl font-bold text-slate-200">{summary.ukupno}</p>
                  </div>
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Wrench className="h-6 w-6 text-cyan-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Prikazano</p>
                    <p className="text-2xl font-bold text-slate-200">{filteredOprema.length}</p>
                  </div>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Filter className="h-6 w-6 text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Vlasnici</p>
                    <p className="text-2xl font-bold text-slate-200">{uniqueVlasnici.length}</p>
                  </div>
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Settings2 className="h-6 w-6 text-purple-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Sa Dokumentima</p>
                    <p className="text-2xl font-bold text-slate-200">
                      {opremaList.filter(o => o.dokument_url).length}
                    </p>
                  </div>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <FileText className="h-6 w-6 text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8 shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-white font-medium">
                Pretraži opremu
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Naziv, vlasnik, mjesto korištenja..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterVlasnik" className="text-white font-medium">
                Vlasnik
              </Label>
              <select
                id="filterVlasnik"
                value={filterVlasnik}
                onChange={(e) => setFilterVlasnik(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Resetuj filtere
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Equipment Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredOprema.map((oprema, index) => (
            <motion.div
              key={oprema.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <OstalaOpremaCard
                oprema={oprema}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGeneratePDF={handleGeneratePDF}
              />
            </motion.div>
          ))}
        </motion.div>

        {filteredOprema.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nema pronađene opreme
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterVlasnik 
                ? 'Pokušajte sa drugačijim kriterijuma pretrage'
                : 'Dodajte novu opremu klikom na dugme "Nova Oprema"'
              }
            </p>
          </motion.div>
        )}
      </div>

      {/* Form Modal */}
      <OstalaOpremaForm
        isOpen={isFormOpen || !!selectedOprema}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        oprema={selectedOprema}
      />
    </div>
  );
} 