'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// Select imports removed - using native HTML select elements
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Retrofit - Raspodjela Goriva</h2>
                <p className="text-sm text-gray-600">Raspodijelite postojeće MRN zapise u fizičke tankove</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">

        {/* Fuel Type Filter */}
        <div className="mb-8">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-gray-800 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </div>
              <Label className="text-sm font-semibold text-gray-700">Filtriraj po tipu goriva</Label>
            </div>
            <select
              id="fuel_type_filter"
              name="fuel_type_filter"
              value={selectedFuelType}
              onChange={(e) => setSelectedFuelType(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-400"
            >
              <option value="">Odaberite tip goriva</option>
              <option value="all">Svi tipovi</option>
              <option value="Jet A-1">JET A-1</option>
              <option value="Jet A">JET A</option>
              <option value="AVGAS">AVGAS</option>
            </select>
          </div>
        </div>

        {loading && !previewData && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">Učitavanje podataka...</span>
            </div>
          </div>
        )}

        {previewData && (
          <>
            {/* MRN Selection */}
            {previewData.existing_mrn_records.length > 0 && (
              <div className="mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-gray-800 rounded-md flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <Label className="text-sm font-semibold text-gray-700">Odaberite MRN Zapis</Label>
                  </div>
                  <select
                    id="mrn_select"
                    name="mrn_select"
                    value={selectedMrn}
                    onChange={(e) => setSelectedMrn(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-400"
                  >
                    <option value="">Odaberite MRN zapis</option>
                    {previewData.existing_mrn_records.map((mrn) => (
                      <option key={mrn.customs_declaration_number} value={mrn.customs_declaration_number}>
                        {mrn.customs_declaration_number} - {mrn.total_liters}L ({mrn.supplier_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {previewData.existing_mrn_records.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nema dostupnih MRN zapisa</h3>
                <p className="text-gray-600">Trenutno nema MRN zapisa dostupnih za raspodjelu</p>
              </div>
            )}

            {/* Distribution Form */}
            {selectedMrn && selectedMrnData && (
              <div className="space-y-6">
                {/* MRN Info Card */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Informacije o MRN zapisu</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">MRN broj:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedMrnData.customs_declaration_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tip goriva:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedMrnData.fuel_type}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Raspoloživo:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedMrnData.total_liters}L / {selectedMrnData.total_kg}kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Gustoća:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedMrnData.density_at_intake.toFixed(4)} kg/L</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribution Form */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-6 h-6 bg-gray-800 rounded-md flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Raspodjela po tankovima</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {distributions.map((dist, index) => {
                      const tank = previewData.physical_tanks.find(t => t.id === dist.tank_id);
                      if (!tank) return null;

                      return (
                        <div key={dist.tank_id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{tank.tank_name}</h4>
                                <p className="text-xs text-gray-600">Kapacitet: {tank.capacity_liters}L</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Trenutno</p>
                              <p className="font-medium text-gray-900">{tank.current_quantity_liters}L</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">Količina (litri)</Label>
                              <Input
                                type="number"
                                value={dist.quantity_liters || ''}
                                onChange={(e) => handleQuantityChange(dist.tank_id, Number(e.target.value))}
                                placeholder="0"
                                step="0.01"
                                className="w-full bg-white border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">Kilogrami (auto)</Label>
                              <Input
                                type="number"
                                value={dist.quantity_kg.toFixed(3)}
                                disabled
                                className="w-full bg-gray-100 border-gray-200 text-gray-600"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-gray-800 rounded-md flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Sažetak raspodjele</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ukupno distribuirano:</span>
                        <span className="text-sm font-semibold text-gray-900">{getTotalDistributed().toFixed(3)}L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Raspoloživo:</span>
                        <span className="text-sm font-medium text-gray-900">{getMaxAvailable().toFixed(3)}L</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {getTotalDistributed() < getMaxAvailable() && (
                        <div className="flex justify-between">
                          <span className="text-sm text-orange-600">Preostalo:</span>
                          <span className="text-sm font-medium text-orange-600">
                            {(getMaxAvailable() - getTotalDistributed()).toFixed(3)}L
                          </span>
                        </div>
                      )}
                      {getTotalDistributed() > getMaxAvailable() && (
                        <div className="flex justify-between">
                          <span className="text-sm text-red-600">Prekoračenje:</span>
                          <span className="text-sm font-medium text-red-600">
                            {(getTotalDistributed() - getMaxAvailable()).toFixed(3)}L
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Otkaži
          </Button>
          <Button
            onClick={handleExecuteRetrofit}
            disabled={loading || !selectedMrn || getTotalDistributed() === 0}
            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Izvršavanje...</span>
              </div>
            ) : (
              'Sačuvaj Raspodjelu'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RetrofitModal;
