import React from 'react';
import { AirlineFE, FuelTankFE } from '../types';

interface FilterSectionProps {
  deliveryVoucher: string;
  setDeliveryVoucher: (voucher: string) => void;
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
  deliveryVoucher,
  setDeliveryVoucher,
}) => {
  const [inputValue, setInputValue] = React.useState(deliveryVoucher);

  React.useEffect(() => {
    setInputValue(deliveryVoucher); // Sync local input if prop changes from outside (e.g. reset)
  }, [deliveryVoucher]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== deliveryVoucher) { // Only update if actual change from debounced value
        setDeliveryVoucher(inputValue);
      }
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, setDeliveryVoucher, deliveryVoucher]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="w-full mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <div className="flex flex-wrap items-end gap-2">
        {/* Date Range Filters */}
        <div className="flex-1 min-w-[120px]">
          <label htmlFor="startDate" className="block text-xs font-medium text-white mb-1">Od datuma:</label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={startDate || ''}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div className="flex-1 min-w-[120px]">
          <label htmlFor="endDate" className="block text-xs font-medium text-white mb-1">Do datuma:</label>
          <input
            type="date"
            name="endDate"
            id="endDate"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={endDate || ''}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Airline Filter */}
        <div className="flex-1 min-w-[130px]">
          <label htmlFor="selectedAirline" className="block text-xs font-medium text-white mb-1">Avio Kompanija:</label>
          <select
            id="selectedAirline"
            name="selectedAirline"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={selectedAirline}
            onChange={(e) => setSelectedAirline(e.target.value)}
          >
            <option value="">Sve kompanije</option>
            {airlines.map((airline) => (
              <option key={airline.id} value={airline.id}>{airline.name}</option>
            ))}
          </select>
        </div>

        {/* Destination Filter */}
        <div className="flex-1 min-w-[120px]">
          <label htmlFor="selectedDestination" className="block text-xs font-medium text-white mb-1">Destinacija:</label>
          <input
            type="text"
            name="selectedDestination"
            id="selectedDestination"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            placeholder="Unesite destinaciju"
          />
        </div>

        {/* Tank Filter */}
        <div className="flex-1 min-w-[130px]">
          <label htmlFor="selectedTank" className="block text-xs font-medium text-white mb-1">Avio cisterna:</label>
          <select
            id="selectedTank"
            name="selectedTank"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={selectedTank}
            onChange={(e) => setSelectedTank(e.target.value)}
          >
            <option value="">Sve avio cisterne</option>
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>{tank.identifier} - {tank.name}</option>
            ))}
          </select>
        </div>

        {/* Traffic Type Filter */}
        <div className="flex-1 min-w-[120px]">
          <label htmlFor="selectedTrafficType" className="block text-xs font-medium text-white mb-1">Tip saobraćaja:</label>
          <select
            id="selectedTrafficType"
            name="selectedTrafficType"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={selectedTrafficType}
            onChange={(e) => setSelectedTrafficType(e.target.value)}
          >
            <option value="">Svi tipovi</option>
            <option value="Izvoz">Izvoz</option>
            <option value="Unutarnji saobraćaj">Unutarnji saobraćaj</option>
          </select>
        </div>

        {/* Currency Filter */}
        <div className="flex-1 min-w-[90px]">
          <label htmlFor="selectedCurrency" className="block text-xs font-medium text-white mb-1">Valuta:</label>
          <select
            id="selectedCurrency"
            name="selectedCurrency"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="">Sve valute</option>
            <option value="BAM">BAM</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {/* Delivery Voucher Filter */}
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="deliveryVoucher" className="block text-xs font-medium text-white mb-1">Broj dostavnice:</label>
          <input
            type="text"
            name="deliveryVoucher"
            id="deliveryVoucher"
            className="w-full bg-white/20 border-white/30 text-white text-sm placeholder:text-white/60 focus:border-white focus:ring-white rounded-md py-1"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Unesite broj dostavnice"
          />
        </div>

        {/* Reset Filters Button */}
        <button 
          onClick={() => {
            setStartDate(getFirstDayOfCurrentMonth());
            setEndDate(getLastDayOfCurrentMonth());
            setSelectedAirline('');
            setSelectedDestination('');
            setSelectedTank('');
            setSelectedTrafficType('');
            setSelectedCurrency('');
            setInputValue(''); // Clear local input for delivery voucher
            setDeliveryVoucher(''); // Clear parent state for delivery voucher
          }}
          className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-[0.3rem] rounded-md transition-colors ml-auto mt-auto"
        >
          Resetuj filtere
        </button>
      </div>
    </div>
  );
};

// Helper function to get the first day of the current month in YYYY-MM-DD format
const getFirstDayOfCurrentMonth = () => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
};

// Helper function to get the last day of the current month in YYYY-MM-DD format
const getLastDayOfCurrentMonth = () => {
  const date = new Date();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
};

export default FilterSection;
