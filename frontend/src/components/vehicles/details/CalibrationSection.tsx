'use client';

import React from 'react';
import { Vehicle, ServiceRecord, ServiceItemType } from '@/types';
import { 
  FaBalanceScale, 
  FaCalendarAlt,
  FaFlask,
  FaWrench,
  FaThermometerHalf,
  FaTint,
  FaBolt,
  FaExchangeAlt,
  FaChartLine
} from 'react-icons/fa';
import Card from './Card';
import DatePairItem from './DatePairItem';
import CalibrationServiceRecords from './CalibrationServiceRecords';

interface CalibrationSectionProps {
  vehicle: Vehicle;
  onUpdate: () => void;
  serviceRecords?: ServiceRecord[];
  isLoadingServiceRecords?: boolean;
  onViewRecord?: (record: ServiceRecord) => void;
}

const CalibrationSection: React.FC<CalibrationSectionProps> = ({ 
  vehicle, 
  onUpdate, 
  serviceRecords = [], 
  isLoadingServiceRecords = false, 
  onViewRecord = () => {}
}) => {
  return (
    <Card title="Kalibracije i testovi" icon={<FaBalanceScale />} className="mb-6">
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
          Osnovne kalibracije
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="Kalibracija volumetra" 
            lastDate={vehicle.last_volumeter_calibration_date} 
            nextDate={vehicle.next_volumeter_calibration_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_volumeter_calibration_date" 
            nextDateFieldName="next_volumeter_calibration_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
          <DatePairItem 
            baseLabel="Kalibracija manometra" 
            lastDate={vehicle.last_manometer_calibration_date} 
            nextDate={vehicle.next_manometer_calibration_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="last_manometer_calibration_date" 
            nextDateFieldName="next_manometer_calibration_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
          <DatePairItem 
            baseLabel="Test sigurnosti od požara" 
            lastDate={vehicle.tanker_last_fire_safety_test_date} 
            nextDate={vehicle.tanker_next_fire_safety_test_date} 
            vehicleId={vehicle.id} 
            lastDateFieldName="tanker_last_fire_safety_test_date" 
            nextDateFieldName="tanker_next_fire_safety_test_date" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
          Testovi i kalibracije opreme
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="Hemijski test na vodu" 
            lastDate={vehicle.water_chemical_test_date} 
            nextDate={vehicle.water_chemical_test_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="water_chemical_test_date" 
            nextDateFieldName="water_chemical_test_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaFlask />} 
          />
          <DatePairItem 
            baseLabel="Moment ključ" 
            lastDate={vehicle.torque_wrench_calibration_date} 
            nextDate={vehicle.torque_wrench_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="torque_wrench_calibration_date" 
            nextDateFieldName="torque_wrench_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaWrench />} 
          />
          <DatePairItem 
            baseLabel="Termometar" 
            lastDate={vehicle.thermometer_calibration_date} 
            nextDate={vehicle.thermometer_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="thermometer_calibration_date" 
            nextDateFieldName="thermometer_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaThermometerHalf />} 
          />
          <DatePairItem 
            baseLabel="Hidrometar" 
            lastDate={vehicle.hydrometer_calibration_date} 
            nextDate={vehicle.hydrometer_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="hydrometer_calibration_date" 
            nextDateFieldName="hydrometer_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaTint />} 
          />
          <DatePairItem 
            baseLabel="Mjerač električne provodljivosti" 
            lastDate={vehicle.conductivity_meter_calibration_date} 
            nextDate={vehicle.conductivity_meter_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="conductivity_meter_calibration_date" 
            nextDateFieldName="conductivity_meter_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaBolt />} 
          />
          <DatePairItem 
            baseLabel="Mjerač otpora" 
            lastDate={vehicle.resistance_meter_calibration_date} 
            nextDate={vehicle.resistance_meter_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="resistance_meter_calibration_date" 
            nextDateFieldName="resistance_meter_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaExchangeAlt />} 
          />
          <DatePairItem 
            baseLabel="Glavni mjerač protoka" 
            lastDate={vehicle.main_flow_meter_calibration_date} 
            nextDate={vehicle.main_flow_meter_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="main_flow_meter_calibration_date" 
            nextDateFieldName="main_flow_meter_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaChartLine />} 
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
          Kalibracija tahografa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="Kalibracija tahografa" 
            lastDate={vehicle.tahograf_zadnja_kalibracija} 
            nextDate={vehicle.tahograf_naredna_kalibracija} 
            vehicleId={vehicle.id} 
            lastDateFieldName="tahograf_zadnja_kalibracija" 
            nextDateFieldName="tahograf_naredna_kalibracija" 
            onUpdate={onUpdate} 
            icon={<FaCalendarAlt />} 
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
          Dodatni datumi kalibracije
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePairItem 
            baseLabel="Datum kalibracije hidrometra" 
            lastDate={vehicle.datum_kalibracije_hidrometra} 
            nextDate={null} 
            vehicleId={vehicle.id} 
            lastDateFieldName="datum_kalibracije_hidrometra" 
            nextDateFieldName={undefined} 
            onUpdate={onUpdate} 
            icon={<FaTint />} 
          />
          <DatePairItem 
            baseLabel="Datum kalibracije moment ključa" 
            lastDate={vehicle.datum_kalibracije_moment_kljuca} 
            nextDate={null} 
            vehicleId={vehicle.id} 
            lastDateFieldName="datum_kalibracije_moment_kljuca" 
            nextDateFieldName={undefined} 
            onUpdate={onUpdate} 
            icon={<FaWrench />} 
          />
          <DatePairItem 
            baseLabel="Datum kalibracije termometra" 
            lastDate={vehicle.datum_kalibracije_termometra} 
            nextDate={null} 
            vehicleId={vehicle.id} 
            lastDateFieldName="datum_kalibracije_termometra" 
            nextDateFieldName={undefined} 
            onUpdate={onUpdate} 
            icon={<FaThermometerHalf />} 
          />
          <DatePairItem 
            baseLabel="Datum kalibracije el. provodljivosti" 
            lastDate={vehicle.datum_kalibracije_uredjaja_elektricne_provodljivosti} 
            nextDate={null} 
            vehicleId={vehicle.id} 
            lastDateFieldName="datum_kalibracije_uredjaja_elektricne_provodljivosti" 
            nextDateFieldName={undefined} 
            onUpdate={onUpdate} 
            icon={<FaBolt />} 
          />
          <DatePairItem 
            baseLabel="Manometer kalibracija" 
            lastDate={vehicle.manometer_calibration_date} 
            nextDate={vehicle.manometer_calibration_valid_until} 
            vehicleId={vehicle.id} 
            lastDateFieldName="manometer_calibration_date" 
            nextDateFieldName="manometer_calibration_valid_until" 
            onUpdate={onUpdate} 
            icon={<FaExchangeAlt />} 
          />
          <DatePairItem 
            baseLabel="Volumeter kalibracija" 
            lastDate={vehicle.volumeter_kalibracija_datum} 
            nextDate={vehicle.volumeter_kalibracija_vazi_do} 
            vehicleId={vehicle.id} 
            lastDateFieldName="volumeter_kalibracija_datum" 
            nextDateFieldName="volumeter_kalibracija_vazi_do" 
            onUpdate={onUpdate} 
            icon={<FaChartLine />} 
          />
        </div>
      </div>

      {/* Zasebna sekcija za prikaz servisnih zapisa kalibracija */}
      {serviceRecords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
            Historija servisnih zapisa kalibracija
          </h3>
          
          <div className="space-y-6">
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.TORQUE_WRENCH_CALIBRATION}
              title="Moment ključ"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.THERMOMETER_CALIBRATION}
              title="Termometar"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.HYDROMETER_CALIBRATION}
              title="Hidrometar"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.CONDUCTIVITY_METER_CALIBRATION}
              title="Mjerač električne provodljivosti"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.RESISTANCE_METER_CALIBRATION}
              title="Mjerač otpora"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.MAIN_FLOW_METER_CALIBRATION}
              title="Glavni mjerač protoka"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.TANKER_CALIBRATION}
              title="Kalibracija cisterne"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.TANKER_PRESSURE_TEST}
              title="Test pritiska cisterne"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.TANKER_FIRE_SAFETY_TEST}
              title="Test sigurnosti od požara"
            />
            
            <CalibrationServiceRecords
              serviceRecords={serviceRecords}
              isLoading={isLoadingServiceRecords}
              onViewRecord={onViewRecord}
              calibrationType={ServiceItemType.WATER_CHEMICAL_TEST}
              title="Hemijski test na vodu"
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default CalibrationSection;
