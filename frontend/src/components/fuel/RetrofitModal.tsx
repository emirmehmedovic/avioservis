'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import { physicalTankRetrofitService, RetrofitPreview, PhysicalTank } from '@/services/physicalTankRetrofitService';
import { toast } from 'sonner';

interface RetrofitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TankDistribution {
  tank_id: number;
  quantity_liters: number;
  quantity_kg: number;
}

const RetrofitModal: React.FC<RetrofitModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [selectedFuelType, setSelectedFuelType] = useState<string>('all');
  const [previewData, setPreviewData] = useState<RetrofitPreview | null>(null);
  const [selectedMrn, setSelectedMrn] = useState<string>('');
  const [distributions, setDistributions] = useState<TankDistribution[]>([]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const data = await physicalTankRetrofitService.getRetrofitPreview(
        selectedFuelType === 'all' ? undefined : selectedFuelType
      );
      setPreviewData(data);
      if (data.existing_mrn_records.length > 0) {
        setSelectedMrn(data.existing_mrn_records[0].customs_declaration_number);
        // Initialize distribution for first MRN
        const firstMrn = data.existing_mrn_records[0];
        setDistributions(
          data.physical_tanks
            .filter(t => t.fuel_type === firstMrn.fuel_type)
            .map(t => ({
              tank_id: t.id,
              quantity_liters: 0,
              quantity_kg: 0
            }))
        );
      }
    } catch (error) {
      console.error('Error fetching retrofit preview:', error);
      toast.error('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, selectedFuelType]);

  useEffect(() => {
    if (selectedMrn && previewData) {
      const mrn = previewData.existing_mrn_records.find(m => m.customs_declaration_number === selectedMrn);
      if (mrn) {
        setDistributions(
          previewData.physical_tanks
            .filter(t => t.fuel_type === mrn.fuel_type)
            .map(t => ({
              tank_id: t.id,
              quantity_liters: 0,
              quantity_kg: 0
            }))
        );
      }
    }
  }, [selectedMrn, previewData]);

  const handleQuantityChange = (tankId: number, liters: number) => {
    const mrn = previewData?.existing_mrn_records.find(m => m.customs_declaration_number === selectedMrn);
    if (!mrn) return;

    const density = mrn.density_at_intake;
    const kg = liters * density;

    setDistributions(prev =>
      prev.map(d =>
        d.tank_id === tankId ? { ...d, quantity_liters: liters, quantity_kg: kg } : d
      )
    );
  };

  const getTotalDistributed = () => {
    return distributions.reduce((sum, d) => sum + d.quantity_liters, 0);
  };

  const getMaxAvailable = () => {
    const mrn = previewData?.existing_mrn_records.find(m => m.customs_declaration_number === selectedMrn);
    return mrn ? mrn.total_liters : 0;
  };

  const handleExecuteRetrofit = async () => {
    if (!selectedMrn) {
      toast.error('Odaberite MRN zapis');
      return;
    }

    const mrn = previewData?.existing_mrn_records.find(m => m.customs_declaration_number === selectedMrn);
    if (!mrn) return;

    const activeDistributions = distributions.filter(d => d.quantity_liters > 0);
    
    if (activeDistributions.length === 0) {
      toast.error('Raspodijelite gorivo u barem jedan tank');
      return;
    }

    const totalDistributed = getTotalDistributed();
    const maxAvailable = getMaxAvailable();

    if (totalDistributed > maxAvailable) {
      toast.error(`Ukupna distribucija (${totalDistributed}L) premašuje raspoloživu količinu (${maxAvailable}L)`);
      return;
    }

    try {
      setLoading(true);
      await physicalTankRetrofitService.executeRetrofit({
        customs_declaration_number: selectedMrn,
        fuel_type: mrn.fuel_type,
        distribution: activeDistributions
      });
      
      toast.success('Retrofit uspješno izvršen');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error executing retrofit:', error);
      toast.error('Greška pri izvršavanju retrofit operacije');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMrnData = previewData?.existing_mrn_records.find(m => m.customs_declaration_number === selectedMrn);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Retrofit - Raspodjela Goriva</h2>

        {/* Fuel Type Filter */}
        <div className="mb-4">
          <Label>Tip Goriva</Label>
          <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
            <SelectItem value="" disabled>Odaberite tip goriva</SelectItem>
            <SelectItem value="all">Svi tipovi</SelectItem>
            <SelectItem value="Jet A-1">JET A-1</SelectItem>
            <SelectItem value="Jet A">JET A</SelectItem>
            <SelectItem value="AVGAS">AVGAS</SelectItem>
          </Select>
        </div>

        {loading && !previewData && (
          <div className="text-center py-8">Učitavanje...</div>
        )}

        {previewData && (
          <>
            {/* MRN Selection */}
            {previewData.existing_mrn_records.length > 0 && (
              <div className="mb-4">
                <Label>Odaberite MRN Zapis</Label>
                <Select value={selectedMrn} onValueChange={setSelectedMrn}>
                  <SelectItem value="" disabled>Odaberite MRN zapis</SelectItem>
                  {previewData.existing_mrn_records.map((mrn) => (
                    <SelectItem key={mrn.customs_declaration_number} value={mrn.customs_declaration_number}>
                      {mrn.customs_declaration_number} - {mrn.total_liters}L ({mrn.supplier_name})
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}

            {previewData.existing_mrn_records.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nema dostupnih MRN zapisa za raspodjelu
              </div>
            )}

            {/* Distribution Form */}
            {selectedMrn && selectedMrnData && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="font-semibold">Informacije o MRN zapisu:</p>
                  <p>MRN: {selectedMrnData.customs_declaration_number}</p>
                  <p>Tip goriva: {selectedMrnData.fuel_type}</p>
                  <p>Raspoloživo: {selectedMrnData.total_liters}L / {selectedMrnData.total_kg}kg</p>
                  <p>Gustoća: {selectedMrnData.density_at_intake.toFixed(4)} kg/L</p>
                </div>

                <div className="space-y-2">
                  {distributions.map((dist, index) => {
                    const tank = previewData.physical_tanks.find(t => t.id === dist.tank_id);
                    if (!tank) return null;

                    return (
                      <div key={dist.tank_id} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Label>{tank.tank_name}</Label>
                          <Input
                            type="number"
                            value={dist.quantity_liters || ''}
                            onChange={(e) => handleQuantityChange(dist.tank_id, Number(e.target.value))}
                            placeholder="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex-1">
                          <Label>Kilogrami (auto)</Label>
                          <Input
                            type="number"
                            value={dist.quantity_kg.toFixed(3)}
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold">Ukupno distribuirano: {getTotalDistributed().toFixed(3)}L</p>
                  {getTotalDistributed() < getMaxAvailable() && (
                    <p className="text-orange-600">
                      Preostalo za raspodjelu: {(getMaxAvailable() - getTotalDistributed()).toFixed(3)}L
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Otkaži
          </Button>
          <Button
            onClick={handleExecuteRetrofit}
            disabled={loading || !selectedMrn || getTotalDistributed() === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Izvršavanje...' : 'Sačuvaj Raspodjelu'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RetrofitModal;
