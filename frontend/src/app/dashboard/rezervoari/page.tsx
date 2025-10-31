'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Filter, Container, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { RezervoarForm } from '@/components/rezervoari/RezervoarForm';
import { RezervoarCard } from '@/components/rezervoari/RezervoarCard';
import { Rezervoar, CreateRezervoarRequest, UpdateRezervoarRequest } from '@/types/rezervoar';
import { rezervoarService } from '@/services/rezervoarService';
import { toast } from 'sonner';

export default function RezervoariPage() {
  const [rezervoari, setRezervoari] = useState<Rezervoar[]>([]);
  const [filteredRezervoari, setFilteredRezervoari] = useState<Rezervoar[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRezervoar, setSelectedRezervoar] = useState<Rezervoar | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOblik, setFilterOblik] = useState('');
  const [filterVlasnik, setFilterVlasnik] = useState('');

  const loadRezervoari = async () => {
    try {
      setLoading(true);
      const data = await rezervoarService.getAll();
      setRezervoari(data);
      setFilteredRezervoari(data);
    } catch (error) {
      console.error('Error loading rezervoari:', error);
      toast.error('Greška pri učitavanju rezervoara');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRezervoari();
  }, []);

  // Filter effect
  useEffect(() => {
    let filtered = rezervoari;

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.naziv_rezervoara.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id_broj.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.mjesto_koristenja.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterOblik) {
      filtered = filtered.filter(r => r.oblik_rezervoara === filterOblik);
    }

    if (filterVlasnik) {
      filtered = filtered.filter(r =>
        r.vlasnik.toLowerCase().includes(filterVlasnik.toLowerCase())
      );
    }

    setFilteredRezervoari(filtered);
  }, [rezervoari, searchTerm, filterOblik, filterVlasnik]);

  const handleCreate = async (data: CreateRezervoarRequest) => {
    try {
      await rezervoarService.create(data);
      toast.success('Rezervoar je uspješno kreiran');
      setIsFormOpen(false);
      loadRezervoari();
    } catch (error: any) {
      console.error('Error creating rezervoar:', error);
      toast.error(error.message || 'Greška pri kreiranju rezervoara');
    }
  };

  const handleUpdate = async (data: UpdateRezervoarRequest) => {
    if (!selectedRezervoar) return;

    try {
      await rezervoarService.update(selectedRezervoar.id, data);
      toast.success('Rezervoar je uspješno ažuriran');
      setSelectedRezervoar(null);
      loadRezervoari();
    } catch (error: any) {
      console.error('Error updating rezervoar:', error);
      toast.error(error.message || 'Greška pri ažuriranju rezervoara');
    }
  };

  const handleEdit = (rezervoar: Rezervoar) => {
    setSelectedRezervoar(rezervoar);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj rezervoar?')) {
      return;
    }

    try {
      await rezervoarService.delete(id);
      toast.success('Rezervoar je uspješno obrisan');
      loadRezervoari();
    } catch (error: any) {
      console.error('Error deleting rezervoar:', error);
      toast.error(error.message || 'Greška pri brisanju rezervoara');
    }
  };

  const handleGeneratePDF = async (id: number) => {
    try {
      const rezervoar = rezervoari.find(r => r.id === id);
      if (!rezervoar) return;

      const blob = await rezervoarService.generatePDF(id);
      rezervoarService.downloadPDF(blob, `rezervoar-${rezervoar.id_broj}.pdf`);
      toast.success('PDF je uspješno generiran');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Greška pri generiranju PDF-a');
    }
  };

  const handleGenerateFullReport = async () => {
    try {
      if (filteredRezervoari.length === 0) {
        toast.error('Nema rezervoara za uključivanje u izvještaj');
        return;
      }

      toast.loading('Generiranje ukupnog izvještaja...', { id: 'full-report' });
      
      const rezervoarIds = filteredRezervoari.map(rezervoar => rezervoar.id);
      await rezervoarService.generateFullReport(rezervoarIds);
      
      toast.success('Ukupni izvještaj je uspješno generiran', { id: 'full-report' });
    } catch (error: any) {
      console.error('Error generating full report:', error);
      toast.error('Greška pri generiranju ukupnog izvještaja', { id: 'full-report' });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedRezervoar(null);
  };

  const handleFormSubmit = async (data: CreateRezervoarRequest | UpdateRezervoarRequest) => {
    if (selectedRezervoar) {
      // Edit mode
      await handleUpdate(data as UpdateRezervoarRequest);
    } else {
      // Create mode  
      await handleCreate(data as CreateRezervoarRequest);
    }
  };

  // Get unique values for filters
  const uniqueOblici = [...new Set(rezervoari.map(r => r.oblik_rezervoara))];
  const uniqueVlasnici = [...new Set(rezervoari.map(r => r.vlasnik))];

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
          Učitavanje rezervoara...
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
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600 rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-800 rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Rezervoari
              </h1>
              <p className="text-gray-300 mt-1">Upravljajte rezervoarima za gorivo</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative w-full sm:w-auto">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Pretraži rezervoare..."
                  className="pl-10 pr-4 py-2 border border-white/20 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400/50 bg-white/10 backdrop-blur-md text-white placeholder-gray-400 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateFullReport}
                  disabled={filteredRezervoari.length === 0}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 duration-200"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Izvještaj
                </Button>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="backdrop-blur-md bg-slate-600/80 hover:bg-slate-700 border border-white/20 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-medium duration-200"
                >
                  <Plus size={18} className="mr-2"/>
                  <span className="hidden sm:inline">Novi</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 bg-white shadow-md hover:shadow-lg transition-all duration-300 rounded-lg">
        <CardHeader className="border-b border-gray-100 pb-4 pt-6 px-6">
          <CardTitle className="flex items-center text-gray-900 text-lg font-semibold">
            <Filter className="w-5 h-5 mr-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
            Filteri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="oblik" className="text-gray-700 font-medium text-sm mb-2 block">Oblik rezervoara</Label>
              <select
                id="oblik"
                value={filterOblik}
                onChange={(e) => setFilterOblik(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
              >
                <option value="">Svi oblici</option>
                {uniqueOblici.map(oblik => (
                  <option key={oblik} value={oblik}>{oblik}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="vlasnik" className="text-gray-700 font-medium text-sm mb-2 block">Vlasnik</Label>
              <select
                id="vlasnik"
                value={filterVlasnik}
                onChange={(e) => setFilterVlasnik(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
              >
                <option value="">Svi vlasnici</option>
                {uniqueVlasnici.map(vlasnik => (
                  <option key={vlasnik} value={vlasnik}>{vlasnik}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilterOblik('');
                  setFilterVlasnik('');
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 transition-all duration-200 px-4 py-2 w-full font-medium"
              >
                Očisti filtere
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Lista rezervoara */}
      {filteredRezervoari.length === 0 ? (
        <Card className="border border-gray-200 bg-white hover:shadow-md transition-all">
          <div className="text-center p-16">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 shadow-md">
              <Container className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">
              {searchTerm || filterOblik || filterVlasnik ? 'Nema rezultata' : 'Bez rezervoara'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
              {searchTerm || filterOblik || filterVlasnik
                ? 'Nismo pronašli rezervoare koji odgovaraju vašim filterima. Pokušajte sa drugim kriterijima.'
                : 'Nema kreiranog rezervoara. Počnite sa dodavanjem prvog rezervoara za upravljanje gorivom.'}
            </p>
            {!(searchTerm || filterOblik || filterVlasnik) && (
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg h-10 px-6"
              >
                <Plus size={18} className="mr-2"/>
                Kreiraj Prvi Rezervoar
              </Button>
            )}
            {(searchTerm || filterOblik || filterVlasnik) && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilterOblik('');
                  setFilterVlasnik('');
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 transition-all h-10 px-6 font-medium shadow-sm hover:shadow-md"
              >
                Očisti sve filtere
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <motion.div
          className="columns-1 lg:columns-2 gap-8"
          style={{ columnGap: '32px' }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredRezervoari.map((rezervoar) => (
            <motion.div key={rezervoar.id} variants={itemVariants} className="break-inside-avoid mb-8">
              <RezervoarCard
                rezervoar={rezervoar}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGeneratePDF={handleGeneratePDF}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Form Modal */}
      {(isFormOpen || selectedRezervoar) && (
        <RezervoarForm
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialData={selectedRezervoar || undefined}
          isEdit={!!selectedRezervoar}
        />
      )}
    </motion.div>
  );
} 