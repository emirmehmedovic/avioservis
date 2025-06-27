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
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600 rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-800 rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Rezervoari
            </h1>
            <p className="text-gray-300 mt-1">Upravljajte rezervoarima za gorivo</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-auto">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#F08080] h-4 w-4">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Pretraži rezervoare..."
                className="pl-10 pr-4 py-2 border border-white/20 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#F08080]/50 bg-white/10 backdrop-blur-md text-white placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateFullReport}
                disabled={filteredRezervoari.length === 0}
                className="bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="h-4 w-4 mr-2" />
                Ukupni Izvještaj
              </Button>
              <Button 
                onClick={() => setIsFormOpen(true)}
                className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium"
              >
                <Plus size={18} className="mr-2"/>
                Novi Rezervoar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-700 overflow-hidden backdrop-blur-md bg-gradient-to-br from-gray-800/90 to-gray-900/90 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-700/80 to-gray-800/80 border-b border-gray-600">
          <CardTitle className="flex items-center text-white text-lg">
            <Filter className="w-5 h-5 mr-2 text-[#F08080]" />
            Filteri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="oblik" className="text-white font-medium text-sm mb-2 block">Oblik rezervoara</Label>
              <select
                id="oblik"
                value={filterOblik}
                onChange={(e) => setFilterOblik(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#F08080]/50 focus:border-[#F08080]/50 text-sm"
              >
                <option value="" className="bg-gray-700 text-white">Svi oblici</option>
                {uniqueOblici.map(oblik => (
                  <option key={oblik} value={oblik} className="bg-gray-700 text-white">{oblik}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="vlasnik" className="text-white font-medium text-sm mb-2 block">Vlasnik</Label>
              <select
                id="vlasnik"
                value={filterVlasnik}
                onChange={(e) => setFilterVlasnik(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#F08080]/50 focus:border-[#F08080]/50 text-sm"
              >
                <option value="" className="bg-gray-700 text-white">Svi vlasnici</option>
                {uniqueVlasnici.map(vlasnik => (
                  <option key={vlasnik} value={vlasnik} className="bg-gray-700 text-white">{vlasnik}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterOblik('');
                  setFilterVlasnik('');
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white border border-gray-500 transition-all duration-200 px-4 py-2"
              >
                Obriši filtere
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Lista rezervoara */}
      {filteredRezervoari.length === 0 ? (
        <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-lg">
          <div className="text-center p-12 relative">
            <div className="absolute inset-0 bg-white/5 z-0"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl opacity-5"></div>
            
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#F08080]/20 to-indigo-500/20 rounded-full flex items-center justify-center mb-4">
              <Container className="w-10 h-10 text-[#F08080]" />
            </div>
            <h3 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#F08080] to-indigo-600">
              {searchTerm || filterOblik || filterVlasnik ? 'Nema rezultata pretrage' : 'Nema rezervoara'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {searchTerm || filterOblik || filterVlasnik
                ? 'Nismo pronašli rezervoare koji odgovaraju vašim filterima. Pokušajte sa drugim kriterijima.'
                : 'Dodajte prvi rezervoar da biste započeli upravljanje rezervoarima za gorivo.'}
            </p>
            {!(searchTerm || filterOblik || filterVlasnik) && (
              <Button 
                onClick={() => setIsFormOpen(true)}
                className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium"
              >
                <Plus size={18} className="mr-2"/>
                Dodaj Prvi Rezervoar
              </Button>
            )}
            {(searchTerm || filterOblik || filterVlasnik) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterOblik('');
                  setFilterVlasnik('');
                }}
                className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200"
              >
                Očisti filtere
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredRezervoari.map((rezervoar) => (
            <motion.div key={rezervoar.id} variants={itemVariants}>
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