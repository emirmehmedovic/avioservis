'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLocations } from '@/lib/apiService';
import { Location } from '@/types';
import withAuth from '@/components/auth/withAuth';
import { FaPlus, FaMapMarkerAlt, FaExclamationTriangle, FaBuilding, FaEdit, FaAddressCard } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const LocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        const data = await getLocations();
        setLocations(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch locations:', err);
        setError(err.message || 'Došlo je do greške prilikom preuzimanja lokacija.');
      }
      setIsLoading(false);
    };

    fetchLocations();
  }, []);

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-150px)]">
      <motion.div 
        className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-lg font-medium text-muted-foreground mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        Učitavanje podataka o lokacijama...
      </p>
    </div>
  );

  return (
    <motion.div 
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div className="flex items-center">
            <div className="mr-4 p-3 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <FaMapMarkerAlt className="h-8 w-8 text-[#e53e3e]" />
            </div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-white"
              >
                Lokacije
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-gray-300 mt-1"
              >
                Pregled i upravljanje lokacijama
              </motion.p>
            </div>
          </div>
          <Link href="/dashboard/locations/new">
            <Button 
              variant="default"
              className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2"
            >
              <FaPlus className="h-4 w-4" />
              Dodaj Novu Lokaciju
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-[#e53e3e]/20 backdrop-blur-md border border-white/10 shadow-lg p-4 rounded-xl">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <FaExclamationTriangle className="text-[#e53e3e]" />
            </div>
            <div>
              <strong className="font-bold mr-2 text-white">Greška!</strong>
              <span className="text-white">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="relative overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] shadow-lg rounded-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4FC3C7] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          {locations.length === 0 && !isLoading ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg flex items-center justify-center mb-6">
                <FaMapMarkerAlt className="h-10 w-10 text-[#e53e3e]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                Nema dostupnih lokacija
              </h3>
              <p className="text-white/70 max-w-md mx-auto mb-4">
                Nema unesenih lokacija. Kliknite na dugme ispod da dodate novu.
              </p>
              
              <Link href="/dashboard/locations/new" className="inline-block mt-2">
                <Button 
                  variant="default"
                  className="backdrop-blur-md bg-[#e53e3e]/80 border border-white/20 text-white shadow-lg hover:bg-[#e53e3e]/90 transition-all font-medium rounded-xl flex items-center gap-2 px-4 py-2"
                >
                  <FaPlus className="h-4 w-4" />
                  Dodaj Novu Lokaciju
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-white/10 bg-gradient-to-r from-[#2c2c2c] to-[#1a1a1a]">
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Naziv Lokacije</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">Adresa</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider">PDV Broj Kompanije</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location, index) => (
                    <motion.tr 
                      key={location.id} 
                      className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#4FC3C7]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-sm mr-3">
                            <FaMapMarkerAlt className="text-[#4FC3C7]" />
                          </div>
                          <span className="font-medium text-white">{location.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-1.5 bg-[#e53e3e]/20 backdrop-blur-md rounded-lg border border-white/10 shadow-sm mr-2">
                            <FaAddressCard className="text-[#e53e3e]" />
                          </div>
                          <span className="text-white/80">{location.address || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-1.5 bg-[#FBBF24]/20 backdrop-blur-md rounded-lg border border-white/10 shadow-sm mr-2">
                            <FaBuilding className="text-[#FBBF24]" />
                          </div>
                          <span className="text-white/80">{location.companyTaxId || '-'}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default withAuth(LocationsPage, ['ADMIN', 'SERVICER', 'FUEL_USER']);
