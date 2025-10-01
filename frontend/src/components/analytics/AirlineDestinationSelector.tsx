'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plane, MapPin, Search, X, Loader2 } from 'lucide-react';

interface Airline {
  id: number;
  name: string;
}

interface Destination {
  id: number;
  name: string;
  code: string;
  country: string;
}

interface AirlineDestinationSelectorProps {
  onSelectionChange: (selection: {
    airlineId?: number;
    destinationId?: string;
    airlineName?: string;
    destinationName?: string;
  }) => void;
  onAnalyze: () => void;
  loading?: boolean;
}

export default function AirlineDestinationSelector({ 
  onSelectionChange, 
  onAnalyze, 
  loading = false 
}: AirlineDestinationSelectorProps) {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedAirline, setSelectedAirline] = useState<Airline | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [loadingAirlines, setLoadingAirlines] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [searchAirline, setSearchAirline] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  // Load airlines on component mount
  useEffect(() => {
    loadAirlines();
  }, []);

  // Load destinations when airline changes
  useEffect(() => {
    if (selectedAirline) {
      loadDestinations(selectedAirline.id);
    } else {
      loadDestinations();
    }
  }, [selectedAirline]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange({
      airlineId: selectedAirline?.id,
      destinationId: selectedDestination?.name, // Use name instead of ID
      airlineName: selectedAirline?.name,
      destinationName: selectedDestination?.name
    });
  }, [selectedAirline, selectedDestination, onSelectionChange]);

  const loadAirlines = async () => {
    try {
      setLoadingAirlines(true);
      const { getAirlines } = await import('@/services/analyticsApiService');
      const data = await getAirlines();
      setAirlines(data as Airline[]);
    } catch (error) {
      console.error('Error loading airlines:', error);
    } finally {
      setLoadingAirlines(false);
    }
  };

  const loadDestinations = async (airlineId?: number) => {
    try {
      setLoadingDestinations(true);
      const { getDestinations } = await import('@/services/analyticsApiService');
      const data = await getDestinations(airlineId);
      setDestinations(data as Destination[]);
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const handleAirlineSelect = (airline: Airline) => {
    setSelectedAirline(airline);
    setSelectedDestination(null); // Reset destination when airline changes
    setSearchAirline('');
  };

  const handleDestinationSelect = (destination: Destination) => {
    setSelectedDestination(destination);
    setSearchDestination('');
  };

  const clearSelection = () => {
    setSelectedAirline(null);
    setSelectedDestination(null);
    setSearchAirline('');
    setSearchDestination('');
  };

  const filteredAirlines = airlines.filter(airline =>
    airline.name.toLowerCase().includes(searchAirline.toLowerCase())
  );

  const filteredDestinations = destinations.filter(destination =>
    destination.name.toLowerCase().includes(searchDestination.toLowerCase()) ||
    destination.code.toLowerCase().includes(searchDestination.toLowerCase()) ||
    destination.country.toLowerCase().includes(searchDestination.toLowerCase())
  );

  const canAnalyze = selectedAirline || selectedDestination;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Filteri</h3>
      </div>

      <div className="space-y-4">
        {/* Clear Selection Button */}
        {(selectedAirline || selectedDestination) && (
          <button
            onClick={clearSelection}
            className="w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-1"
          >
            <X className="h-3 w-3" />
            Obriši odabir
          </button>
        )}

        {/* Airline Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Plane className="h-3 w-3" />
            Aviokompanija
          </label>
          
          <input
            type="text"
            placeholder="Pretraži aviokompaniju..."
            value={searchAirline}
            onChange={(e) => setSearchAirline(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          
          {loadingAirlines ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              <span className="text-xs text-gray-600">Učitavam...</span>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded text-sm shadow-sm">
              {filteredAirlines.map((airline) => (
                <button
                  key={airline.id}
                  onClick={() => handleAirlineSelect(airline)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                    selectedAirline?.id === airline.id ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plane className="h-3 w-3 text-gray-400" />
                    <span className="truncate">{airline.name}</span>
                  </div>
                </button>
              ))}
              {filteredAirlines.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                  Nema rezultata
                </div>
              )}
            </div>
          )}
        </div>

        {/* Destination Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            Destinacija
            {selectedAirline && (
              <span className="text-xs text-blue-600 font-normal">
                (za {selectedAirline.name})
              </span>
            )}
          </label>
          
          <input
            type="text"
            placeholder="Pretraži destinaciju..."
            value={searchDestination}
            onChange={(e) => setSearchDestination(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
          
          {loadingDestinations ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              <span className="text-xs text-gray-600">Učitavam...</span>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded text-sm shadow-sm">
              {filteredDestinations.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => handleDestinationSelect(destination)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                    selectedDestination?.id === destination.id ? 'bg-green-50 text-green-700 font-medium border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="truncate">{destination.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{destination.code}</span>
                  </div>
                  {destination.country && destination.country !== 'N/A' && (
                    <div className="text-xs text-gray-400 mt-1 ml-5">{destination.country}</div>
                  )}
                </button>
              ))}
              {filteredDestinations.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                  Nema rezultata
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-600 space-y-1">
            {selectedAirline ? (
              <div className="flex items-center gap-1 text-blue-600">
                <Plane className="h-3 w-3" />
                <span className="font-medium">{selectedAirline.name}</span>
              </div>
            ) : (
              <div className="text-gray-400">Sve aviokompanje</div>
            )}
            
            {selectedDestination ? (
              <div className="flex items-center gap-1 text-green-600">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">{selectedDestination.name}</span>
              </div>
            ) : (
              <div className="text-gray-400">Sve destinacije</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
