"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FixedTankStatus, FuelType, FixedStorageTank } from '@/types/fuel';
import { createFixedTank } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';

interface NewFixedTankFormProps {
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

// Define an interface for form data
interface FixedTankFormData {
  name: string;
  identifier: string;
  capacity_liters: string; // Initially string for input, convert to number on submit
  fuel_type: FuelType | ''; // Allow empty string for initial empty value
  status: FixedTankStatus;
  location_description: string;
  current_quantity_liters?: string; // Make optional as per backend controller
}

const NewFixedTankForm: React.FC<NewFixedTankFormProps> = ({ onSubmitSuccess, onCancel }) => {
  const [formData, setFormData] = useState<FixedTankFormData>({
    name: '',
    identifier: '',
    capacity_liters: '',
    fuel_type: '', // Start with empty or a default FuelType e.g. FuelType.DIESEL
    status: FixedTankStatus.ACTIVE, // Default status
    location_description: '',
    current_quantity_liters: '0', // Default to 0 or empty string
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedDocument(event.target.files[0]);
    } else {
      setSelectedDocument(null);
    }
  };

  const handleSelectChange = (name: keyof FixedTankFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const capacity_liters_num = parseFloat(formData.capacity_liters);
    const current_quantity_liters_num = formData.current_quantity_liters ? parseFloat(formData.current_quantity_liters) : 0;

    if (!formData.name || !formData.identifier || isNaN(capacity_liters_num) || capacity_liters_num <= 0 || !formData.fuel_type || !formData.status) {
        setError('Molimo popunite sva obavezna polja ispravno (Naziv, Identifikator, Kapacitet > 0, Tip Goriva, Status).');
        setIsLoading(false);
        return;
    }
    
    if (current_quantity_liters_num < 0) {
        setError('Početna količina ne može biti negativna.');
        setIsLoading(false);
        return;
    }

    if (current_quantity_liters_num > capacity_liters_num) {
        setError('Početna količina ne može biti veća od kapaciteta.');
        setIsLoading(false);
        return;
    }

    const formDataPayload = new FormData();
    formDataPayload.append('tank_name', formData.name);
    formDataPayload.append('tank_identifier', formData.identifier);
    formDataPayload.append('capacity_liters', String(capacity_liters_num));
    formDataPayload.append('fuel_type', formData.fuel_type as FuelType);
    formDataPayload.append('status', formData.status);
    formDataPayload.append('location_description', formData.location_description);

    if (formData.current_quantity_liters && !isNaN(current_quantity_liters_num)) {
      formDataPayload.append('current_liters', String(current_quantity_liters_num));
    } else {
      formDataPayload.append('current_liters', '0');
    }

    if (selectedDocument) {
      formDataPayload.append('identificationDocument', selectedDocument);
    }

    try {
      await createFixedTank(formDataPayload as any); // apiService needs to handle FormData
      onSubmitSuccess(); 
    } catch (err: any) {
      console.error('Failed to create tank:', err);
      // err.responseBody might contain more detailed error from the new global error handler
      const message = err.responseBody?.message || err.message || 'Došlo je do greške prilikom kreiranja tanka.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#111111]/90 backdrop-blur-md border-0 shadow-2xl p-6 rounded-xl">
      <form onSubmit={handleSubmit} id="new-tank-form" className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/90 font-medium">Naziv Tanka</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-white/90 font-medium">Identifikator</Label>
              <Input 
                id="identifier" 
                name="identifier" 
                value={formData.identifier} 
                onChange={handleChange} 
                required 
                className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity_liters" className="text-white/90 font-medium">Kapacitet (L)</Label>
              <Input 
                id="capacity_liters" 
                name="capacity_liters" 
                type="number" 
                value={formData.capacity_liters} 
                onChange={handleChange} 
                required 
                className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="current_quantity_liters" className="text-white/90 font-medium">Početna Količina (L)</Label>
              <Input 
                id="current_quantity_liters" 
                name="current_quantity_liters" 
                type="number" 
                value={formData.current_quantity_liters} 
                onChange={handleChange} 
                className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20"
              />
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuel_type" className="text-white/90 font-medium">Tip Goriva</Label>
              <Select 
                name="fuel_type" 
                value={formData.fuel_type} 
                onValueChange={(value: string) => handleSelectChange('fuel_type', value as FuelType)} 
                required
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20">
                  <SelectValue placeholder="Odaberite tip goriva" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/20 text-white">
                  {Object.values(FuelType).map(type => (
                    <SelectItem key={type} value={type} className="focus:bg-[#E60026]/20 focus:text-white">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-white/90 font-medium">Status</Label>
              <Select 
                name="status" 
                value={formData.status} 
                onValueChange={(value: string) => handleSelectChange('status', value as FixedTankStatus)} 
                required
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20">
                  <SelectValue placeholder="Odaberite status" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/20 text-white">
                  {Object.values(FixedTankStatus).map(s => (
                    <SelectItem key={s} value={s} className="focus:bg-[#E60026]/20 focus:text-white">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location_description" className="text-white/90 font-medium">Opis Lokacije</Label>
              <Input 
                id="location_description" 
                name="location_description" 
                value={formData.location_description} 
                onChange={handleChange} 
                className="bg-white/10 border-white/20 text-white focus:border-[#E60026]/70 focus:ring-[#E60026]/20"
              />
            </div>
          </div>
        </div>
        
        {/* Full width document upload */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="identificationDocument" className="text-white/90 font-medium">Identifikacioni Dokument (Opciono)</Label>
          <Input 
            id="identificationDocument" 
            name="identificationDocument" 
            type="file" 
            onChange={handleFileChange} 
            className="mt-1 block w-full text-sm text-white/80 bg-white/10 border-white/20 rounded-lg
                      file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium 
                      file:bg-[#E60026]/80 file:text-white hover:file:bg-[#E60026]" 
            accept=".pdf,.jpg,.jpeg,.png"
          />
          {selectedDocument && (
            <p className="mt-1 text-xs text-[#E60026]/80">Odabran dokument: {selectedDocument.name}</p>
          )}
        </div>
      </form>
    </Card>
  );
};

export default NewFixedTankForm;
