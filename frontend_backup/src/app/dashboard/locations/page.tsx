/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLocations } from '@/lib/apiService';
import { Location } from '@/types';
import withAuth from '@/components/auth/withAuth';

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Lokacije</h1>
        <Link href="/dashboard/locations/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out">
          Dodaj Novu Lokaciju
        </Link>
      </div>

      {isLoading && <p className="text-center text-gray-600">Učitavanje lokacija...</p>}
      {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">Greška: {error}</p>}

      {!isLoading && !error && locations.length === 0 && (
        <p className="text-center text-gray-600">Nema dostupnih lokacija. Dodajte novu.</p>
      )}

      {!isLoading && !error && locations.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Naziv Lokacije
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDV Broj Kompanije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{location.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.address || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.companyTaxId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default withAuth(LocationsPage, ['ADMIN', 'SERVICER', 'FUEL_USER']);
