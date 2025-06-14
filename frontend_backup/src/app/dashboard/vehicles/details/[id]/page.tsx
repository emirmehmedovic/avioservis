'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getVehicleById, updateVehicle, uploadVehicleImage, getVehicleServiceRecords, createServiceRecordWithDocument, deleteServiceRecord } from '@/lib/apiService'; 
import { Vehicle, VehicleStatus, VehicleImage as VehicleImageType, ServiceRecord, ServiceRecordCategory, ServiceItemType, ServiceItem } from '@/types'; 
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 
import {
  FaCar,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTools,
  FaCalendarAlt,
  FaStickyNote, 
  FaFilter,
  FaOilCan,
  FaThermometerHalf,
  FaTachometerAlt,
  FaFileContract,
  FaGasPump, 
  FaCamera,
  FaList,
  FaPlus,
  FaSave,
  FaEdit,
  FaTrash,
  FaCogs,
  FaFileMedical,
  FaFileInvoice, 
  FaTruck,
  FaRulerCombined,
  FaWarehouse,
  FaIndustry,
  FaBoxes,
  FaUserTie,
  FaIdCard,
  FaShieldAlt,
  FaClipboardList, 
  FaTimes,
  FaCheck,
  FaMapMarkerAlt,
  FaRegListAlt,
  FaRegFileAlt,
  FaRegBuilding,
  FaHardHat, 
  FaFireExtinguisher,
  FaBolt,
  FaWater,
  FaWind,
  FaWeightHanging,
  FaBalanceScale, 
  FaCheckSquare,
  FaCalendarPlus,
  FaTag,
  FaClock,
  FaMicrochip,
  FaEllipsisH,
  FaUser,
  FaPhone,
  FaStar, // Added FaStar for set main image button
  FaWrench,
  FaHistory,
  FaFileAlt,
  FaFilePdf,
  FaDownload,
  FaCalendarCheck,
  FaClipboard
} from 'react-icons/fa';
import { FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi'; 
import withAuth from '@/components/auth/withAuth';
import Image from 'next/image'; // Import Next.js Image component

interface EditableItemProps {
  label: string;
  value?: string | number | boolean | Date | null; 
  icon?: React.ReactNode;
  vehicleId: number;
  fieldName: keyof Vehicle; 
  onUpdate: () => void; 
  type?: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
}

const EditableItem: React.FC<EditableItemProps> = ({
  label,
  value,
  icon,
  vehicleId,
  fieldName,
  onUpdate,
  type = 'text',
  options,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Initialize selectedValue, converting null to empty string for text/number inputs to avoid uncontrolled component warnings
  const [selectedValue, setSelectedValue] = useState(value === null && (type === 'text' || type === 'number' || type === 'textarea') ? '' : value);

  const handleOpenModal = () => {
    // Reset selectedValue to current prop value when opening modal
    setSelectedValue(value === null && (type === 'text' || type === 'number' || type === 'textarea') ? '' : value);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveItem = async () => {
    try {
      // updateVehicle expects id as number, which vehicleId already is.
      await updateVehicle(vehicleId, { [fieldName]: selectedValue }); 
      toast.success(`Polje '${label}' uspješno ažurirano.`);
      onUpdate(); 
      handleCloseModal();
    } catch (error) {
      console.error('Greška pri ažuriranju polja:', error);
      toast.error('Greška pri ažuriranju polja.');
    }
  };

  const formatDateForDisplay = (date: Date | null | undefined) => {
    if (!date) return <span className="text-gray-400 italic">Nema podatka</span>;
    return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  };
  
  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0]; 
  };

  const displayValue = () => {
    if (type === 'date') return formatDateForDisplay(value as Date | null);
    if (type === 'boolean') return value ? <span className="text-green-600 font-semibold">Da</span> : <span className="text-red-600 font-semibold">Ne</span>;
    if (value === null || value === undefined || String(value).trim() === '') return <span className="text-gray-400 italic">Nema podatka</span>;
    return String(value);
  };

  return (
    <div className="group p-3.5 rounded-lg hover:bg-gray-50 transition-colors duration-150 border border-transparent hover:border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon && <span className="mr-3 text-lg text-indigo-500">{icon}</span>}
          <span className="text-sm font-medium text-gray-600">{label}:</span>
        </div>
        <button 
          onClick={handleOpenModal} 
          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100"
          aria-label={`Uredi ${label}`}
        >
          <FaEdit className="w-4 h-4" /> 
        </button>
      </div>
      <div className="mt-1 ml-2 pl-0 md:pl-7 text-md font-semibold text-gray-800 cursor-pointer" onClick={handleOpenModal}>
        {displayValue()}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 ease-out scale-95 group-hover:scale-100">
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-xl font-semibold text-gray-800">Uredi: <span className="text-indigo-600">{label}</span></h4>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <FaTimes className="w-5 h-5"/>
              </button>
            </div>
            <div className="mb-5 space-y-3">
              {type === 'textarea' ? (
                <textarea 
                  value={selectedValue as string}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm"
                  placeholder={`Unesite ${label.toLowerCase()}`}
                />
              ) : type === 'select' ? (
                <select 
                  value={selectedValue as string} 
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm bg-white"
                >
                  {options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : type === 'boolean' ? (
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setSelectedValue(true)}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${selectedValue === true ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Da
                  </button>
                  <button 
                    onClick={() => setSelectedValue(false)}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${selectedValue === false ? 'bg-rose-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Ne
                  </button>
                </div>
              ) : type === 'date' ? (
                <input 
                  type="date" 
                  value={formatDateForInput(selectedValue as Date)}
                  onChange={(e) => setSelectedValue(e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm"
                />
              ) : (
                <input 
                  type={type === 'number' ? 'number' : 'text'} 
                  value={selectedValue as string}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm"
                  placeholder={`Unesite ${label.toLowerCase()}`}
                />
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={handleCloseModal} 
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Odustani
              </button>
              <button 
                onClick={handleSaveItem} 
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Spremi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 

interface DatePairItemProps {
  baseLabel: string;
  lastDate?: Date | null;
  nextDate?: Date | null;
  vehicleId: number;
  lastDateFieldName: keyof Vehicle;
  nextDateFieldName: keyof Vehicle;
  onUpdate: () => void;
  icon?: React.ReactNode;
}

const DatePairItem: React.FC<DatePairItemProps> = ({
  baseLabel,
  lastDate,
  nextDate,
  vehicleId,
  lastDateFieldName,
  nextDateFieldName,
  onUpdate,
  icon
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
        {icon && <span className="mr-2 text-indigo-500">{icon}</span>}
        {baseLabel}
      </h4>
      <div className="space-y-3">
        <EditableItem
          label={`Datum posljednje (${baseLabel.toLowerCase()})`}
          value={lastDate}
          vehicleId={vehicleId}
          fieldName={lastDateFieldName}
          onUpdate={onUpdate}
          type="date"
        />
        <EditableItem
          label={`Datum sljedeće (${baseLabel.toLowerCase()})`}
          value={nextDate}
          vehicleId={vehicleId}
          fieldName={nextDateFieldName}
          onUpdate={onUpdate}
          type="date"
        />
      </div>
    </div>
  );
};

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  initiallyExpanded?: boolean;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className, initiallyExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white shadow-xl rounded-xl overflow-hidden ${className || ''}`}>
      <button 
        onClick={handleToggle} 
        className="w-full flex items-center justify-between p-4 md:p-5 focus:outline-none bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center">
          {icon && <span className="mr-3 text-xl md:text-2xl text-indigo-600">{icon}</span>}
          <h3 className="text-lg md:text-xl font-semibold text-gray-800">{title}</h3>
        </div>
        {children && (isExpanded ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />)}
      </button>
      {children && isExpanded && (
        <div className="p-4 md:p-5 border-t border-gray-200 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

// Helper functions for formatting service record data
const formatServiceCategory = (category: ServiceRecordCategory): string => {
  const categoryMap: Record<ServiceRecordCategory, string> = {
    [ServiceRecordCategory.REGULAR_MAINTENANCE]: 'Redovno održavanje',
    [ServiceRecordCategory.REPAIR]: 'Popravka',
    [ServiceRecordCategory.TECHNICAL_INSPECTION]: 'Tehnički pregled',
    [ServiceRecordCategory.FILTER_REPLACEMENT]: 'Zamjena filtera',
    [ServiceRecordCategory.HOSE_REPLACEMENT]: 'Zamjena crijeva',
    [ServiceRecordCategory.CALIBRATION]: 'Kalibracija',
    [ServiceRecordCategory.OTHER]: 'Ostalo'
  };
  return categoryMap[category] || category;
};

const formatServiceItemType = (type: ServiceItemType): string => {
  const typeMap: Record<ServiceItemType, string> = {
    [ServiceItemType.FILTER]: 'Filter',
    [ServiceItemType.HOSE_HD63]: 'Crijevo HD63',
    [ServiceItemType.HOSE_HD38]: 'Crijevo HD38',
    [ServiceItemType.HOSE_TW75]: 'Crijevo TW75',
    [ServiceItemType.HOSE_LEAK_TEST]: 'Test curenja crijeva',
    [ServiceItemType.VOLUMETER]: 'Volumetar',
    [ServiceItemType.MANOMETER]: 'Manometar',
    [ServiceItemType.HECPV_ILCPV]: 'HECPV/ILCPV',
    [ServiceItemType.SIX_MONTH_CHECK]: '6-mjesečna provjera',
    [ServiceItemType.ENGINE]: 'Motor',
    [ServiceItemType.BRAKES]: 'Kočnice',
    [ServiceItemType.TRANSMISSION]: 'Transmisija',
    [ServiceItemType.ELECTRICAL]: 'Električni sistem',
    [ServiceItemType.TIRES]: 'Gume',
    [ServiceItemType.OTHER]: 'Ostalo'
  };
  return typeMap[type] || type;
};

const VehicleDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string; 

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); // State for main image update
  const [targetImageUrlForUpdate, setTargetImageUrlForUpdate] = useState<string | null>(null); // State for spinner target
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('osnovno'); // Default section: 'osnovno', 'inspekcije', 'slike', 'servisi'
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // For image upload
  const [isUploading, setIsUploading] = useState(false); // For image upload
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [isLoadingServiceRecords, setIsLoadingServiceRecords] = useState(false);
  const [selectedServiceRecord, setSelectedServiceRecord] = useState<ServiceRecord | null>(null);
  const [showServiceRecordModal, setShowServiceRecordModal] = useState(false);
  const [showAddServiceRecordModal, setShowAddServiceRecordModal] = useState(false);
  const [serviceDocumentFile, setServiceDocumentFile] = useState<File | null>(null);

  const fetchVehicleDetails = async () => {
    if (!id) {
      setError('ID vozila nije pronađen.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getVehicleById(id);
      setVehicle(data);
      setError(null);
    } catch (err) {
      console.error('Greška pri dohvatanju detalja vozila:', err);
      setError('Nije moguće učitati detalje vozila. Pokušajte ponovo kasnije.');
      if ((err as any).status === 401 || (err as any).status === 403) {
        router.push('/login');
      }
    }
    setIsLoading(false);
  };

  const fetchServiceRecords = async () => {
    if (!id) return;
    
    setIsLoadingServiceRecords(true);
    try {
      const records = await getVehicleServiceRecords(id);
      setServiceRecords(records);
    } catch (err) {
      console.error('Greška pri dohvatanju servisnih naloga:', err);
      toast.error('Nije moguće učitati servisne naloge. Pokušajte ponovo kasnije.');
    } finally {
      setIsLoadingServiceRecords(false);
    }
  };

  useEffect(() => {
    fetchVehicleDetails();
  }, [id]);

  // Fetch service records when vehicle id changes or when activeSection is 'servisi'
  useEffect(() => {
    if (id && activeSection === 'servisi') {
      fetchServiceRecords();
    }
  }, [id, activeSection]);

  const handleSectionChange = (sectionKey: string) => {
    setActiveSection(sectionKey);
  };

  const getStatusColor = (status?: VehicleStatus) => {
    if (!status) return 'bg-gray-500';
    switch (status) {
      case VehicleStatus.ACTIVE: return 'bg-green-500';
      case VehicleStatus.MAINTENANCE: return 'bg-yellow-500';
      case VehicleStatus.OUT_OF_SERVICE: return 'bg-red-500';
      case VehicleStatus.INACTIVE: return 'bg-gray-600';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen"><FiLoader className="animate-spin text-blue-600 text-6xl mb-4" />
        <p className="text-xl text-gray-700">Učitavanje detalja vozila...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <FaExclamationTriangle className="text-red-500 text-6xl mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Greška prilikom učitavanja</h2>
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <FaTruck className="text-gray-400 text-6xl mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Vozilo nije pronađeno</h2>
        <p className="text-gray-600 text-lg">Nema dostupnih informacija za traženo vozilo.</p>
      </div>
    );
  }
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files ? event.target.files[0] : null);
  };

  const handleImageUpload = async () => {
    if (selectedFile && id) { 
      setIsUploading(true);
      try {
        const uploadedImage = await uploadVehicleImage(id, selectedFile);
        toast.success(`Slika vozila "${uploadedImage.imageUrl}" uspješno uploadana.`);
        setSelectedFile(null); 
        await fetchVehicleDetails(); 
      } catch (error) {
        console.error('Greška pri uploadu slike:', error);
        toast.error('Greška pri uploadu slike. Molimo pokušajte ponovo.');
      }
      setIsUploading(false);
    }
  };

  const handleSetMainImage = async (newMainImageUrl: string) => {
    if (!vehicle || !vehicle.id) return;

    if (vehicle.image_url === newMainImageUrl) {
      toast.info('Ova slika je već postavljena kao glavna.');
      return;
    }

    setTargetImageUrlForUpdate(newMainImageUrl); // Set target for spinner
    setIsUpdating(true);
    try {
      const updatedVehicle = await updateVehicle(vehicle.id, { image_url: newMainImageUrl });
      setVehicle(updatedVehicle); // Update local state with the full updated vehicle data
      toast.success('Glavna slika je uspešno postavljena!');
    } catch (err) {
      console.error('Greška pri postavljanju glavne slike:', err);
      toast.error('Došlo je do greške pri postavljanju glavne slike.');
    } finally {
      setIsUpdating(false);
      setTargetImageUrlForUpdate(null); // Clear target for spinner
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {vehicle && (
        <>
          {/* === HEADER START === */}
          <div className="mb-8 p-6 bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-2xl rounded-xl border border-gray-200">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative w-full md:w-72 h-56 md:h-48 rounded-lg overflow-hidden shadow-xl border-2 border-gray-100 flex-shrink-0">
                {vehicle.image_url ? (
                  <Image
                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${vehicle.image_url}`}
                    alt={`Slika za ${vehicle.vehicle_name}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaTruck className="text-8xl text-indigo-300" />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800 mb-2 tracking-tight">{vehicle.vehicle_name}</h1>
                <p className="text-gray-600 text-md mb-4">Registarska oznaka: <span className="font-semibold text-gray-700">{vehicle.license_plate}</span></p>
                <div className="flex items-center mb-3">
                  <span className={`px-4 py-1.5 text-sm font-bold text-white rounded-full shadow-md ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status || 'N/A'}
                  </span>
                  {/* Edit status button can be placed here if needed, or handled within 'Osnovno' section */}
                </div>
                {/* Placeholder for other key info or actions */}
              </div>
              {/* Optional: Action buttons like 'Upload new image' can go here */}
            </div>
          </div>
          {/* === HEADER END === */}
          {/* === TABS NAVIGATION START === */}
          <div className="mb-6 border-b-2 border-gray-300">
            <nav className="-mb-px flex space-x-6 md:space-x-8 overflow-x-auto" aria-label="Tabs">
              {[
                { key: 'osnovno', title: 'Osnovne Info', icon: <FaInfoCircle /> },
                { key: 'inspekcije', title: 'Inspekcije', icon: <FaCalendarAlt /> },
                { key: 'slike', title: 'Slike', icon: <FaCamera /> },
                { key: 'servisi', title: 'Servisi', icon: <FaTools /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleSectionChange(tab.key)}
                  className={`flex items-center whitespace-nowrap py-3 px-3 md:px-4 border-b-2 font-semibold text-sm md:text-base transition-all duration-200 ease-in-out group 
                              ${activeSection === tab.key 
                                ? 'border-indigo-600 text-indigo-700 bg-indigo-50 rounded-t-lg shadow-sm' 
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-400 hover:bg-gray-100 rounded-t-md'}`}
                  aria-current={activeSection === tab.key ? 'page' : undefined}
                >
                  {tab.icon && <span className={`mr-2 text-lg ${activeSection === tab.key ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{tab.icon}</span>}
                  {tab.title}
                </button>
              ))}
            </nav>
          </div>
          {/* === TABS NAVIGATION END === */}
          {/* Main content area - now spans full width */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12 space-y-6">
              {activeSection === 'osnovno' && (
                <Card title="Osnovne Informacije Vozila" icon={<FaInfoCircle />} initiallyExpanded>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 p-4 md:p-6">
                    <EditableItem label="Naziv Vozila" value={vehicle.vehicle_name} fieldName="vehicle_name" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaCar />} />
                    <EditableItem label="Registarska Oznaka" value={vehicle.license_plate} fieldName="license_plate" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaIdCard />} />
                    {/* Status is now in header, but can be editable here too if desired */}
                    <EditableItem label="Status Vozila" value={vehicle.status} fieldName="status" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} type="select" options={Object.values(VehicleStatus).map(s => ({ value: s, label: s }))} icon={<FaShieldAlt />} />
                    <EditableItem label="Broj Šasije" value={vehicle.chassis_number || ''} fieldName="chassis_number" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaCogs />} />
                    <EditableItem label="Broj Pločice Cisterne" value={vehicle.vessel_plate_no || ''} fieldName="vessel_plate_no" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaTag />} />
                    <EditableItem label="Filter Instaliran" value={vehicle.filter_installed ? 'Da' : 'Ne'} fieldName="filter_installed" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} type="boolean" icon={<FaFilter />} />
                    <EditableItem label="Datum Instalacije Filtera" value={vehicle.filter_installation_date} fieldName="filter_installation_date" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} type="date" icon={<FaCalendarAlt />} />
                    <EditableItem label="Validnost Filtera (mjeseci)" value={vehicle.filter_validity_period_months || undefined} fieldName="filter_validity_period_months" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} type="number" icon={<FaClock />} />
                    <EditableItem label="Broj Pločice Filtera" value={vehicle.filter_type_plate_no || ''} fieldName="filter_type_plate_no" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaTag />} />
                    <EditableItem label="Senzorska Tehnologija" value={vehicle.sensor_technology || ''} fieldName="sensor_technology" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaMicrochip />} />
                    <EditableItem label="Kontakt Odgovorne Osobe" value={vehicle.responsible_person_contact || ''} fieldName="responsible_person_contact" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} icon={<FaUser />} />
                    <EditableItem label="Napomene" value={vehicle.notes || ''} fieldName="notes" vehicleId={vehicle.id} onUpdate={fetchVehicleDetails} type="textarea" icon={<FaStickyNote />} />
                  </div>
                </Card>
              )}
              {activeSection === 'inspekcije' && (
                <Card title="Inspekcije i Provjere" icon={<FaCalendarAlt />} initiallyExpanded>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 p-3 md:p-4">
                    <DatePairItem 
                      baseLabel="zamjena crijeva HD63"
                      lastDate={vehicle.last_hose_hd63_replacement_date}
                      nextDate={vehicle.next_hose_hd63_replacement_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_hose_hd63_replacement_date"
                      nextDateFieldName="next_hose_hd63_replacement_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaTools />}
                    />
                    <DatePairItem 
                      baseLabel="zamjena crijeva HD38"
                      lastDate={vehicle.last_hose_hd38_replacement_date}
                      nextDate={vehicle.next_hose_hd38_replacement_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_hose_hd38_replacement_date"
                      nextDateFieldName="next_hose_hd38_replacement_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaTools />}
                    />
                    <DatePairItem 
                      baseLabel="zamjena crijeva TW75"
                      lastDate={vehicle.last_hose_tw75_replacement_date}
                      nextDate={vehicle.next_hose_tw75_replacement_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_hose_tw75_replacement_date"
                      nextDateFieldName="next_hose_tw75_replacement_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaTools />}
                    />
                    <DatePairItem 
                      baseLabel="test curenja crijeva"
                      lastDate={vehicle.last_hose_leak_test_date}
                      nextDate={vehicle.next_hose_leak_test_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_hose_leak_test_date"
                      nextDateFieldName="next_hose_leak_test_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaTools />}
                    />
                    <DatePairItem 
                      baseLabel="kalibracija volumetra"
                      lastDate={vehicle.last_volumeter_calibration_date}
                      nextDate={vehicle.next_volumeter_calibration_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_volumeter_calibration_date"
                      nextDateFieldName="next_volumeter_calibration_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaBalanceScale />}
                    />
                    <DatePairItem 
                      baseLabel="kalibracija manometra"
                      lastDate={vehicle.last_manometer_calibration_date}
                      nextDate={vehicle.next_manometer_calibration_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_manometer_calibration_date"
                      nextDateFieldName="next_manometer_calibration_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaTachometerAlt />}
                    />
                    <DatePairItem 
                      baseLabel="HECPV/ILCPV test"
                      lastDate={vehicle.last_hecpv_ilcpv_test_date}
                      nextDate={vehicle.next_hecpv_ilcpv_test_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_hecpv_ilcpv_test_date"
                      nextDateFieldName="next_hecpv_ilcpv_test_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaFileContract />}
                    />
                    <DatePairItem 
                      baseLabel="6-mjesečna provjera"
                      lastDate={vehicle.last_6_month_check_date}
                      nextDate={vehicle.next_6_month_check_date}
                      vehicleId={vehicle.id}
                      lastDateFieldName="last_6_month_check_date"
                      nextDateFieldName="next_6_month_check_date"
                      onUpdate={fetchVehicleDetails}
                      icon={<FaCheckSquare />}
                    />
                  </div>
                </Card>
              )}
              {activeSection === 'slike' && (
                <Card title="Upravljanje Slikama Vozila" icon={<FaCamera />} initiallyExpanded>
                  {(() => {
                    if (vehicle && vehicle.images) {
                      console.log('Vehicle Images Data:', JSON.stringify(vehicle.images, null, 2));
                    }
                    return null; // Ensure something valid is returned for React
                  })()}
                  <div className="p-4 space-y-4">
                    <div>
                      <label htmlFor="vehicleImage" className="block text-sm font-medium text-gray-700 mb-1">
                        Odaberite sliku za upload:
                      </label>
                      <input
                        type="file"
                        id="vehicleImage"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {selectedFile && (
                        <p className="mt-1 text-xs text-gray-500">Odabrani fajl: {selectedFile.name}</p>
                      )}
                    </div>
                    <button
                      onClick={handleImageUpload}
                      disabled={!selectedFile || isUploading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      {isUploading ? (
                        <><FiLoader className="animate-spin mr-2" /> Upload u toku...</>
                      ) : 'Uploaduj Sliku'}
                    </button>
                  </div>

                  <div className="mt-6 p-4 border-t border-gray-200">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Postojeće slike:</h4>
                    {vehicle && vehicle.images && vehicle.images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                        {vehicle.images.map((img, index) => (
                          <div key={img.id || index} className="flex flex-col items-center">
                            <div className="relative w-full aspect-w-1 aspect-h-1 group mb-2 shadow-md rounded-lg overflow-hidden">
                              <Image
                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${img.imageUrl}`}
                                alt={`Slika vozila ${index + 1}`}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="group-hover:opacity-80 transition-opacity duration-300"
                              />
                            </div>
                            <button
                              onClick={() => handleSetMainImage(img.imageUrl)}
                              disabled={isUpdating || vehicle.image_url === img.imageUrl}
                              className={`mt-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ease-in-out flex items-center justify-center
                                          ${vehicle.image_url === img.imageUrl 
                                            ? 'bg-green-600 text-white cursor-default'
                                            : 'bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}
                                          disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                            >
                              {vehicle.image_url === img.imageUrl ? (
                                <><FaStar className="mr-1.5" /> Glavna</>
                              ) : (
                                'Postavi kao Glavnu'
                              )}
                              {isUpdating && targetImageUrlForUpdate === img.imageUrl && <FiLoader className="animate-spin ml-2" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 mt-4">Nema slika za ovo vozilo.</p>
                    )}
                  </div>
                </Card>
              )}
              {activeSection === 'servisi' && (
                <Card title="Servisni Zapisi" icon={<FaWrench />} initiallyExpanded>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-800">Historija servisiranja</h3>
                      <button
                        onClick={() => setShowAddServiceRecordModal(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        <FaPlus className="mr-2" /> Dodaj Servisni Nalog
                      </button>
                    </div>

                    {isLoadingServiceRecords ? (
                      <div className="flex justify-center py-10">
                        <FiLoader className="animate-spin text-indigo-600 text-3xl" />
                      </div>
                    ) : serviceRecords.length > 0 ? (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        {/* Service records */}
                        <div className="space-y-8">
                          {serviceRecords.map((record) => (
                            <div key={record.id} className="relative flex items-start">
                              {/* Timeline dot */}
                              <div className="absolute left-7 w-3.5 h-3.5 bg-indigo-600 rounded-full transform -translate-x-1/2 mt-1.5 z-10"></div>
                              
                              {/* Content */}
                              <div className="ml-12 bg-white p-4 rounded-lg shadow-md w-full hover:shadow-lg transition-shadow cursor-pointer"
                                   onClick={() => {
                                     setSelectedServiceRecord(record);
                                     setShowServiceRecordModal(true);
                                   }}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2">
                                      {formatServiceCategory(record.category)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {new Date(record.serviceDate).toLocaleDateString('bs')}
                                    </span>
                                  </div>
                                  {record.documentUrl && (
                                    <span className="text-indigo-600">
                                      <FaFilePdf />
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-medium text-gray-900 mb-1">{record.description}</h4>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {record.serviceItems.slice(0, 3).map((item, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {formatServiceItemType(item.type)}
                                    </span>
                                  ))}
                                  {record.serviceItems.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      +{record.serviceItems.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-lg">
                        <FaHistory className="mx-auto text-gray-400 text-4xl mb-3" />
                        <p className="text-gray-500">Nema servisnih naloga za ovo vozilo.</p>
                        <p className="text-gray-500 text-sm mt-1">Kliknite na dugme "Dodaj Servisni Nalog" da dodate prvi servisni nalog.</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
      {!vehicle && !isLoading && (
        <div className="text-center py-10">
          <FaExclamationTriangle className="mx-auto text-4xl text-red-500 mb-4" />
          <p className="text-xl text-gray-700">Vozilo nije pronađeno ili nemate pristup.</p>
          <button 
            onClick={() => router.push('/dashboard/vehicles')}
            className="mt-6 px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Nazad na listu vozila
          </button>
        </div>
      )}

      {/* Modal for viewing service record details */}
      {showServiceRecordModal && selectedServiceRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Detalji Servisnog Naloga</h3>
                <button 
                  onClick={() => setShowServiceRecordModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Datum Servisiranja</h4>
                  <p className="text-gray-900">{new Date(selectedServiceRecord.serviceDate).toLocaleDateString('bs')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Kategorija</h4>
                  <p className="text-gray-900">{formatServiceCategory(selectedServiceRecord.category)}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Opis</h4>
                <p className="text-gray-900">{selectedServiceRecord.description}</p>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Servisirane Stavke</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedServiceRecord.serviceItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{formatServiceItemType(item.type)}</span>
                        {item.replaced && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <FaCheck className="mr-1" /> Zamijenjeno
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedServiceRecord.documentUrl && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Dokument</h4>
                  <a 
                    href={`${process.env.NEXT_PUBLIC_API_BASE_URL}${selectedServiceRecord.documentUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FaDownload className="mr-2" /> Preuzmi Dokument
                  </a>
                </div>
              )}
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setShowServiceRecordModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Zatvori
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding a new service record */}
      {showAddServiceRecordModal && (
        <ServiceRecordForm 
          vehicleId={id} 
          onClose={() => setShowAddServiceRecordModal(false)}
          onSuccess={() => {
            setShowAddServiceRecordModal(false);
            fetchServiceRecords();
            toast.success('Servisni nalog je uspješno dodan!');
          }}
        />
      )}
    </div>
  );
};

// Service Record Form Component
interface ServiceRecordFormProps {
  vehicleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ServiceRecordForm: React.FC<ServiceRecordFormProps> = ({ vehicleId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<{
    serviceDate: string;
    description: string;
    category: ServiceRecordCategory;
    serviceItems: ServiceItem[];
  }>({  
    serviceDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    description: '',
    category: ServiceRecordCategory.REGULAR_MAINTENANCE,
    serviceItems: [],
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableServiceItems, setAvailableServiceItems] = useState<{type: ServiceItemType, selected: boolean, replaced: boolean}[]>(
    Object.values(ServiceItemType).map(type => ({ type, selected: false, replaced: false }))
  );
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleServiceItemToggle = (index: number) => {
    const updatedItems = [...availableServiceItems];
    updatedItems[index].selected = !updatedItems[index].selected;
    setAvailableServiceItems(updatedItems);
  };
  
  const handleReplacedToggle = (index: number) => {
    const updatedItems = [...availableServiceItems];
    updatedItems[index].replaced = !updatedItems[index].replaced;
    setAvailableServiceItems(updatedItems);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files ? e.target.files[0] : null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceDate || !formData.description || !formData.category) {
      toast.error('Molimo popunite sva obavezna polja.');
      return;
    }
    
    // Prepare service items from selected ones
    const selectedServiceItems = availableServiceItems
      .filter(item => item.selected)
      .map(item => ({
        type: item.type,
        replaced: item.replaced,
      }));
    
    if (selectedServiceItems.length === 0) {
      toast.error('Molimo odaberite barem jednu stavku servisa.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create payload
      const payload = {
        ...formData,
        vehicleId: Number(vehicleId),
        serviceItems: selectedServiceItems,
      };
      
      // Submit with or without document
      await createServiceRecordWithDocument(vehicleId, payload, selectedFile || undefined);
      onSuccess();
    } catch (error) {
      console.error('Error creating service record:', error);
      toast.error('Došlo je do greške prilikom dodavanja servisnog naloga.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">Dodaj Novi Servisni Nalog</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="serviceDate" className="block text-sm font-medium text-gray-700 mb-1">
                Datum Servisiranja *
              </label>
              <input
                type="date"
                id="serviceDate"
                name="serviceDate"
                value={formData.serviceDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Kategorija *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                {Object.values(ServiceRecordCategory).map((category) => (
                  <option key={category} value={category}>
                    {formatServiceCategory(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Opis *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servisirane Stavke *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableServiceItems.map((item, index) => (
                <div key={index} className={`border rounded-md p-3 ${item.selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`item-${index}`}
                      checked={item.selected}
                      onChange={() => handleServiceItemToggle(index)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`item-${index}`} className="ml-2 block text-sm text-gray-900">
                      {formatServiceItemType(item.type)}
                    </label>
                  </div>
                  {item.selected && (
                    <div className="mt-2 ml-6">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`replaced-${index}`}
                          checked={item.replaced}
                          onChange={() => handleReplacedToggle(index)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`replaced-${index}`} className="ml-2 block text-sm text-gray-700">
                          Zamijenjeno
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-1">
              PDF Dokument (opcionalno)
            </label>
            <input
              type="file"
              id="document"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {selectedFile && (
              <p className="mt-1 text-xs text-gray-500">Odabrani fajl: {selectedFile.name}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              Odustani
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><FiLoader className="animate-spin mr-2" /> Spremanje...</>
              ) : (
                'Spremi Servisni Nalog'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default withAuth(VehicleDetailsPage);
