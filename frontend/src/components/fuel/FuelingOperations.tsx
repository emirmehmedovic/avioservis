import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

// Import types
import { 
  FuelingOperation, 
  FuelingOperationFormData, 
  FuelingOperationsApiResponse, 
  FuelTankFE, 
  AirlineFE 
} from './types';

// Prošireni tipovi koji uključuju usd_exchange_rate polje
interface ExtendedFuelingOperationFormData extends FuelingOperationFormData {
  usd_exchange_rate?: string;
}

interface ExtendedFuelingOperation extends FuelingOperation {
  usd_exchange_rate?: string;
}

import { FuelPriceRule } from '@/types/fuel'; // Corrected import path for FuelPriceRule

// Import components
import FilterSection from './components/FilterSection';
import OperationsTable from './components/OperationsTable';
import AddOperationForm from './components/AddOperationForm';
import OperationDetailsModal from './components/OperationDetailsModal';

// Import services and utilities
import { 
  fetchOperations, 
  fetchTanks, 
  fetchAirlines, 
  addFuelingOperation,
  deleteFuelingOperation,
  fetchFuelingOperation
} from './services/fuelingOperationsService';
import { getFuelPriceRules, clearMobileTankCustomsCache, clearFixedTankCustomsCache } from '@/lib/apiService'; // Added import for fetching rules and cache invalidation
import { 
  formatDate, 
  generatePDFInvoice, 
  API_BASE_URL, 
  prepareLocalTimeForServer, 
  getCurrentLocalDateTime 
} from './utils/helpers';
import { generateConsolidatedPDFInvoice } from './utils/consolidatedInvoice';
import { generateConsolidatedXMLInvoice, downloadXML } from './utils/xmlInvoice';
import { generateConsolidatedDomesticPDFInvoice } from './utils/domesticInvoice';

export default function FuelingOperations() {
  // State for operations data
  const [operations, setOperations] = useState<ExtendedFuelingOperation[]>([]);
  const [tanks, setTanks] = useState<FuelTankFE[]>([]);
  const [airlines, setAirlines] = useState<AirlineFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLiters, setTotalLiters] = useState<number>(0);
  const [fuelPriceRules, setFuelPriceRules] = useState<FuelPriceRule[]>([]); // Added state for fuel price rules
  
  // State for UI controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOperationForDetails, setSelectedOperationForDetails] = useState<ExtendedFuelingOperation | null>(null);
  
  // State for filters
  const [startDate, setStartDate] = useState<string | null>(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string | null>(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [selectedAirline, setSelectedAirline] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedTank, setSelectedTank] = useState<string>('');
  const [selectedTrafficType, setSelectedTrafficType] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [deliveryVoucherFilter, setDeliveryVoucherFilter] = useState<string>('');
  
  // State for form
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [modalAvailableDestinations, setModalAvailableDestinations] = useState<string[]>([]);
  const [formData, setFormData] = useState<ExtendedFuelingOperationFormData>({
    dateTime: getCurrentLocalDateTime(), // Koristi lokalno vrijeme za BA
    aircraft_registration: '',
    airlineId: '',
    destination: '',
    quantity_liters: 0,
    specific_density: 0.8,
    quantity_kg: 0,
    price_per_kg: 0,
    discount_percentage: 0, // Inicijalno nema rabata
    currency: 'BAM',
    usd_exchange_rate: '', // Kurs USD u BAM (ako je valuta USD)
    total_amount: 0,
    tankId: '',
    flight_number: '',
    operator_name: '',
    notes: '',
    tip_saobracaja: 'Izvoz',
    delivery_note_number: '', // Dodano polje za broj dostavnice
  });
  
  // Dodatno stanje za tekstualni prikaz polja
  const [textInputs, setTextInputs] = useState({
    quantity_liters: '',
    quantity_kg: '',
    price_per_kg: '',
    discount_percentage: '',
  });

  // Reset form funkcija je definirana kasnije

  // Fetch operations with filters
  const loadOperations = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchOperations(
        startDate,
        endDate,
        selectedAirline,
        selectedDestination,
        selectedTank,
        selectedTrafficType,
        selectedCurrency,
        deliveryVoucherFilter
      );
      
      setOperations(result.operations);
      setTotalLiters(result.totalLiters);
    } catch (error) {
      console.error("Failed to fetch fueling operations:", error);
      toast.error("Greška pri učitavanju operacija točenja.");
      setOperations([]);
      setTotalLiters(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedAirline, selectedDestination, selectedTank, selectedTrafficType, selectedCurrency, deliveryVoucherFilter]);

  // Load tanks
  const loadTanks = useCallback(async () => {
    try {
      const data = await fetchTanks();
      setTanks(data);
      setFormData((prev: FuelingOperationFormData) => {
        if (data.length > 0 && !prev.tankId) {
          return { ...prev, tankId: data[0].id.toString() };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error("Greška pri učitavanju tankera.");
    }
  }, []);

  // Load airlines
  const loadAirlines = useCallback(async () => {
    try {
      const data = await fetchAirlines();
      setAirlines(data);
      setFormData((prev: FuelingOperationFormData) => {
        // Set default airline only if not already set and airlines are fetched
        if (data.length > 0 && !prev.airlineId) {
          const firstAirline = data[0];
          const destinations = firstAirline?.operatingDestinations;
          if (destinations && destinations.length > 0) {
            setModalAvailableDestinations(destinations);
            return { ...prev, airlineId: firstAirline.id.toString() };
          } else {
            setModalAvailableDestinations([]);
            return { ...prev, airlineId: firstAirline.id.toString() };
          }
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching airlines:', error);
      toast.error("Greška pri učitavanju avio kompanija.");
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    loadOperations();
    loadTanks();
    loadAirlines();
  }, [loadOperations, loadTanks, loadAirlines]);

  // Fetch fuel price rules on component mount
  useEffect(() => {
    const loadFuelPriceRules = async () => {
      try {
        const rules = await getFuelPriceRules();
        setFuelPriceRules(rules || []);
      } catch (error) {
        console.error("Failed to fetch fuel price rules:", error);
        toast.error("Greška pri učitavanju pravila o cijenama goriva.");
        setFuelPriceRules([]); // Set to empty array on error
      }
    };
    loadFuelPriceRules();
  }, []); // Empty dependency array ensures this runs once on mount

  // Debug: Log operations data to check for delivery_note_number field
  useEffect(() => {
    if (operations.length > 0) {
      console.log('Operations data:', operations);
      console.log('First operation fields:', Object.keys(operations[0]));
    }
  }, [operations]);

  // Handle form input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`handleInputChange: ${name} = ${value}`); // Dodajemo log za debugging

    // Start with current form data
    const newFormData = { ...formData };

    // Handle file input separately
    if (e.target.type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Dodaj nove dokumente u postojeći niz
        const newFiles = Array.from(files);
        // Filtriraj samo PDF dokumente i druge dozvoljene formate
        const allowedFiles = newFiles.filter(file => 
          file.type === 'application/pdf' || 
          file.type === 'text/plain' || 
          file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type.startsWith('image/')
        );
        
        if (allowedFiles.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...allowedFiles]);
        }
      }
      return; // Exit early for file inputs
    }

    // Update the specific field that changed
    const formKey = name as keyof typeof formData;

    // Posebno rukovanje za usd_exchange_rate polje
    if (formKey === 'usd_exchange_rate') {
      const extendedFormData = newFormData as ExtendedFuelingOperationFormData;
      extendedFormData.usd_exchange_rate = value;
      console.log(`Setting usd_exchange_rate to: ${value}`); // Dodajemo log za debugging
      setFormData(extendedFormData);
      return;
    }
    
    // Posebno rukovanje za promjenu valute
    if (formKey === 'currency') {
      newFormData.currency = value;
      console.log(`Currency changed to: ${value}`);
      
      // Postavi odgovarajući exchange rate ovisno o valuti
      if (value === 'EUR') {
        // Za EUR koristimo fiksni kurs
        (newFormData as ExtendedFuelingOperationFormData).usd_exchange_rate = '1.955830';
        console.log('Setting fixed EUR exchange rate in handleInputChange');
      } else if (value === 'BAM') {
        // Za BAM postavljamo prazan string koji će backend tretirati kao null
        (newFormData as ExtendedFuelingOperationFormData).usd_exchange_rate = '';
        console.log('Setting empty exchange rate for BAM in handleInputChange');
      } else if (value === 'USD') {
        // Za USD, resetiraj kurs da korisnik može unijeti vlastiti
        (newFormData as ExtendedFuelingOperationFormData).usd_exchange_rate = '';
        console.log('Clearing exchange rate for USD in handleInputChange');
      }
      
      setFormData(newFormData);
      return;
    }
    
    // Handle numeric inputs that are now text inputs
    if (['quantity_liters', 'quantity_kg', 'price_per_kg', 'discount_percentage'].includes(formKey as string)) {
      // Provjera valjanosti unosa za sva tekstualna polja s brojevima
      const validationPatterns = {
        'quantity_liters': /^\d*(\.\d{0,2})?$/,
        'quantity_kg': /^\d*(\.\d{0,2})?$/,
        'price_per_kg': /^\d*(\.\d{0,5})?$/,
        'discount_percentage': /^\d*(\.\d{0,2})?$/
      };
      
      // Ažuriraj tekstualno stanje za prikaz u poljima
      setTextInputs(prev => ({
        ...prev,
        [formKey]: value
      }));
      
      // Provjeri da li je unos prazan ili validan broj prema odgovarjućem obrascu
      const pattern = validationPatterns[formKey as keyof typeof validationPatterns];
      if (value === '' || pattern.test(value)) {
        // Samo za interni izračun koristimo zaokruživanje, ali ne mijenjamo prikaz u polju
        const numValue = value === '' ? 0 : parseFloat(value);
        // Zaokruženi broj za pohranu u formData
        const roundedValue = value === '' ? 0 : parseFloat(parseFloat(value).toFixed(2));
        
        // Type-safe assignment for numeric fields
        if (formKey === 'quantity_kg') {
          // Ažuriramo kilograme direktno - bez automatskog izračuna litara
          // Koristimo zaokruženu vrijednost za pohranu ali ne mijenjamo prikaz
          newFormData.quantity_kg = roundedValue;
          
          // Ažuriramo prikaz u polju - zadržavamo korisnikov unos za bolje tipkanje
          setTextInputs(prev => ({
            ...prev,
            quantity_kg: value // Zadržavamo originalni unos korisnika za bolju interakciju
          }));
          
          // Ako su i kilogrami i litre veći od 0, izračunajmo specifičnu gustoću
          if (numValue > 0 && newFormData.quantity_liters > 0) {
            // Izračunaj specifičnu gustoću kao kg/L
            const calculatedDensity = numValue / newFormData.quantity_liters;
            // Zaokruži na 3 decimale i spremi
            newFormData.specific_density = parseFloat(calculatedDensity.toFixed(3));
          }
        } else if (formKey === 'quantity_liters') {
          // Ažuriraj litre
          newFormData.quantity_liters = numValue;
          
          // Ako su i kilogrami i litre veći od 0, izračunajmo specifičnu gustoću
          if (numValue > 0 && newFormData.quantity_kg > 0) {
            // Izračunaj specifičnu gustoću kao kg/L
            const calculatedDensity = newFormData.quantity_kg / numValue;
            // Zaokruži na 3 decimale i spremi
            newFormData.specific_density = parseFloat(calculatedDensity.toFixed(3));
          }
        } else if (formKey === 'price_per_kg') {
          newFormData.price_per_kg = numValue;
        } else if (formKey === 'discount_percentage') {
          // Ograniči rabat na raspon 0-100%
          newFormData.discount_percentage = Math.min(Math.max(numValue, 0), 100);
        }
        
        // Ako se promijenila gustoća, ažuriraj izračun litara iz kilograma
        if (formKey === 'specific_density' && numValue > 0 && newFormData.quantity_kg > 0) {
          const calculatedLiters = newFormData.quantity_kg / numValue;
          newFormData.quantity_liters = parseFloat(calculatedLiters.toFixed(2));
          
          // Ažuriramo prikaz litara
          setTextInputs(prev => ({
            ...prev,
            quantity_liters: calculatedLiters.toFixed(2)
          }));
        }
      } else {
        // Ako nije validan format, zadrži prethodnu vrijednost
        return;
      }
      
      // Izračunaj ukupan iznos plaćanja nakon promjene količine, cijene ili rabata
      const baseAmount = newFormData.quantity_kg * newFormData.price_per_kg;
      const discountAmount = baseAmount * (newFormData.discount_percentage / 100);
      newFormData.total_amount = +(baseAmount - discountAmount).toFixed(5); // 5 decimalnih mjesta za precizniji izračun
    } else {
      // Type-safe assignment for string fields
      if (formKey === 'dateTime') newFormData.dateTime = value;
      else if (formKey === 'aircraft_registration') newFormData.aircraft_registration = value;
      else if (formKey === 'airlineId') newFormData.airlineId = value;
      else if (formKey === 'destination') newFormData.destination = value;
      else if (formKey === 'tankId') newFormData.tankId = value;
      else if (formKey === 'flight_number') newFormData.flight_number = value;
      else if (formKey === 'operator_name') newFormData.operator_name = value;
      else if (formKey === 'notes') newFormData.notes = value;
      else if (formKey === 'tip_saobracaja') newFormData.tip_saobracaja = value;
      else if (formKey === 'delivery_note_number') newFormData.delivery_note_number = value;
      // Rukovanje s currency je premješteno na početak funkcije
    }

    // If airlineId changed, update available destinations and reset destination field
    if (formKey === 'airlineId') {
      const airlineIdNum = parseInt(value);
      const selectedAirlineData = airlines.find(a => a.id === airlineIdNum);
      
      const destinations = selectedAirlineData?.operatingDestinations;
      if (destinations && destinations.length > 0) {
        setModalAvailableDestinations(destinations);
        newFormData.destination = ''; // Reset destination
      } else {
        setModalAvailableDestinations([]);
        newFormData.destination = ''; // Reset destination
      }
    }
    
    setFormData(newFormData);
  }, [formData, setFormData, setSelectedFiles, setTextInputs]);

  // Reset form to default values
  const resetForm = () => {
    const defaultAirlineId = (airlines || []).length > 0 ? airlines[0].id.toString() : '';
    let initialDestinations: string[] = [];
    const initialDestinationValue = '';

    if (defaultAirlineId && (airlines || []).length > 0) {
      const firstAirline = airlines.find(a => a.id.toString() === defaultAirlineId);
      const destinations = firstAirline?.operatingDestinations;
      if (destinations && destinations.length > 0) {
        initialDestinations = destinations;
      }
    }

    setFormData({
      dateTime: getCurrentLocalDateTime(),  // Koristi lokalno BA vrijeme
      aircraft_registration: '',
      airlineId: defaultAirlineId,
      destination: initialDestinationValue,
      quantity_liters: 0,
      specific_density: 0.8,
      quantity_kg: 0,
      price_per_kg: 0,
      discount_percentage: 0,
      currency: 'BAM',
      total_amount: 0,
      tankId: (tanks || []).length > 0 ? tanks[0].id.toString() : '',
      flight_number: '',
      operator_name: '',
      notes: '',
      tip_saobracaja: 'Izvoz',
      delivery_note_number: '', // Dodano polje za broj dostavnice
    });
    setModalAvailableDestinations(initialDestinations);
    setSelectedFiles([]);
    setTextInputs({
      quantity_liters: '',
      quantity_kg: '',
      price_per_kg: '',
      discount_percentage: ''
    });
  };

  // Handle adding a new operation
  const handleAddOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.aircraft_registration) {
      toast.error('Unesite registraciju aviona');
      return;
    }
    if (!formData.airlineId) {
      toast.error('Odaberite avio kompaniju');
      return;
    }
    if (!formData.destination) {
      toast.error('Unesite ili odaberite destinaciju');
      return;
    }
    // VALIDACIJA: Kilograme i litre validiramo ravnopravno
    if (formData.quantity_kg <= 0) {
      toast.error('Količina goriva u kilogramima mora biti veća od 0');
      return;
    }
    if (formData.quantity_liters <= 0) {
      toast.error('Količina goriva u litrama mora biti veća od 0');
      return;
    }
    
    // Provjera specifične gustoće - izračunava se automatski ako su litre i kilogrami uneseni
    if (formData.specific_density <= 0) {
      // Ako specifična gustoća još nije izračunata, izračunajmo je sada
      if (formData.quantity_kg > 0 && formData.quantity_liters > 0) {
        const calculatedDensity = formData.quantity_kg / formData.quantity_liters;
        formData.specific_density = parseFloat(calculatedDensity.toFixed(3));
      } else {
        toast.error('Nije moguće izračunati specifičnu gustoću - provjerite kg i litre');
        return;
      }
    }
    if (!formData.tankId) {
      toast.error('Odaberite tanker');
      return;
    }
    if (!formData.operator_name) {
      toast.error('Unesite ime operatera');
      return;
    }

    try {
      const submissionFormData = new FormData();
      
      // Convert string values to numbers for numeric fields
      const airlineIdNum = parseInt(formData.airlineId as string, 10);
      const tankIdNum = parseInt(formData.tankId as string, 10);
      
      // Konvertiraj lokalno vrijeme u UTC format prije slanja na server
      const utcDateTime = prepareLocalTimeForServer(formData.dateTime);
      
      // Add all form data with proper type conversion
      submissionFormData.append('dateTime', utcDateTime);
      submissionFormData.append('aircraft_registration', formData.aircraft_registration);
      submissionFormData.append('airlineId', airlineIdNum.toString());
      submissionFormData.append('destination', formData.destination);
      submissionFormData.append('quantity_liters', formData.quantity_liters.toString());
      submissionFormData.append('specific_density', formData.specific_density.toString());
      submissionFormData.append('quantity_kg', formData.quantity_kg.toString());
      submissionFormData.append('price_per_kg', formData.price_per_kg.toString());
      submissionFormData.append('discount_percentage', formData.discount_percentage.toString());
      submissionFormData.append('currency', formData.currency);
      
      // Add exchange rate for USD or EUR currencies
      if (formData.currency === 'USD' || formData.currency === 'EUR') {
        submissionFormData.append('usd_exchange_rate', formData.usd_exchange_rate || (formData.currency === 'EUR' ? '1.955830' : ''));
      }
      
      submissionFormData.append('total_amount', formData.total_amount.toString());
      submissionFormData.append('tankId', tankIdNum.toString());
      submissionFormData.append('flight_number', formData.flight_number || '');
      submissionFormData.append('operator_name', formData.operator_name);
      submissionFormData.append('notes', formData.notes || '');
      submissionFormData.append('tip_saobracaja', formData.tip_saobracaja || '');
      submissionFormData.append('delivery_note_number', formData.delivery_note_number || '');
      
      // Add documents if any
      if ((selectedFiles || []).length > 0) {
        selectedFiles.forEach((file) => {
          submissionFormData.append('documents', file);
        });
      }
      
      await addFuelingOperation(submissionFormData);
      
      // Invalidacija keša za MRN podatke nakon dodavanja operacije
      if (tankIdNum) {
        console.log(`Invalidating tank customs cache after add operation for tankId: ${tankIdNum}`);
        // Invalidiramo keš za oba tipa tanka (mobilni i fiksni) da budemo sigurni
        clearMobileTankCustomsCache(tankIdNum);
        clearFixedTankCustomsCache(tankIdNum);
      }
      
      // Jednostavno rješenje: postavi flag u localStorage da se podaci trebaju osvježiti
      localStorage.setItem('fuelingOperationCompleted', Date.now().toString());
      
      toast.success('Operacija točenja uspješno dodana');
      setShowAddModal(false);
      resetForm();
      loadOperations();
      loadTanks();
    } catch (error) {
      console.error('Error adding fueling operation:', error);
      toast.error('Došlo je do greške prilikom dodavanja operacije točenja');
    }
  };

  // Handle row click to show details
  const handleRowClick = async (operation: FuelingOperation) => {
    // Prvo postavimo trenutnu operaciju da se prikaže modalni prozor odmah
    setSelectedOperationForDetails(operation);
    setShowDetailsModal(true);
    
    // Zatim dohvatimo svježe podatke s backenda koristeći autenticirani API poziv
    try {
      const freshData = await fetchFuelingOperation(operation.id);
      console.log('Fetched operation details:', freshData);
      if (freshData) {
        // Ažuriramo operaciju s novim podacima
        setSelectedOperationForDetails(freshData);
      }
    } catch (error) {
      console.error('Error in handleRowClick:', error);
      toast.error('Greška pri dohvaćanju detalja operacije');
    }
  };
  
  // Handle delete operation
  const handleDeleteOperation = async (operation: FuelingOperation, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    
    // Confirm deletion
    if (!confirm(`Jeste li sigurni da želite obrisati operaciju točenja za ${operation.airline?.name || 'N/A'} (${operation.aircraft_registration || 'N/A'})? \n\nOva akcija će vratiti ${operation.quantity_liters ? operation.quantity_liters.toLocaleString('hr-HR', { minimumFractionDigits: 2 }) : '0'} litara goriva u cisternu ${operation.tank?.name || 'N/A'}.`)) {
      return;
    }
    
    try {
      await deleteFuelingOperation(operation.id);
      
      // Invalidacija keša za MRN podatke nakon brisanja operacije
      if (operation.tankId) {
        console.log(`Invalidating tank customs cache after delete operation for tankId: ${operation.tankId}`);
        // Invalidiramo keš za oba tipa tanka (mobilni i fiksni) da budemo sigurni
        clearMobileTankCustomsCache(operation.tankId);
        clearFixedTankCustomsCache(operation.tankId);
      }
      
      toast.success('Operacija točenja uspješno obrisana');
      // Refresh operations list
      loadOperations();
    } catch (error) {
      console.error('Error deleting fueling operation:', error);
      toast.error('Greška pri brisanju operacije točenja');
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 fuel-operations-small-screen" style={{ maxWidth: '100%', width: '100%' }}>
      {/* Header with title and action buttons */}
      <div className="p-6 rounded-xl text-white relative overflow-hidden">
        {/* Background gradient matching other components */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] backdrop-blur-md border border-white/10 z-0"></div>
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F08080] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        {/* Glass highlight effect - matching tab header */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 14C20 14 18 10 12 10C6 10 4 14 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Operacije Točenja Goriva
            </h2>
            <p className="text-sm opacity-80 mt-1">Pregled i upravljanje operacijama točenja goriva u avione</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="mt-4 sm:mt-0 px-4 py-2 backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium rounded-xl flex items-center gap-2 relative z-10"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dodaj Operaciju
          </button>
        </div>
        
        {/* Filter Section */}
        <div className="relative z-10">
          <FilterSection 
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          selectedAirline={selectedAirline}
          setSelectedAirline={setSelectedAirline}
          selectedDestination={selectedDestination}
          setSelectedDestination={setSelectedDestination}
          selectedTank={selectedTank}
          setSelectedTank={setSelectedTank}
          selectedTrafficType={selectedTrafficType}
          setSelectedTrafficType={setSelectedTrafficType}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          deliveryVoucher={deliveryVoucherFilter}
          setDeliveryVoucher={setDeliveryVoucherFilter}
          airlines={airlines}
          tanks={tanks}
        />
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 border-opacity-50 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-indigo-700 font-medium">Učitavanje operacija točenja goriva...</p>
            </div>
          </div>
        ) : (operations || []).length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nema operacija</h3>
            <p className="mt-1 text-sm text-gray-500">Nema operacija točenja goriva koje odgovaraju zadatim filterima ili nema unesenih operacija.</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Dodaj Prvu Operaciju
            </button>
          </div>
        ) : (
          <div className="overflow-hidden w-full">
            <OperationsTable 
              operations={operations} 
              handleRowClick={handleRowClick}
              handleDeleteOperation={handleDeleteOperation}
            />
            
            {/* Consolidated Invoice Button */}
            <div className="mt-6 flex space-x-3">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generisanje Zbirnih Dokumenata
                </h3>
                <p className="text-xs text-gray-500 mb-4">Izaberite tip dokumenta koji želite generisati za trenutno filtrirane operacije</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Export PDF Invoice Card */}
                  <button
                    type="button"
                    onClick={() => {
                      // Prepare filter description
                      const filterDesc: string[] = [];
                      if (startDate) filterDesc.push(`Od: ${formatDate(dayjs(startDate).startOf('day').toISOString())}`);
                      if (endDate) filterDesc.push(`Do: ${formatDate(dayjs(endDate).endOf('day').toISOString())}`);
                      if (selectedAirline) {
                        const airline = airlines.find(a => a.id.toString() === selectedAirline);
                        if (airline) filterDesc.push(`Kompanija: ${airline.name}`);
                      }
                      if (selectedDestination) filterDesc.push(`Destinacija: ${selectedDestination}`);
                      if (selectedTank) {
                        const tank = tanks.find(t => t.id.toString() === selectedTank);
                        if (tank) filterDesc.push(`Tanker: ${tank.identifier} - ${tank.name}`);
                      }
                      if (selectedTrafficType) filterDesc.push(`Tip saobraćaja: ${selectedTrafficType}`);
                      if (selectedCurrency) filterDesc.push(`Valuta: ${selectedCurrency}`);
                      
                      const filterDescription = filterDesc.length > 0 
                        ? filterDesc.join(', ') 
                        : 'Sve operacije';
                      
                      try {
                        generateConsolidatedPDFInvoice(operations, filterDescription);
                        toast.success('Zbirna PDF faktura je uspješno generisana!');
                      } catch (error) {
                        console.error('Error generating consolidated PDF invoice:', error);
                        toast.error('Došlo je do greške prilikom generisanja zbirne PDF fakture.');
                      }
                    }}
                    className={`group relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col h-full ${operations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={operations.length === 0}
                    title="Standardna faktura za izvoz"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Zbirna PDF Faktura</h4>
                        <p className="text-xs text-gray-500">Za izvoz</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 flex-grow">Standardna faktura bez PDV-a za izvozne operacije točenja goriva</p>
                    <div className="flex justify-end">
                      <span className="inline-flex items-center text-xs font-medium text-green-600 group-hover:text-green-700">
                        Generiši
                        <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                    </div>
                  </button>

                  {/* Domestic PDF Invoice Card */}
                  <button
                    type="button"
                    onClick={() => {
                      // Prepare filter description
                      const filterDesc: string[] = [];
                      if (startDate) filterDesc.push(`Od: ${formatDate(dayjs(startDate).startOf('day').toISOString())}`);
                      if (endDate) filterDesc.push(`Do: ${formatDate(dayjs(endDate).endOf('day').toISOString())}`);
                      if (selectedAirline) {
                        const airline = airlines.find(a => a.id.toString() === selectedAirline);
                        if (airline) filterDesc.push(`Kompanija: ${airline.name}`);
                      }
                      if (selectedDestination) filterDesc.push(`Destinacija: ${selectedDestination}`);
                      if (selectedTank) {
                        const tank = tanks.find(t => t.id.toString() === selectedTank);
                        if (tank) filterDesc.push(`Tanker: ${tank.identifier} - ${tank.name}`);
                      }
                      if (selectedTrafficType) filterDesc.push(`Tip saobraćaja: ${selectedTrafficType}`);
                      if (selectedCurrency) filterDesc.push(`Valuta: ${selectedCurrency}`);
                      
                      const filterDescription = filterDesc.length > 0 
                        ? filterDesc.join(', ') 
                        : 'Sve operacije';
                      
                      try {
                        generateConsolidatedDomesticPDFInvoice(operations, filterDescription);
                        toast.success('Zbirna domaća faktura je uspješno generisana!');
                      } catch (error) {
                        console.error('Error generating consolidated domestic invoice:', error);
                        toast.error('Došlo je do greške prilikom generisanja zbirne domaće fakture.');
                      }
                    }}
                    className={`group relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col h-full ${operations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={operations.length === 0}
                    title="Faktura za unutarnji saobraćaj sa PDV-om"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V9" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12h-6" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Zbirna Domaća Faktura</h4>
                        <p className="text-xs text-gray-500">Sa PDV-om</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 flex-grow">Faktura sa obračunatim PDV-om za unutarnji saobraćaj</p>
                    <div className="flex justify-end">
                      <span className="inline-flex items-center text-xs font-medium text-purple-600 group-hover:text-purple-700">
                        Generiši
                        <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                    </div>
                  </button>

                  {/* XML Invoice Card */}
                  <button
                    type="button"
                    onClick={() => {
                      // Prepare filter description
                      const filterDesc: string[] = [];
                      if (startDate) filterDesc.push(`Od: ${formatDate(dayjs(startDate).startOf('day').toISOString())}`);
                      if (endDate) filterDesc.push(`Do: ${formatDate(dayjs(endDate).endOf('day').toISOString())}`);
                      if (selectedAirline) {
                        const airline = airlines.find(a => a.id.toString() === selectedAirline);
                        if (airline) filterDesc.push(`Kompanija: ${airline.name}`);
                      }
                      if (selectedDestination) filterDesc.push(`Destinacija: ${selectedDestination}`);
                      if (selectedTank) {
                        const tank = tanks.find(t => t.id.toString() === selectedTank);
                        if (tank) filterDesc.push(`Tanker: ${tank.identifier} - ${tank.name}`);
                      }
                      if (selectedTrafficType) filterDesc.push(`Tip saobraćaja: ${selectedTrafficType}`);
                      if (selectedCurrency) filterDesc.push(`Valuta: ${selectedCurrency}`);
                      
                      const filterDescription = filterDesc.length > 0 
                        ? filterDesc.join(', ') 
                        : 'Sve operacije';
                      
                      try {
                        const xmlContent = generateConsolidatedXMLInvoice(operations, filterDescription);
                        downloadXML(xmlContent, `Zbirna-Faktura-XML-${dayjs().format('YYYYMMDD')}.xml`);
                        toast.success('Zbirna XML faktura je uspješno generisana!');
                      } catch (error) {
                        console.error('Error generating consolidated XML invoice:', error);
                        toast.error('Došlo je do greške prilikom generisanja zbirne XML fakture.');
                      }
                    }}
                    className={`group relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left flex flex-col h-full ${operations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={operations.length === 0}
                    title="XML faktura za sistemsku integraciju"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Zbirna XML Faktura</h4>
                        <p className="text-xs text-gray-500">Za integraciju</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 flex-grow">Strukturirani XML dokument za integraciju sa drugim sistemima</p>
                    <div className="flex justify-end">
                      <span className="inline-flex items-center text-xs font-medium text-blue-600 group-hover:text-blue-700">
                        Preuzmi
                        <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Operation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dodaj Operaciju Točenja Goriva</h3>
              <AddOperationForm 
                formData={formData}
                textInputs={textInputs}
                handleInputChange={handleInputChange}
                handleAddOperation={handleAddOperation}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                modalAvailableDestinations={modalAvailableDestinations}
                airlines={airlines}
                tanks={tanks}
                fuelPriceRules={fuelPriceRules} // Pass fuelPriceRules to the form
                onCancel={() => { setShowAddModal(false); resetForm(); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOperationForDetails && (
        <OperationDetailsModal 
          operation={selectedOperationForDetails}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}
