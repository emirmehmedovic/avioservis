'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, RefreshCw, Database, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { physicalTankService, PhysicalTank, CreateTankData } from '@/services/physicalTankService';
import { physicalCisternService, PhysicalCistern, CreateCisternData } from '@/services/physicalCisternService';
import { physicalTankTransferService, PhysicalTankTransfer, CreateTransferRequest } from '@/services/physicalTankTransferService';
import { physicalSubCisternService, SubCistern, CreateSubCisternDto } from '@/services/physicalSubCisternService';
import RetrofitModal from './RetrofitModal';

const PhysicalTanksDisplay = () => {
  const [tanks, setTanks] = useState<PhysicalTank[]>([]);
  const [cisterns, setCisterns] = useState<PhysicalCistern[]>([]);
  const [transfers, setTransfers] = useState<PhysicalTankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateCisternModal, setShowCreateCisternModal] = useState(false);
  const [showEditCisternModal, setShowEditCisternModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRetrofitModal, setShowRetrofitModal] = useState(false);
  const [showSubCisternConfigModal, setShowSubCisternConfigModal] = useState(false);
  const [showTankHistoryModal, setShowTankHistoryModal] = useState(false);
  const [showSubCisternTransferModal, setShowSubCisternTransferModal] = useState(false);
  const [selectedSubCisternForTransfer, setSelectedSubCisternForTransfer] = useState<SubCistern | null>(null);
  const [subCisternTransferForm, setSubCisternTransferForm] = useState({
    to_sub_cistern_id: '',
    quantity_liters: '',
    quantity_kg: 0
  });
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [selectedSubCisternForReconciliation, setSelectedSubCisternForReconciliation] = useState<SubCistern | null>(null);
  const [reconciliationForm, setReconciliationForm] = useState({
    quantity_liters: '',
    density: '',
    quantity_kg: 0
  });
  const [showTankReconciliationModal, setShowTankReconciliationModal] = useState(false);
  const [selectedTankForReconciliation, setSelectedTankForReconciliation] = useState<PhysicalTank | null>(null);
  const [tankReconciliationForm, setTankReconciliationForm] = useState({
    quantity_liters: '',
    density: '',
    quantity_kg: 0
  });
  const [selectedTankForHistory, setSelectedTankForHistory] = useState<PhysicalTank | null>(null);
  const [tankMrnHistory, setTankMrnHistory] = useState<any[]>([]);
  const [tankTransferHistory, setTankTransferHistory] = useState<any[]>([]);
  const [historyActiveTab, setHistoryActiveTab] = useState<'entries' | 'exits'>('entries');
  const [editingTank, setEditingTank] = useState<PhysicalTank | null>(null);
  const [editingCistern, setEditingCistern] = useState<PhysicalCistern | null>(null);
  const [selectedCisternForConfig, setSelectedCisternForConfig] = useState<PhysicalCistern | null>(null);
  const [subCisterns, setSubCisterns] = useState<SubCistern[]>([]);
  const [newSubCisterns, setNewSubCisterns] = useState<CreateSubCisternDto[]>([]);
  const [activeTab, setActiveTab] = useState<'tanks' | 'cisterns' | 'transfers'>('tanks');
  const [createForm, setCreateForm] = useState<CreateTankData>({
    tank_name: '',
    tank_identifier: '',
    capacity_liters: 0,
    fuel_type: 'Jet A-1',
    location_description: ''
  });
  const [createCisternForm, setCreateCisternForm] = useState<CreateCisternData>({
    cistern_identifier: '',
    capacity_liters: 0,
    fuel_type: 'Jet A-1',
    is_active: true
  });
  const [transferForm, setTransferForm] = useState<CreateTransferRequest>({
    from_tank_id: 0,
    to_cistern_id: 0,
    to_sub_cistern_id: null,
    quantity_liters: 0,
    quantity_kg: 0,
    transfer_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [selectedCisternForTransfer, setSelectedCisternForTransfer] = useState<PhysicalCistern | null>(null);
  const [availableSubCisternsForTransfer, setAvailableSubCisternsForTransfer] = useState<SubCistern[]>([]);
  const [selectedSubCisternId, setSelectedSubCisternId] = useState<number | null>(null);

  const fuelTypes = [
    { value: 'Jet A-1', label: 'JET A-1' },
    { value: 'Jet A', label: 'JET A' },
    { value: 'AVGAS', label: 'AVGAS' }
  ];

  const fetchTanks = async () => {
    try {
      setLoading(true);
      const [tanksData, cisternsData, transfersData, allSubCisternsData] = await Promise.all([
        physicalTankService.getAllTanks(),
        physicalCisternService.getAllCisterns(),
        physicalTankTransferService.getTransfers(),
        physicalSubCisternService.getAllSubCisterns()
      ]);
      setTanks(tanksData);
      setCisterns(cisternsData);
      setTransfers(transfersData);
      setSubCisterns(allSubCisternsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  const createTank = async (tankData: CreateTankData) => {
    try {
      await physicalTankService.createTank(tankData);
      toast.success('Tank uspješno kreiran');
      setShowCreateModal(false);
      setCreateForm({
        tank_name: '',
        tank_identifier: '',
        capacity_liters: 0,
        fuel_type: 'Jet A-1',
        location_description: ''
      });
      fetchTanks();
    } catch (error) {
      console.error('Error creating tank:', error);
      toast.error('Greška pri kreiranju tanka');
    }
  };

  const updateTank = async (id: number, tankData: Partial<CreateTankData>) => {
    try {
      await physicalTankService.updateTank(id, tankData);
      toast.success('Tank uspješno ažuriran');
      setShowEditModal(false);
      setEditingTank(null);
      fetchTanks();
    } catch (error) {
      console.error('Error updating tank:', error);
      toast.error('Greška pri ažuriranju tanka');
    }
  };

  const deleteTank = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj tank?')) {
      return;
    }

    try {
      await physicalTankService.deleteTank(id);
      toast.success('Tank uspješno obrisan');
      fetchTanks();
    } catch (error) {
      console.error('Error deleting tank:', error);
      toast.error('Greška pri brisanju tanka');
    }
  };

  // Cistern functions
  const createCistern = async (cisternData: CreateCisternData) => {
    try {
      await physicalCisternService.createCistern(cisternData);
      toast.success('Cisterna uspješno kreirana');
      setShowCreateCisternModal(false);
      setCreateCisternForm({
        cistern_identifier: '',
        capacity_liters: 0,
        fuel_type: 'Jet A-1',
        is_active: true
      });
      fetchTanks();
    } catch (error) {
      console.error('Error creating cistern:', error);
      toast.error('Greška pri kreiranju cisterne');
    }
  };

  const updateCistern = async (id: number, cisternData: Partial<CreateCisternData>) => {
    try {
      await physicalCisternService.updateCistern(id, cisternData);
      toast.success('Cisterna uspješno ažurirana');
      setShowEditCisternModal(false);
      setEditingCistern(null);
      fetchTanks();
    } catch (error) {
      console.error('Error updating cistern:', error);
      toast.error('Greška pri ažuriranju cisterne');
    }
  };

  const deleteCistern = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu cisternu?')) {
      return;
    }

    try {
      await physicalCisternService.deleteCistern(id);
      toast.success('Cisterna uspješno obrisana');
      fetchTanks();
    } catch (error) {
      console.error('Error deleting cistern:', error);
      toast.error('Greška pri brisanju cisterne');
    }
  };

  const createTransfer = async (transferData: CreateTransferRequest) => {
    try {
      await physicalTankTransferService.createTransfer(transferData);
      toast.success('Transfer uspješno kreiran');
      setShowTransferModal(false);
      setTransferForm({
        from_tank_id: 0,
        to_cistern_id: 0,
        to_sub_cistern_id: null,
        quantity_liters: 0,
        quantity_kg: 0,
        transfer_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setSelectedCisternForTransfer(null);
      setAvailableSubCisternsForTransfer([]);
      setSelectedSubCisternId(null);
      fetchTanks();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('Greška pri kreiranju transfera');
    }
  };

  // Open tank history modal
  const openTankHistory = async (tankId: number) => {
    try {
      const tank = tanks.find(t => t.id === tankId);
      if (!tank) return;

      setSelectedTankForHistory(tank);
      
      // Učitaj i MRN zapise i transfer zapise
      const [history, transfers] = await Promise.all([
        physicalTankService.getTankMrnBreakdown(tankId),
        physicalTankService.getTankTransferHistory(tankId)
      ]);
      
      setTankMrnHistory(history.mrn_records);
      setTankTransferHistory(transfers);
      setShowTankHistoryModal(true);
    } catch (error) {
      console.error('Error fetching tank history:', error);
      toast.error('Greška pri učitavanju historije tanka');
    }
  };

  const deleteTransfer = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj transfer? Ovo će vratiti gorivo nazad u tank.')) {
      return;
    }

    try {
      await physicalTankTransferService.deleteTransfer(id);
      toast.success('Transfer uspješno obrisan');
      fetchTanks();
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast.error('Greška pri brisanju transfera');
    }
  };

  // Sub-Cistern functions
  const fetchSubCisterns = async (cisternId: number) => {
    try {
      const data = await physicalSubCisternService.getSubCisterns(cisternId);
      setSubCisterns(data);
    } catch (error) {
      console.error('Error fetching sub-cisterns:', error);
      toast.error('Greška pri učitavanju sub-cisterni');
    }
  };

  const openSubCisternConfig = async (cistern: PhysicalCistern) => {
    setSelectedCisternForConfig(cistern);
    setShowSubCisternConfigModal(true);
    
    // Fetch existing sub-cisterns
    try {
      await fetchSubCisterns(cistern.id);
    } catch (error) {
      console.error('Error loading sub-cisterns:', error);
    }
  };

  const openReconciliationModal = (subCistern: SubCistern) => {
    setSelectedSubCisternForReconciliation(subCistern);
    const currentDensity = subCistern.current_quantity_liters > 0 
      ? subCistern.current_quantity_kg / subCistern.current_quantity_liters 
      : 0.8; // Default density
    
    setReconciliationForm({
      quantity_liters: subCistern.current_quantity_liters.toString(),
      density: currentDensity.toFixed(3),
      quantity_kg: subCistern.current_quantity_kg
    });
    setShowReconciliationModal(true);
  };

  const handleReconciliation = async () => {
    if (!selectedSubCisternForReconciliation) return;

    const liters = parseFloat(reconciliationForm.quantity_liters);
    const density = parseFloat(reconciliationForm.density);

    if (isNaN(liters) || isNaN(density) || liters < 0 || density <= 0) {
      toast.error('Unesite validne vrednosti');
      return;
    }

    if (liters > selectedSubCisternForReconciliation.capacity_liters) {
      toast.error('Količina ne može biti veća od kapaciteta sub-cisterne');
      return;
    }

    try {
      await physicalSubCisternService.manualUpdate(selectedSubCisternForReconciliation.id, {
        current_quantity_liters: liters,
        current_quantity_kg: liters * density,
        notes: `Rekonsilijacija - Gustoća: ${density.toFixed(3)} kg/L`
      });

      toast.success('Rekonsilijacija uspješno izvršena');
      setShowReconciliationModal(false);
      setSelectedSubCisternForReconciliation(null);
      setReconciliationForm({ quantity_liters: '', density: '', quantity_kg: 0 });
      
      // Refresh data without loading state
      try {
        const [tanksData, cisternsData, transfersData, allSubCisternsData] = await Promise.all([
          physicalTankService.getAllTanks(),
          physicalCisternService.getAllCisterns(),
          physicalTankTransferService.getTransfers(),
          physicalSubCisternService.getAllSubCisterns()
        ]);
        setTanks(tanksData);
        setCisterns(cisternsData);
        setTransfers(transfersData);
        setSubCisterns(allSubCisternsData);
      } catch (refreshError) {
        console.error('Error refreshing data after reconciliation:', refreshError);
        // Don't show error to user as the main operation succeeded
      }
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast.error(error?.message || 'Greška pri rekonsilijaciji');
    }
  };

  const openTankReconciliationModal = (tank: PhysicalTank) => {
    setSelectedTankForReconciliation(tank);
    const currentDensity = tank.current_quantity_liters > 0 
      ? tank.current_quantity_kg / tank.current_quantity_liters 
      : 0.8; // Default density
    
    setTankReconciliationForm({
      quantity_liters: tank.current_quantity_liters.toString(),
      density: currentDensity.toFixed(3),
      quantity_kg: tank.current_quantity_kg
    });
    setShowTankReconciliationModal(true);
  };

  const handleTankReconciliation = async () => {
    if (!selectedTankForReconciliation) return;

    const liters = parseFloat(tankReconciliationForm.quantity_liters);
    const density = parseFloat(tankReconciliationForm.density);

    if (isNaN(liters) || isNaN(density) || liters < 0 || density <= 0) {
      toast.error('Unesite validne vrednosti');
      return;
    }

    if (liters > selectedTankForReconciliation.capacity_liters) {
      toast.error('Količina ne može biti veća od kapaciteta tanka');
      return;
    }

    try {
      await physicalTankService.manualUpdateTank(selectedTankForReconciliation.id, {
        measured_liters: liters,
        measured_kg: liters * density,
        notes: `Rekonsilijacija - Gustoća: ${density.toFixed(3)} kg/L`
      });

      // Update the tank in state immediately
      setTanks(prevTanks => 
        prevTanks.map(tank => 
          tank.id === selectedTankForReconciliation.id 
            ? {
                ...tank,
                current_quantity_liters: liters,
                current_quantity_kg: liters * density,
                average_density: density
              }
            : tank
        )
      );

      toast.success('Rekonsilijacija tanka uspješno izvršena');
      setShowTankReconciliationModal(false);
      setSelectedTankForReconciliation(null);
      setTankReconciliationForm({ quantity_liters: '', density: '', quantity_kg: 0 });
      
      // Also refresh all data in background
      try {
        const [tanksData, cisternsData, transfersData, allSubCisternsData] = await Promise.all([
          physicalTankService.getAllTanks(),
          physicalCisternService.getAllCisterns(),
          physicalTankTransferService.getTransfers(),
          physicalSubCisternService.getAllSubCisterns()
        ]);
        
        // Debug: Check if average_density is updated
        const updatedTank = tanksData.find(t => t.id === selectedTankForReconciliation.id);
        console.log('Updated tank from API:', {
          id: updatedTank?.id,
          current_quantity_liters: updatedTank?.current_quantity_liters,
          current_quantity_kg: updatedTank?.current_quantity_kg,
          average_density: updatedTank?.average_density
        });
        
        setTanks(tanksData);
        setCisterns(cisternsData);
        setTransfers(transfersData);
        setSubCisterns(allSubCisternsData);
      } catch (refreshError) {
        console.error('Error refreshing data after reconciliation:', refreshError);
        // Don't show error to user as the main operation succeeded
      }
    } catch (error: any) {
      console.error('Tank reconciliation error:', error);
      toast.error(error?.message || 'Greška pri rekonsilijaciji tanka');
    }
  };

  const handleCreateSubCisterns = async () => {
    if (!selectedCisternForConfig) return;

    if (newSubCisterns.length === 0) {
      toast.error('Dodajte barem jednu sub-cisternu');
      return;
    }

    const totalCapacity = newSubCisterns.reduce((sum, sc) => sum + sc.capacity_liters, 0);
    if (totalCapacity > selectedCisternForConfig.capacity_liters) {
      toast.error(`Ukupan kapacitet sub-cisterni (${totalCapacity}L) premašuje kapacitet parent cisterne (${selectedCisternForConfig.capacity_liters}L)`);
      return;
    }

    try {
      await physicalSubCisternService.createSubCisterns(
        selectedCisternForConfig.id,
        newSubCisterns
      );
      toast.success('Sub-cisterne uspješno kreirane');
      setShowSubCisternConfigModal(false);
      setSelectedCisternForConfig(null);
      setNewSubCisterns([]);
      await fetchSubCisterns(selectedCisternForConfig.id);
      fetchTanks();
    } catch (error: any) {
      console.error('Error creating sub-cisterns:', error);
      toast.error(error.message || 'Greška pri kreiranju sub-cisterni');
    }
  };

  const addSubCisternRow = () => {
    setNewSubCisterns([
      ...newSubCisterns,
      {
        parent_cistern_id: selectedCisternForConfig?.id || 0,
        sub_cistern_name: `Cisterna ${newSubCisterns.length + 1}`,
        capacity_liters: 0
      }
    ]);
  };

  const removeSubCisternRow = (index: number) => {
    setNewSubCisterns(newSubCisterns.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchTanks();
  }, []);

  // Auto-select cumulative cistern when transfer modal opens
  useEffect(() => {
    if (showTransferModal && cisterns.length > 0) {
      const cumulativeCistern = cisterns.find(c => c.is_cumulative);
      if (cumulativeCistern) {
        setSelectedCisternForTransfer(cumulativeCistern);
        setTransferForm(prev => ({
          ...prev,
          to_cistern_id: cumulativeCistern.id,
          to_sub_cistern_id: null
        }));
        
        // Load sub-cisterns
        const subCisternsForCistern = subCisterns.filter(sc => sc.parent_cistern_id === cumulativeCistern.id);
        setAvailableSubCisternsForTransfer(subCisternsForCistern);
      }
    }
  }, [showTransferModal, cisterns, subCisterns]);

  const getFuelTypeLabel = (fuelType: string) => {
    return fuelTypes.find(ft => ft.value === fuelType)?.label || fuelType;
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 text-blue-600 bg-blue-100 rounded p-1" />
          <div>
            <h1 className="text-3xl font-bold">Fizički Tankovi & Cisterne</h1>
            <p className="text-gray-600">Upravljanje fizičkim tankovima, cisternama i njihovim stanjem</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'tanks' ? (
            <>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Tank
              </Button>
              <Button onClick={() => setShowRetrofitModal(true)} className="bg-orange-600 hover:bg-orange-700">
                <Database className="h-4 w-4 mr-2" />
                Retrofit
              </Button>
            </>
          ) : activeTab === 'cisterns' ? (
            <Button onClick={() => setShowCreateCisternModal(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Cisternu
            </Button>
          ) : (
            <Button onClick={() => setShowTransferModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Novi Transfer
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('tanks')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tanks'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tankovi ({tanks.length})
        </button>
        <button
          onClick={() => setActiveTab('cisterns')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'cisterns'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cisterne ({cisterns.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'transfers'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Transfers ({transfers.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'tanks' ? (
          tanks.map((tank) => {
            const capacityPercent = getCapacityPercentage(tank.current_quantity_liters, tank.capacity_liters);
            
            // Determine tank readiness status
            let isReady = false;
            let readinessStatus = 'N/A';
            if (tank.last_fuel_intake_date) {
              const lastIntakeDate = new Date(tank.last_fuel_intake_date);
              const now = new Date();
              const hoursSinceIntake = (now.getTime() - lastIntakeDate.getTime()) / (1000 * 60 * 60);
              isReady = hoursSinceIntake >= 5;
              readinessStatus = isReady ? 'Spreman' : 'Slijeganje';
            }
            
            return (
            <Card key={tank.id} className="relative group overflow-hidden bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
              {/* Status Indicator Bar - Based on readiness, not capacity */}
              <div className={`absolute top-0 left-0 right-0 h-2 ${
                !tank.last_fuel_intake_date ? 'bg-gray-300' : 
                isReady ? 'bg-gray-600' : 'bg-gray-400'
              }`} />
              
              <CardHeader className="pb-4 pt-7 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-bold text-gray-900 mb-1 truncate">{tank.tank_name}</CardTitle>
                    <p className="text-sm text-gray-600 font-medium">{tank.tank_identifier}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge variant={tank.is_active ? "default" : "secondary"} className="shrink-0">
                      {tank.is_active ? "Aktivan" : "Neaktivan"}
                    </Badge>
                    {/* Readiness Status Badge */}
                    {tank.last_fuel_intake_date && (
                      <Badge className={`shrink-0 text-xs ${
                        isReady 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-amber-100 text-amber-700 border border-amber-300'
                      }`}>
                        {readinessStatus}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {tank.location_description && (
                  <p className="text-xs text-gray-500 italic mb-3">{tank.location_description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="font-medium text-xs">
                    {getFuelTypeLabel(tank.fuel_type)}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTankHistory(tank.id)}
                      className="h-7 px-3 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                      title="Historija ulaza i izlaza"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Historija ulaza i izlaza</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTankReconciliationModal(tank)}
                      className="h-7 px-2 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:border-gray-400"
                      title="Rekonsilijacija"
                    >
                      <Database className="h-3.5 w-3.5" />
                    </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTank(tank);
                      setCreateForm({
                        tank_name: tank.tank_name,
                        tank_identifier: tank.tank_identifier,
                        capacity_liters: tank.capacity_liters,
                        fuel_type: tank.fuel_type,
                        location_description: tank.location_description || ''
                      });
                      setShowEditModal(true);
                    }}
                      className="h-7 px-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      title="Uredi"
                  >
                      <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTank(tank.id)}
                      className="h-7 px-2 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      title="Obriši"
                  >
                      <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
              
              <CardContent className="space-y-4 pt-5">
                {/* Tank Capacity & Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Kapacitet</p>
                    <p className="text-lg font-bold text-gray-900">{tank.capacity_liters.toLocaleString()} L</p>
                </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Popunjenost</p>
                    <p className="text-lg font-bold text-gray-900">{capacityPercent}%</p>
                </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Trenutno</p>
                    <p className="text-lg font-bold text-gray-900">{tank.current_quantity_liters.toLocaleString()} L</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Težina</p>
                    <p className="text-lg font-bold text-gray-900">{tank.current_quantity_kg.toLocaleString()} kg</p>
                </div>
                {tank.average_density && tank.average_density > 0 && (
                    <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Prosječna gustoća</p>
                      <p className="text-lg font-bold text-gray-900">{tank.average_density.toFixed(3)} kg/L</p>
                  </div>
                )}
              </div>

                {/* Capacity Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gray-600"
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>

                {/* Tank Readiness & Fuel Intake Info */}
                {tank.last_fuel_intake_date ? (() => {
                  const lastIntakeDate = new Date(tank.last_fuel_intake_date);
                  const now = new Date();
                  const hoursSinceIntake = (now.getTime() - lastIntakeDate.getTime()) / (1000 * 60 * 60);
                  const isWithinSettlingPeriod = hoursSinceIntake < 5;

                  return (
                    <div className="space-y-3">
                      {/* Current Fuel Status - Removed, already shown above in grid */}

                      {/* Readiness Status */}
                      <div className={`p-3 rounded-lg border-2 ${
                        isWithinSettlingPeriod 
                          ? 'bg-gray-900 border-gray-700' 
                          : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            isWithinSettlingPeriod ? 'bg-amber-500' : 'bg-gray-600'
                          }`}>
                            {isWithinSettlingPeriod ? (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
              </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold mb-1 ${
                              isWithinSettlingPeriod ? 'text-white' : 'text-gray-900'
                            }`}>
                              {isWithinSettlingPeriod ? 'UPOZORENJE: Proces slijeganja u toku' : 'Tank spreman za korištenje'}
                            </p>
                            {isWithinSettlingPeriod && (
                              <div className="space-y-1 mt-2">
                                <div className="flex items-center justify-between">
                                  <p className={`text-xs font-medium ${isWithinSettlingPeriod ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Zadnje točenje
                                  </p>
                                  <p className={`text-xs font-semibold ${isWithinSettlingPeriod ? 'text-white' : 'text-gray-900'}`}>
                                    {lastIntakeDate.toLocaleDateString('en-GB')} {lastIntakeDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className={`text-xs font-medium ${isWithinSettlingPeriod ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Proteklo
                                  </p>
                                  <p className={`text-xs font-semibold ${isWithinSettlingPeriod ? 'text-white' : 'text-gray-900'}`}>
                                    {hoursSinceIntake.toFixed(1)}h / 5h
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className={`text-xs font-medium ${isWithinSettlingPeriod ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Preostalo
                                  </p>
                                  <p className={`text-xs font-semibold ${isWithinSettlingPeriod ? 'text-white' : 'text-gray-900'}`}>
                                    {(5 - hoursSinceIntake).toFixed(1)}h
                                  </p>
                                </div>
                              </div>
                            )}
                            {!isWithinSettlingPeriod && (
                              <div className="space-y-1 mt-2">
                                <div className="flex items-center justify-between border-b border-gray-300 pb-2">
                                  <p className="text-xs font-medium text-gray-600">Zadnje točenje</p>
                                  <p className="text-xs font-semibold text-gray-900">
                                    {lastIntakeDate.toLocaleDateString('en-GB')} {lastIntakeDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                 <div className="flex items-center justify-between">
                                   <p className="text-xs font-medium text-gray-600">Trenutno stanje</p>
                                   <p className="text-xs font-semibold text-gray-900">
                                     {tank.current_quantity_liters.toLocaleString()} L
                                   </p>
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0v1H9a1 1 0 110 2h1v1a1 1 0 11 2 0v-1h1a1 1 0 110-2h-1V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Nema podataka o točenju</p>
                        <p className="text-xs text-gray-600">Historija točenja nije dostupna</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })
        ) : activeTab === 'cisterns' ? (
          cisterns.map((cistern) => {
            const cisternSubCisterns = subCisterns.filter(sc => sc.parent_cistern_id === cistern.id && sc.is_active);
            const capacityPercent = getCapacityPercentage(cistern.current_quantity_liters, cistern.capacity_liters);
            
            return cistern.is_cumulative ? (
              // Cumulative Cistern - Full Width
              <div key={cistern.id} className="w-full col-span-3">
                <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  {/* Professional Top Border */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800" />
                  
                  <CardHeader className="relative bg-white pb-0 pt-6 border-b border-gray-100">
                    {/* Header with Title and Actions */}
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gray-900 rounded-xl shadow-sm">
                          <Database className="h-8 w-8 text-white" />
                        </div>
                      <div>
                          <CardTitle className="text-3xl font-bold text-gray-900 mb-1">
                            {cistern.cistern_identifier}
                          </CardTitle>
                          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">Kumulativna Cisterna</p>
                      </div>
                      </div>
                      <div className="flex gap-3 items-center">
                        <Badge 
                          variant={cistern.is_active ? "default" : "secondary"} 
                          className={`text-xs px-4 py-2 font-medium ${
                            cistern.is_active 
                              ? 'bg-gray-900 text-white' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {cistern.is_active ? "✓ Aktivan" : "⨯ Neaktivan"}
                </Badge>
                        <Badge 
                          variant="outline" 
                          className="text-xs px-4 py-2 font-medium border-gray-300 text-gray-700 bg-white"
                        >
                          {getFuelTypeLabel(cistern.fuel_type)}
                </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSubCisternConfig(cistern)}
                          className="h-10 px-4 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium transition-all duration-200"
                          title="Sub-Cisterne"
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Sub-Cisterne
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCistern(cistern);
                            setCreateCisternForm({
                              cistern_identifier: cistern.cistern_identifier,
                              capacity_liters: cistern.capacity_liters,
                              fuel_type: cistern.fuel_type,
                              is_active: cistern.is_active,
                              is_cumulative: cistern.is_cumulative || false
                            });
                            setShowEditCisternModal(true);
                          }}
                          className="h-10 px-3 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                          title="Uredi"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCistern(cistern.id)}
                          className="h-10 px-3 border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                          title="Obriši"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
              </div>

                    {/* Main Stats Grid - Professional Design */}
                    <div className="grid grid-cols-5 gap-6 pb-6">
                      <div className="group bg-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-800 rounded-lg">
                            <Database className="h-5 w-5 text-white" />
                      </div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kapacitet</p>
                      </div>
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {cistern.capacity_liters.toLocaleString()} L
                        </p>
                      </div>
                      <div className="group bg-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-800 rounded-lg">
                            <RefreshCw className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Trenutno</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {cistern.current_quantity_liters.toLocaleString()} L
                        </p>
                      </div>
                      <div className="group bg-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-800 rounded-lg">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Težina</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {cistern.current_quantity_kg.toLocaleString()} kg
                        </p>
                      </div>
                      <div className="group bg-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-800 rounded-lg">
                            <Database className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Gustoća</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {cistern.average_density ? cistern.average_density.toFixed(3) : '0.000'} kg/L
                        </p>
                      </div>
                      <div className="group bg-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-800 rounded-lg">
                            <RefreshCw className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Popunjenost</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {capacityPercent}%
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-8 bg-gray-50">
                    {/* Central Transfer Button */}
                    <div className="flex justify-center mb-8">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setShowTransferModal(true)}
                        className="group h-14 px-8 bg-gray-900 text-white border-0 hover:bg-gray-800 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                        title="Dopuni cisternu iz fiksnog tanka"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Plus className="h-6 w-6" />
                          </div>
                          <span>Dopuni cisternu iz fiksnog tanka</span>
                        </div>
                      </Button>
                    </div>
                    
                    {/* Sub-Cisterns Section */}
                    <div className="border-t border-gray-200 pt-8">
                      {cisternSubCisterns.length > 0 && (
                        <>
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-gray-800 rounded-lg">
                              <Database className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                              Sub-Cisterne
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            {cisternSubCisterns.map((subCistern) => {
                              const subCapacityPercent = getCapacityPercentage(subCistern.current_quantity_liters, subCistern.capacity_liters);
                              const avgDensity = subCistern.current_quantity_liters > 0 
                                ? subCistern.current_quantity_kg / subCistern.current_quantity_liters 
                                : 0;
                              
                              return (
                                <Card key={subCistern.id} className="relative overflow-hidden bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 group">
                                  {/* Professional top border */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800" />
                                  
                                  <CardHeader className="pb-4 pt-6">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-gray-800 rounded-lg shadow-sm">
                                          <Database className="h-5 w-5 text-white" />
                                        </div>
                                      <div>
                                          <p className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                            {subCistern.sub_cistern_name}
                                          </p>
                                          <p className="text-sm text-gray-600 font-medium">
                                            Kapacitet: {subCistern.capacity_liters.toLocaleString()} L
                                          </p>
                                      </div>
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button
                                          variant="outline"
                                        size="sm"
                                          onClick={() => {
                                            setSelectedSubCisternForTransfer(subCistern);
                                            setShowSubCisternTransferModal(true);
                                          }}
                                        className="flex-1 h-11 bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium transition-all duration-200"
                                          title="Pretakanje iz jedne u drugu cisternu"
                                        >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Pretakanje
                                        </Button>
                                        <Button
                                          variant="outline"
                                        size="sm"
                                          onClick={() => openReconciliationModal(subCistern)}
                                        className="flex-1 h-11 bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium transition-all duration-200"
                                          title="Rekonsilijacija"
                                        >
                                        <Database className="h-4 w-4 mr-2" />
                                          Rekonsilijacija
                                        </Button>
                                    </div>
                                  </CardHeader>
                                  
                                  <CardContent className="space-y-6">
                                    {/* Capacity Stats Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="p-1.5 bg-gray-800 rounded-lg">
                                            <Database className="h-4 w-4 text-white" />
                                      </div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kapacitet</p>
                                      </div>
                                        <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                          {subCistern.capacity_liters.toLocaleString()} L
                                        </p>
                                      </div>
                                      <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="p-1.5 bg-gray-800 rounded-lg">
                                            <RefreshCw className="h-4 w-4 text-white" />
                                      </div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Popunjenost</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                          {subCapacityPercent}%
                                        </p>
                                      </div>
                                      <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="p-1.5 bg-gray-800 rounded-lg">
                                            <FileText className="h-4 w-4 text-white" />
                                          </div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Trenutno</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                          {Math.round(subCistern.current_quantity_liters).toLocaleString()} L
                                        </p>
                                      </div>
                                      <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="p-1.5 bg-gray-800 rounded-lg">
                                            <Database className="h-4 w-4 text-white" />
                                          </div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Težina</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                          {Math.round(subCistern.current_quantity_kg).toLocaleString()} kg
                                        </p>
                                      </div>
                                      <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <div className="p-1.5 bg-gray-800 rounded-lg">
                                            <RefreshCw className="h-4 w-4 text-white" />
                                          </div>
                                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Gustoća</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                          {avgDensity > 0 ? avgDensity.toFixed(3) : '0.000'} kg/L
                                        </p>
                                      </div>
                                    </div>

                                    {/* Capacity Bar */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm font-semibold text-gray-600">
                                        <span>Popunjenost</span>
                                        <span>{subCapacityPercent}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                          className="bg-gray-800 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${subCapacityPercent}%` }}
                                      />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </>
                      )}
                      
                      {cisternSubCisterns.length === 0 && (
                        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 bg-gray-800 rounded-2xl shadow-sm">
                              <Database className="h-12 w-12 text-white" />
                            </div>
                            <div>
                              <p className="text-xl font-bold text-gray-900 mb-2">Nema konfigurisanih sub-cisterni</p>
                              <p className="text-gray-600 mb-6 max-w-md">
                                Kliknite na "Sub-Cisterne" u gornjem meniju da konfigurišete i upravljajte sub-cisternama
                              </p>
                            </div>
                          <Button
                            variant="outline"
                              size="lg"
                            onClick={() => openSubCisternConfig(cistern)}
                              className="bg-gray-900 text-white border-0 hover:bg-gray-800 font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                          >
                              <Database className="h-5 w-5 mr-2" />
                            Konfiguriraj Sub-Cisterne
                          </Button>
                          </div>
                        </div>
                      )}
                    </div>
            </CardContent>
          </Card>
              </div>
        ) : (
              // Regular Cistern - Professional Card
            <Card key={cistern.id} className="relative overflow-hidden bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 group">
              {/* Professional top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800" />
              
              <CardHeader className="pb-4 pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-800 rounded-lg shadow-sm">
                      <Database className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                        {cistern.cistern_identifier}
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-medium">Obična Cisterna</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTransferModal(true)}
                        className="h-9 px-3 bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium transition-all duration-200"
                        title="Prebaci iz fizičkog tanka"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Transfer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSubCisternConfig(cistern)}
                        className="h-9 px-3 bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium transition-all duration-200"
                        title="Konfiguriraj sub-cisterne"
                      >
                        <Database className="h-4 w-4 mr-1" />
                        Sub-Cisterne
                      </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCistern(cistern);
                        setCreateCisternForm({
                          cistern_identifier: cistern.cistern_identifier,
                          capacity_liters: cistern.capacity_liters,
                          fuel_type: cistern.fuel_type,
                            is_active: cistern.is_active,
                            is_cumulative: cistern.is_cumulative || false
                        });
                        setShowEditCisternModal(true);
                      }}
                      className="h-9 px-3 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      title="Uredi"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCistern(cistern.id)}
                      className="h-9 px-3 border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                      title="Obriši"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-gray-800 rounded-lg">
                        <Database className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kapacitet</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {cistern.capacity_liters.toLocaleString()} L
                    </p>
                  </div>
                  <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-gray-800 rounded-lg">
                        <RefreshCw className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Trenutno</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {cistern.current_quantity_liters.toLocaleString()} L
                    </p>
                  </div>
                  <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-gray-800 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Težina</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {cistern.current_quantity_kg.toLocaleString()} kg
                    </p>
                  </div>
                  <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-gray-800 rounded-lg">
                        <Database className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Popunjenost</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {capacityPercent}%
                    </p>
                  </div>
                </div>

                {/* Density if available */}
                {cistern.average_density && (
                  <div className="group bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-gray-800 rounded-lg">
                        <RefreshCw className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Prosječna Gustoća</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {cistern.average_density.toFixed(3)} kg/L
                    </p>
                  </div>
                )}

                {/* Capacity Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Popunjenost</span>
                    <span>{capacityPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gray-800 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex justify-between items-center pt-2">
                  <Badge 
                    variant={cistern.is_active ? "default" : "secondary"} 
                    className={`px-4 py-2 font-medium ${
                      cistern.is_active 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cistern.is_active ? "✓ Aktivan" : "⨯ Neaktivan"}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="px-4 py-2 font-medium border-gray-300 text-gray-700 bg-white"
                  >
                    {getFuelTypeLabel(cistern.fuel_type)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            );
          })
        ) : activeTab === 'transfers' ? (
          <div className="w-full col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Iz Tankova</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">U Cisternu</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Količina (L)</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Težina (kg)</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Datum</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Napomene</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{transfer.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {transfer.fromTank?.tank_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {transfer.toCistern?.cistern_identifier || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {transfer.quantity_liters.toLocaleString()} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {transfer.quantity_kg.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(transfer.transfer_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {transfer.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTransfer(transfer.id)}
                            className="h-7 px-2 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            title="Obriši transfer"
                    >
                            <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>
                  </div>
        ) : null}
      </div>

      {((activeTab === 'tanks' && tanks.length === 0) || (activeTab === 'cisterns' && cisterns.length === 0) || (activeTab === 'transfers' && transfers.length === 0)) && (
        <div className="text-center py-12">
          <div className="h-16 w-16 text-gray-400 mx-auto mb-4 bg-gray-100 rounded" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'tanks' ? 'Nema tankova' : activeTab === 'cisterns' ? 'Nema cisterni' : 'Nema transfera'}
          </h3>
          <p className="text-gray-500 mb-4">
            {activeTab === 'tanks' 
              ? 'Kreirajte svoj prvi fizički tank da počnete' 
              : activeTab === 'cisterns'
              ? 'Kreirajte svoju prvu cisternu da počnete'
              : 'Kreirajte svoj prvi transfer da počnete'
            }
          </p>
          <Button 
            onClick={() => {
              if (activeTab === 'tanks') setShowCreateModal(true);
              else if (activeTab === 'cisterns') setShowCreateCisternModal(true);
              else setShowTransferModal(true);
            }}
            className={
              activeTab === 'tanks' ? 'bg-blue-600 hover:bg-blue-700' : 
              activeTab === 'cisterns' ? 'bg-green-600 hover:bg-green-700' :
              'bg-purple-600 hover:bg-purple-700'
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'tanks' ? 'Dodaj Prvi Tank' : activeTab === 'cisterns' ? 'Dodaj Prvu Cisternu' : 'Dodaj Prvi Transfer'}
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Dodaj Novi Tank</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createTank(createForm);
            }} className="space-y-4">
              <div>
                <Label htmlFor="tank_name">Naziv Tankova</Label>
                <Input
                  id="tank_name"
                  value={createForm.tank_name}
                  onChange={(e) => setCreateForm({...createForm, tank_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tank_identifier">Serijski Broj</Label>
                <Input
                  id="tank_identifier"
                  value={createForm.tank_identifier}
                  onChange={(e) => setCreateForm({...createForm, tank_identifier: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity_liters">Kapacitet (L)</Label>
                <Input
                  id="capacity_liters"
                  type="number"
                  value={createForm.capacity_liters}
                  onChange={(e) => setCreateForm({...createForm, capacity_liters: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="fuel_type">Tip Goriva</Label>
                <Select
                  value={createForm.fuel_type}
                  onValueChange={(value) => setCreateForm({...createForm, fuel_type: value})}
                >
                  {fuelTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="location_description">Lokacija (opciono)</Label>
                <Input
                  id="location_description"
                  value={createForm.location_description}
                  onChange={(e) => setCreateForm({...createForm, location_description: e.target.value})}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Otkaži
                </Button>
                <Button type="submit">Kreiraj</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Uredi Tank</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateTank(editingTank.id, createForm);
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit_tank_name">Naziv Tankova</Label>
                <Input
                  id="edit_tank_name"
                  value={createForm.tank_name}
                  onChange={(e) => setCreateForm({...createForm, tank_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_tank_identifier">Serijski Broj</Label>
                <Input
                  id="edit_tank_identifier"
                  value={createForm.tank_identifier}
                  onChange={(e) => setCreateForm({...createForm, tank_identifier: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_capacity_liters">Kapacitet (L)</Label>
                <Input
                  id="edit_capacity_liters"
                  type="number"
                  value={createForm.capacity_liters}
                  onChange={(e) => setCreateForm({...createForm, capacity_liters: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_fuel_type">Tip Goriva</Label>
                <Select
                  value={createForm.fuel_type}
                  onValueChange={(value) => setCreateForm({...createForm, fuel_type: value})}
                >
                  {fuelTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_location_description">Lokacija (opciono)</Label>
                <Input
                  id="edit_location_description"
                  value={createForm.location_description}
                  onChange={(e) => setCreateForm({...createForm, location_description: e.target.value})}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditModal(false);
                  setEditingTank(null);
                }}>
                  Otkaži
                </Button>
                <Button type="submit">Ažuriraj</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Cistern Modal */}
      {showCreateCisternModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Dodaj Novu Cisternu</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createCistern(createCisternForm);
            }} className="space-y-4">
              <div>
                <Label htmlFor="cistern_identifier">Identifikator Cisterne</Label>
                <Input
                  id="cistern_identifier"
                  value={createCisternForm.cistern_identifier}
                  onChange={(e) => setCreateCisternForm({...createCisternForm, cistern_identifier: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cistern_capacity_liters">Kapacitet (L)</Label>
                <Input
                  id="cistern_capacity_liters"
                  type="number"
                  value={createCisternForm.capacity_liters}
                  onChange={(e) => setCreateCisternForm({...createCisternForm, capacity_liters: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cistern_fuel_type">Tip Goriva</Label>
                <Select
                  value={createCisternForm.fuel_type}
                  onValueChange={(value) => setCreateCisternForm({...createCisternForm, fuel_type: value})}
                >
                  {fuelTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateCisternModal(false)}>
                  Otkaži
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">Kreiraj</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cistern Modal */}
      {showEditCisternModal && editingCistern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Uredi Cisternu</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateCistern(editingCistern.id, createCisternForm);
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit_cistern_identifier">Identifikator Cisterne</Label>
                <Input
                  id="edit_cistern_identifier"
                  value={createCisternForm.cistern_identifier}
                  onChange={(e) => setCreateCisternForm({...createCisternForm, cistern_identifier: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_cistern_capacity_liters">Kapacitet (L)</Label>
                <Input
                  id="edit_cistern_capacity_liters"
                  type="number"
                  value={createCisternForm.capacity_liters}
                  onChange={(e) => setCreateCisternForm({...createCisternForm, capacity_liters: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_cistern_fuel_type">Tip Goriva</Label>
                <Select
                  value={createCisternForm.fuel_type}
                  onValueChange={(value) => setCreateCisternForm({...createCisternForm, fuel_type: value})}
                >
                  {fuelTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_cumulative"
                  checked={createCisternForm.is_cumulative || false}
                  onChange={(e) => setCreateCisternForm({...createCisternForm, is_cumulative: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit_is_cumulative" className="cursor-pointer">
                  Kumulativna Cisterna (za sub-cisterne)
                </Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditCisternModal(false);
                  setEditingCistern(null);
                }}>
                  Otkaži
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">Ažuriraj</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Novi Transfer</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              createTransfer(transferForm);
            }} className="space-y-4">
              <div>
                <Label htmlFor="from_tank_id">Iz Tankova</Label>
                <Select
                  value={transferForm.from_tank_id ? transferForm.from_tank_id.toString() : ''}
                  onValueChange={(value) => {
                    const tank = tanks.find(t => t.id === parseInt(value));
                    setTransferForm({...transferForm, from_tank_id: parseInt(value)});
                  }}
                >
                  <SelectItem value="" disabled>Odaberite tank</SelectItem>
                  {tanks.map((tank) => (
                    <SelectItem key={tank.id} value={tank.id.toString()}>
                      {tank.tank_name} - {Number(tank.current_quantity_liters).toLocaleString()}L / {Number(tank.current_quantity_kg).toLocaleString()}kg ({tank.average_density ? Number(tank.average_density).toFixed(3) : 'N/A'} kg/L)
                    </SelectItem>
                  ))}
                </Select>
                {transferForm.from_tank_id > 0 && (() => {
                  const selectedTank = tanks.find(t => t.id === transferForm.from_tank_id);
                  return selectedTank && selectedTank.average_density ? (
                    <p className="text-sm text-gray-600 mt-1">Prosječna gustoća: {selectedTank.average_density.toFixed(3)} kg/L</p>
                  ) : null;
                })()}
              </div>
              
              {/* Only show cistern selection if there's NOT exactly one cumulative cistern */}
              {!(cisterns.filter(c => c.is_cumulative).length === 1) && (
              <div>
                <Label htmlFor="to_cistern_id">U Cisternu</Label>
                <Select
                    value={transferForm.to_cistern_id ? transferForm.to_cistern_id.toString() : ''}
                    onValueChange={(value) => {
                      const cisternId = parseInt(value);
                      const cistern = cisterns.find(c => c.id === cisternId);
                      setSelectedCisternForTransfer(cistern || null);
                      setTransferForm({...transferForm, to_cistern_id: cisternId, to_sub_cistern_id: null});
                      
                      // Load sub-cisterns if cumulative
                      if (cistern?.is_cumulative) {
                        const subCisternsForCistern = subCisterns.filter(sc => sc.parent_cistern_id === cisternId);
                        setAvailableSubCisternsForTransfer(subCisternsForCistern);
                      } else {
                        setAvailableSubCisternsForTransfer([]);
                      }
                    }}
                >
                  <SelectItem value="" disabled>Odaberite cisternu</SelectItem>
                  {cisterns.map((cistern) => (
                    <SelectItem key={cistern.id} value={cistern.id.toString()}>
                        {cistern.cistern_identifier} - {Number(cistern.current_quantity_liters).toLocaleString()}L / {Number(cistern.current_quantity_kg).toLocaleString()}kg
                    </SelectItem>
                  ))}
                </Select>
              </div>
              )}
              
              {/* Sub-Cistern Selection - Always show when cumulative cistern is selected */}
              {selectedCisternForTransfer?.is_cumulative && availableSubCisternsForTransfer.length > 0 && (
                <div>
                  <Label>Odaberite Cisternu</Label>
                  <Select
                    value={selectedSubCisternId?.toString() || ''}
                    onValueChange={(value) => {
                      const subCisternId = parseInt(value);
                      setSelectedSubCisternId(subCisternId);
                      setTransferForm({...transferForm, to_sub_cistern_id: subCisternId});
                    }}
                  >
                    <SelectItem value="" disabled>Odaberite cisternu</SelectItem>
                    {availableSubCisternsForTransfer.map((subCistern) => (
                      <SelectItem key={subCistern.id} value={subCistern.id.toString()}>
                        {subCistern.sub_cistern_name} - Kapacitet: {Number(subCistern.capacity_liters).toLocaleString()}L, Trenutno: {Number(subCistern.current_quantity_liters).toLocaleString()}L / {Number(subCistern.current_quantity_kg).toLocaleString()}kg
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="quantity_liters">Količina (L)</Label>
                <Input
                  id="quantity_liters"
                  type="number"
                  step="0.01"
                  value={transferForm.quantity_liters || ''}
                  onChange={(e) => {
                    const liters = Number(e.target.value);
                    // Get selected tank's average density
                    const selectedTank = tanks.find(t => t.id === transferForm.from_tank_id);
                    const density = selectedTank?.average_density || 0.8;
                    const kg = liters * density;
                    setTransferForm({...transferForm, quantity_liters: liters, quantity_kg: kg});
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity_kg">Težina (kg) - Automatski</Label>
                <Input
                  id="quantity_kg"
                  type="number"
                  value={transferForm.quantity_kg.toFixed(3)}
                  disabled
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="transfer_date">Datum Transfera</Label>
                <Input
                  id="transfer_date"
                  type="date"
                  value={transferForm.transfer_date}
                  onChange={(e) => setTransferForm({...transferForm, transfer_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Napomene (opciono)</Label>
                <Input
                  id="notes"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferForm({
                      from_tank_id: 0,
                      to_cistern_id: 0,
                      to_sub_cistern_id: null,
                      quantity_liters: 0,
                      quantity_kg: 0,
                      transfer_date: new Date().toISOString().split('T')[0],
                      notes: ''
                    });
                    setSelectedCisternForTransfer(null);
                    setAvailableSubCisternsForTransfer([]);
                    setSelectedSubCisternId(null);
                  }}
                >
                  Otkaži
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Kreiraj Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Cistern Configuration Modal */}
      {showSubCisternConfigModal && selectedCisternForConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Konfiguracija Sub-Cisterni za {selectedCisternForConfig.cistern_identifier}
            </h2>
            
            {/* Existing Sub-Cisterns */}
            {subCisterns.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Postojeće Sub-Cisterne:</h3>
                <div className="space-y-2">
                  {subCisterns.map((sc) => (
                    <div key={sc.id} className="bg-gray-100 p-3 rounded flex justify-between items-center">
                      <div>
                        <p className="font-medium">{sc.sub_cistern_name}</p>
                        <p className="text-sm text-gray-600">
                          Kapacitet: {sc.capacity_liters.toLocaleString()}L | 
                          Trenutno: {sc.current_quantity_liters.toLocaleString()}L
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Sub-Cisterns */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Dodaj Nove Sub-Cisterne:</h3>
              <div className="space-y-3">
                {newSubCisterns.map((sc, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Naziv</Label>
                      <Input
                        value={sc.sub_cistern_name}
                        onChange={(e) => {
                          const updated = [...newSubCisterns];
                          updated[index].sub_cistern_name = e.target.value;
                          setNewSubCisterns(updated);
                        }}
                        placeholder="Npr. Cisterna 1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Kapacitet (L)</Label>
                      <Input
                        type="number"
                        value={sc.capacity_liters || ''}
                        onChange={(e) => {
                          const updated = [...newSubCisterns];
                          updated[index].capacity_liters = Number(e.target.value);
                          setNewSubCisterns(updated);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSubCisternRow(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={addSubCisternRow}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Sub-Cisternu
              </Button>

              {newSubCisterns.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                  Ukupan kapacitet: {newSubCisterns.reduce((sum, sc) => sum + sc.capacity_liters, 0).toLocaleString()}L
                  {' / '}
                  {selectedCisternForConfig.capacity_liters.toLocaleString()}L (parent)
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSubCisternConfigModal(false);
                  setNewSubCisterns([]);
                  setSelectedCisternForConfig(null);
                }}
              >
                Otkaži
              </Button>
              <Button
                type="button"
                onClick={handleCreateSubCisterns}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={newSubCisterns.length === 0}
              >
                Sačuvaj
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tank History Modal */}
      {showTankHistoryModal && selectedTankForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Historija Ulaza i Izlaza
                  </h2>
                  <p className="text-gray-600 text-sm">{selectedTankForHistory.tank_name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTankHistoryModal(false);
                    setSelectedTankForHistory(null);
                    setTankMrnHistory([]);
                    setTankTransferHistory([]);
                    setHistoryActiveTab('entries');
                  }}
                  className="text-gray-500 hover:text-gray-700 border-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              {/* Tabs */}
              <div className="mt-4 flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setHistoryActiveTab('entries')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    historyActiveTab === 'entries'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ulazi ({tankMrnHistory.length})
                </button>
                <button
                  onClick={() => setHistoryActiveTab('exits')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    historyActiveTab === 'exits'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Izlazi ({tankTransferHistory.length})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {historyActiveTab === 'entries' ? (
                // Ulazi tab
                tankMrnHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Nema MRN zapisa za ovaj tank</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Ukupno zapisa</p>
                        <p className="text-3xl font-bold text-gray-900">{tankMrnHistory.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Ukupna količina</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {tankMrnHistory.reduce((sum, mrn) => sum + Number(mrn.quantity_liters), 0).toLocaleString()} L
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Preostalo</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {tankMrnHistory.reduce((sum, mrn) => sum + Number(mrn.remaining_quantity_liters), 0).toLocaleString()} L
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MRN Broj</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Količina (L)</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Težina (kg)</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Preostalo (L)</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Preostalo (kg)</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gustoća</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Datum</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tankMrnHistory.map((mrn, index) => (
                          <tr key={mrn.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {mrn.customs_declaration_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {Number(mrn.quantity_liters).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {Number(mrn.quantity_kg).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                              {Number(mrn.remaining_quantity_liters).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                              {Number(mrn.remaining_quantity_kg).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {Number(mrn.density_at_intake).toFixed(4)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(mrn.date_added).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {mrn.is_retrofitted ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  Retrofit
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Originalni
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
              ) : (
                // Izlazi tab
                tankTransferHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">Nema transfer zapisa za ovaj tank</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Ukupno transfera</p>
                          <p className="text-3xl font-bold text-gray-900">{tankTransferHistory.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Ukupno preneseno</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {tankTransferHistory.reduce((sum, transfer) => sum + Number(transfer.quantity_liters), 0).toLocaleString()} L
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Ukupno kg</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {tankTransferHistory.reduce((sum, transfer) => sum + Number(transfer.quantity_kg), 0).toLocaleString()} kg
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Transfer Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Datum
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Količina (L)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Količina (kg)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gustoća
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ciljna cisterna
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tankTransferHistory.map((transfer, index) => (
                              <tr key={transfer.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {new Date(transfer.transfer_datetime).toLocaleDateString('en-GB')} {new Date(transfer.transfer_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {Number(transfer.quantity_liters).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {Number(transfer.quantity_kg).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {Number(transfer.quantity_kg / transfer.quantity_liters).toFixed(4)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {transfer.targetCistern?.cistern_identifier || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Završeno
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Cistern Transfer Modal */}
      {showSubCisternTransferModal && selectedSubCisternForTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              Transfer između Sub-Cisterni
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label>Iz Sub-Cisterne</Label>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedSubCisternForTransfer.sub_cistern_name}
                </p>
                <p className="text-sm text-gray-600">
                  Trenutno: {Math.round(selectedSubCisternForTransfer.current_quantity_liters).toLocaleString()}L / {Math.round(selectedSubCisternForTransfer.current_quantity_kg).toLocaleString()}kg
                </p>
              </div>

              <div>
                <Label htmlFor="to_sub_cistern">U Sub-Cisternu</Label>
                <Select
                  value={subCisternTransferForm.to_sub_cistern_id}
                  onValueChange={(value) => {
                    setSubCisternTransferForm(prev => ({ ...prev, to_sub_cistern_id: value }));
                  }}
                >
                  <SelectItem value="" disabled>Odaberite sub-cisternu</SelectItem>
                  {subCisterns
                    .filter(sc => sc.id !== selectedSubCisternForTransfer.id && sc.parent_cistern_id === selectedSubCisternForTransfer.parent_cistern_id)
                    .map((subCistern) => (
                      <SelectItem key={subCistern.id} value={subCistern.id.toString()}>
                        {subCistern.sub_cistern_name} - 
                        {' '}{Math.round(subCistern.current_quantity_liters).toLocaleString()}L / {Math.round(subCistern.current_quantity_kg).toLocaleString()}kg
                      </SelectItem>
                    ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transfer_liters">Količina (L)</Label>
                  <Input
                    id="transfer_liters"
                    type="number"
                    placeholder="0"
                    value={subCisternTransferForm.quantity_liters}
                    onChange={(e) => {
                      const liters = parseFloat(e.target.value) || 0;
                      // Calculate kg based on average density of source sub-cistern
                      const avgDensity = selectedSubCisternForTransfer.current_quantity_liters > 0
                        ? selectedSubCisternForTransfer.current_quantity_kg / selectedSubCisternForTransfer.current_quantity_liters
                        : 0.8; // Default density
                      const calculatedKg = liters * avgDensity;
                      
                      setSubCisternTransferForm(prev => ({
                        ...prev,
                        quantity_liters: e.target.value,
                        quantity_kg: calculatedKg
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer_kg">Težina (kg)</Label>
                  <Input
                    id="transfer_kg"
                    type="number"
                    placeholder="0"
                    value={subCisternTransferForm.quantity_kg.toFixed(2)}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubCisternTransferModal(false);
                  setSelectedSubCisternForTransfer(null);
                  setSubCisternTransferForm({ to_sub_cistern_id: '', quantity_liters: '', quantity_kg: 0 });
                }}
              >
                Otkaži
              </Button>
              <Button
                onClick={async () => {
                  if (!subCisternTransferForm.to_sub_cistern_id || !subCisternTransferForm.quantity_liters) {
                    toast.error('Unesite sve podatke');
                    return;
                  }

                  if (parseFloat(subCisternTransferForm.quantity_liters) <= 0) {
                    toast.error('Količina mora biti veća od 0');
                    return;
                  }

                  if (parseFloat(subCisternTransferForm.quantity_liters) > selectedSubCisternForTransfer.current_quantity_liters) {
                    toast.error('Ne možete prebaciti više nego što ima sub-cisterni');
                    return;
                  }

                  try {
                    await physicalSubCisternService.transferBetweenSubCisterns({
                      source_sub_cistern_id: selectedSubCisternForTransfer.id,
                      destination_sub_cistern_id: parseInt(subCisternTransferForm.to_sub_cistern_id),
                      quantity_liters: parseFloat(subCisternTransferForm.quantity_liters),
                      quantity_kg: subCisternTransferForm.quantity_kg
                    });

                    toast.success('Transfer uspješno izvršen');
                    setShowSubCisternTransferModal(false);
                    setSelectedSubCisternForTransfer(null);
                    setSubCisternTransferForm({ to_sub_cistern_id: '', quantity_liters: '', quantity_kg: 0 });
                    
                    // Refresh data
                    await fetchTanks();
                  } catch (error: any) {
                    console.error('Transfer error:', error);
                    toast.error(error?.message || 'Greška pri transferu');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tank Reconciliation Modal */}
      {showTankReconciliationModal && selectedTankForReconciliation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Rekonsilijacija - {selectedTankForReconciliation.tank_name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="tank_recon_liters">Količina (L)</Label>
                <Input
                  id="tank_recon_liters"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={tankReconciliationForm.quantity_liters}
                  onChange={(e) => {
                    const liters = parseFloat(e.target.value) || 0;
                    const density = parseFloat(tankReconciliationForm.density) || 0.8;
                    const calculatedKg = liters * density;
                    
                    setTankReconciliationForm(prev => ({
                      ...prev,
                      quantity_liters: e.target.value,
                      quantity_kg: calculatedKg
                    }));
                  }}
                />
              </div>

              <div>
                <Label htmlFor="tank_recon_density">Gustoća (kg/L)</Label>
                <Input
                  id="tank_recon_density"
                  type="number"
                  step="0.001"
                  placeholder="0.800"
                  value={tankReconciliationForm.density}
                  onChange={(e) => {
                    const density = parseFloat(e.target.value) || 0.8;
                    const liters = parseFloat(tankReconciliationForm.quantity_liters) || 0;
                    const calculatedKg = liters * density;
                    
                    setTankReconciliationForm(prev => ({
                      ...prev,
                      density: e.target.value,
                      quantity_kg: calculatedKg
                    }));
                  }}
                />
              </div>

              <div>
                <Label htmlFor="tank_recon_kg">Težina (kg) - Automatski</Label>
                <Input
                  id="tank_recon_kg"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={tankReconciliationForm.quantity_kg.toFixed(2)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Kapacitet tanka:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedTankForReconciliation.capacity_liters.toLocaleString()} L
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTankReconciliationModal(false);
                  setSelectedTankForReconciliation(null);
                  setTankReconciliationForm({ quantity_liters: '', density: '', quantity_kg: 0 });
                }}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleTankReconciliation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sačuvaj Rekonsilijaciju
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconciliationModal && selectedSubCisternForReconciliation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Rekonsilijacija - {selectedSubCisternForReconciliation.sub_cistern_name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="recon_liters">Količina (L)</Label>
                <Input
                  id="recon_liters"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={reconciliationForm.quantity_liters}
                  onChange={(e) => {
                    const liters = parseFloat(e.target.value) || 0;
                    const density = parseFloat(reconciliationForm.density) || 0.8;
                    const calculatedKg = liters * density;
                    
                    setReconciliationForm(prev => ({
                      ...prev,
                      quantity_liters: e.target.value,
                      quantity_kg: calculatedKg
                    }));
                  }}
                />
              </div>

              <div>
                <Label htmlFor="recon_density">Gustoća (kg/L)</Label>
                <Input
                  id="recon_density"
                  type="number"
                  step="0.001"
                  placeholder="0.800"
                  value={reconciliationForm.density}
                  onChange={(e) => {
                    const density = parseFloat(e.target.value) || 0.8;
                    const liters = parseFloat(reconciliationForm.quantity_liters) || 0;
                    const calculatedKg = liters * density;
                    
                    setReconciliationForm(prev => ({
                      ...prev,
                      density: e.target.value,
                      quantity_kg: calculatedKg
                    }));
                  }}
                />
              </div>

              <div>
                <Label htmlFor="recon_kg">Težina (kg) - Automatski</Label>
                <Input
                  id="recon_kg"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={reconciliationForm.quantity_kg.toFixed(2)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Kapacitet sub-cisterne:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedSubCisternForReconciliation.capacity_liters.toLocaleString()} L
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReconciliationModal(false);
                  setSelectedSubCisternForReconciliation(null);
                  setReconciliationForm({ quantity_liters: '', density: '', quantity_kg: 0 });
                }}
              >
                Otkaži
              </Button>
              <Button
                onClick={handleReconciliation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sačuvaj Rekonsilijaciju
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Retrofit Modal */}
      <RetrofitModal
        isOpen={showRetrofitModal}
        onClose={() => setShowRetrofitModal(false)}
        onSuccess={() => {
          fetchTanks();
          toast.success('Retrofit uspješno izvršen');
        }}
      />
    </div>
  );
};

export default PhysicalTanksDisplay;
