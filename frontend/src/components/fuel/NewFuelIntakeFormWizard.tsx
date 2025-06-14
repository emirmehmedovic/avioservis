"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FuelType, FuelCategory, FixedStorageTank, FuelIntakeRecord } from '../../types/fuel';
import dayjs from 'dayjs';
import {
  getFixedTanks,
  createFuelIntake,
  uploadFuelIntakeDocument,
  getFixedTankCustomsBreakdown,
  CreateFuelIntakePayload
} from '../../lib/apiService';
import { Trash2, UploadCloud, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// TODO: Import necessary types: FuelIntakeRecord, FixedStorageTank, FuelType etc.
// TODO: Import API service functions: getFixedTanks, createFuelIntake, uploadFuelIntakeDocument

const STEPS = {
  DELIVERY_DETAILS: 1,
  TANK_DISTRIBUTION: 2,
  DOCUMENT_UPLOAD: 3,
  REVIEW_SUBMIT: 4, // Enabled Review Step
};

interface TankDistributionData {
  tank_id?: number;
  quantity_liters?: number;
  // Potentially add tank_name or identifier here for easier display, but keep data minimal for submission
}

interface DocumentUploadData {
  file: File;
  document_type: string;
  // previewUrl?: string; // Optional: for image previews, not implemented yet
}

// Interface for MRN customs breakdown item
interface CustomsBreakdownItem {
  mrn: string;
  quantity_liters: number;
  quantity_kg: number;
  date_added: string | Date;
  customs_date?: string | Date;
  customs_declaration_number?: string;
  remaining_quantity_liters?: number;
}

// Interface for API response CustomsBreakdownItem
interface ApiCustomsBreakdownItem {
  mrn?: string;
  customs_declaration_number?: string;
  quantity_liters?: number;
  remaining_quantity_liters?: number;
  date_added?: string;
  customs_date?: string;
}

// Interface for MRN data per tank
interface TankMRNData {
  tankId: string;
  newestMRNDate: Date | null;
  newestMRNDateString: string;
  newestMRN: string;
  customsItems: CustomsBreakdownItem[];
}

// Placeholder for form data structure - will be expanded
// Currency enum for price input
enum Currency {
  BAM = "BAM",
  EUR = "EUR",
  USD = "USD"
}

interface IntakeFormData {
  // Step 1
  delivery_vehicle_plate?: string;
  delivery_vehicle_driver_name?: string;
  intake_datetime?: string; // Using string for datetime-local input
  quantity_liters_received?: number;
  quantity_kg_received?: number;
  specific_gravity?: number;
  fuel_type?: FuelType;
  fuel_category?: FuelCategory;
  refinery_name?: string;
  supplier_name?: string;
  delivery_note_number?: string;
  customs_declaration_number?: string;
  
  // Price related fields
  price_per_kg?: number;
  currency?: Currency;
  total_price?: number; // Calculated field
  
  // Step 2
  tank_distributions?: TankDistributionData[];

  // Step 3
  document_uploads?: DocumentUploadData[]; // Added for Step 3
}

// Updated FormErrors to better handle indexed errors for tank_distributions and document_uploads
type FormErrors = Partial<Record<keyof Omit<IntakeFormData, 'tank_distributions' | 'document_uploads'>, string>> & {
  tank_distributions?: {
    [index: number]: Partial<Record<keyof TankDistributionData, string>>;
  };
  document_uploads?: {
    [index: number]: Partial<Record<keyof DocumentUploadData, string>>;
  };
  general_tank_distribution?: string; // For errors like overall quantity mismatch
  general_document_upload?: string; // For general file upload errors
};

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function NewFuelIntakeFormWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEPS.DELIVERY_DETAILS);
  const [formData, setFormData] = useState<Partial<IntakeFormData>>({
    tank_distributions: [{}],
    document_uploads: [],
    fuel_category: FuelCategory.DOMESTIC,
    currency: Currency.BAM,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
  const [availableTanks, setAvailableTanks] = useState<FixedStorageTank[]>([]);
  const [tanksLoading, setTanksLoading] = useState<boolean>(false);
  const [tanksError, setTanksError] = useState<string | null>(null);
  
  // MRN data state
  const [tankMRNDataMap, setTankMRNDataMap] = useState<Map<string, TankMRNData>>(new Map());
  const [isMRNDataLoading, setIsMRNDataLoading] = useState<boolean>(false);
  const [mrnDataError, setMRNDataError] = useState<string | null>(null);
  const [showOptimalDistribution, setShowOptimalDistribution] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch fixed tanks on component mount
  useEffect(() => {
    const fetchTanks = async () => {
      setTanksLoading(true);
      setTanksError(null);
      try {
        const tanks = await getFixedTanks();
        // Filter tanks by fuel type if fuel_type is already selected in Step 1?
        // For now, fetching all. Can be refined.
        setAvailableTanks(tanks);
      } catch (err: any) {
        console.error("Failed to fetch fixed tanks:", err);
        setTanksError(err.message || "Greška pri dohvatanju fiksnih tankova.");
      }
      setTanksLoading(false);
    };
    fetchTanks();
  }, []); // Empty dependency array means it runs once on mount

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
    fieldName?: keyof IntakeFormData // For Select or custom components
  ) => {
    let name: keyof IntakeFormData;
    let value: any;

    if (typeof e === 'string') {
      // This case is for Select where e is the value and fieldName is provided
      if (!fieldName) return; // Should not happen if used correctly
      name = fieldName;
      value = e;
    } else {
      // This case is for standard HTML input elements
      name = e.target.name as keyof IntakeFormData;
      const target = e.target as HTMLInputElement;
      value = target.type === 'checkbox' ? target.checked : target.value;
    }

    const numericFields: (keyof IntakeFormData)[] = ['quantity_liters_received', 'quantity_kg_received', 'specific_gravity', 'price_per_kg'];

    if (numericFields.includes(name)) {
      value = value === '' ? undefined : parseFloat(value);
    }
    
    // Update form data with the new value
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      
      // Recalculate total price if either quantity_kg_received or price_per_kg changes
      if (name === 'quantity_kg_received' || name === 'price_per_kg') {
        const kg = name === 'quantity_kg_received' ? value : updatedData.quantity_kg_received;
        const price = name === 'price_per_kg' ? value : updatedData.price_per_kg;
        
        if (kg !== undefined && kg !== null && price !== undefined && price !== null) {
          updatedData.total_price = kg * price;
        }
      }
      
      return updatedData;
    });
    
    // Clear validation error for this field when user starts typing
    if (formErrors[name as keyof Omit<IntakeFormData, 'tank_distributions' | 'document_uploads'>]) {
      setFormErrors(prev => ({ ...prev, [name as keyof Omit<IntakeFormData, 'tank_distributions' | 'document_uploads'>]: undefined }));
    }
  };

  useEffect(() => {
    const { quantity_liters_received, quantity_kg_received } = formData;

    const qL = typeof quantity_liters_received === 'number' && !isNaN(quantity_liters_received) ? quantity_liters_received : null;
    const qKg = typeof quantity_kg_received === 'number' && !isNaN(quantity_kg_received) ? quantity_kg_received : null;

    // Only calculate if both values are valid and positive
    if (qL !== null && qL > 0 && qKg !== null && qKg > 0) {
      // Calculate specific gravity from liters and kg - bez zaokruživanja za veću preciznost
      const calculatedSg = qKg / qL;
      
      // Update only if different from current value
      if (calculatedSg !== formData.specific_gravity) {
        setFormData(prev => ({
          ...prev,
          specific_gravity: calculatedSg
        }));
      }
    }
  }, [formData.quantity_liters_received, formData.quantity_kg_received]);  // Only depend on the two input values
  
  // --- MRN Data Fetching ---
  const fetchMRNDataForTanks = async (tanksToFetch: FixedStorageTank[]) => {
    if (!tanksToFetch || tanksToFetch.length === 0) {
      setTankMRNDataMap(new Map());
      return;
    }
    setIsMRNDataLoading(true);
    setMRNDataError(null);
    const newTankMRNDataMap = new Map<string, TankMRNData>();
    
    try {
      // Process each tank in parallel
      await Promise.all(tanksToFetch.map(async (tank) => {
        try {
          // Fetch customs breakdown data for this tank
          const mrnItems = await getFixedTankCustomsBreakdown(tank.id);
          
          // Convert to a consistent format
          const customsItems: Array<{
            mrn: string;
            quantity_liters: number;
            date_added: string;
          }> = Array.isArray(mrnItems) 
            ? (mrnItems as ApiCustomsBreakdownItem[]).map(item => ({
                mrn: item.mrn || item.customs_declaration_number || '',
                quantity_liters: item.quantity_liters || item.remaining_quantity_liters || 0,
                date_added: item.date_added || item.customs_date || new Date().toISOString()
              }))
            : ((mrnItems as any).customs_breakdown?.map((item: ApiCustomsBreakdownItem) => ({
                mrn: item.customs_declaration_number || '',
                quantity_liters: item.remaining_quantity_liters || 0,
                date_added: item.date_added || new Date().toISOString()
              })) || []);
          
          if (customsItems && customsItems.length > 0) {
            // Process the customs breakdown items to find the newest MRN date for this tank
            let newestMRNDate: Date | null = null;
            let newestMRNString = '';
            
            for (const item of customsItems) {
              const itemDate = dayjs(item.date_added).toDate();
              if (!newestMRNDate || itemDate > newestMRNDate) {
                newestMRNDate = itemDate;
                newestMRNString = item.mrn;
              }
            }
            
            if (newestMRNDate) {
              // Store the MRN data for this tank
              newTankMRNDataMap.set(tank.id.toString(), {
                tankId: tank.id.toString(),
                newestMRNDate,
                newestMRNDateString: dayjs(newestMRNDate).format('DD.MM.YYYY'),
                newestMRN: newestMRNString,
                customsItems: customsItems as unknown as CustomsBreakdownItem[]
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching MRN data for tank ${tank.id}:`, err);
        }
      }));
      
      // Update the state with all the MRN data
      setTankMRNDataMap(newTankMRNDataMap);
      
    } catch (err: any) {
      console.error("Error fetching MRN data for tanks:", err);
      setMRNDataError(err.message || "Greška pri dohvaćanju MRN podataka.");
    } finally {
      setIsMRNDataLoading(false);
    }
  };

  // --- MRN-based Distribution ---
  const distributeOptimallyByMRN = async () => {
    // Validate that we have a fuel type and quantity to distribute
    if (!formData.fuel_type || !formData.quantity_liters_received || formData.quantity_liters_received <= 0) {
      setError("Potrebno je odabrati tip goriva i unijeti količinu za raspodjelu.");
      return;
    }

    setIsMRNDataLoading(true);
    setMRNDataError(null);
    
    try {
      // Get tanks matching the selected fuel type
      const tanksForSelectedFuelType = filteredAvailableTanks.filter(tank => tank.status === 'ACTIVE');
      
      if (tanksForSelectedFuelType.length === 0) {
        setMRNDataError("Nema dostupnih tankova za odabrani tip goriva.");
        return;
      }
      
      // Fetch MRN data for all matching tanks
      await fetchMRNDataForTanks(tanksForSelectedFuelType);
      
      // Sort tanks by newest MRN date first (null dates at the end)
      const sortedTanks = [...tanksForSelectedFuelType].sort((a, b) => {
        const tankAData = tankMRNDataMap.get(a.id.toString());
        const tankBData = tankMRNDataMap.get(b.id.toString());
        
        // If we don't have MRN data for a tank, put it at the end
        if (!tankAData?.newestMRNDate) return 1;
        if (!tankBData?.newestMRNDate) return -1;
        
        // Sort by newest MRN date first
        return tankBData.newestMRNDate.getTime() - tankAData.newestMRNDate.getTime();
      });
      
      // Calculate available capacity for each tank - limited to 95% of total capacity
      const CAPACITY_CUTOFF_PERCENTAGE = 0.95; // Spremnik se može napuniti do 95% kapaciteta
      
      const tankCapacities = sortedTanks.map(tank => {
        // Maksimalni dozvoljeni volumen je 95% ukupnog kapaciteta
        const maxAllowedVolume = tank.capacity_liters * CAPACITY_CUTOFF_PERCENTAGE;
        // Dostupni kapacitet je razlika između 95% kapaciteta i trenutne količine
        const availableCapacity = Math.max(0, maxAllowedVolume - tank.current_quantity_liters);
        
        return {
          tankId: tank.id,
          availableCapacity: availableCapacity,
          mrnDate: tankMRNDataMap.get(tank.id.toString())?.newestMRNDateString || 'N/A'
        };
      });
      
      // Total quantity to distribute
      const totalQuantity = formData.quantity_liters_received;
      let remainingQuantity = totalQuantity;
      
      // Create new tank distributions based on optimal distribution
      const newDistributions: TankDistributionData[] = [];
      
      for (const tank of tankCapacities) {
        if (remainingQuantity <= 0) break;
        
        // Calculate how much we can put in this tank
        const quantityForThisTank = Math.min(remainingQuantity, tank.availableCapacity);
        
        if (quantityForThisTank > 0) {
          newDistributions.push({
            tank_id: tank.tankId,
            quantity_liters: parseFloat(quantityForThisTank.toFixed(2))
          });
          
          remainingQuantity -= quantityForThisTank;
        }
      }
      
      // Update form data with new distributions
      setFormData(prev => ({
        ...prev,
        tank_distributions: newDistributions
      }));
      
      // Show success message
      setSuccessMessage("Gorivo je optimalno raspoređeno prema najnovijim MRN datumima.");
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err: any) {
      console.error("Error distributing fuel by MRN:", err);
      setMRNDataError(err.message || "Greška pri optimalnoj raspodjeli goriva.");
    } finally {
      setIsMRNDataLoading(false);
    }
  };

  // --- Tank Distribution Handlers ---
  const handleAddTankDistribution = () => {
    setFormData(prev => ({
      ...prev,
      tank_distributions: [...(prev.tank_distributions || []), {}],
    }));
  };

  const handleRemoveTankDistribution = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tank_distributions: prev.tank_distributions?.filter((_, i) => i !== index),
    }));
    // Clear errors for this specific index if any
    if (formErrors.tank_distributions && formErrors.tank_distributions[index]) {
        const newTankErrors = { ...formErrors.tank_distributions };
        delete newTankErrors[index];
        setFormErrors(prev => ({ ...prev, tank_distributions: newTankErrors }));
    }
  };

  const handleTankDistributionChange = (index: number, field: keyof TankDistributionData, value: string | number) => {
    setFormData(prev => {
      const newDistributions = [...(prev.tank_distributions || [])];
      const currentEntry = { ...newDistributions[index] };
      
      if (field === 'quantity_liters') {
        // Koristi Number umjesto parseFloat i zaokruži na 2 decimale za veću preciznost
        if (value === '') {
          currentEntry[field] = undefined;
        } else {
          // Pretvaranje u broj i zaokruživanje na 2 decimale
          const numValue = typeof value === 'string' ? Number(value) : value;
          currentEntry[field] = Math.round(numValue * 100) / 100;
        }
      } else if (field === 'tank_id') {
        const tankId = value === '' ? undefined : parseInt(value as string, 10);
        currentEntry[field] = tankId;
        
        // Fetch MRN data for this tank if it's selected and we don't already have its MRN data
        if (tankId && !tankMRNDataMap.has(tankId.toString())) {
          // Fetch MRN data for this specific tank
          fetchMRNDataForSingleTank(tankId);
        }
      }
      newDistributions[index] = currentEntry;
      return { ...prev, tank_distributions: newDistributions };
    });
    // Clear validation error for this specific field
    if (formErrors.tank_distributions && formErrors.tank_distributions[index] && formErrors.tank_distributions[index][field]) {
        const newTankErrors = { ...formErrors.tank_distributions };
        const newIndexErrors = { ...newTankErrors[index] };
        delete newIndexErrors[field];
        newTankErrors[index] = newIndexErrors;
        if (Object.keys(newTankErrors[index]).length === 0) delete newTankErrors[index];
        setFormErrors(prev => ({ ...prev, tank_distributions: newTankErrors }));
    }
  };
  
  // Function to fetch MRN data for a single tank
  const fetchMRNDataForSingleTank = async (tankId: number) => {
    try {
      // Set loading state for this specific tank
      setIsMRNDataLoading(true);
      
      // Fetch MRN data for the tank
      const mrnItems = await getFixedTankCustomsBreakdown(tankId);
      
      // Convert to a consistent format
      const customsItems: Array<{
        mrn: string;
        quantity_liters: number;
        date_added: string;
      }> = Array.isArray(mrnItems) 
        ? (mrnItems as ApiCustomsBreakdownItem[]).map(item => ({
            mrn: item.mrn || item.customs_declaration_number || '',
            quantity_liters: item.quantity_liters || item.remaining_quantity_liters || 0,
            date_added: item.date_added || item.customs_date || new Date().toISOString()
          }))
        : ((mrnItems as any).customs_breakdown?.map((item: ApiCustomsBreakdownItem) => ({
            mrn: item.customs_declaration_number || '',
            quantity_liters: item.remaining_quantity_liters || 0,
            date_added: item.date_added || new Date().toISOString()
          })) || []);
      
      // Find the newest MRN date
      let newestMRNDate: Date | null = null;
      let newestMRNString = '';
      
      if (customsItems.length > 0) {
        // Sort by date descending
        const sortedItems = [...customsItems].sort((a, b) => {
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
        });
        
        // Get the newest date
        newestMRNDate = new Date(sortedItems[0].date_added);
        newestMRNString = sortedItems[0].mrn;
      }
      
      // Update the MRN data map with this tank's data
      setTankMRNDataMap(prev => {
        const newMap = new Map(prev);
        newMap.set(tankId.toString(), {
          tankId: tankId.toString(),
          newestMRNDate,
          newestMRNDateString: newestMRNDate ? dayjs(newestMRNDate).format('DD.MM.YYYY') : 'Nema MRN podataka',
          newestMRN: newestMRNString,
          customsItems: customsItems as unknown as CustomsBreakdownItem[]
        });
        return newMap;
      });
      
      setIsMRNDataLoading(false);
    } catch (error) {
      console.error(`Error fetching MRN data for tank ${tankId}:`, error);
      setIsMRNDataLoading(false);
    }
  };

  // Memoized filtered tanks for Step 2 dropdowns
  const filteredAvailableTanks = useMemo(() => {
    if (!availableTanks || !formData.fuel_type) return [];
    return availableTanks.filter(tank => {
      // Handle both old and new structures
      const tankAny = tank as any;
      if (tankAny.fuelType && typeof tankAny.fuelType === 'object' && 'name' in tankAny.fuelType) {
        return tankAny.fuelType.name === formData.fuel_type;
      }
      // Fallback to the old structure
      return tank.fuel_type === formData.fuel_type;
    });
  }, [availableTanks, formData.fuel_type]);

  const getTankDisplayInfo = (tankId?: number) => {
    const tank = availableTanks.find(t => t.id === tankId);
    if (!tank) return 'N/A';
    
    // Use type assertion to handle potential extended properties
    const tankAny = tank as any;
    
    // Get the correct name and identifier based on available properties
    const tankName = tankAny.name || tank.tank_name;
    const tankIdentifier = tankAny.identifier || tank.tank_identifier;
    
    // Get the correct fuel type based on available properties
    const fuelTypeName = tankAny.fuelType?.name || tank.fuel_type;
    
    const freeCapacity = tank.capacity_liters - tank.current_quantity_liters;
    return `${tankName} (${tankIdentifier}) / ${fuelTypeName} / Kap: ${tank.capacity_liters.toFixed(0)}L / Tren: ${tank.current_quantity_liters.toFixed(0)}L / Slob: ${freeCapacity.toFixed(0)}L`;
  };

  const totalDistributedQuantity = useMemo(() => {
    return formData.tank_distributions?.reduce((sum, dist) => sum + (dist.quantity_liters || 0), 0) || 0;
  }, [formData.tank_distributions]);

  const validateStep1 = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.delivery_vehicle_plate?.trim()) {
      errors.delivery_vehicle_plate = "Registarska oznaka je obavezna.";
    }
    if (!formData.intake_datetime) {
      errors.intake_datetime = "Datum i vrijeme ulaza su obavezni.";
    }
    if (!formData.fuel_type) {
      errors.fuel_type = "Tip goriva je obavezan.";
    }
    if (!formData.fuel_category) {
      errors.fuel_category = "Kategorija je obavezna.";
    }
    // Validacija MRN broja - obavezan i mora biti u ispravnom formatu
    if (!formData.customs_declaration_number?.trim()) {
      errors.customs_declaration_number = "MRN broj je obavezan.";
    } else {
      // Podržani formati MRN broja:
      // 1. Standardni format: 2 slova koda zemlje + 6 cifara godine i dana + 8 alfanumeričkih znakova + 1 kontrolna cifra
      // 2. Alternativni format 1: 2 slova koda zemlje + 16 cifara
      // 3. Alternativni format 2: 2 broja + 2 slova + 12 brojeva + 1 slovo + 1 broj
      // 4. Testni formati: počinju s 'TEST' ili 'UNTRACKED'
      const standardMrnRegex = /^[A-Z]{2}\d{6}[A-Z0-9]{8}\d{1}$/;
      const alternativeMrnRegex1 = /^[A-Z]{2}\d{16}$/;
      const alternativeMrnRegex2 = /^\d{2}[A-Z]{2}\d{12}[A-Z]{1}\d{1}$/;
      const testMrnRegex = /^(TEST|UNTRACKED)/;
      
      if (!standardMrnRegex.test(formData.customs_declaration_number) && 
          !alternativeMrnRegex1.test(formData.customs_declaration_number) && 
          !alternativeMrnRegex2.test(formData.customs_declaration_number) && 
          !testMrnRegex.test(formData.customs_declaration_number)) {
        errors.customs_declaration_number = "MRN mora biti u jednom od podržanih formata: 2 slova države + 16 brojeva (npr. BA1234567890123456), 2 broja + 2 slova + 12 brojeva + 1 slovo + 1 broj (npr. 24BA010304000120J6), ili standardni EU format.";
      }
    }
    const qL = formData.quantity_liters_received;
    const qKg = formData.quantity_kg_received;
    
    // Sada zahtijevamo samo litre i kilograme
    if (!qL || !qKg) {
      if (!qL) errors.quantity_liters_received = "Količina (L) je obavezna.";
      if (!qKg) errors.quantity_kg_received = "Količina (KG) je obavezna.";
    } else {
      if (qL <= 0) errors.quantity_liters_received = "Količina (L) mora biti pozitivna.";
      if (qKg <= 0) errors.quantity_kg_received = "Količina (KG) mora biti pozitivna.";
    }
    
    // Validate price-related fields
    const pricePerKg = formData.price_per_kg;
    if (pricePerKg !== undefined && pricePerKg !== null) {
      if (pricePerKg <= 0) {
        errors.price_per_kg = "Cijena po KG mora biti pozitivna.";
      }
      
      // If price is provided, currency is required
      if (!formData.currency) {
        errors.currency = "Valuta je obavezna kada je cijena unesena.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: FormErrors = { ...formErrors, tank_distributions: {}, general_tank_distribution: undefined }; // Preserve other step errors
    let isValid = true;
    const EPSILON = 0.005; // Tolerance for floating point comparisons (0.005 to be safe with 2 decimal places)

    if (!formData.tank_distributions || formData.tank_distributions.length === 0) {
      if ((formData.quantity_liters_received || 0) > 0) {
        errors.general_tank_distribution = "Morate rasporediti primljenu količinu goriva.";
        isValid = false;
      }
    } else {
      const selectedTankIds = new Set<number>();
      formData.tank_distributions.forEach((dist, index) => {
        const itemErrors: Partial<Record<keyof TankDistributionData, string>> = {};
        if (dist.tank_id === undefined) {
          itemErrors.tank_id = "Odaberite tank.";
          isValid = false;
        } else {
          if (selectedTankIds.has(dist.tank_id)) {
            itemErrors.tank_id = "Ovaj tank je već odabran.";
            isValid = false;
          }
          selectedTankIds.add(dist.tank_id);
          const tankDetails = availableTanks.find(t => t.id === dist.tank_id);
          if (tankDetails && formData.fuel_type) {
            // Use type assertion to handle potential extended properties
            const tankAny = tankDetails as any;
            // Get the correct fuel type based on available properties
            const tankFuelType = tankAny.fuelType?.name || tankDetails.fuel_type;
            
            if (tankFuelType !== formData.fuel_type) {
              // Get the correct tank name based on available properties
              const tankName = tankAny.name || tankDetails.tank_name;
              itemErrors.tank_id = `Tank ${tankName} ne podržava ${formData.fuel_type}.`;
              isValid = false;
            }
          }
          if (tankDetails && dist.quantity_liters !== undefined && dist.quantity_liters > (tankDetails.capacity_liters - tankDetails.current_quantity_liters)) {
            itemErrors.quantity_liters = `Količina premašuje slobodni kapacitet tanka (${(tankDetails.capacity_liters - tankDetails.current_quantity_liters).toFixed(2)} L).`;
            isValid = false;
          }
        }
        if (dist.quantity_liters === undefined || dist.quantity_liters <= 0) {
          itemErrors.quantity_liters = "Unesite pozitivnu količinu.";
          isValid = false;
        }
        if (Object.keys(itemErrors).length > 0) {
          if (!errors.tank_distributions) errors.tank_distributions = {};
          errors.tank_distributions[index] = itemErrors;
        }
      });
    }

    // Adjust for potential floating point inaccuracies
    const receivedQty = formData.quantity_liters_received || 0;

    if (totalDistributedQuantity > receivedQty + EPSILON) {
      errors.general_tank_distribution = `Ukupno raspoređena količina (${totalDistributedQuantity.toFixed(2)} L) ne može premašiti primljenu količinu (${receivedQty.toFixed(2)} L).`;
      isValid = false;
    }
    // Check if not fully distributed, allowing for small negative Epsilon due to prior calculation (e.g. remaining is -0.00001)
    // The display already shows toFixed(2) for remaining, so a very small negative is displayed as -0.00 or 0.00.
    // We want to ensure it's not significantly less.
    const remainingForDistribution = receivedQty - totalDistributedQuantity;
    if (remainingForDistribution > EPSILON && receivedQty > 0) { // If significantly more than EPSILON remains to be distributed
      errors.general_tank_distribution = `Morate rasporediti cjelokupnu primljenu količinu. Preostalo: ${remainingForDistribution.toFixed(2)} L.`;
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // --- Document Upload Handlers (Step 3) ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newUploads: DocumentUploadData[] = Array.from(files).map(file => ({
        file,
        document_type: '', // Default empty type, user needs to fill this
      }));
      setFormData(prev => ({
        ...prev,
        document_uploads: [...(prev.document_uploads || []), ...newUploads],
      }));
      // Clear general file upload error if any
      if (formErrors.general_document_upload) {
        setFormErrors(prev => ({ ...prev, general_document_upload: undefined }));
      }
    }
    // Reset file input to allow selecting the same file again if removed and re-added
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveDocument = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      document_uploads: prev.document_uploads?.filter((_, index) => index !== indexToRemove),
    }));
    // Clear errors for this specific document index if any
    if (formErrors.document_uploads && formErrors.document_uploads[indexToRemove]) {
      const newDocErrors = { ...formErrors.document_uploads };
      delete newDocErrors[indexToRemove];
      setFormErrors(prev => ({ ...prev, document_uploads: newDocErrors }));
    }
  };

  const handleDocumentTypeChange = (indexToUpdate: number, type: string) => {
    setFormData(prev => ({
      ...prev,
      document_uploads: prev.document_uploads?.map((doc, index) => 
        index === indexToUpdate ? { ...doc, document_type: type } : doc
      ),
    }));
    // Clear validation error for this specific document's type field
    if (formErrors.document_uploads && 
        formErrors.document_uploads[indexToUpdate] && 
        formErrors.document_uploads[indexToUpdate].document_type) {
      const newDocErrors = { ...formErrors.document_uploads };
      const newIndexErrors = { ...newDocErrors[indexToUpdate] };
      delete newIndexErrors.document_type;
      newDocErrors[indexToUpdate] = newIndexErrors;
      if (Object.keys(newDocErrors[indexToUpdate]).length === 0) delete newDocErrors[indexToUpdate];
      setFormErrors(prev => ({ ...prev, document_uploads: newDocErrors }));
    }
  };

  const validateStep3 = (): boolean => {
    const errors: FormErrors = { ...formErrors, document_uploads: {}, general_document_upload: undefined }; 
    let isValid = true;

    if (formData.document_uploads && formData.document_uploads.length > 0) {
      formData.document_uploads.forEach((doc, index) => {
        const itemErrors: Partial<Record<keyof DocumentUploadData, string>> = {};
        if (!doc.document_type.trim()) {
          itemErrors.document_type = "Tip dokumenta je obavezan.";
          isValid = false;
        }
        // Add other file-specific validations here if needed (e.g., size, type)
        // For now, just checking document_type

        if (Object.keys(itemErrors).length > 0) {
          if (!errors.document_uploads) errors.document_uploads = {};
          errors.document_uploads[index] = itemErrors;
        }
      });
    } 
    // No specific general error for step 3 yet, unless e.g. no documents uploaded when required.
    // For now, it's optional to upload documents.

    setFormErrors(errors);
    return isValid;
  };

  const goToStep = (step: number) => {
    setError(null); // Clear general errors when navigating
    // Potentially clear step-specific errors if needed, or rely on re-validation
    setCurrentStep(step);
  };

  const handleNext = () => {
    setError(null); 
    let stepIsValid = false;
    if (currentStep === STEPS.DELIVERY_DETAILS) {
      stepIsValid = validateStep1();
    } else if (currentStep === STEPS.TANK_DISTRIBUTION) {
      stepIsValid = validateStep2();
    } else if (currentStep === STEPS.DOCUMENT_UPLOAD) {
      stepIsValid = validateStep3();
    } else if (currentStep === STEPS.REVIEW_SUBMIT) {
      // This case should ideally not be hit if button is "Submit"
      // but if it is, we proceed to handleSubmit
      handleSubmit();
      return;
    }

    if (stepIsValid) {
      // Clear errors for the validated step (simplified placeholder)
      if (currentStep === STEPS.DELIVERY_DETAILS) setFormErrors(prev => ({...prev, delivery_vehicle_plate: undefined, intake_datetime: undefined, fuel_type: undefined, fuel_category: undefined, quantity_liters_received: undefined, quantity_kg_received: undefined, specific_gravity: undefined }));
      if (currentStep === STEPS.TANK_DISTRIBUTION) setFormErrors(prev => ({...prev, tank_distributions: {}, general_tank_distribution: undefined }));
      if (currentStep === STEPS.DOCUMENT_UPLOAD) setFormErrors(prev => ({...prev, document_uploads: {}, general_document_upload: undefined }));
      
      const nextStep = currentStep + 1;
      if (nextStep <= STEPS.REVIEW_SUBMIT) { 
           setCurrentStep(nextStep);
       }
    } 
  };

  const handleBack = () => {
    setError(null);
    setSuccessMessage(null);
    // Clear specific errors for the step being left, if applicable
    if (currentStep === STEPS.REVIEW_SUBMIT) { /* No specific errors for review step itself */ }
    else if (currentStep === STEPS.DOCUMENT_UPLOAD) setFormErrors(prev => ({...prev, document_uploads: {}, general_document_upload: undefined }));
    else if (currentStep === STEPS.TANK_DISTRIBUTION) setFormErrors(prev => ({...prev, tank_distributions: {}, general_tank_distribution: undefined }));
    
    if (currentStep > STEPS.DELIVERY_DETAILS) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
        goToStep(STEPS.DELIVERY_DETAILS);
        setError("Molimo ispravite greške u Koraku 1: Detalji Dostave.");
        setSuccessMessage(null);
        return;
    }
    if (!validateStep2()) {
        goToStep(STEPS.TANK_DISTRIBUTION);
        setError("Molimo ispravite greške u Koraku 2: Raspodjela u Tankove.");
        setSuccessMessage(null);
        return;
    }
    if (!validateStep3()) {
        goToStep(STEPS.DOCUMENT_UPLOAD);
        setError("Molimo ispravite greške u Koraku 3: Upload Dokumenata.");
        setSuccessMessage(null);
        return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    // setFormErrors({}); // All specific errors should be cleared by validation success or fixed by user navigating back
    console.log("Form Data to submit (including files):", formData);

    try {
      // Prepare payload for createFuelIntake
      // Ensure all required fields for the payload are present and correctly typed.
      // The backend will also validate, but good to ensure structure here.
      if (!formData.delivery_vehicle_plate || !formData.intake_datetime || !formData.fuel_type || !formData.fuel_category ||
          formData.quantity_liters_received === undefined || formData.quantity_kg_received === undefined || formData.specific_gravity === undefined) {
        setError("Nedostaju obavezni podaci za kreiranje zapisa. Molimo provjerite Korak 1.");
        setSuccessMessage(null);
        setCurrentStep(STEPS.DELIVERY_DETAILS);
        setIsLoading(false);
        return;
      }
      
      const payload: CreateFuelIntakePayload = {
        delivery_vehicle_plate: formData.delivery_vehicle_plate!,
        delivery_vehicle_driver_name: formData.delivery_vehicle_driver_name || null,
        intake_datetime: formData.intake_datetime!,
        quantity_liters_received: formData.quantity_liters_received!,
        quantity_kg_received: formData.quantity_kg_received!,
        specific_gravity: formData.specific_gravity!,
        fuel_type: formData.fuel_type ? String(formData.fuel_type) : 'DIESEL', // Send as string, not number
        fuel_category: formData.fuel_category ? String(formData.fuel_category) : 'Domaće tržište',
        refinery_name: formData.refinery_name || null,
        supplier_name: formData.supplier_name || null,
        delivery_note_number: formData.delivery_note_number || null,
        customs_declaration_number: formData.customs_declaration_number || null,
        // Add price-related fields
        price_per_kg: formData.price_per_kg !== undefined ? formData.price_per_kg : null,
        currency: formData.currency ? String(formData.currency) : null,
        total_price: formData.total_price !== undefined ? formData.total_price : null,
        tank_distributions: formData.tank_distributions!
          .filter(dist => dist.tank_id && dist.quantity_liters)
          .map(dist => ({
            tank_id: dist.tank_id!,
            quantity_liters: dist.quantity_liters!,
          })),
      };

      console.log("Submitting main data:", payload);
      const intakeRecord: FuelIntakeRecord = await createFuelIntake(payload);
      const intakeRecordId = intakeRecord.id;
      console.log("Fuel intake record created successfully, ID:", intakeRecordId);
      // TODO: Use toast.success('Zapis o ulazu goriva uspješno kreiran!');

      const documentUploadErrorMessages: string[] = []; // Change to const
      if (formData.document_uploads && formData.document_uploads.length > 0) {
        console.log(`Attempting to upload ${formData.document_uploads.length} documents.`);
        for (const docUpload of formData.document_uploads) { // Ensure loop is correct
          try {
            console.log(`Uploading document: ${docUpload.file.name}, Type: ${docUpload.document_type}`);
            await uploadFuelIntakeDocument(intakeRecordId, docUpload.file, docUpload.document_type);
            console.log(`Successfully uploaded ${docUpload.file.name}.`);
            // TODO: toast.success(`Dokument ${docUpload.file.name} uspješno uploadovan.`);
          } catch (uploadError: any) {
            console.error(`Failed to upload document ${docUpload.file.name}:`, uploadError);
            // TODO: toast.error(`Greška pri uploadu dokumenta ${docUpload.file.name}: ${uploadError.message}`);
            documentUploadErrorMessages.push(`Greška pri uploadu '${docUpload.file.name}': ${uploadError.message}`); // Use .push
          }
        }
      }

      if (documentUploadErrorMessages.length > 0) { // Use .length
        // Partial success: main record created, some documents failed
        setError(`Zapis je kreiran (ID: ${intakeRecordId}), ali neki dokumenti nisu mogli biti uploadovani: ${documentUploadErrorMessages.join(', ')}`); // Use .join
        setSuccessMessage(null);
        // Optionally, still redirect or offer to retry uploads
        // For now, just shows an error and stays on the form.
        // router.push(`/dashboard/fuel/intakes/${intakeRecordId}`); // Or redirect to a page where they can manage documents
      } else {
        // Full success
        setSuccessMessage('Zapis o ulazu goriva i svi dokumenti uspješno sačuvani!');
        setError(null);
        // TODO: Implement toast.success('Zapis o ulazu goriva i svi dokumenti uspješno sačuvani!')
        router.push('/dashboard/fuel'); // Corrected redirect path
      }
    } catch (err: any) {
      console.error("Submission process error:", err);
      let errorMessage = 'Došlo je do greške prilikom čuvanja zapisa o ulazu goriva.';
      if (err.responseBody && err.responseBody.errors && Array.isArray(err.responseBody.errors)) {
        errorMessage = err.responseBody.errors.map((e: any) => e.msg || e.message).join('; ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setSuccessMessage(null);
      // TODO: Use toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };  
  
  // Helper component for Review Section Title
  const ReviewSection = ({ title, step, children }: { title: string, step: number, children: React.ReactNode }) => (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-lg font-semibold text-gray-700">{title}</h4>
        <Button variant="outline" size="sm" onClick={() => goToStep(step)} className="flex items-center">
          <Edit3 className="h-4 w-4 mr-2" /> Izmijeni
        </Button>
      </div>
      {children}
    </div>
  );

  // Helper to display a value or a placeholder if empty
  const displayValue = (value: string | number | undefined | null, placeholder: string = "Nije unešeno") => 
    value !== undefined && value !== null && value !== '' ? String(value) : <span className="text-gray-500 italic">{placeholder}</span>;


  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.DELIVERY_DETAILS:
        return (
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Osnovni Podaci o Dostavi</h3>
            </div>
            
            <div className="space-y-6">
              {/* Delivery Vehicle Information Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Informacije o Dostavnom Vozilu
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="delivery_vehicle_plate" className="text-gray-700">Registarska oznaka dostavne cisterne</Label>
                    <div className="relative">
                      <Input 
                        id="delivery_vehicle_plate" 
                        name="delivery_vehicle_plate" 
                        value={formData.delivery_vehicle_plate || ''} 
                        onChange={handleInputChange} 
                        className={`mt-1 pl-9 ${formErrors.delivery_vehicle_plate ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/>
                          <path d="M8 4v16"/>
                          <path d="M16 4v16"/>
                        </svg>
                      </div>
                    </div>
                    {formErrors.delivery_vehicle_plate && <p className="text-xs text-red-500 mt-1">{formErrors.delivery_vehicle_plate}</p>}
                  </div>
                  <div>
                    <Label htmlFor="delivery_vehicle_driver_name" className="text-gray-700">Ime vozača (opciono)</Label>
                    <div className="relative">
                      <Input 
                        id="delivery_vehicle_driver_name" 
                        name="delivery_vehicle_driver_name" 
                        value={formData.delivery_vehicle_driver_name || ''} 
                        onChange={handleInputChange} 
                        className="mt-1 pl-9 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date and Time Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Datum i Vrijeme
                </h4>
                <div>
                  <Label htmlFor="intake_datetime" className="text-gray-700">Datum i vrijeme ulaza</Label>
                  <div className="relative">
                    <Input 
                      id="intake_datetime" 
                      name="intake_datetime" 
                      type="datetime-local" 
                      value={formData.intake_datetime || ''} 
                      onChange={handleInputChange} 
                      className={`mt-1 pl-9 ${formErrors.intake_datetime ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                  </div>
                  {formErrors.intake_datetime && <p className="text-xs text-red-500 mt-1">{formErrors.intake_datetime}</p>}
                </div>
              </div>

              {/* Quantity Information Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/>
                    <path d="M6 9h12"/>
                    <path d="M6 12h12"/>
                    <path d="M6 15h12"/>
                  </svg>
                  Količina i Tip Goriva
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <Label htmlFor="quantity_liters_received" className="text-gray-700">Količina (L)</Label>
                    <div className="relative">
                      <Input 
                        id="quantity_liters_received" 
                        name="quantity_liters_received" 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={formData.quantity_liters_received || ''} 
                        onChange={handleInputChange}
                        className={`mt-1 pl-9 ${formErrors.quantity_liters_received ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 21h8"/>
                          <path d="M12 21v-5"/>
                          <path d="M10 3L4 9a1 1 0 0 0 0 1.41l8.59 8.59a1 1 0 0 0 1.41 0l8.59-8.59A1 1 0 0 0 22 9l-6-6-6 6"/>
                        </svg>
                      </div>
                    </div>
                    {formErrors.quantity_liters_received && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.quantity_liters_received}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="quantity_kg_received" className="text-gray-700">Količina (KG)</Label>
                    <div className="relative">
                      <Input 
                        id="quantity_kg_received" 
                        name="quantity_kg_received" 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={formData.quantity_kg_received || ''} 
                        onChange={handleInputChange}
                        className={`mt-1 pl-9 ${formErrors.quantity_kg_received ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 18h12"/>
                          <path d="M6 6h12"/>
                          <circle cx="18" cy="12" r="3"/>
                          <circle cx="6" cy="12" r="3"/>
                        </svg>
                      </div>
                    </div>
                    {formErrors.quantity_kg_received && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.quantity_kg_received}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="specific_gravity" className="text-gray-700">Spec. gustoća (kg/L)</Label>
                    <div className="relative">
                      <Input 
                        id="specific_gravity" 
                        name="specific_gravity" 
                        type="number" 
                        step="0.001"
                        min="0"
                        value={formData.specific_gravity || ''} 
                        readOnly
                        disabled
                        className="mt-1 pl-9 bg-gray-50 text-gray-500"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v18"/>
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 italic">Automatski izračunato</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">Unesite količinu u litrama i kilogramima, a specifična gustoća će biti automatski izračunata.</p>
                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Unesite ukupnu cijenu - druga vrijednost će biti automatski izračunata.
                </p>
                
                {/* Price Information Card */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-yellow-600">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Informacije o cijeni
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price_per_kg" className="text-gray-700">Cijena po KG</Label>
                      <div className="relative">
                        <Input 
                          id="price_per_kg" 
                          name="price_per_kg" 
                          type="text" 
                          value={formData.price_per_kg || ''} 
                          onChange={(e) => {
                            // Validacija unosa (dozvoli samo brojeve i decimale s do 3 decimalna mjesta)
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,3}$/.test(value)) {
                              handleInputChange({
                                target: {
                                  name: 'price_per_kg',
                                  value
                                }
                              } as React.ChangeEvent<HTMLInputElement>);
                              
                              // Izračun ukupne cijene ako imamo količinu
                              const pricePerKg = parseFloat(value);
                              if (!isNaN(pricePerKg) && formData.quantity_kg_received) {
                                const totalPrice = parseFloat((pricePerKg * formData.quantity_kg_received).toFixed(3));
                                setFormData(prev => ({
                                  ...prev,
                                  total_price: totalPrice
                                }));
                              }
                            }
                          }}
                          className="mt-1 pl-9 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                        </div>
                      </div>
                      {formErrors.price_per_kg && <p className="text-xs text-red-500 mt-1">{formErrors.price_per_kg}</p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="currency" className="text-gray-700">Valuta</Label>
                      <Select 
                        name="currency"
                        onValueChange={(value: string) => {
                          handleInputChange(value, 'currency');
                        }}
                        value={formData.currency || Currency.BAM}
                      >
                        <SelectTrigger className={`w-full mt-1 ${formErrors.currency ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Odaberite valutu" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Currency).map(currency => (
                            <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.currency && <p className="text-xs text-red-500 mt-1">{formErrors.currency}</p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="total_price" className="text-gray-700">Ukupna cijena</Label>
                      <div className="relative">
                        <Input 
                          id="total_price" 
                          name="total_price" 
                          type="text"
                          value={formData.total_price || ''} 
                          onChange={(e) => {
                            // Validacija unosa (dozvoli samo brojeve i decimale s do 3 decimalna mjesta)
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d{0,3}$/.test(value)) {
                              handleInputChange({
                                target: {
                                  name: 'total_price',
                                  value
                                }
                              } as React.ChangeEvent<HTMLInputElement>);
                              
                              // Izračun cijene po kg ako imamo količinu
                              const totalPrice = parseFloat(value);
                              if (!isNaN(totalPrice) && formData.quantity_kg_received && formData.quantity_kg_received > 0) {
                                const pricePerKg = parseFloat((totalPrice / formData.quantity_kg_received).toFixed(3));
                                setFormData(prev => ({
                                  ...prev,
                                  price_per_kg: pricePerKg
                                }));
                              }
                            }
                          }}
                          className="mt-1 pl-9 focus:ring-blue-500"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                            <path d="M12 8v8"/>
                            <path d="M16 12H8"/>
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 italic">Automatski izračunato</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="fuel_type" className="text-gray-700">Tip goriva</Label>
                  <Select 
                    name="fuel_type"
                    onValueChange={(value: string) => handleInputChange(value, 'fuel_type')}
                    value={formData.fuel_type || ''}
                  >
                    <SelectTrigger className={`w-full mt-1 ${formErrors.fuel_type ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Odaberite tip goriva" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(FuelType).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.fuel_type && <p className="text-xs text-red-500 mt-1">{formErrors.fuel_type}</p>}
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="fuel_category" className="text-gray-700">Kategorija</Label>
                  <Select 
                    name="fuel_category"
                    onValueChange={(value: string) => handleInputChange(value, 'fuel_category')}
                    value={formData.fuel_category || FuelCategory.DOMESTIC}
                  >
                    <SelectTrigger className={`w-full mt-1 ${formErrors.fuel_category ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Odaberite kategoriju" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(FuelCategory).map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.fuel_category && <p className="text-xs text-red-500 mt-1">{formErrors.fuel_category}</p>}
                </div>
              </div>

              {/* Documentation Card */}
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Dokumentacija
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="refinery_name" className="text-gray-700">Rafinerija</Label>
                    <div className="relative">
                      <Input 
                        id="refinery_name" 
                        name="refinery_name" 
                        value={formData.refinery_name || ''} 
                        onChange={handleInputChange} 
                        className="mt-1 pl-9 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/>
                          <path d="M7 8h10"/>
                          <path d="M7 12h10"/>
                          <path d="M7 16h10"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="supplier_name" className="text-gray-700">Dobavljač (opciono)</Label>
                    <div className="relative">
                      <Input 
                        id="supplier_name" 
                        name="supplier_name" 
                        value={formData.supplier_name || ''} 
                        onChange={handleInputChange} 
                        className="mt-1 pl-9 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="delivery_note_number" className="text-gray-700">Broj dostavnice (opciono)</Label>
                    <div className="relative">
                      <Input 
                        id="delivery_note_number" 
                        name="delivery_note_number" 
                        value={formData.delivery_note_number || ''} 
                        onChange={handleInputChange} 
                        className="mt-1 pl-9 focus:ring-blue-500"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customs_declaration_number" className="text-gray-700">Broj carinske prijave/MRN *</Label>
                    <div className="relative">
                      <Input 
                        id="customs_declaration_number" 
                        name="customs_declaration_number" 
                        value={formData.customs_declaration_number || ''} 
                        onChange={(e) => handleInputChange(e)}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${formErrors.customs_declaration_number ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Unesite broj carinske prijave/MRN"
                      />
                      {formErrors.customs_declaration_number && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.customs_declaration_number}</p>
                      )}
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <line x1="9" y1="9" x2="15" y2="9"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                          <line x1="9" y1="12" x2="15" y2="12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case STEPS.TANK_DISTRIBUTION:
        if (tanksLoading) return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Učitavanje dostupnih tankova...</p>
          </div>
        );
        
        if (tanksError) return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Greška pri učitavanju tankova</h3>
            <p className="text-red-600">{tanksError}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              Pokušaj ponovo
            </Button>
          </div>
        );
        
        const selectedFuelType = formData.fuel_type;
        if (!selectedFuelType) {
          return (
            <div>
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                    <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Raspodjela u Fiksne Tankove</h3>
              </div>
              <div className="flex p-6 mb-6 text-orange-800 border-l-4 border-orange-500 bg-orange-50" role="alert">
                <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                <div>
                  <span className="font-medium">Potreban tip goriva!</span> Molimo odaberite tip goriva u Koraku 1 da biste nastavili sa raspodjelom.
                </div>
              </div>
            </div>
          );
        }

        const tanksForSelectedFuelType = filteredAvailableTanks;
        const currentlySelectedTankIdsInStep2 = new Set(formData.tank_distributions?.map(d => d.tank_id).filter(id => id !== undefined));

        return (
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Raspodjela u Fiksne Tankove</h3>
            </div>
            
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  Pregled Količina
                </h4>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={distributeOptimallyByMRN}
                  disabled={isMRNDataLoading}
                  className="flex items-center gap-2 px-4 py-1 text-sm border-green-300 text-green-600 hover:bg-green-50 transition-colors duration-200"
                >
                  {isMRNDataLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                      Učitavanje...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        <path d="M9 14l2 2 4-4"></path>
                      </svg>
                      Optimalna MRN raspodjela
                    </>
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="text-sm text-gray-600 mb-1">Ukupno primljeno goriva:</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-lg font-bold text-blue-700">{formData.quantity_liters_received?.toFixed(2) || '0.00'} L</span>
                      <div className="text-xs text-blue-600 mt-1">Tip: {selectedFuelType}</div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                    </svg>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-600 mb-1">Ukupno raspoređeno do sada:</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className={`text-lg font-bold ${totalDistributedQuantity > (formData.quantity_liters_received || 0) ? 'text-red-600' : 'text-green-700'}`}>
                        {totalDistributedQuantity.toFixed(2)} L
                      </span>
                      <div className="text-xs text-green-600 mt-1">
                        {formData.tank_distributions?.filter(d => d.tank_id).length || 0} tankova odabrano
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Preostalo za raspodjelu:</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className={`text-lg font-bold ${((formData.quantity_liters_received || 0) - totalDistributedQuantity) < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {((formData.quantity_liters_received || 0) - totalDistributedQuantity).toFixed(2)} L
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {((formData.quantity_liters_received || 0) - totalDistributedQuantity) < 0 ? 'Prekoračenje količine!' : 'Dostupno za raspodjelu'}
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {formErrors.general_tank_distribution && (
              <div className="flex p-4 mb-6 text-red-800 border-l-4 border-red-500 bg-red-50" role="alert">
                <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                <div>
                  <span className="font-medium">Greška:</span> {formErrors.general_tank_distribution}
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="flex p-4 mb-6 text-green-800 border-l-4 border-green-500 bg-green-50" role="alert">
                <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                <div>
                  <span className="font-medium">Uspješno:</span> {successMessage}
                </div>
              </div>
            )}
            
            {mrnDataError && (
              <div className="flex p-4 mb-6 text-red-800 border-l-4 border-red-500 bg-red-50" role="alert">
                <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                <div>
                  <span className="font-medium">Greška MRN podataka:</span> {mrnDataError}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {formData.tank_distributions?.map((distribution, index) => {
                const tankError = formErrors.tank_distributions?.[index]?.tank_id;
                const qtyError = formErrors.tank_distributions?.[index]?.quantity_liters;
                const currentTankId = distribution.tank_id;

                const selectableTanks = tanksForSelectedFuelType.filter(
                  tank => tank.status === 'ACTIVE' && (tank.id === currentTankId || !currentlySelectedTankIdsInStep2.has(tank.id))
                );
                
                return (
                  <div key={index} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-md font-medium text-gray-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                          <path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/>
                          <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
                        </svg>
                        Tank #{index + 1}
                      </h5>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveTankDistribution(index)} 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 rounded-full" 
                        aria-label="Ukloni raspodjelu"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor={`tank_id_${index}`} className="text-gray-700 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-gray-500">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                            <line x1="9" y1="9" x2="9.01" y2="9"/>
                            <line x1="15" y1="9" x2="15.01" y2="9"/>
                          </svg>
                          Odaberite Tank (Tip: {selectedFuelType})
                        </Label>
                        {distribution.tank_id && tankMRNDataMap.get(distribution.tank_id.toString()) && (
                          <div className="mt-1 text-xs text-gray-600 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Najnoviji MRN datum: <span className="font-medium ml-1">{tankMRNDataMap.get(distribution.tank_id.toString())?.newestMRNDateString}</span>
                          </div>
                        )}
                        <Select
                          name={`tank_id_${index}`}
                          value={distribution.tank_id?.toString() || ''}
                          onValueChange={(value: string) => handleTankDistributionChange(index, 'tank_id', value)}
                        >
                          <SelectTrigger className={`w-full mt-1 ${tankError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}>
                            <SelectValue placeholder="Odaberite fiksni tank..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectableTanks.length === 0 && !currentTankId && <SelectItem value="no-tanks" disabled>Nema dostupnih tankova ovog tipa ili su svi već odabrani.</SelectItem>}
                            {selectableTanks.map(tank => (
                              <SelectItem key={tank.id} value={tank.id.toString()}>
                                {getTankDisplayInfo(tank.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {tankError && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {tankError}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`quantity_liters_${index}`} className="text-gray-700 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-gray-500">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                          </svg>
                          Količina za ovaj tank (L)
                        </Label>
                        <div className="relative">
                          <Input
                            id={`quantity_liters_${index}`}
                            name={`quantity_liters_${index}`}
                            type="number"
                            value={distribution.quantity_liters === undefined ? '' : distribution.quantity_liters}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTankDistributionChange(index, 'quantity_liters', e.target.value)}
                            placeholder="npr. 500"
                            step="0.01"
                            className={`mt-1 pl-9 ${qtyError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 21h8"/>
                              <path d="M12 21v-5"/>
                              <path d="M10 3L4 9a1 1 0 0 0 0 1.41l8.59 8.59a1 1 0 0 0 1.41 0l8.59-8.59A1 1 0 0 0 22 9l-6-6-6 6"/>
                            </svg>
                          </div>
                        </div>
                        {qtyError && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {qtyError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {tanksForSelectedFuelType.length > (formData.tank_distributions?.length || 0) ? (
              <div className="flex justify-center mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddTankDistribution} 
                  className="flex items-center gap-2 px-5 py-2 border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Dodaj Tank za Raspodjelu
                </Button>
              </div>
            ) : tanksForSelectedFuelType.length === 0 && !tanksLoading ? (
              <div className="flex p-6 mt-6 text-gray-700 border border-gray-200 rounded-lg bg-gray-50">
                <svg className="flex-shrink-0 w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <p className="font-medium">Nema dostupnih tankova</p>
                  <p className="text-sm text-gray-600 mt-1">Nema dostupnih aktivnih fiksnih tankova za tip goriva: <span className="font-semibold">{selectedFuelType}</span>.</p>
                </div>
              </div>
            ) : null}

          </div>
        );
      case STEPS.DOCUMENT_UPLOAD:
        return (
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Upload Dokumenata</h3>
            </div>
            
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Dodaj Dokumente
              </h4>
              
              <div className="mb-6">
                <Label 
                  htmlFor="file-upload-input"
                  className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-all duration-300 group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-blue-100 p-3 rounded-full mb-3 group-hover:bg-blue-200 transition-all duration-300">
                      <UploadCloud className="w-10 h-10 text-blue-500" />
                    </div>
                    <p className="mb-2 text-sm text-gray-700"><span className="font-semibold text-blue-600">Kliknite za upload</span> ili prevucite fajlove</p>
                    <p className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">PDF, JPG, PNG, DOCX (MAX. 5MB po fajlu)</p>
                  </div>
                  <input 
                    id="file-upload-input" 
                    ref={fileInputRef} 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileSelect}
                    // accept=".pdf,.jpg,.jpeg,.png,.docx" // Example accept types
                  />
                </Label>
                {formErrors.general_document_upload && (
                  <div className="flex p-3 mt-3 text-red-800 border-l-4 border-red-500 bg-red-50" role="alert">
                    <svg className="flex-shrink-0 w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    <div>{formErrors.general_document_upload}</div>
                  </div>
                )}
              </div>
            </div>

            {formData.document_uploads && formData.document_uploads.length > 0 && (
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-500">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Odabrani Dokumenti ({formData.document_uploads.length})
                </h4>
                <div className="space-y-4">
                  {formData.document_uploads.map((docUpload, index) => {
                    const docError = formErrors.document_uploads?.[index]?.document_type;
                    const fileType = docUpload.file.name.split('.').pop()?.toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileType || '');
                    const isPdf = fileType === 'pdf';
                    const isDoc = ['doc', 'docx'].includes(fileType || '');
                    
                    return (
                      <div key={index} className="flex items-start p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="mr-4 bg-gray-100 p-3 rounded-lg">
                          {isImage && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          )}
                          {isPdf && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <path d="M9 15h6"/>
                              <path d="M9 11h6"/>
                            </svg>
                          )}
                          {isDoc && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10 9 9 9 8 9"/>
                            </svg>
                          )}
                          {!isImage && !isPdf && !isDoc && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                              <polyline points="13 2 13 9 20 9"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm font-medium text-gray-800 mb-1">{docUpload.file.name}</p>
                          <div className="flex items-center">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{formatFileSize(docUpload.file.size)}</span>
                            {fileType && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full ml-2 uppercase">{fileType}</span>}
                          </div>
                          <div className="mt-3">
                            <Label htmlFor={`document_type_${index}`} className="text-xs text-gray-600 mb-1 block">Tip dokumenta</Label>
                            <div className="relative">
                              <Input 
                                id={`document_type_${index}`}
                                type="text"
                                placeholder="Unesite tip dokumenta (npr. Dostavnica)"
                                value={docUpload.document_type}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDocumentTypeChange(index, e.target.value)}
                                className={`pl-8 text-sm ${docError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                              />
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                              </div>
                            </div>
                            {docError && (
                              <p className="text-xs text-red-500 mt-1 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {docError}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveDocument(index)}
                          className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 rounded-full"
                          aria-label="Ukloni dokument"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {formData.document_uploads && formData.document_uploads.length === 0 && (
              <div className="flex p-6 text-gray-700 border border-gray-200 rounded-lg bg-gray-50">
                <svg className="flex-shrink-0 w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <p className="font-medium">Nema dokumenata</p>
                  <p className="text-sm text-gray-600 mt-1">Dodajte dokumente koristeći upload polje iznad.</p>
                </div>
              </div>
            )}
          </div>
        );
      case STEPS.REVIEW_SUBMIT:
        return (
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Pregled i Slanje</h3>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 font-medium">Molimo pregledajte sve unesene podatke prije finalnog slanja.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                      <rect x="1" y="3" width="15" height="13"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    Detalji Dostave
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => goToStep(STEPS.DELIVERY_DETAILS)}
                    className="text-xs flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Edit3 className="h-3 w-3" />
                    Izmijeni
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm bg-gray-50 p-4 rounded-lg">
                  <div className="flex">
                    <span className="text-gray-500 w-40">Reg. dost. cisterne:</span>
                    <span className="font-medium">{displayValue(formData.delivery_vehicle_plate)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Vozač:</span>
                    <span className="font-medium">{displayValue(formData.delivery_vehicle_driver_name)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Datum i vrijeme ulaza:</span>
                    <span className="font-medium">{displayValue(formData.intake_datetime ? new Date(formData.intake_datetime).toLocaleString() : undefined)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Tip goriva:</span>
                    <span className="font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{displayValue(formData.fuel_type)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Kategorija:</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${formData.fuel_category === 'Izvoz' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{displayValue(formData.fuel_category)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Količina (L):</span>
                    <span className="font-medium">{displayValue(formData.quantity_liters_received?.toFixed(2))}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Količina (KG):</span>
                    <span className="font-medium">{displayValue(formData.quantity_kg_received?.toFixed(2))}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Spec. gustoća (kg/L):</span>
                    <span className="font-medium">{displayValue(formData.specific_gravity)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Dobavljač:</span>
                    <span className="font-medium">{displayValue(formData.supplier_name)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Br. dostavnice:</span>
                    <span className="font-medium">{displayValue(formData.delivery_note_number)}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 w-40">Br. car. deklaracije:</span>
                    <span className="font-medium">{displayValue(formData.customs_declaration_number)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                      <path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/>
                      <path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/>
                    </svg>
                    Raspodjela u Fiksne Tankove
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => goToStep(STEPS.TANK_DISTRIBUTION)}
                    className="text-xs flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Edit3 className="h-3 w-3" />
                    Izmijeni
                  </Button>
                </div>
                
                {(!formData.tank_distributions || formData.tank_distributions.length === 0 || formData.tank_distributions.every(d => !d.tank_id)) ? (
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-500 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nema raspodjele u tankove.
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {formData.tank_distributions.filter(dist => dist.tank_id).map((dist, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border-b border-gray-200 last:border-0">
                          <div className="flex items-center">
                            <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium">{getTankDisplayInfo(dist.tank_id)}</span>
                          </div>
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            {displayValue(dist.quantity_liters?.toFixed(2))} L
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Ukupno raspoređeno:</span>
                      <span className="font-bold text-blue-700">{totalDistributedQuantity.toFixed(2)} L</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Priloženi Dokumenti
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => goToStep(STEPS.DOCUMENT_UPLOAD)}
                    className="text-xs flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Edit3 className="h-3 w-3" />
                    Izmijeni
                  </Button>
                </div>
                
                {(!formData.document_uploads || formData.document_uploads.length === 0) ? (
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-500 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nema priloženih dokumenata.
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {formData.document_uploads.map((doc, index) => {
                        const fileType = doc.file.name.split('.').pop()?.toLowerCase();
                        return (
                          <div key={index} className="flex items-center p-2 border-b border-gray-200 last:border-0">
                            <div className="mr-3">
                              {['jpg', 'jpeg', 'png', 'gif'].includes(fileType || '') && (
                                <div className="bg-blue-100 p-1 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                </div>
                              )}
                              {fileType === 'pdf' && (
                                <div className="bg-red-100 p-1 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                </div>
                              )}
                              {['doc', 'docx'].includes(fileType || '') && (
                                <div className="bg-blue-100 p-1 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                </div>
                              )}
                              {!['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'].includes(fileType || '') && (
                                <div className="bg-gray-100 p-1 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                    <polyline points="13 2 13 9 20 9"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium text-sm">{doc.file.name}</p>
                              <div className="flex items-center mt-1">
                                <span className="text-xs text-gray-500">{formatFileSize(doc.file.size)}</span>
                                <span className="mx-2 text-gray-300">|</span>
                                <span className="text-xs text-gray-500">Tip: {displayValue(doc.document_type)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <div className="flex p-4 mt-6 text-red-800 border-l-4 border-red-500 bg-red-50" role="alert">
                <svg className="flex-shrink-0 w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                <div>
                  <span className="font-medium">Greška:</span> {error}
                </div>
              </div>
            )}
            
            <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-700 text-sm">Kliknite na "Sačuvaj Zapis" ispod da potvrdite unos i sačuvate podatke o ulazu goriva.</p>
            </div>
          </div>
        );
      default:
        return <p>Nepoznat korak.</p>;
    }
  };

  // Determine the maximum step available (if review step is conditional)
  const maxSteps = STEPS.REVIEW_SUBMIT;

  // Helper function to determine step status for the step indicator
  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="p-8 bg-white shadow-lg rounded-xl max-w-5xl mx-auto border border-gray-100">
      <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Novi Zapis o Ulazu Goriva</h2>
      <p className="text-center text-gray-500 mb-8">Unesite podatke o novom ulazu goriva u sistem</p>
      
      {/* Modern Step Indicator */}
      <div className="mb-10">
        <div className="flex justify-between items-center relative">
          {/* Progress Line */}
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-gray-200 z-0"></div>
          <div 
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-blue-500 z-0 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep - 1) / (maxSteps - 1) * 100}%` }}
          ></div>
          
          {/* Step Circles */}
          {Object.values(STEPS).map((step, index) => (
            <div key={index} className="z-10 flex flex-col items-center">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm transition-all duration-300
                  ${getStepStatus(step) === 'completed' ? 'bg-blue-500 text-white' : 
                    getStepStatus(step) === 'current' ? 'bg-white border-2 border-blue-500 text-blue-500' : 
                    'bg-white border-2 border-gray-300 text-gray-400'}`}
              >
                {getStepStatus(step) === 'completed' ? '✓' : step}
              </div>
              <span 
                className={`mt-2 text-xs font-medium transition-all duration-300
                  ${getStepStatus(step) === 'completed' ? 'text-blue-500' : 
                    getStepStatus(step) === 'current' ? 'text-blue-500' : 
                    'text-gray-400'}`}
              >
                {step === STEPS.DELIVERY_DETAILS ? 'Osnovni Podaci' : 
                 step === STEPS.TANK_DISTRIBUTION ? 'Raspodjela' : 
                 step === STEPS.DOCUMENT_UPLOAD ? 'Dokumenti' : 'Pregled'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Error and Success Messages */}
      {error && currentStep !== STEPS.REVIEW_SUBMIT && (
        <div className="flex items-center p-4 mb-6 text-red-800 rounded-lg bg-red-50" role="alert">
          <svg className="flex-shrink-0 w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
          </svg>
          <span className="font-medium">Greška:</span> {error}
        </div>
      )}

      {successMessage && currentStep !== STEPS.REVIEW_SUBMIT && (
        <div className="flex items-center p-4 mb-6 text-green-800 rounded-lg bg-green-50" role="alert">
          <svg className="flex-shrink-0 w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
          </svg>
          <span className="font-medium">Uspjeh:</span> {successMessage}
        </div>
      )}

      {/* Form Content */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          onClick={handleBack} 
          variant="outline" 
          disabled={currentStep === STEPS.DELIVERY_DETAILS || isLoading}
          className="px-6 py-2 flex items-center gap-2 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Nazad
        </Button>
        {currentStep < maxSteps ? (
          <Button 
            onClick={handleNext} 
            disabled={isLoading || (currentStep === STEPS.TANK_DISTRIBUTION && tanksLoading)}
            className="px-6 py-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all duration-200"
          >
            Naprijed
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="px-6 py-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-all duration-200"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Slanje...
              </>
            ) : (
              <>
                Sačuvaj Zapis
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 