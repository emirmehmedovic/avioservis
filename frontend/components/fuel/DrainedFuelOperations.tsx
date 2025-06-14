import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusIcon, ArrowDownIcon, XMarkIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Define interfaces for our data types
interface FixedTank {
  id: number;
  name: string;
  identifier: string;
  capacity_liters: number;
  current_quantity_liters: number;
  fuel_type: string;
  location_description: string;
  status: string;
}

interface MobileTank {
  id: number;
  name: string;
  identifier: string;
  capacity_liters: number;
  current_liters: number;
  fuel_type: string;
  status: string;
}

interface DrainRecord {
  id: number;
  dateTime: string;
  sourceId: number;
  sourceName: string;
  sourceType: 'fixed' | 'mobile';
  quantityLiters: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number;
  userName: string;
}

interface DrainFormData {
  date: string;
  sourceType: 'fixed' | 'mobile';
  sourceId: number;
  quantity_liters: string;
  notes: string;
}

const DrainedFuelOperations: React.FC = () => {
  // State variables
  const [fixedTanks, setFixedTanks] = useState<FixedTank[]>([]);
  const [mobileTanks, setMobileTanks] = useState<MobileTank[]>([]);
  const [drainRecords, setDrainRecords] = useState<DrainRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<DrainFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    sourceType: 'fixed',
    sourceId: 0,
    quantity_liters: '',
    notes: '',
  });
  const [selectedSource, setSelectedSource] = useState<FixedTank | MobileTank | null>(null);
  const [activeTab, setActiveTab] = useState<'fixed' | 'mobile'>('fixed');

  // Fetch data functions
  const fetchFixedTanks = useCallback(async () => {
    try {
      const data = await fetchWithAuth<FixedTank[]>('/api/fuel/fixed-tanks');
      setFixedTanks(data);
    } catch (error) {
      console.error('Error fetching fixed tanks:', error);
      toast.error('Greška pri dohvaćanju fiksnih tankova');
    }
  }, []);

  const fetchMobileTanks = useCallback(async () => {
    try {
      const data = await fetchWithAuth<MobileTank[]>('/api/fuel/tanks');
      setMobileTanks(data);
    } catch (error) {
      console.error('Error fetching mobile tanks:', error);
      toast.error('Greška pri dohvaćanju mobilnih tankova');
    }
  }, []);

  const fetchDrainRecords = useCallback(async () => {
    try {
      // This endpoint would need to be implemented in the backend
      const data = await fetchWithAuth<DrainRecord[]>('/api/fuel/drain-records');
      setDrainRecords(data);
    } catch (error) {
      console.error('Error fetching drain records:', error);
      toast.error('Greška pri dohvaćanju evidencije istakanja goriva');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchFixedTanks(),
        fetchMobileTanks(),
        fetchDrainRecords()
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchFixedTanks, fetchMobileTanks, fetchDrainRecords]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Update selected source when source type or ID changes
    if (name === 'sourceType') {
      setActiveTab(value as 'fixed' | 'mobile');
      setFormData(prev => ({ ...prev, sourceId: 0 }));
      setSelectedSource(null);
    } else if (name === 'sourceId') {
      const sourceId = parseInt(value);
      const source = formData.sourceType === 'fixed'
        ? fixedTanks.find(tank => tank.id === sourceId)
        : mobileTanks.find(tank => tank.id === sourceId);
      setSelectedSource(source || null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sourceId) {
      toast.error('Molimo odaberite izvor goriva');
      return;
    }
    
    if (!formData.quantity_liters || parseFloat(formData.quantity_liters) <= 0) {
      toast.error('Molimo unesite validnu količinu goriva');
      return;
    }
    
    // Check if there's enough fuel in the source
    const quantityToRemove = parseFloat(formData.quantity_liters);
    
    if (formData.sourceType === 'fixed') {
      const tank = fixedTanks.find(t => t.id === formData.sourceId);
      if (!tank) {
        toast.error('Odabrani rezervoar nije pronađen');
        return;
      }
      
      if (tank.current_quantity_liters < quantityToRemove) {
        toast.error(`Nedovoljno goriva u rezervoaru. Dostupno: ${tank.current_quantity_liters} L`);
        return;
      }
    } else {
      const tank = mobileTanks.find(t => t.id === formData.sourceId);
      if (!tank) {
        toast.error('Odabrana cisterna nije pronađena');
        return;
      }
      
      if (tank.current_liters < quantityToRemove) {
        toast.error(`Nedovoljno goriva u cisterni. Dostupno: ${tank.current_liters} L`);
        return;
      }
    }
    
    try {
      setIsLoading(true);
      
      // Prepare payload for API
      const payload = {
        drain_datetime: new Date(formData.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
        source_type: formData.sourceType,
        source_id: formData.sourceId,
        quantity_liters: formData.quantity_liters,
        notes: formData.notes || null
      };
      
      // This endpoint would need to be implemented in the backend
      await fetchWithAuth('/api/fuel/drain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      toast.success('Istakanje goriva uspješno evidentirano');
      setIsModalOpen(false);
      
      // Refresh data
      await Promise.all([
        fetchFixedTanks(),
        fetchMobileTanks(),
        fetchDrainRecords()
      ]);
      
      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        sourceType: 'fixed',
        sourceId: 0,
        quantity_liters: '',
        notes: '',
      });
      setSelectedSource(null);
      
    } catch (error) {
      console.error('Error submitting drain record:', error);
      toast.error('Greška pri evidentiranju istakanja goriva');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Drenirano gorivo</h2>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Novo istakanje
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Evidencija istakanja goriva</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
            </div>
          ) : drainRecords.length === 0 ? (
            <div className="text-center py-10">
              <ArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Nema podataka</h3>
              <p className="mt-1 text-sm text-gray-500">
                Još nema evidentiranih istakanja goriva.
              </p>
              <div className="mt-6">
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Novo istakanje
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum i vrijeme</TableHead>
                    <TableHead>Izvor</TableHead>
                    <TableHead>Tip izvora</TableHead>
                    <TableHead className="text-right">Količina (L)</TableHead>
                    <TableHead>Napomena</TableHead>
                    <TableHead>Korisnik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drainRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.dateTime), 'dd.MM.yyyy HH:mm')}</TableCell>
                      <TableCell>{record.sourceName}</TableCell>
                      <TableCell>
                        {record.sourceType === 'fixed' ? 'Fiksni rezervoar' : 'Mobilna cisterna'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record.quantityLiters.toLocaleString()}
                      </TableCell>
                      <TableCell>{record.notes || '-'}</TableCell>
                      <TableCell>{record.userName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* New Drain Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo istakanje goriva</DialogTitle>
            <DialogDescription>
              Evidentirajte istakanje goriva iz fiksnog rezervoara ili mobilne cisterne.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tip izvora</Label>
              <Tabs 
                value={activeTab} 
                onValueChange={(value: string) => handleSelectChange('sourceType', value)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fixed">Fiksni rezervoar</TabsTrigger>
                  <TabsTrigger value="mobile">Mobilna cisterna</TabsTrigger>
                </TabsList>
                
                <TabsContent value="fixed" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceId">Odaberite rezervoar</Label>
                    <Select 
                      value={formData.sourceId.toString()} 
                      onValueChange={(value) => handleSelectChange('sourceId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite rezervoar" />
                      </SelectTrigger>
                      <SelectContent>
                        {fixedTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id.toString()}>
                            {tank.name} ({tank.identifier}) - {tank.current_quantity_liters.toLocaleString()} L
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="mobile" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceId">Odaberite cisternu</Label>
                    <Select 
                      value={formData.sourceId.toString()} 
                      onValueChange={(value) => handleSelectChange('sourceId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite cisternu" />
                      </SelectTrigger>
                      <SelectContent>
                        {mobileTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id.toString()}>
                            {tank.name} ({tank.identifier}) - {tank.current_liters.toLocaleString()} L
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {selectedSource && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-medium text-sm text-gray-700">Informacije o izvoru</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Naziv:</span> {selectedSource.name}
                  </div>
                  <div>
                    <span className="text-gray-500">Identifikator:</span> {selectedSource.identifier}
                  </div>
                  <div>
                    <span className="text-gray-500">Tip goriva:</span> {selectedSource.fuel_type}
                  </div>
                  <div>
                    <span className="text-gray-500">Trenutna količina:</span>{' '}
                    {formData.sourceType === 'fixed' 
                      ? (selectedSource as FixedTank).current_quantity_liters.toLocaleString() 
                      : (selectedSource as MobileTank).current_liters.toLocaleString()
                    } L
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="quantity_liters">Količina (L)</Label>
              <Input
                id="quantity_liters"
                name="quantity_liters"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity_liters}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Napomena</Label>
              <Input
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Opcionalno"
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Odustani
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Učitavanje...
                  </>
                ) : (
                  'Evidentiraj istakanje'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DrainedFuelOperations;
