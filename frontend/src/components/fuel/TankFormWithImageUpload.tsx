import React, { useState } from 'react';
import { PhotoIcon, BeakerIcon, MapPinIcon } from '@heroicons/react/24/outline';
import TankImageUpload from './TankImageUpload';
import { formatImageUrl, logImageUrl } from '@/lib/imageUtils';

// Primjer forme za dodavanje/uređivanje tanka s opcijom za upload slika
// Ovaj kod možete integrirati u vaš TankManagement.tsx

interface TankFormProps {
  isEdit?: boolean;
  tankId?: number;
  existingImageUrl?: string;
  formData: {
    identifier: string;
    name: string;
    location: string;
    capacity_liters: string;
    current_liters: string;
    fuel_type: string;
  };
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onImageUploaded?: (imageUrl: string) => void;
}

const TankFormWithImageUpload: React.FC<TankFormProps> = ({
  isEdit = false,
  tankId,
  existingImageUrl,
  formData,
  onSubmit,
  onCancel,
  handleInputChange,
  onImageUploaded
}) => {
  // Use the utility function to format the image URL
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    formatImageUrl(existingImageUrl)
  );
  
  // Log the initial image URL for debugging
  logImageUrl('TankFormWithImageUpload-Init', existingImageUrl, imageUrl);

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
        {/* Image Upload Section */}
        <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
          <div className="flex items-center mb-3">
            <PhotoIcon className="w-5 h-5 text-[#E60026] mr-2" />
            <h4 className="font-medium text-indigo-800">Slika Tanka</h4>
          </div>
          
          <TankImageUpload
            tankId={isEdit ? tankId : undefined}
            existingImageUrl={imageUrl}
            onImageUploaded={(url) => {
              const formattedUrl = formatImageUrl(url);
              setImageUrl(formattedUrl);
              logImageUrl('TankFormWithImageUpload-Upload', url, formattedUrl);
              if (onImageUploaded) {
                onImageUploaded(formattedUrl || url);
              }
            }}
          />
        </div>

        {/* Basic Information Section */}
        <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
          <div className="flex items-center mb-3">
            <BeakerIcon className="w-5 h-5 text-[#E60026] mr-2" />
            <h4 className="font-medium text-indigo-800">Osnovne Informacije</h4>
          </div>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                Identifikator
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="identifier"
                  id="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  required
                  placeholder="npr. AV-001"
                  className="block w-full rounded-md border-gray-300 focus:border-[#E60026] focus:ring-[#E60026] sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Naziv
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="npr. Cisterna 1"
                  className="block w-full rounded-md border-gray-300 focus:border-[#E60026] focus:ring-[#E60026] sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Location Section */}
        <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
          <div className="flex items-center mb-3">
            <MapPinIcon className="w-5 h-5 text-[#E60026] mr-2" />
            <h4 className="font-medium text-indigo-800">Lokacija</h4>
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Lokacija Cisterne
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="text"
                name="location"
                id="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                placeholder="npr. Aerodrom Sarajevo"
                className="block w-full rounded-md border-gray-300 focus:border-[#E60026] focus:ring-[#E60026] sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Capacity and Fuel Section */}
        <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-[#E60026] mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 14C19 16.7614 16.7614 19 14 19H10C7.23858 19 5 16.7614 5 14V10C5 7.23858 7.23858 5 10 5H14C16.7614 5 19 7.23858 19 10V14Z" stroke="currentColor" strokeWidth="2" />
              <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h4 className="font-medium text-indigo-800">Kapacitet i Gorivo</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="capacity_liters" className="block text-sm font-medium text-gray-700">
                Kapacitet (litara)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="capacity_liters"
                  id="capacity_liters"
                  min="0"
                  step="0.1"
                  value={formData.capacity_liters}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 focus:border-[#E60026] focus:ring-[#E60026] sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">L</span>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="current_liters" className="block text-sm font-medium text-gray-700">
                Trenutna Količina
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="current_liters"
                  id="current_liters"
                  min="0"
                  step="0.1"
                  value={formData.current_liters}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 focus:border-[#E60026] focus:ring-[#E60026] sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">L</span>
                </div>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="fuel_type" className="block text-sm font-medium text-gray-700">
                Tip Goriva
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <select
                  id="fuel_type"
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 focus:border-[#E60026] focus:ring-[#E60026] sm:text-sm pr-10 appearance-none"
                >
                  <option value="Jet A-1">Jet A-1</option>
                  <option value="Avgas 100LL">Avgas 100LL</option>
                  <option value="Druga vrsta goriva">Druga vrsta goriva</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-3 border-t pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E60026] sm:mt-0 sm:text-sm transition-colors"
        >
          Odustani
        </button>
        <button
          type="submit"
          className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2.5 bg-gradient-to-r from-[#E60026] to-[#800014] text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E60026] sm:text-sm transition-colors"
        >
          {isEdit ? 'Spremi Promjene' : 'Dodaj Tank'}
        </button>
      </div>
    </form>
  );
};

export default TankFormWithImageUpload;
