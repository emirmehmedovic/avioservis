'use client';

import React from 'react';
import { Vehicle, ServiceRecord, ServiceItemType } from '@/types';
import { 
  FaGasPump, 
  FaRulerVertical, 
  FaTint, 
  FaFlask,
  FaShippingFast,
  FaCalendarAlt,
  FaInfoCircle,
  FaOilCan,
  FaLeaf,
  FaTachometerAlt,
  FaTruck,
  FaWarehouse,
  FaArrowCircleUp,
  FaArrowCircleDown
} from 'react-icons/fa';
import Card from './Card';
import EditableItem from './EditableItem';
import ServiceRecordsByType from './ServiceRecordsByType';

interface TankerSpecificationSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
  serviceRecords?: ServiceRecord[];
  isLoadingServiceRecords?: boolean;
  onViewRecord?: (record: ServiceRecord) => void;
}

const TankerSpecificationSection: React.FC<TankerSpecificationSectionProps> = ({ 
  vehicle, 
  onUpdate, 
  serviceRecords = [], 
  isLoadingServiceRecords = false, 
  onViewRecord = () => {}
}) => {
  return (
    <Card title="Specifikacija cisterne" icon={<FaGasPump />} className="mb-6">
      <div className="space-y-6">
        {/* Osnovne informacije o cisterni */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaTint className="inline-block mr-2 text-indigo-500" /> 
            Osnovne informacije
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Kapacitet cisterne (L)" 
              value={vehicle.kapacitet_cisterne} 
              icon={<FaTint />} 
              vehicleId={vehicle.id} 
              fieldName="kapacitet_cisterne" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Broj odjeljaka" 
              value={vehicle.tanker_compartments} 
              icon={<FaRulerVertical />} 
              vehicleId={vehicle.id} 
              fieldName="tanker_compartments" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Tip tanka" 
              value={vehicle.tanker_type} 
              icon={<FaWarehouse />} 
              vehicleId={vehicle.id} 
              fieldName="tanker_type" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>

        {/* Opis vozila */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaInfoCircle className="inline-block mr-2 text-indigo-500" /> 
            Opis vozila
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <EditableItem 
              label="Opis vozila" 
              value={vehicle.vehicle_description} 
              icon={<FaInfoCircle />} 
              vehicleId={vehicle.id} 
              fieldName="vehicle_description" 
              type="textarea" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>

        {/* Specifikacije goriva i protoka */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaOilCan className="inline-block mr-2 text-indigo-500" /> 
            Specifikacije goriva
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Podržane vrste goriva" 
              value={vehicle.supported_fuel_types} 
              icon={<FaOilCan />} 
              vehicleId={vehicle.id} 
              fieldName="supported_fuel_types" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Euro norma" 
              value={vehicle.euro_norm} 
              icon={<FaLeaf />} 
              vehicleId={vehicle.id} 
              fieldName="euro_norm" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Protok (L/min)" 
              value={vehicle.flow_rate} 
              icon={<FaTachometerAlt />} 
              vehicleId={vehicle.id} 
              fieldName="flow_rate" 
              type="number" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>

        {/* Tip vozila i način punjenja */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaTruck className="inline-block mr-2 text-indigo-500" /> 
            Tip vozila i način punjenja
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Tip vozila" 
              value={vehicle.vehicle_type} 
              icon={<FaTruck />} 
              vehicleId={vehicle.id} 
              fieldName="vehicle_type" 
              onUpdate={onUpdate} 
              options={[
                { value: 'Refuler', label: 'Refuler' },
                { value: 'Dispenser', label: 'Dispenser' },
                { value: 'Defuler', label: 'Defuler' }
              ]}
            />
            <EditableItem 
              label="Vrsta punjenja" 
              value={vehicle.fueling_type} 
              icon={<FaArrowCircleUp />} 
              vehicleId={vehicle.id} 
              fieldName="fueling_type" 
              onUpdate={onUpdate} 
              options={[
                { value: 'Nadkrilno', label: 'Nadkrilno' },
                { value: 'Podkrilno', label: 'Podkrilno' }
              ]}
            />
            <EditableItem 
              label="Tip punjenja" 
              value={vehicle.loading_type} 
              icon={<FaArrowCircleDown />} 
              vehicleId={vehicle.id} 
              fieldName="loading_type" 
              onUpdate={onUpdate} 
              options={[
                { value: 'Top', label: 'Top' },
                { value: 'Bottom', label: 'Bottom' }
              ]}
            />
          </div>
        </div>

        {/* Filtri i crijeva */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaFlask className="inline-block mr-2 text-indigo-500" /> 
            Filtri i crijeva
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Tip filtera" 
              value={vehicle.tip_filtera} 
              icon={<FaFlask />} 
              vehicleId={vehicle.id} 
              fieldName="tip_filtera" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Crijeva za točenje" 
              value={vehicle.crijeva_za_tocenje} 
              icon={<FaShippingFast />} 
              vehicleId={vehicle.id} 
              fieldName="crijeva_za_tocenje" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>

        {/* Datumi važenja */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaCalendarAlt className="inline-block mr-2 text-indigo-500" /> 
            Datumi važenja
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Registrovano do" 
              value={vehicle.registrovano_do} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="registrovano_do" 
              type="date" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="ADR važi do" 
              value={vehicle.adr_vazi_do} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="adr_vazi_do" 
              type="date" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Periodični pregled važi do" 
              value={vehicle.periodicni_pregled_vazi_do} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="periodicni_pregled_vazi_do" 
              type="date" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>
      </div>

      {/* Zasebna sekcija za prikaz servisnih zapisa cisterne */}
      {serviceRecords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
            Historija servisnih zapisa cisterne
          </h3>
          
          <ServiceRecordsByType
            serviceRecords={serviceRecords}
            isLoading={isLoadingServiceRecords}
            onViewRecord={onViewRecord}
            serviceItemTypes={[
              ServiceItemType.TANKER_CALIBRATION,
              ServiceItemType.TANKER_PRESSURE_TEST,
              ServiceItemType.TANKER_FIRE_SAFETY_TEST
            ]}
            title="Servisni zapisi cisterne"
          />
        </div>
      )}
    </Card>
  );
};

export default TankerSpecificationSection;
