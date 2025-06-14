"use client";

import { useEffect, useState } from 'react';
import { FixedStorageTank, FuelType } from '@/types/fuel';
import { Button } from "@/components/ui/Button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from '@/components/ui/Card';
import { getFixedTanks, createFixedTankToFixedTankTransfer } from '@/lib/apiService'; // Assuming createFixedTankToFixedTankTransfer will be created
import { toast } from 'sonner';

interface FixedToFixedTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: () => void;
  availableTanks: FixedStorageTank[]; // Pass available tanks as a prop
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

  const sourceTank = availableTanks.find(tank => tank.id.toString() === sourceTankId);
  const destinationTank = availableTanks.find(tank => tank.id.toString() === destinationTankId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!sourceTankId || !destinationTankId || !quantityLiters) {
      setError('Molimo popunite sva polja.');
      return;
    }

    const quantity = parseFloat(quantityLiters);
    if (isNaN(quantity) || quantity <= 0) {
      setError('Količina mora biti pozitivan broj.');
      return;
    }

    if (sourceTankId === destinationTankId) {
      setError('Izvorni i odredišni tank ne mogu biti isti.');
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
    
    // Optional: Check for fuel type compatibility if needed in the future
    // if (sourceTank && destinationTank && sourceTank.fuel_type !== destinationTank.fuel_type) {
    //   if (!confirm(`Tipovi goriva se razlikuju (${sourceTank.fuel_type} -> ${destinationTank.fuel_type}). Jeste li sigurni da želite nastaviti?`)) {
    //     return;
    //   }
    // }

    setIsLoading(true);
    try {
      await createFixedTankToFixedTankTransfer({
        sourceTankId: parseInt(sourceTankId),
        destinationTankId: parseInt(destinationTankId),
        quantityLiters: quantity,
      });
      toast.success('Pretakanje goriva uspješno izvršeno!');
      onTransferSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Greška prilikom pretakanja goriva.');
      toast.error(err.message || 'Greška prilikom pretakanja goriva.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-[#1A1A1A] to-[#111111]/90 backdrop-blur-md border-0 shadow-2xl text-white">
        <DialogHeader className="pb-4 border-b border-white/20">
          <DialogTitle className="text-xl font-bold text-white">Pretakanje Goriva (Fiksni u Fiksni)</DialogTitle>
          <DialogDescription className="text-white/70">
            Prebacite gorivo iz jednog fiksnog tanka u drugi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="sourceTank" className="text-white/90 font-medium">Izvorni Tank</Label>
            <Select value={sourceTankId} onValueChange={setSourceTankId} required>
              <SelectTrigger id="sourceTank" className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20">
                <SelectValue placeholder="Odaberite izvorni tank" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/20 text-white">
                {availableTanks.map(tank => (
                  <SelectItem key={tank.id} value={tank.id.toString()} disabled={tank.id.toString() === destinationTankId} className="focus:bg-[#E60026]/20 focus:text-white">
                    {tank.tank_name} ({tank.tank_identifier}) - {tank.fuel_type} ({tank.current_quantity_liters.toLocaleString()} L)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationTank" className="text-white/90 font-medium">Odredišni Tank</Label>
            <Select value={destinationTankId} onValueChange={setDestinationTankId} required>
              <SelectTrigger id="destinationTank" className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20">
                <SelectValue placeholder="Odaberite odredišni tank" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/20 text-white">
                {availableTanks.map(tank => (
                  <SelectItem key={tank.id} value={tank.id.toString()} disabled={tank.id.toString() === sourceTankId} className="focus:bg-[#E60026]/20 focus:text-white">
                    {tank.tank_name} ({tank.tank_identifier}) - {tank.fuel_type} (Slobodno: {(tank.capacity_liters - tank.current_quantity_liters).toLocaleString()} L)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={isLoading}
              className="bg-gradient-to-r from-[#E60026] to-[#4D000A] hover:from-[#B3001F] hover:to-[#800014] text-white"
            >
              {isLoading ? 'Pretakanje...' : 'Prebaci Gorivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
