'use client';

import React, { useState, useEffect } from 'react';
import FuelConsistencyStatus from '@/components/fuel/FuelConsistencyStatus';
import FuelConsistencyDialog from '@/components/fuel/FuelConsistencyDialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Info, AlertTriangle } from 'lucide-react';
import fuelConsistencyService, { TankConsistencyResult } from '@/lib/fuelConsistencyService';

export default function FuelConsistencyPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [inconsistencyData, setInconsistencyData] = useState<TankConsistencyResult | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectTank = async (tankId: number) => {
    try {
      // Dohvati podatke o konzistentnosti za odabrani tank
      const tankData = await fuelConsistencyService.checkTankConsistency(tankId);
      setInconsistencyData(tankData);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Greška prilikom dohvaćanja podataka o konzistentnosti tanka:', error);
      // Možemo dodati prikazivanje obavijesti o grešci ovdje
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setInconsistencyData(undefined);
  };
  
  const handleResolved = () => {
    // Nakon uspješne korekcije, osvježavamo prikaz
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Provjera konzistentnosti goriva</h1>
        <p className="text-gray-600">
          Ovaj alat omogućava provjeru konzistentnosti između stvarne količine goriva u tankovima i 
          očekivane količine prema evidenciji operacija.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FuelConsistencyStatus
            onSelectTank={handleSelectTank}
            refreshTrigger={refreshTrigger}
          />
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info size={18} />
                <span>Informacije o konzistentnosti</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium mb-1">Što je konzistentnost goriva?</h3>
                  <p className="text-sm text-gray-600">
                    Konzistentnost goriva provjerava jesu li stvarne količine u tankovima usklađene 
                    s očekivanim količinama prema evidenciji ulaza i izlaza goriva.
                  </p>
                </div>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <h3 className="flex items-center gap-2 font-medium mb-1">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span>Kada korigirati nekonzistentnost?</span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    Korekcije treba raditi samo nakon temeljite provjere i utvrđivanja uzroka 
                    nepodudaranja. Svaka korekcija se bilježi u sistem s detaljnim zapisom o 
                    korisniku i razlogu promjene.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Legenda statusa</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-sm">Konzistentno: Tank i MRN zapisi se podudaraju</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                      <span className="text-sm">Manja nekonzistentnost: Razlika do 1% ukupne količine</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-sm">Velika nekonzistentnost: Razlika veća od 1% ukupne količine</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog za rješavanje nekonzistentnosti */}
      <FuelConsistencyDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        inconsistencyData={inconsistencyData}
        onResolved={handleResolved}
      />
    </div>
  );
}
