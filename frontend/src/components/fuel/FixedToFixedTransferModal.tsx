"use client";

import { useEffect, useState } from 'react';
import { FixedStorageTank, FuelType } from '@/types/fuel';
import { Button } from "@/components/ui/Button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
// Select imports removed - using native HTML select elements
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { getFixedTanks, createFixedTankToFixedTankTransfer, createMrnTransfer, getFixedTankCustomsBreakdown } from '@/lib/apiService';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';
import { 
  Fuel, 
  ArrowRight, 
  FileText, 
  Calendar,
  Scale,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface FixedToFixedTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: () => void;
  availableTanks: FixedStorageTank[];
}

interface MrnRecord {
  id: number;
  customs_declaration_number: string;
  remaining_quantity_liters: number;
  remaining_quantity_kg: number;
  date_added: string;
  supplier_name?: string | null;
  specific_gravity?: number | null;
}

export default function FixedToFixedTransferModal({
  isOpen,
  onClose,
  onTransferSuccess,
  availableTanks,
}: FixedToFixedTransferModalProps) {
  const [sourceTankId, setSourceTankId] = useState<string>('');
  const [destinationTankId, setDestinationTankId] = useState<string>('');
  const [quantityLiters, setQuantityLiters] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState<'quantity' | 'mrn'>('quantity');
  const [selectedMrnId, setSelectedMrnId] = useState<number | null>(null);
  const [mrnRecords, setMrnRecords] = useState<MrnRecord[]>([]);
  const [loadingMrnData, setLoadingMrnData] = useState(false);

  const sourceTank = availableTanks.find(tank => tank.id.toString() === sourceTankId);
  const destinationTank = availableTanks.find(tank => tank.id.toString() === destinationTankId);

  // Dohvati MRN podatke kada se odabere izvorni tank
  useEffect(() => {
    if (sourceTankId && transferMode === 'mrn') {
      fetchMrnData();
    } else {
      setMrnRecords([]);
      setSelectedMrnId(null);
    }
  }, [sourceTankId, transferMode]);

  const fetchMrnData = async () => {
    if (!sourceTankId) return;
    
    setLoadingMrnData(true);
    try {
      const response = await getFixedTankCustomsBreakdown(parseInt(sourceTankId));
      
      if (response && typeof response === 'object' && 'customs_breakdown' in response) {
        const breakdown = response.customs_breakdown || [];
        setMrnRecords(breakdown.map((item: any) => ({
          id: item.id,
          customs_declaration_number: item.customs_declaration_number,
          remaining_quantity_liters: item.remaining_quantity_liters,
          remaining_quantity_kg: item.remaining_quantity_kg || 0,
          date_added: item.date_added,
          supplier_name: item.supplier_name,
          specific_gravity: item.specific_gravity
        })));
      } else {
        setMrnRecords([]);
      }
    } catch (error) {
      console.error('Greška pri dohvaćanju MRN podataka:', error);
      toast.error('Greška pri dohvaćanju MRN podataka');
      setMrnRecords([]);
    } finally {
      setLoadingMrnData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!sourceTankId || !destinationTankId) {
      setError('Molimo odaberite izvorni i odredišni tank.');
      return;
    }

    if (sourceTankId === destinationTankId) {
      setError('Izvorni i odredišni tank ne mogu biti isti.');
      return;
    }

    if (transferMode === 'quantity') {
      // Transfer po količini
      if (!quantityLiters) {
        setError('Molimo unesite količinu.');
        return;
      }

      const quantity = parseFloat(quantityLiters);
      if (isNaN(quantity) || quantity <= 0) {
        setError('Količina mora biti pozitivan broj.');
      return;
    }

    if (sourceTank && quantity > sourceTank.current_quantity_liters) {
      setError(`Nedovoljno goriva u izvornom tanku. Dostupno: ${sourceTank.current_quantity_liters.toLocaleString()} L`);
      return;
    }

    if (destinationTank && quantity > (destinationTank.capacity_liters - destinationTank.current_quantity_liters)) {
      setError(`Nema dovoljno kapaciteta u odredišnom tanku. Slobodno: ${(destinationTank.capacity_liters - destinationTank.current_quantity_liters).toLocaleString()} L`);
      return;
    }
    } else {
      // Transfer po MRN-u
      if (!selectedMrnId) {
        setError('Molimo odaberite MRN zapis za transfer.');
        return;
      }

      const selectedMrn = mrnRecords.find(mrn => mrn.id === selectedMrnId);
      if (!selectedMrn) {
        setError('Odabrani MRN zapis nije pronađen.');
        return;
      }

      if (destinationTank && selectedMrn.remaining_quantity_liters > (destinationTank.capacity_liters - destinationTank.current_quantity_liters)) {
        setError(`Nema dovoljno kapaciteta u odredišnom tanku. Potrebno: ${selectedMrn.remaining_quantity_liters.toLocaleString()} L, Slobodno: ${(destinationTank.capacity_liters - destinationTank.current_quantity_liters).toLocaleString()} L`);
        return;
      }
    }

    setIsLoading(true);
    try {
      if (transferMode === 'quantity') {
        // Postojeći transfer po količini
      await createFixedTankToFixedTankTransfer({
        sourceTankId: parseInt(sourceTankId),
        destinationTankId: parseInt(destinationTankId),
          quantityLiters: parseFloat(quantityLiters),
      });
        toast.success('Transfer goriva uspješno izvršen!');
      } else {
        // Novi transfer po MRN-u
        const selectedMrn = mrnRecords.find(mrn => mrn.id === selectedMrnId);
        if (!selectedMrn) throw new Error('Odabrani MRN zapis nije pronađen.');

        await createMrnTransfer({
          sourceTankId: parseInt(sourceTankId),
          destinationTankId: parseInt(destinationTankId),
          mrnId: selectedMrnId!,
          notes: `Transfer MRN-a ${selectedMrn.customs_declaration_number}`
        });
        
        toast.success(`Transfer MRN-a ${selectedMrn.customs_declaration_number} uspješno izvršen!`);
      }
      
      onTransferSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Greška prilikom transfera goriva.');
      toast.error(err.message || 'Greška prilikom transfera goriva.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bs-BA');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gradient-to-br from-[#1A1A1A] to-[#111111]/90 backdrop-blur-md border-0 shadow-2xl text-white">
        <DialogHeader className="pb-4 border-b border-white/20">
          <DialogTitle className="text-xl font-bold text-white">Transfer Goriva (Fiksni u Fiksni)</DialogTitle>
          <DialogDescription className="text-white/70">
            Prebacite gorivo iz jednog fiksnog tanka u drugi po količini ili po MRN zapisu.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <Tabs value={transferMode} onValueChange={(value) => setTransferMode(value as 'quantity' | 'mrn')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="quantity" className="data-[state=active]:bg-[#E60026] data-[state=active]:text-white">
                <Scale className="w-4 h-4 mr-2" />
                Transfer po količini
              </TabsTrigger>
              <TabsTrigger value="mrn" className="data-[state=active]:bg-[#E60026] data-[state=active]:text-white">
                <FileText className="w-4 h-4 mr-2" />
                Transfer po MRN-u
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quantity" className="space-y-4">
              {/* Transfer po količini */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sourceTank" className="text-white/90 font-medium">Izvorni Tank</Label>
            <select
              id="sourceTank"
              name="sourceTank"
              value={sourceTankId}
              onChange={(e) => setSourceTankId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Odaberite izvorni tank</option>
              {availableTanks.map(tank => (
                <option key={tank.id} value={tank.id.toString()} disabled={tank.id.toString() === destinationTankId}>
                  {tank.tank_name} ({tank.tank_identifier}) - {tank.fuel_type} ({tank.current_quantity_liters.toLocaleString()} L)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationTank" className="text-white/90 font-medium">Odredišni Tank</Label>
            <select
              id="destinationTank"
              name="destinationTank"
              value={destinationTankId}
              onChange={(e) => setDestinationTankId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Odaberite odredišni tank</option>
              {availableTanks.map(tank => (
                <option key={tank.id} value={tank.id.toString()} disabled={tank.id.toString() === sourceTankId}>
                  {tank.tank_name} ({tank.tank_identifier}) - {tank.fuel_type} (Slobodno: {(tank.capacity_liters - tank.current_quantity_liters).toLocaleString()} L)
                </option>
              ))}
            </select>
                </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityLiters" className="text-white/90 font-medium">Količina (L)</Label>
            <Input
              id="quantityLiters"
              type="number"
              value={quantityLiters}
              onChange={(e) => setQuantityLiters(e.target.value)}
              placeholder="Unesite količinu u litrama"
              required
              min="1"
              className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20"
            />
          </div>
            </TabsContent>

            <TabsContent value="mrn" className="space-y-4">
              {/* Transfer po MRN-u */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceTankMrn" className="text-white/90 font-medium">Izvorni Tank</Label>
                  <select
                    id="sourceTankMrn"
                    name="sourceTankMrn"
                    value={sourceTankId}
                    onChange={(e) => setSourceTankId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Odaberite izvorni tank</option>
                    {availableTanks.map(tank => (
                      <option key={tank.id} value={tank.id.toString()} disabled={tank.id.toString() === destinationTankId}>
                        {tank.tank_name} ({tank.tank_identifier}) - {tank.fuel_type} ({tank.current_quantity_liters.toLocaleString()} L)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destinationTankMrn" className="text-white/90 font-medium">Odredišni Tank</Label>
                  <select
                    id="destinationTankMrn"
                    name="destinationTankMrn"
                    value={destinationTankId}
                    onChange={(e) => setDestinationTankId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Odaberite odredišni tank</option>
                    {availableTanks.map(tank => (
                      <option key={tank.id} value={tank.id.toString()} disabled={tank.id.toString() === sourceTankId}>
                        {tank.tank_name} ({tank.tank_identifier}) - {tank.fuel_type} (Slobodno: {(tank.capacity_liters - tank.current_quantity_liters).toLocaleString()} L)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MRN Records Display */}
              {sourceTankId && (
                <Card className="bg-gray-900/80 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white text-lg font-bold bg-gray-800/50 px-3 py-2 rounded-lg">MRN Zapisi u izvornom tanku</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingMrnData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60026]"></div>
                        <span className="ml-3 text-white/70">Učitavanje MRN podataka...</span>
                      </div>
                    ) : mrnRecords.length > 0 ? (
                      <div className="space-y-3">
                        {mrnRecords.map((mrn) => (
                          <div
                            key={mrn.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedMrnId === mrn.id
                                ? 'border-[#E60026] bg-[#E60026]/20'
                                : 'border-white/20 bg-gray-800/50 hover:bg-gray-700/50'
                            }`}
                            onClick={() => setSelectedMrnId(mrn.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {selectedMrnId === mrn.id ? (
                                  <CheckCircle className="w-5 h-5 text-[#E60026]" />
                                ) : (
                                  <FileText className="w-5 h-5 text-white/50" />
                                )}
                                <div>
                                  <div className="font-medium text-white">
                                    MRN: {mrn.customs_declaration_number}
                                  </div>
                                  <div className="text-sm text-white/70">
                                    {formatDate(mrn.date_added)}
                                    {mrn.supplier_name && ` • ${mrn.supplier_name}`}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-white">
                                  {formatNumber(mrn.remaining_quantity_liters)} L
                                </div>
                                <div className="text-sm text-white/70">
                                  {formatNumber(mrn.remaining_quantity_kg)} kg
                                </div>
                                {mrn.specific_gravity && (
                                  <div className="text-xs text-white/50">
                                    ρ: {mrn.specific_gravity.toFixed(4)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-white/50">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nema MRN zapisa u ovom tanku</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-white/20 mt-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className="border-[#E60026]/50 bg-[#E60026]/10 text-[#E60026] hover:bg-[#E60026]/20 hover:border-[#E60026]/70"
            >
              Odustani
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (transferMode === 'mrn' && !selectedMrnId)}
              className="bg-gradient-to-r from-[#E60026] to-[#4D000A] hover:from-[#B3001F] hover:to-[#800014] text-white"
            >
              {isLoading ? 'Transfer u tijeku...' : `Prebaci ${transferMode === 'mrn' ? 'MRN' : 'Gorivo'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
