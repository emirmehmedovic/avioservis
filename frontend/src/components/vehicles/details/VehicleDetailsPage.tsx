'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getVehicleById, getVehicleServiceRecords, createServiceRecordWithDocument } from '@/lib/apiService';
import { Vehicle, VehicleStatus, VehicleImage as VehicleImageType, ServiceRecord, ServiceItemType } from '@/types';
import Modal from '@/components/ui/Modal';
import ServiceRecordForm from '@/components/forms/ServiceRecordForm';
import { toast } from 'react-toastify';
import { FiArrowLeft } from 'react-icons/fi';
import { FaCar, FaExternalLinkAlt, FaIdCard, FaHashtag, FaMapMarkerAlt, FaBuilding, FaFileAlt, FaTools } from 'react-icons/fa';
import withAuth from '@/components/auth/withAuth';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Loader2, Car } from 'lucide-react';
// Import our new components
import SectionNavigation from './SectionNavigation';
import GeneralInfoSection from './GeneralInfoSection';
import TechnicalDataSection from './TechnicalDataSection';
import TankerSpecificationSection from './TankerSpecificationSection';
import FilterDataSection from './FilterDataSection';
import HosesSection from './HosesSection';
import CalibrationSection from './CalibrationSection';
import NotesSection from './NotesSection';
import ServiceRecordsSection from './ServiceRecordsSection';
import VehicleImagesSection from './VehicleImagesSection';
import WorkOrderForm from './WorkOrderForm';
import WorkOrderView from './WorkOrderView';
import ServiceRecordDetailsView from './ServiceRecordDetailsView';
import ReportsSection from './ReportsSection';
import { formatServiceCategory, formatDateForDisplay } from './serviceHelpers';
import { getSecureFileUrl } from '@/lib/utils';

// Import the sections configuration
import { sections } from '@/components/vehicles/details/sections';

const VehicleDetailsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  // State variables
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>(sections[0].key);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [isLoadingServiceRecords, setIsLoadingServiceRecords] = useState(false);
  const [showAddServiceRecordModal, setShowAddServiceRecordModal] = useState(false);
  const [selectedServiceRecordForModal, setSelectedServiceRecordForModal] = useState<ServiceRecord | null>(null);
  const [showViewServiceRecordModal, setShowViewServiceRecordModal] = useState(false);
  const [showAddWorkOrderModal, setShowAddWorkOrderModal] = useState(false);
  const [showViewWorkOrderModal, setShowViewWorkOrderModal] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState<VehicleImageType | null>(null);
  const [mainImageChanged, setMainImageChanged] = useState(false);

  // Define formatter here for use in VehicleDetailsPage scope
  const formatDateForDisplayInPage = (date: Date | string | null | undefined) => {
    if (!date) return <span className="text-gray-400 italic">Nema podatka</span>;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return <span className="text-gray-400 italic">Neispravan datum</span>; 
    return new Intl.DateTimeFormat('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
  };

  // Fetch vehicle details
  const fetchVehicleDetails = useCallback(async () => {
    if (!id) {
      setError("ID vozila nije pronađen.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getVehicleById(id as string);
      setVehicle(data);
      setError(null);
    } catch (err) {
      console.error("Greška pri dohvatanju detalja vozila:", err);
      setError("Greška pri dohvatanju detalja vozila. Pokušajte ponovo kasnije.");
      setVehicle(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch service records
  const fetchServiceRecords = useCallback(async () => {
    if (!id) return;
    
    setIsLoadingServiceRecords(true);
    try {
      const records = await getVehicleServiceRecords(id as string);
      setServiceRecords(records);
    } catch (err) {
      console.error("Greška pri dohvatanju servisnih zapisa:", err);
      toast.error('Greška pri dohvatanju servisnih zapisa.');
    } finally {
      setIsLoadingServiceRecords(false);
    }
  }, [id]);

  // Initial data loading
  useEffect(() => {
    fetchVehicleDetails();
    fetchServiceRecords();
  }, [fetchVehicleDetails, fetchServiceRecords]);

  // Handle setting main image
  const handleSetMainImage = async (imageId: number) => {
    if (!vehicle) return;
    
    try {
      // Implement the API call to set main image
      // await setVehicleMainImage(vehicle.id.toString(), imageId.toString());
      toast.success('Glavna slika uspješno postavljena!');
      setMainImageChanged(true);
      fetchVehicleDetails(); // Refresh to get updated image data
    } catch (error) {
      console.error("Greška pri postavljanju glavne slike:", error);
      toast.error('Greška pri postavljanju glavne slike.');
    }
  };

  // Handle section change
  const handleSectionChange = (key: string) => {
    setActiveSection(key);
  };

  // Get status color based on vehicle status
  const getStatusColor = (status: VehicleStatus | undefined) => {
    if (!status) return 'bg-gray-500';
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'MAINTENANCE': return 'bg-yellow-500';
      case 'OUT_OF_SERVICE': return 'bg-red-500';
      case 'INACTIVE': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Open image modal
  const openImageModal = (image: VehicleImageType) => {
    setSelectedImageForModal(image);
  };

  // Handle viewing a service record
  const handleViewServiceRecord = (record: ServiceRecord) => {
    // Ako je radni nalog, prikaži ga u posebnom modalu
    if (record.serviceItems.some(item => item.type === ServiceItemType.WORK_ORDER)) {
      setSelectedServiceRecordForModal(record);
      setShowViewWorkOrderModal(true);
    } else {
      setSelectedServiceRecordForModal(record);
      setShowViewServiceRecordModal(true);
    }
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Učitavanje detalja vozila...</h2>
      </div>
    );
  }

  // If error, show error message
  if (error || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <Car className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Greška</h2>
          <p className="text-gray-600 mb-4">{error || "Vozilo nije pronađeno."}</p>
          <Button 
            onClick={() => router.push('/dashboard/vehicles')}
            className="inline-flex items-center"
          >
            <FiArrowLeft className="mr-2" /> Nazad na listu vozila
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button and header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Button 
            onClick={() => router.push('/dashboard/vehicles')}
            variant="outline"
            className="mr-4"
          >
            <FiArrowLeft className="mr-2" /> Nazad
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          {/* Vehicle Image */}
          <div className="w-full md:w-48 h-48 relative rounded-md overflow-hidden border border-gray-200">
            {vehicle.images && vehicle.images.length > 0 ? (
              <img 
                src={getSecureFileUrl(vehicle.images.find(img => img.isMainImage)?.imageUrl || vehicle.images[0].imageUrl)}
                alt={vehicle.vehicle_name || "Vozilo"}
                className="object-cover w-full h-full"
              />
            ) : vehicle.image_url ? (
              <img 
                src={getSecureFileUrl(vehicle.image_url)}
                alt={vehicle.vehicle_name || "Vozilo"}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Car className="w-16 h-16 text-gray-300" />
                <span className="sr-only">Nema slike</span>
              </div>
            )}
          </div>
          
          {/* Vehicle Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <FaCar className="mr-2 text-indigo-500" />
                  {vehicle.vehicle_name || "Vozilo"}
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                  <div>
                    <p className="text-gray-600 text-sm flex items-center">
                      <FaIdCard className="mr-2 text-gray-400" /> 
                      <span className="font-medium">Reg. broj:</span> 
                      <span className="ml-1">{vehicle.license_plate || 'N/A'}</span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 text-sm flex items-center">
                      <FaHashtag className="mr-2 text-gray-400" /> 
                      <span className="font-medium">VIN:</span> 
                      <span className="ml-1">{vehicle.chassis_number || 'N/A'}</span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 text-sm flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-gray-400" /> 
                      <span className="font-medium">Lokacija:</span> 
                      <span className="ml-1">{vehicle.location?.name || 'N/A'}</span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 text-sm flex items-center">
                      <FaBuilding className="mr-2 text-gray-400" /> 
                      <span className="font-medium">Vlasnik:</span> 
                      <span className="ml-1">{vehicle.company?.name || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex items-start">
                <div className="flex items-center px-3 py-2 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
                  <span className="flex items-center">
                    <span className={`h-3 w-3 rounded-full ${getStatusColor(vehicle.status)} mr-1.5`}></span>
                    <span className="text-sm font-medium">
                      {vehicle.status === 'ACTIVE' ? 'Aktivno' : 
                       vehicle.status === 'MAINTENANCE' ? 'Održavanje' : 
                       vehicle.status === 'OUT_OF_SERVICE' ? 'Van upotrebe' : 
                       vehicle.status === 'INACTIVE' ? 'Neaktivno' : 'Nepoznato'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar */}
        <div className="lg:col-span-1">
          <SectionNavigation 
            sections={sections} 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange} 
          />
        </div>

        {/* Main content area */}
        <div className="lg:col-span-3">
          {/* Render the appropriate section based on activeSection */}
          {activeSection === 'general' && (
            <GeneralInfoSection vehicle={vehicle} onUpdate={fetchVehicleDetails} />
          )}

          {activeSection === 'technical' && (
            <TechnicalDataSection vehicle={vehicle} onUpdate={fetchVehicleDetails} />
          )}

          {activeSection === 'tanker' && (
            <TankerSpecificationSection 
              vehicle={vehicle} 
              onUpdate={fetchVehicleDetails}
              serviceRecords={serviceRecords}
              isLoadingServiceRecords={isLoadingServiceRecords}
              onViewRecord={handleViewServiceRecord} 
            />
          )}

          {activeSection === 'filter' && (
            <FilterDataSection 
              vehicle={vehicle} 
              onUpdate={fetchVehicleDetails}
              serviceRecords={serviceRecords}
              isLoadingServiceRecords={isLoadingServiceRecords}
              onViewRecord={handleViewServiceRecord} 
            />
          )}

          {activeSection === 'hoses' && (
            <HosesSection 
              vehicle={vehicle} 
              onUpdate={fetchVehicleDetails}
              serviceRecords={serviceRecords}
              isLoadingServiceRecords={isLoadingServiceRecords}
              onViewRecord={handleViewServiceRecord} 
            />
          )}

          {activeSection === 'calibration' && (
            <CalibrationSection 
              vehicle={vehicle} 
              onUpdate={fetchVehicleDetails}
              serviceRecords={serviceRecords}
              isLoadingServiceRecords={isLoadingServiceRecords}
              onViewRecord={handleViewServiceRecord} 
            />
          )}

          {activeSection === 'notes' && (
            <NotesSection vehicle={vehicle} onUpdate={fetchVehicleDetails} />
          )}

          {activeSection === 'service' && (
            <ServiceRecordsSection 
              vehicleId={vehicle.id}
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={handleViewServiceRecord}
              onAddRecord={() => setShowAddServiceRecordModal(true)}
              onRecordDeleted={fetchServiceRecords}
              onAddWorkOrder={() => setShowAddWorkOrderModal(true)}
            />
          )}

          {activeSection === 'images' && (
            <VehicleImagesSection 
              vehicleId={vehicle.id}
              images={vehicle.images || []}
              onImageUploaded={fetchVehicleDetails}
              onSetMainImage={handleSetMainImage}
              onOpenImageModal={openImageModal}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsSection vehicle={vehicle} />
          )}
        </div>
      </div>

      {/* Modal for viewing an image */}
      {selectedImageForModal && (
        <Modal 
          onClose={() => setSelectedImageForModal(null)} 
          title="Pregled slike"

        >
          <div className="flex justify-center">
            <img 
              src={getSecureFileUrl(selectedImageForModal.imageUrl)} 
              alt="Slika vozila" 
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
          <div className="mt-4 text-center text-gray-600 text-sm">
            {selectedImageForModal.isMainImage && (
              <span className="inline-flex items-center bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md text-xs font-medium mr-2">
                <FaCar className="mr-1" /> Glavna slika
              </span>
            )}
            Uploaded: {new Date(selectedImageForModal.uploadedAt || Date.now()).toLocaleDateString()}
          </div>
        </Modal>
      )}

      {/* Modal for adding service record */}
      {showAddServiceRecordModal && (
        <Modal onClose={() => setShowAddServiceRecordModal(false)} title="Dodaj Novi Servisni Zapis">
          <ServiceRecordForm 
            vehicleId={vehicle.id} 
            onSubmit={async (formData, documentFile) => {
              try {
                await createServiceRecordWithDocument(vehicle.id.toString(), formData, documentFile || undefined);
                toast.success('Servisni zapis uspješno kreiran!');
                setShowAddServiceRecordModal(false); 
                fetchServiceRecords(); 
              } catch (error) {
                console.error("Greška pri kreiranju servisnog zapisa:", error);
                toast.error('Greška pri kreiranju servisnog zapisa.');
              }
            }}
            onCancel={() => setShowAddServiceRecordModal(false)} 
          />
        </Modal>
      )}

      {/* Modal for viewing service record details */}
      {showViewServiceRecordModal && selectedServiceRecordForModal && (
        <Modal onClose={() => setShowViewServiceRecordModal(false)} title="Detalji Servisnog Zapisa">
          <ServiceRecordDetailsView 
            record={selectedServiceRecordForModal} 
            onClose={() => setShowViewServiceRecordModal(false)} 
          />
        </Modal>
      )}

      {/* Work Order Form Modal */}
      {showAddWorkOrderModal && (
        <Modal onClose={() => setShowAddWorkOrderModal(false)} title="Kreiraj Radni Nalog">
          <WorkOrderForm
            vehicleId={vehicle.id}
            onSubmit={() => {
              setShowAddWorkOrderModal(false);
              fetchServiceRecords();
            }}
            onClose={() => setShowAddWorkOrderModal(false)}
          />
        </Modal>
      )}

      {/* Work Order View Modal */}
      {showViewWorkOrderModal && selectedServiceRecordForModal && (
        <Modal onClose={() => setShowViewWorkOrderModal(false)} title="Pregled Radnog Naloga">
          <WorkOrderView
            serviceRecord={selectedServiceRecordForModal}
            onClose={() => setShowViewWorkOrderModal(false)}
          />
        </Modal>
      )}
    </motion.div>
  );
};

export default VehicleDetailsPage;
