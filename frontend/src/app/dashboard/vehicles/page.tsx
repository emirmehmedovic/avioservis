'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getVehicles, deleteVehicle } from '@/lib/apiService';
import { Vehicle, VehicleStatus } from '@/types';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getStatusColor } from '@/lib/utils';
import { 
  Plus, 
  Car, 
  Trash2, 
  Search,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  Filter,
  Grid,
  List,
  Fuel
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchVehiclesData = async () => {
    try {
      setIsLoading(true);
      const data = await getVehicles();
      setVehicles(data);
      setFilteredVehicles(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch vehicles:', err);
      setError(err.message || 'Došlo je do greške prilikom dohvatanja vozila.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesData();
  }, []);

  const handleDeleteVehicle = async (vehicleId: number, vehicleName: string) => {
    if (window.confirm(`Jeste li sigurni da želite obrisati vozilo "${vehicleName}"?`)) {
      setDeletingId(vehicleId);
      try {
        await deleteVehicle(vehicleId);
        toast.success(`Vozilo "${vehicleName}" uspješno obrisano.`);
        fetchVehiclesData(); 
      } catch (err: any) {
        console.error('Failed to delete vehicle:', err);
        toast.error(err.message || 'Greška prilikom brisanja vozila.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = vehicles.filter(vehicle => 
        vehicle.vehicle_name.toLowerCase().includes(lowercasedSearch) ||
        vehicle.license_plate.toLowerCase().includes(lowercasedSearch) ||
        (vehicle.status && vehicle.status.toLowerCase().includes(lowercasedSearch))
      );
      setFilteredVehicles(filtered);
    }
  }, [searchTerm, vehicles]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-150px)]">
        <motion.div 
          className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-lg font-medium text-muted-foreground mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Učitavanje liste vozila...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
        <motion.div 
          className="backdrop-blur-md bg-white/10 border border-white/10 p-8 rounded-2xl text-center max-w-md shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-xl font-semibold mb-2 text-red-500">Greška!</p>
          <p className="mb-6 text-gray-600">{error}</p>
          <Button 
            variant="destructive"
            onClick={fetchVehiclesData}
          >
            Pokušaj ponovo
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-600 rounded-full filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-800 rounded-full filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Vozila
            </h1>
            <p className="text-gray-300 mt-1">Upravljajte voznim parkom</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-auto">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#F08080] h-4 w-4">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Pretraži vozila..."
                className="pl-10 pr-4 py-2 border border-white/20 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#F08080]/50 bg-white/10 backdrop-blur-md text-foreground"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary"
                size="icon"
                onClick={() => setViewMode('grid')}
                aria-label="Grid prikaz"
                className={viewMode === 'grid' 
                  ? 'backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all' 
                  : 'backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all'}
              >
                <Grid size={18} />
              </Button>
              <Button 
                variant="secondary"
                size="icon"
                onClick={() => setViewMode('list')}
                aria-label="List prikaz"
                className={viewMode === 'list' 
                  ? 'backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all' 
                  : 'backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all'}
              >
                <List size={18} />
              </Button>
              <Link href="/dashboard/vehicles/new">
                <Button 
                  variant="default" 
                  className="backdrop-blur-md bg-[#F08080]/30 border border-white/20 text-white shadow-lg hover:bg-[#F08080]/40 transition-all font-medium"
                >
                  <Plus size={18} className="mr-2"/>
                  Dodaj Vozilo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {filteredVehicles.length === 0 && (
        <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-lg">
          <div className="text-center p-12 relative">
            <div className="absolute inset-0 bg-white/5 z-0"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl opacity-5"></div>
            
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mb-4">
              <Car className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              {searchTerm ? 'Nema rezultata pretrage' : 'Nema vozila'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {searchTerm 
                ? `Nismo pronašli vozila koja odgovaraju pojmu "${searchTerm}". Pokušajte sa drugim pojmom.`
                : 'Dodajte prvo vozilo da biste započeli upravljanje voznim parkom.'}
            </p>
            {!searchTerm && (
              <Link href="/dashboard/vehicles/new">
                <Button variant="default" className="shadow-md">
                  <Plus size={18} className="mr-2"/>
                  Dodaj Prvo Vozilo
                </Button>
              </Link>
            )}
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
              >
                Očisti pretragu
              </Button>
            )}
          </div>
        </Card>
      )}

      {filteredVehicles.length > 0 && viewMode === 'grid' && (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredVehicles.map((vehicle) => {
            const mainImage = vehicle.images?.find(img => img.isMainImage) || vehicle.images?.[0];
            const imageUrl = mainImage ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${mainImage.imageUrl}` : null;

            return (
              <motion.div key={vehicle.id} variants={itemVariants}>
                <Card className="h-full flex flex-col overflow-hidden border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c]/60 to-[#1a1a1a]/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F08080]/20 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10 z-0"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full filter blur-3xl opacity-20 -ml-10 -mb-10 z-0"></div>
                  <Link href={`/dashboard/vehicles/details/${vehicle.id}`} className="block relative h-48 w-full group overflow-hidden rounded-t-xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50 group-hover:opacity-70 transition-all duration-300 z-10" />
                    
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={`${vehicle.vehicle_name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                        <Car className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 z-20">
                      <span className={`backdrop-blur-md ${getStatusColor(vehicle.status)} inline-block px-3 py-1 rounded-full text-xs font-medium text-white shadow-md border border-white/20 transition-all duration-300 group-hover:scale-105`}>
                        {vehicle.status || 'N/A'}
                      </span>
                    </div>
                  </Link>
                  <CardContent className="flex-grow flex flex-col p-5 relative z-10">
                    <Link href={`/dashboard/vehicles/details/${vehicle.id}`}>
                      <h3 className="text-lg font-semibold mb-1 text-white hover:text-[#F08080] transition-colors duration-200 line-clamp-1">{vehicle.vehicle_name}</h3>
                    </Link>
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F08080]/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">REG</span>
                        </div>
                        <p className="text-sm text-white/80">{vehicle.license_plate}</p>
                      </div>
                      {vehicle.fuel_type && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Fuel size={14} className="text-blue-300" />
                          </div>
                          <p className="text-sm text-white/80">{vehicle.fuel_type}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-white/20">
                      <Link href={`/dashboard/vehicles/details/${vehicle.id}`}>
                        <Button variant="secondary" size="sm" className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200">
                          Detalji
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600 border border-white/10 hover:bg-red-500/10 disabled:opacity-50"
                        onClick={() => handleDeleteVehicle(vehicle.id, vehicle.vehicle_name)}
                        disabled={deletingId === vehicle.id}
                        aria-label="Obriši vozilo"
                      >
                        {deletingId === vehicle.id ? (
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 size={16} />
                          </motion.div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {filteredVehicles.length > 0 && viewMode === 'list' && (
        <Card className="border border-white/10 overflow-hidden backdrop-blur-md bg-gradient-to-br from-white/60 to-white/20 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Slika</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Naziv Vozila</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registracija</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredVehicles.map((vehicle, index) => {
                  const mainImage = vehicle.images?.find(img => img.isMainImage) || vehicle.images?.[0];
                  const imageUrl = mainImage ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${mainImage.imageUrl}` : null;

                  return (
                    <motion.tr 
                      key={vehicle.id} 
                      className="hover:bg-white/5 transition-colors duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="relative h-12 w-20 rounded-md overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 z-10 backdrop-blur-sm" />
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={`Slika za ${vehicle.vehicle_name}`}
                              fill
                              sizes="80px"
                              style={{ objectFit: 'cover' }}
                              className="rounded-md"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center relative z-20">
                              <Car className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/dashboard/vehicles/details/${vehicle.id}`} className="font-medium hover:underline bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                          {vehicle.vehicle_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {vehicle.license_plate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`backdrop-blur-sm ${getStatusColor(vehicle.status)} inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white border border-white/20`}>
                          {vehicle.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex space-x-2 items-center">
                          <Link href={`/dashboard/vehicles/details/${vehicle.id}`} className="min-w-0">
                            <Button variant="secondary" size="sm">
                              Detalji
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-[#F08080] hover:text-white border border-[#F08080]/30 hover:bg-[#F08080]/30 disabled:opacity-50 transition-all duration-200"
                            onClick={() => handleDeleteVehicle(vehicle.id, vehicle.vehicle_name)}
                            disabled={deletingId === vehicle.id}
                            aria-label="Obriši vozilo"
                          >
                            {deletingId === vehicle.id ? (
                              <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Loader2 size={16} />
                              </motion.div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
