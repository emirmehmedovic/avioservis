import React from 'react';
import { AirlineFE, FuelTankFE } from '../types';

interface FilterSectionProps {
  startDate: string | null;
  setStartDate: (date: string) => void;
  endDate: string | null;
  setEndDate: (date: string) => void;
  selectedAirline: string;
  setSelectedAirline: (airlineId: string) => void;
  selectedDestination: string;
  setSelectedDestination: (destination: string) => void;
  selectedTank: string;
  setSelectedTank: (tankId: string) => void;
  selectedTrafficType: string;
  setSelectedTrafficType: (trafficType: string) => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  airlines: AirlineFE[];
  tanks: FuelTankFE[];
}

const FilterSection: React.FC<FilterSectionProps> = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedAirline,
  setSelectedAirline,
  selectedDestination,
  setSelectedDestination,
  selectedTank,
  setSelectedTank,
  selectedTrafficType,
  setSelectedTrafficType,
  selectedCurrency,
  setSelectedCurrency,
  airlines,
  tanks,
}) => {
  return (
    <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-white mb-1">Od datuma:</label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={startDate || ''}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-white mb-1">Do datuma:</label>
          <input
            type="date"
            name="endDate"
            id="endDate"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={endDate || ''}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="selectedAirline" className="block text-sm font-medium text-white mb-1">Avio Kompanija:</label>
          <select
            id="selectedAirline"
            name="selectedAirline"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={selectedAirline}
            onChange={(e) => setSelectedAirline(e.target.value)}
          >
            <option value="">Sve kompanije</option>
            {airlines.map((airline) => (
              <option key={airline.id} value={airline.id}>{airline.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="selectedDestination" className="block text-sm font-medium text-white mb-1">Destinacija:</label>
          <input
            type="text"
            name="selectedDestination"
            id="selectedDestination"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            placeholder="Unesite destinaciju"
          />
        </div>
        <div>
          <label htmlFor="selectedTank" className="block text-sm font-medium text-white mb-1">Avio cisterna:</label>
          <select
            id="selectedTank"
            name="selectedTank"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={selectedTank}
            onChange={(e) => setSelectedTank(e.target.value)}
          >
            <option value="">Sve avio cisterne</option>
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>{tank.identifier} - {tank.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="selectedTrafficType" className="block text-sm font-medium text-white mb-1">Tip saobraćaja:</label>
          <select
            id="selectedTrafficType"
            name="selectedTrafficType"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={selectedTrafficType}
            onChange={(e) => setSelectedTrafficType(e.target.value)}
          >
            <option value="">Svi tipovi</option>
            <option value="Izvoz">Izvoz</option>
            <option value="Unutarnji saobraćaj">Unutarnji saobraćaj</option>
          </select>
        </div>
        <div>
          <label htmlFor="selectedCurrency" className="block text-sm font-medium text-white mb-1">Valuta:</label>
          <select
            id="selectedCurrency"
            name="selectedCurrency"
            className="w-full sm:w-auto bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white focus:ring-white rounded-md"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="">Sve valute</option>
            <option value="BAM">BAM</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
