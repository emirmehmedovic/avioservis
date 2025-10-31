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
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600 rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-800 rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
            <Link href="/dashboard/locations/new">
              <Button
                variant="default"
                className="backdrop-blur-md bg-slate-600/80 hover:bg-slate-700 border border-white/20 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-medium duration-200 flex items-center gap-2"
              >
                <FaPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Lokacija</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 shadow-md p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <FaExclamationTriangle className="text-red-600" />
            </div>
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {locations.length === 0 && !isLoading ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-6">
              <FaMapMarkerAlt className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Nema dostupnih lokacija
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              Nema unesenih lokacija. Kliknite na dugme u headeru da dodate novu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Naziv Lokacije</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Adresa</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">PDV Broj Kompanije</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location, index) => (
                  <motion.tr
                    key={location.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                          <FaMapMarkerAlt className="text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{location.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
                          <FaAddressCard className="text-amber-600" />
                        </div>
                        <span className="text-gray-600">{location.address || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                          <FaBuilding className="text-green-600" />
                        </div>
                        <span className="text-gray-600">{location.companyTaxId || '-'}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default withAuth(LocationsPage, ['ADMIN', 'SERVICER', 'FUEL_USER']);
