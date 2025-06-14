import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth, getFixedTanks, getMobileTanks, getDrainRecords, clearDrainRecordsCache } from '@/lib/apiService'; // Added getFixedTanks and getMobileTanks
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusIcon, ArrowDownIcon, XMarkIcon, TrashIcon, PencilIcon, ArrowPathIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Define interfaces for our data types
interface FixedTank {
  id: number;
  tank_name: string;
  tank_identifier: string;
  capacity_liters: number;
  current_quantity_liters: number;
  fuel_type: string;
  location_description: string | null;
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

// Sučelje za pojedinačni MRN podatak u breakdown-u
interface MrnBreakdownItem {
  mrn: string;
  quantity: number;
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
  originalDrainId?: number; // Dodano za praćenje povezanih transakcija
  mrnBreakdown?: string; // JSON string s MRN podacima
  parsedMrnBreakdown?: MrnBreakdownItem[]; // Parsirani MRN podaci za lakši prikaz
}

interface DrainFormData {
  date: string;
  sourceType: 'fixed' | 'mobile';
  sourceId: number;
  quantity_liters: string;
  notes: string;
}

interface ReverseTransactionFormData {
  date: string;
  destinationType: 'fixed' | 'mobile';
  destinationId: number;
  quantity_liters: string;
  notes: string;
  originalDrainId: number;
}

interface SaleTransactionFormData {
  date: string;
  quantity_liters: string;
  notes: string;
  originalDrainId: number;
  buyerName: string;
}

const DrainedFuelOperations: React.FC = () => {
  // State variables
  const [fixedTanks, setFixedTanks] = useState<FixedTank[]>([]);
  const [mobileTanks, setMobileTanks] = useState<MobileTank[]>([]);
  const [drainRecords, setDrainRecords] = useState<DrainRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [formData, setFormData] = useState<DrainFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    sourceType: 'fixed',
    sourceId: 0,
    quantity_liters: '',
    notes: '',
  });
  const [reverseFormData, setReverseFormData] = useState<ReverseTransactionFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    destinationType: 'fixed',
    destinationId: 0,
    quantity_liters: '',
    notes: '',
    originalDrainId: 0
  });
  
  const [saleFormData, setSaleFormData] = useState<SaleTransactionFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    quantity_liters: '',
    notes: '',
    originalDrainId: 0,
    buyerName: ''
  });
  const [selectedSource, setSelectedSource] = useState<FixedTank | MobileTank | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<FixedTank | MobileTank | null>(null);
  const [activeTab, setActiveTab] = useState<'fixed' | 'mobile'>('fixed');
  const [reverseActiveTab, setReverseActiveTab] = useState<'fixed' | 'mobile'>('fixed');
  const [selectedDrainRecord, setSelectedDrainRecord] = useState<DrainRecord | null>(null);
  
  // Summary state
  const [totalDrained, setTotalDrained] = useState<number>(0);
  const [totalReturned, setTotalReturned] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // Fetch data functions
  const fetchFixedTanks = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const response = await getFixedTanks(forceRefresh); // Use cached function, pass forceRefresh
      setFixedTanks(response);
    } catch (error) {
      console.error('Error fetching fixed tanks:', error);
      toast.error('Greška pri dohvaćanju fiksnih tankova');
    }
  }, []);

  const fetchMobileTanks = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const response = await getMobileTanks(forceRefresh); // Use cached function, pass forceRefresh
      setMobileTanks(response);
    } catch (error) {
      console.error('Error fetching mobile tanks:', error);
      toast.error('Greška pri dohvaćanju mobilnih tankova');
    }
  }, []);

  const fetchDrainRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDrainRecords(); // Use cached function
      
      // Parsiranje MRN podataka iz JSON stringa
      const recordsWithParsedMrn = data.map(record => {
        if (record.mrnBreakdown) {
          try {
            const parsedMrn = JSON.parse(record.mrnBreakdown) as MrnBreakdownItem[];
            return {
              ...record,
              parsedMrnBreakdown: parsedMrn
            };
          } catch (e) {
            console.error(`Greška pri parsiranju MRN podataka za zapis ID ${record.id}:`, e);
            return record;
          }
        }
        return record;
      });
      
      setDrainRecords(recordsWithParsedMrn);
      
      // Izračunaj ukupne količine
      const drained = recordsWithParsedMrn
        .filter(r => r.quantityLiters > 0)
        .reduce((sum, r) => sum + r.quantityLiters, 0);
      
      const returned = recordsWithParsedMrn
        .filter(r => r.quantityLiters < 0)
        .reduce((sum, r) => sum + Math.abs(r.quantityLiters), 0);
      
      setTotalDrained(drained);
      setTotalReturned(returned);
      
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
  
  // Calculate summary values whenever drain records change
  useEffect(() => {
    let drainedTotal = 0;
    let returnedTotal = 0;
    let soldTotal = 0;
    
    drainRecords.forEach(record => {
      // Regular drain records have positive quantities
      if (record.quantityLiters > 0) {
        drainedTotal += record.quantityLiters;
      }
      // Reverse transactions and sales have negative quantities in the database
      else if (record.quantityLiters < 0) {
        // Check if it's a sale transaction (contains "Prodaja goriva kupcu")
        if (record.notes && record.notes.includes('Prodaja goriva kupcu')) {
          soldTotal += Math.abs(record.quantityLiters);
        } else {
          returnedTotal += Math.abs(record.quantityLiters);
        }
      }
    });
    
    setTotalDrained(drainedTotal);
    setTotalReturned(returnedTotal + soldTotal); // Include sold fuel in the returned total for balance calculation
    setCurrentBalance(drainedTotal - returnedTotal - soldTotal);
  }, [drainRecords]);
  
  // Funkcija za provjeru je li dostupno dovoljno goriva za povrat ili prodaju
  const isEnoughFuelAvailable = (requestedQuantity: number): boolean => {
    // Ako je trenutno stanje manje od tražene količine, nema dovoljno goriva
    return currentBalance >= requestedQuantity;
  };

  // Effect to update selectedSource when formData.sourceId or formData.sourceType changes
  useEffect(() => {
    if (!formData.sourceId || formData.sourceId === 0) {
      setSelectedSource(null);
      return;
    }

    const source = formData.sourceType === 'fixed'
      ? fixedTanks.find(tank => tank.id === formData.sourceId)
      : mobileTanks.find(tank => tank.id === formData.sourceId);
    setSelectedSource(source || null);
  }, [formData.sourceId, formData.sourceType, fixedTanks, mobileTanks]);

  // Effect to update selectedDestination when reverseFormData.destinationId or reverseFormData.destinationType changes
  useEffect(() => {
    if (!reverseFormData.destinationId || reverseFormData.destinationId === 0) {
      setSelectedDestination(null);
      return;
    }

    const destination = reverseFormData.destinationType === 'fixed'
      ? fixedTanks.find(tank => tank.id === reverseFormData.destinationId)
      : mobileTanks.find(tank => tank.id === reverseFormData.destinationId);
    setSelectedDestination(destination || null);
  }, [reverseFormData.destinationId, reverseFormData.destinationType, fixedTanks, mobileTanks]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle reverse form input changes
  const handleReverseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReverseFormData({
      ...reverseFormData,
      [name]: value
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    if (name === 'sourceType' || name === 'destinationType') {
      if (name === 'sourceType') {
        setFormData({
          ...formData,
          [name]: value as 'fixed' | 'mobile',
          sourceId: 0
        });
        setActiveTab(value as 'fixed' | 'mobile');
      } else {
        setReverseFormData({
          ...reverseFormData,
          [name]: value as 'fixed' | 'mobile',
          destinationId: 0
        });
        setReverseActiveTab(value as 'fixed' | 'mobile');
      }
    } else if (name === 'sourceId') {
      setFormData({
        ...formData,
        sourceId: parseInt(value)
      });
    } else if (name === 'destinationId') {
      setReverseFormData({
        ...reverseFormData,
        destinationId: parseInt(value)
      });
    }
  };

  // Handle sale form input changes
  const handleSaleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSaleFormData({
      ...saleFormData,
      [name]: value
    });
  };

  // Funkcija za izračun preostale količine goriva dostupne za povrat
  const calculateAvailableQuantity = (drainRecordId: number): number => {
    // Pronađi originalnu transakciju drenaže
    const originalDrainRecord = drainRecords.find(record => record.id === drainRecordId);
    if (!originalDrainRecord || originalDrainRecord.quantityLiters <= 0) return 0;
    
    // Pronađi sve povezane transakcije (povrati i prodaje)
    const relatedTransactions = drainRecords.filter(record => {
      // Tražimo samo negativne transakcije (povrati i prodaje)
      if (record.quantityLiters >= 0) return false;
      
      // Provjeri je li ova transakcija povezana s originalnom drenažom
      // 1. Preko originalDrainId polja (ako postoji)
      if (record.originalDrainId && record.originalDrainId === drainRecordId) return true;
      
      // 2. Preko teksta u napomenama
      if (record.notes) {
        return (
          record.notes.includes(`originalDrainId: ${drainRecordId}`) ||
          record.notes.includes(`Povrat goriva iz drenaže ID: ${drainRecordId}`) ||
          record.notes.includes(`Povrat iz drenaže #${drainRecordId}`) ||
          (record.notes.includes('Prodaja goriva kupcu') && record.notes.includes(`${drainRecordId}`))
        );
      }
      
      return false;
    });
    
    // Izračunaj ukupnu količinu koja je već vraćena ili prodana
    const returnedAndSoldQuantity = relatedTransactions.reduce(
      (total, record) => total + Math.abs(record.quantityLiters), 0
    );
    
    // Ispiši debug informacije
    console.log(`[calculateAvailableQuantity] DrainID: ${drainRecordId}, Original: ${originalDrainRecord.quantityLiters}, Returned/Sold: ${returnedAndSoldQuantity}`);
    console.log('Related transactions:', relatedTransactions);
    
    // Preostala količina dostupna za povrat
    return Math.max(0, originalDrainRecord.quantityLiters - returnedAndSoldQuantity);
  };

  // Handle opening the reverse transaction modal
  const handleOpenReverseModal = (drainRecord: DrainRecord) => {
    // Postavi maksimalnu dostupnu količinu na trenutno stanje ili originalnu količinu, što god je manje
    const maxQuantity = Math.min(currentBalance, drainRecord.quantityLiters);
    
    setSelectedDrainRecord(drainRecord);
    setReverseFormData({
      ...reverseFormData,
      originalDrainId: drainRecord.id,
      quantity_liters: maxQuantity > 0 ? maxQuantity.toString() : '0'
    });
    setIsReverseModalOpen(true);
  };

  // Handle opening the sale transaction modal
  const handleOpenSaleModal = (drainRecord: DrainRecord) => {
    // Postavi maksimalnu dostupnu količinu na trenutno stanje ili originalnu količinu, što god je manje
    const maxQuantity = Math.min(currentBalance, drainRecord.quantityLiters);
    
    setSelectedDrainRecord(drainRecord);
    setSaleFormData({
      ...saleFormData,
      originalDrainId: drainRecord.id,
      quantity_liters: maxQuantity > 0 ? maxQuantity.toString() : '0'
    });
    setIsSaleModalOpen(true);
  };

  // Handle sale transaction form submission
  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!saleFormData.buyerName.trim()) {
      toast.error('Molimo unesite naziv kupca');
      return;
    }
    
    if (!saleFormData.quantity_liters || parseFloat(saleFormData.quantity_liters) <= 0) {
      toast.error('Molimo unesite validnu količinu goriva');
      return;
    }

    if (!selectedDrainRecord) {
      toast.error('Nije odabran zapis drenaže za prodaju');
      return;
    }
    
    const quantityToSell = parseFloat(saleFormData.quantity_liters);
    
    // Provjeri ima li dovoljno goriva u ukupnom stanju
    if (!isEnoughFuelAvailable(quantityToSell)) {
      toast.error(`Nedovoljno goriva za prodaju. Trenutno stanje: ${currentBalance.toLocaleString('bs-BA')} L`);
      return;
    }
    
    // Provjeri je li količina za prodaju veća od originalne količine drenaže
    if (quantityToSell > selectedDrainRecord.quantityLiters) {
      toast.error(`Količina za prodaju ne može biti veća od originalno drenirane količine (${selectedDrainRecord.quantityLiters.toLocaleString('bs-BA')} L)`);
      return;
    }
    
    // Provjeri ima li uopće dostupne količine za prodaju
    if (currentBalance <= 0) {
      toast.error('Nema dostupnog goriva za prodaju');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Prepare payload for API
      const payload = {
        dateTime: new Date(saleFormData.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
        quantityLiters: parseFloat(saleFormData.quantity_liters),
        notes: `Prodaja goriva kupcu ${saleFormData.buyerName} (originalDrainId: ${saleFormData.originalDrainId})`,
        originalDrainId: saleFormData.originalDrainId,
        buyerName: saleFormData.buyerName
      };
      
      const response = await fetchWithAuth('/api/fuel/drains/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      toast.success('Prodaja goriva uspješno evidentirana');
      setIsSaleModalOpen(false);
      clearDrainRecordsCache();
      // Refresh all relevant data after sale
      await Promise.all([
        fetchFixedTanks(), // Standard refresh, sale doesn't directly change tank levels in this context
        fetchMobileTanks(),// Standard refresh
        fetchDrainRecords() // Use useCallback version to get fresh drain records
      ]);
      
      // Reset form
      setSaleFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        quantity_liters: '',
        notes: '',
        originalDrainId: 0,
        buyerName: ''
      });
      setSelectedDrainRecord(null);
      
    } catch (error) {
      console.error('Error submitting sale transaction:', error);
      toast.error('Greška pri evidentiranju prodaje goriva');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reverse transaction form submission
  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reverseFormData.destinationId) {
      toast.error('Molimo odaberite odredište goriva');
      return;
    }
    
    if (!reverseFormData.quantity_liters || parseFloat(reverseFormData.quantity_liters) <= 0) {
      toast.error('Molimo unesite validnu količinu goriva');
      return;
    }

    if (!selectedDrainRecord) {
      toast.error('Nije odabran zapis drenaže za povrat');
      return;
    }
    
    const quantityToReturn = parseFloat(reverseFormData.quantity_liters);
    
    // Provjeri ima li dovoljno goriva u ukupnom stanju
    if (!isEnoughFuelAvailable(quantityToReturn)) {
      toast.error(`Nedovoljno goriva za povrat. Trenutno stanje: ${currentBalance.toLocaleString('bs-BA')} L`);
      return;
    }
    
    // Provjeri je li količina za povrat veća od originalne količine drenaže
    if (quantityToReturn > selectedDrainRecord.quantityLiters) {
      toast.error(`Količina za povrat ne može biti veća od originalno drenirane količine (${selectedDrainRecord.quantityLiters.toLocaleString('bs-BA')} L)`);
      return;
    }
    
    // Provjeri ima li uopće dostupne količine za povrat
    if (currentBalance <= 0) {
      toast.error('Nema dostupnog goriva za povrat');
      return;
    }
    
    // Check if destination has enough capacity
    if (reverseFormData.destinationType === 'fixed') {
      const tank = fixedTanks.find(t => t.id === reverseFormData.destinationId);
      if (!tank) {
        toast.error('Odabrani rezervoar nije pronađen');
        return;
      }
      
      const availableCapacity = tank.capacity_liters - tank.current_quantity_liters;
      if (availableCapacity < quantityToReturn) {
        toast.error(`Nedovoljno kapaciteta u rezervoaru. Dostupno: ${availableCapacity.toLocaleString()} L`);
        return;
      }
    } else {
      const tank = mobileTanks.find(t => t.id === reverseFormData.destinationId);
      if (!tank) {
        toast.error('Odabrana cisterna nije pronađena');
        return;
      }
      
      const availableCapacity = tank.capacity_liters - tank.current_liters;
      if (availableCapacity < quantityToReturn) {
        toast.error(`Nedovoljno kapaciteta u cisterni. Dostupno: ${availableCapacity.toLocaleString()} L`);
        return;
      }
    }
    
    try {
      setIsLoading(true);
      
      // Prepare payload for API
      const payload = {
        dateTime: new Date(reverseFormData.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
        destinationType: reverseFormData.destinationType,
        destinationId: reverseFormData.destinationId,
        quantityLiters: parseFloat(reverseFormData.quantity_liters), // Šaljemo pozitivan broj, backend će ga tretirati kao povrat
        notes: (reverseFormData.notes ? reverseFormData.notes + ' ' : '') + `Povrat iz drenaže #${reverseFormData.originalDrainId} originalDrainId: ${reverseFormData.originalDrainId}`, // Dodajemo referencu na originalnu drenažu
        originalDrainId: reverseFormData.originalDrainId
      };
      
      // This endpoint would need to be implemented in the backend
      const response = await fetchWithAuth('/api/fuel/drains/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      toast.success('Povrat goriva uspješno evidentiran');
      setIsReverseModalOpen(false);
      clearDrainRecordsCache();
      // Force refresh tanks as their levels have changed
      if (reverseFormData.destinationType === 'fixed') {
        await fetchFixedTanks(true); 
      } else {
        await fetchMobileTanks(true);
      }
      // Refresh drain records
      await fetchDrainRecords();
      
      // Reset form
      setReverseFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        destinationType: 'fixed',
        destinationId: 0,
        quantity_liters: '',
        notes: '',
        originalDrainId: 0
      });
      setSelectedDestination(null);
      setSelectedDrainRecord(null);
      
    } catch (error) {
      console.error('Error submitting reverse transaction:', error);
      toast.error('Greška pri evidentiranju povrata goriva');
    } finally {
      setIsLoading(false);
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
      
      // Prepare payload for API with corrected field names
      const payload = {
        dateTime: new Date(formData.date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
        sourceType: formData.sourceType,
        sourceId: formData.sourceId,
        quantityLiters: parseFloat(formData.quantity_liters),
        notes: formData.notes || null
      };
      
      // This endpoint would need to be implemented in the backend
      const response = await fetchWithAuth('/api/fuel/drains/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      toast.success('Evidencija uspješno kreirana');
      setIsModalOpen(false);
      clearDrainRecordsCache();
      // Force refresh the source tank as its level has changed
      if (formData.sourceType === 'fixed') {
        await fetchFixedTanks(true);
      } else {
        await fetchMobileTanks(true);
      }
      // Refresh drain records
      await fetchDrainRecords();
      
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
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-4">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <ArrowDownIcon className="h-6 w-6 mr-2" />
              Drenirano gorivo
            </h2>
            <p className="text-gray-300 mt-1 ml-8">
              Evidencija istakanja i povrata dreniranog goriva
            </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Novo istakanje</span>
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Drained */}
        <Card className="bg-black/50 border-white/10 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Drenirano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrained.toLocaleString('bs-BA')} L</div>
          </CardContent>
        </Card>
        
        {/* Total Returned/Sold */}
        <Card className="bg-black/50 border-white/10 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Vraćeno/Prodano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReturned.toLocaleString('bs-BA')} L</div>
          </CardContent>
        </Card>
        
        {/* Current Balance */}
        <Card className="bg-black/50 border-white/10 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trenutno Stanje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBalance.toLocaleString('bs-BA')} L</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Records Table */}
      <Card className="bg-black/50 border-white/10 shadow-md">
        <CardHeader>
          <CardTitle>Evidencija Istakanja i Transakcija</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-white rounded-full"></div>
            </div>
          ) : drainRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nema evidentiranih istakanja goriva
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
                    <TableHead>MRN podaci</TableHead>
                    <TableHead>Napomena</TableHead>
                    <TableHead>Korisnik</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drainRecords.map((record) => {
                    // Determine if this is a sale transaction
                    const isSaleTransaction = record.notes && record.notes.includes('Prodaja goriva kupcu');
                    // Determine if this is a return transaction
                    const isReturnTransaction = record.quantityLiters < 0 && !isSaleTransaction;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.dateTime), 'dd.MM.yyyy HH:mm')}</TableCell>
                        <TableCell>{record.sourceName}</TableCell>
                        <TableCell>
                          {record.sourceType === 'fixed' ? 'Fiksni rezervoar' : 'Mobilna cisterna'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Math.abs(record.quantityLiters).toLocaleString('bs-BA')}
                          {record.quantityLiters < 0 && ' (-)' /* Show negative indicator */}
                        </TableCell>
                        <TableCell>
                          {record.parsedMrnBreakdown && record.parsedMrnBreakdown.length > 0 ? (
                            <div className="space-y-1">
                              {record.parsedMrnBreakdown.map((mrnItem, index) => (
                                <div key={index} className="flex items-center text-xs">
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 mr-2">
                                    MRN
                                  </Badge>
                                  <span className="font-mono">{mrnItem.mrn}</span>
                                  <span className="ml-2 text-gray-500">
                                    {Math.abs(mrnItem.quantity).toLocaleString('bs-BA')} L
                                    {mrnItem.quantity < 0 && ' (povrat)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Nema MRN podataka</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSaleTransaction ? (
                            <div className="flex items-center">
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                Prodaja
                              </Badge>
                              <span className="ml-2">{record.notes}</span>
                            </div>
                          ) : isReturnTransaction ? (
                            <div className="flex items-center">
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Povrat
                              </Badge>
                              <span className="ml-2">{record.notes}</span>
                            </div>
                          ) : (
                            record.notes || '-'
                          )}
                        </TableCell>
                        <TableCell>{record.userName}</TableCell>
                        <TableCell>
                          {record.quantityLiters > 0 && (
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleOpenReverseModal(record)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 text-xs"
                              >
                                <ArrowPathIcon className="h-3 w-3" />
                                Povrat
                              </Button>
                              <Button
                                onClick={() => handleOpenSaleModal(record)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20"
                              >
                                <BanknotesIcon className="h-3 w-3" />
                                Prodaja
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                            {tank.tank_name} ({tank.tank_identifier}) - {tank.current_quantity_liters.toLocaleString('bs-BA')} L
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
                    <span className="text-gray-500">Naziv:</span> {formData.sourceType === 'fixed' ? (selectedSource as FixedTank)?.tank_name : (selectedSource as MobileTank)?.name}
                  </div>
                  <div>
                    <span className="text-gray-500">Identifikator:</span> {formData.sourceType === 'fixed' ? (selectedSource as FixedTank)?.tank_identifier : (selectedSource as MobileTank)?.identifier}
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

      {/* Sale Transaction Modal */}
      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Prodaja Filtriranog Goriva</DialogTitle>
            <DialogDescription>
              Evidentirajte prodaju filtriranog goriva eksternom kupcu
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSaleSubmit}>
            {selectedDrainRecord && (
              <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <h4 className="text-sm font-medium mb-2 text-amber-500">Informacije o originalnoj drenaži</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-white/60">Datum:</span>
                    <span className="ml-2">{format(new Date(selectedDrainRecord.dateTime), 'dd.MM.yyyy')}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Izvor:</span>
                    <span className="ml-2">{selectedDrainRecord.sourceName}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Količina:</span>
                    <span className="ml-2">{selectedDrainRecord.quantityLiters.toLocaleString('bs-BA')} L</span>
                  </div>
                  <div>
                    <span className="text-white/60">Korisnik:</span>
                    <span className="ml-2">{selectedDrainRecord.userName}</span>
                  </div>
                </div>
              </div>
            )}
          
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sale-date" className="text-right">
                  Datum
                </Label>
                <Input
                  id="sale-date"
                  name="date"
                  type="date"
                  value={saleFormData.date}
                  onChange={handleSaleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buyer-name" className="text-right">
                  Naziv kupca
                </Label>
                <Input
                  id="buyer-name"
                  name="buyerName"
                  placeholder="Unesite naziv kupca"
                  value={saleFormData.buyerName}
                  onChange={handleSaleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sale-quantity" className="text-right">
                  Količina (L)
                </Label>
                <Input
                  id="sale-quantity"
                  name="quantity_liters"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Unesite količinu"
                  value={saleFormData.quantity_liters}
                  onChange={handleSaleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sale-notes" className="text-right">
                  Napomena
                </Label>
                <Input
                  id="sale-notes"
                  name="notes"
                  placeholder="Opcionalna napomena"
                  value={saleFormData.notes}
                  onChange={handleSaleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSaleModalOpen(false)}
                className="border-white/10 hover:bg-white/5"
              >
                Odustani
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-amber-500/80 hover:bg-amber-500 text-white"
              >
                {isLoading ? 'Procesiranje...' : 'Evidentiraj prodaju'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reverse Transaction Modal */}
      <Dialog open={isReverseModalOpen} onOpenChange={setIsReverseModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Povrat Filtriranog Goriva</DialogTitle>
            <DialogDescription>
              Evidentirajte povrat filtriranog goriva u fiksni rezervoar ili mobilni tank
            </DialogDescription>
          </DialogHeader>
          
          {selectedDrainRecord && (
            <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <h4 className="text-sm font-medium mb-2 text-amber-500">Informacije o originalnoj drenaži</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-amber-700">Izvor:</span> {selectedDrainRecord.sourceName}
                </div>
                <div>
                  <span className="text-amber-700">Tip izvora:</span> {selectedDrainRecord.sourceType === 'fixed' ? 'Fiksni rezervoar' : 'Mobilna cisterna'}
                </div>
                <div>
                  <span className="text-amber-700">Količina:</span> {selectedDrainRecord.quantityLiters.toLocaleString()} L
                </div>
                <div>
                  <span className="text-amber-700">Datum:</span> {format(new Date(selectedDrainRecord.dateTime), 'dd.MM.yyyy HH:mm')}
                </div>
                
                {/* MRN podaci */}
                {selectedDrainRecord.parsedMrnBreakdown && selectedDrainRecord.parsedMrnBreakdown.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <span className="text-amber-700 block mb-1">MRN podaci:</span>
                    <div className="space-y-1">
                      {selectedDrainRecord.parsedMrnBreakdown.map((mrnItem, index) => (
                        <div key={index} className="flex items-center">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 mr-2 text-xs">
                            MRN
                          </Badge>
                          <span className="font-mono text-xs">{mrnItem.mrn}</span>
                          <span className="ml-2 text-gray-500 text-xs">
                            {Math.abs(mrnItem.quantity).toLocaleString('bs-BA')} L
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs mt-1 text-amber-700">
                      <p>Povrat će biti proporcionalno raspodijeljen po MRN brojevima.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={handleReverseSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum povrata</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={reverseFormData.date}
                onChange={handleReverseInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tip odredišta</Label>
              <Tabs 
                value={reverseActiveTab} 
                onValueChange={(value: string) => handleSelectChange('destinationType', value)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fixed">Fiksni rezervoar</TabsTrigger>
                  <TabsTrigger value="mobile">Mobilna cisterna</TabsTrigger>
                </TabsList>
                
                <TabsContent value="fixed" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinationId">Odaberite rezervoar</Label>
                    <Select 
                      value={reverseFormData.destinationId.toString()} 
                      onValueChange={(value) => handleSelectChange('destinationId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite rezervoar" />
                      </SelectTrigger>
                      <SelectContent>
                        {fixedTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id.toString()}>
                            {tank.tank_name} ({tank.tank_identifier}) - {tank.current_quantity_liters.toLocaleString('bs-BA')}/{tank.capacity_liters.toLocaleString('bs-BA')} L
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="mobile" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinationId">Odaberite cisternu</Label>
                    <Select 
                      value={reverseFormData.destinationId.toString()} 
                      onValueChange={(value) => handleSelectChange('destinationId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite cisternu" />
                      </SelectTrigger>
                      <SelectContent>
                        {mobileTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id.toString()}>
                            {tank.name} ({tank.identifier}) - {tank.current_liters.toLocaleString()}/{tank.capacity_liters.toLocaleString()} L
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {selectedDestination && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-medium text-sm text-gray-700">Informacije o odredištu</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Naziv:</span> {reverseFormData.destinationType === 'fixed' ? (selectedDestination as FixedTank)?.tank_name : (selectedDestination as MobileTank)?.name}
                  </div>
                  <div>
                    <span className="text-gray-500">Identifikator:</span> {reverseFormData.destinationType === 'fixed' ? (selectedDestination as FixedTank)?.tank_identifier : (selectedDestination as MobileTank)?.identifier}
                  </div>
                  <div>
                    <span className="text-gray-500">Tip goriva:</span> {selectedDestination.fuel_type}
                  </div>
                  <div>
                    <span className="text-gray-500">Raspoloživi kapacitet:</span>{' '}
                    {reverseFormData.destinationType === 'fixed' 
                      ? ((selectedDestination as FixedTank).capacity_liters - (selectedDestination as FixedTank).current_quantity_liters).toLocaleString() 
                      : ((selectedDestination as MobileTank).capacity_liters - (selectedDestination as MobileTank).current_liters).toLocaleString()
                    } L
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="quantity_liters">Količina za povrat (L)</Label>
              <Input
                id="quantity_liters"
                name="quantity_liters"
                type="number"
                step="0.01"
                min="0.01"
                value={reverseFormData.quantity_liters}
                onChange={handleReverseInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Napomena</Label>
              <Input
                id="notes"
                name="notes"
                value={reverseFormData.notes}
                onChange={handleReverseInputChange}
                placeholder="Opcionalno"
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsReverseModalOpen(false)}>
                Odustani
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Učitavanje...
                  </>
                ) : (
                  'Evidentiraj povrat'
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
