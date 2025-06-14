'use client';

import React from 'react';
import { Vehicle } from '@/types';
import { 
  FaCar, 
  FaIdCard, 
  FaHashtag, 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaBuilding,
  FaUserTie,
  FaTools,
  FaIndustry,
  FaTruckLoading,
  FaCogs,
  FaWeightHanging,
  FaBolt,
  FaTachometerAlt,
  FaUser,
  FaGasPump,
  FaTruck
} from 'react-icons/fa';
import Card from './Card';
import EditableItem from './EditableItem';

interface GeneralInfoSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
}

const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({ vehicle, onUpdate }) => {
  return (
    <Card title="Opšti podaci" icon={<FaCar />} className="mb-6">
      <div className="space-y-6">
        {/* Opšti podaci - Sekcija */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaIdCard className="inline-block mr-2 text-indigo-500" /> 
            Osnovne informacije
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Registarska oznaka" 
              value={vehicle.license_plate} 
              icon={<FaIdCard />} 
              vehicleId={vehicle.id} 
              fieldName="license_plate" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Broj šasije" 
              value={vehicle.chassis_number} 
              icon={<FaHashtag />} 
              vehicleId={vehicle.id} 
              fieldName="chassis_number" 
              onUpdate={onUpdate} 
            />
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
              label="Lokacija" 
              value={vehicle.location?.name} 
              icon={<FaMapMarkerAlt />} 
              vehicleId={vehicle.id} 
              fieldName="locationId" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Vlasnik" 
              value={vehicle.company?.name} 
              icon={<FaBuilding />} 
              vehicleId={vehicle.id} 
              fieldName="companyId" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Kontakt odgovorne osobe" 
              value={vehicle.responsible_person_contact} 
              icon={<FaUserTie />} 
              vehicleId={vehicle.id} 
              fieldName="responsible_person_contact" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>
        
        {/* Tehnički podaci - Sekcija */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaTools className="inline-block mr-2 text-indigo-500" /> 
            Tehnički podaci
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Godina proizvodnje" 
              value={vehicle.year_of_manufacture} 
              icon={<FaCalendarAlt />} 
              vehicleId={vehicle.id} 
              fieldName="year_of_manufacture" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Vrsta goriva" 
              value={vehicle.fuel_type} 
              icon={<FaGasPump />} 
              vehicleId={vehicle.id} 
              fieldName="fuel_type" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Broj sjedišta" 
              value={vehicle.seat_count} 
              icon={<FaUser />} 
              vehicleId={vehicle.id} 
              fieldName="seat_count" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Tip kamiona" 
              value={vehicle.truck_type} 
              icon={<FaTruck />} 
              vehicleId={vehicle.id} 
              fieldName="truck_type" 
              onUpdate={onUpdate} 
              options={[
                { value: 'Solo', label: 'Solo' },
                { value: 'Poluprikolica', label: 'Poluprikolica' }
              ]}
            />
          </div>
        </div>
        
        {/* Podaci o šasiji i nadogradnji - Sekcija */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaCar className="inline-block mr-2 text-indigo-500" /> 
            Šasija i nadogradnja
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Proizvođač šasije" 
              value={vehicle.chassis_manufacturer} 
              icon={<FaIndustry />} 
              vehicleId={vehicle.id} 
              fieldName="chassis_manufacturer" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Tip šasije" 
              value={vehicle.chassis_type} 
              icon={<FaCar />} 
              vehicleId={vehicle.id} 
              fieldName="chassis_type" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Proizvođač nadogradnje" 
              value={vehicle.body_manufacturer} 
              icon={<FaIndustry />} 
              vehicleId={vehicle.id} 
              fieldName="body_manufacturer" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Tip nadogradnje" 
              value={vehicle.body_type} 
              icon={<FaTruckLoading />} 
              vehicleId={vehicle.id} 
              fieldName="body_type" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>
        
        {/* Podaci o motoru i performansama - Sekcija */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3 pb-2 border-b border-gray-200">
            <FaCogs className="inline-block mr-2 text-indigo-500" /> 
            Motor i performanse
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableItem 
              label="Broj osovina" 
              value={vehicle.axle_count} 
              icon={<FaCogs />} 
              vehicleId={vehicle.id} 
              fieldName="axle_count" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Nosivost (kg)" 
              value={vehicle.carrying_capacity_kg} 
              icon={<FaWeightHanging />} 
              vehicleId={vehicle.id} 
              fieldName="carrying_capacity_kg" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Snaga motora (kW)" 
              value={vehicle.engine_power_kw} 
              icon={<FaBolt />} 
              vehicleId={vehicle.id} 
              fieldName="engine_power_kw" 
              type="number" 
              onUpdate={onUpdate} 
            />
            <EditableItem 
              label="Zapremina motora (ccm)" 
              value={vehicle.engine_displacement_ccm} 
              icon={<FaTachometerAlt />} 
              vehicleId={vehicle.id} 
              fieldName="engine_displacement_ccm" 
              type="number" 
              onUpdate={onUpdate} 
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GeneralInfoSection;
