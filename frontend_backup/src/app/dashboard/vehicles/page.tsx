'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getVehicles } from '@/lib/apiService';
import { Vehicle, VehicleStatus } from '@/types';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getStatusColor, formatDate } from '@/lib/utils';
import { 
  Plus, 
  Car, 
  Edit, 
  Trash2, 
  Search,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchVehicles = async () => {
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

    fetchVehicles();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = vehicles.filter(vehicle => 
        vehicle.vehicle_name.toLowerCase().includes(lowercasedSearch) ||
        vehicle.license_plate.toLowerCase().includes(lowercasedSearch) ||
        vehicle.status.toLowerCase().includes(lowercasedSearch)
      );
      setFilteredVehicles(filtered);
    }
  }, [searchTerm, vehicles]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh]">
        <Loader2 className="w-12 h-12 text-avioBlue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Učitavanje liste vozila...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-destructive">
        <div className="bg-destructive/10 p-6 rounded-lg text-center max-w-md">
          <p className="text-xl font-semibold mb-2">Greška!</p>
          <p className="mb-4">{error}</p>
          <Button 
            variant="destructive"
            onClick={() => window.location.reload()}
          >
            Pokušaj ponovo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vozila</h1>
          <p className="text-muted-foreground mt-1">Upravljajte voznim parkom</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Pretraži vozila..."
              className="pl-10 pr-4 py-2 border border-input rounded-md w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-avioBlue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-secondary' : ''}
            >
              <SlidersHorizontal size={18} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-secondary' : ''}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </Button>
            <Link href="/dashboard/vehicles/new">
              <Button variant="avioBlue" icon={<Plus size={18} />}>
                Dodaj Vozilo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredVehicles.length === 0 && (
        <Card className="py-12">
          <div className="text-center">
            <Car className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Nema rezultata pretrage' : 'Nema vozila'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {searchTerm 
                ? `Nismo pronašli vozila koja odgovaraju pojmu "${searchTerm}". Pokušajte sa drugim pojmom.`
                : 'Dodajte prvo vozilo da biste započeli upravljanje voznim parkom.'}
            </p>
            {!searchTerm && (
              <Link href="/dashboard/vehicles/new">
                <Button variant="avioBlue" icon={<Plus size={18} />}>
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

      {/* Grid view */}
      {filteredVehicles.length > 0 && viewMode === 'grid' && (
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredVehicles.map((vehicle) => (
            <motion.div key={vehicle.id} variants={itemVariants}>
              <Card hoverable className="h-full flex flex-col overflow-hidden">
                <div className="relative h-48 w-full bg-muted">
                  {vehicle.image_url ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${vehicle.image_url}`}
                      alt={`${vehicle.vehicle_name}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      <Car className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`${getStatusColor(vehicle.status)} inline-block px-3 py-1 rounded-full text-xs font-medium`}>
                      {vehicle.status}
                    </span>
                  </div>
                </div>
                <CardContent className="flex-grow flex flex-col p-5">
                  <Link href={`/dashboard/vehicles/details/${vehicle.id}`} className="hover:underline">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">{vehicle.vehicle_name}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-4">Reg: {vehicle.license_plate}</p>
                  
                  <div className="mt-auto flex justify-between pt-4 border-t border-border">
                    <Link href={`/dashboard/vehicles/details/${vehicle.id}`}>
                      <Button variant="outline" size="sm">Detalji</Button>
                    </Link>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/vehicles/edit/${vehicle.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit size={16} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* List view */}
      {filteredVehicles.length > 0 && viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Slika</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Naziv Vozila</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Registracija</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVehicles.map((vehicle, index) => (
                  <motion.tr 
                    key={vehicle.id} 
                    className="hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                        {vehicle.image_url ? (
                          <Image
                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL}${vehicle.image_url}`}
                            alt={`Slika za ${vehicle.vehicle_name}`}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="rounded-md"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Car className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/vehicles/details/${vehicle.id}`} className="font-medium hover:underline text-avioBlue-600">
                        {vehicle.vehicle_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {vehicle.license_plate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${getStatusColor(vehicle.status)} inline-block`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/vehicles/details/${vehicle.id}`}>
                          <Button variant="outline" size="sm">Detalji</Button>
                        </Link>
                        <Link href={`/dashboard/vehicles/edit/${vehicle.id}`}>
                          <Button variant="ghost" size="sm" className="text-avioBlue-600">
                            <Edit size={16} className="mr-1" /> Izmijeni
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 size={16} className="mr-1" /> Obriši
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
