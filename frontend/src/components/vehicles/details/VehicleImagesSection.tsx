'use client';

import React, { useState } from 'react';
import { VehicleImage as VehicleImageType } from '@/types';
import { FaCamera, FaUpload, FaStar, FaTrash } from 'react-icons/fa';
import Card from './Card';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { uploadVehicleImage, deleteVehicleImage, setMainVehicleImage } from '@/lib/apiService';
import { getSecureFileUrl } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface VehicleImagesSectionProps {
  vehicleId: number;
  images: VehicleImageType[];
  onImageUploaded: () => void;
  onSetMainImage: (imageId: number) => void;
  onOpenImageModal: (image: VehicleImageType) => void;
}

const VehicleImagesSection: React.FC<VehicleImagesSectionProps> = ({
  vehicleId,
  images,
  onImageUploaded,
  onSetMainImage,
  onOpenImageModal
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile) {
      toast.error('Molimo odaberite sliku za upload.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadVehicleImage(vehicleId.toString(), selectedFile);
      toast.success('Slika uspješno uploadovana!');
      setSelectedFile(null);
      onImageUploaded();
      
      // Reset the file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error("Greška pri uploadu slike:", error);
      toast.error('Greška pri uploadu slike.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovu sliku?')) {
      return;
    }

    try {
      await deleteVehicleImage(vehicleId.toString(), imageId);
      toast.success('Slika uspješno obrisana!');
      onImageUploaded(); // Refresh images
    } catch (error) {
      console.error("Greška pri brisanju slike:", error);
      toast.error('Greška pri brisanju slike.');
    }
  };

  const handleSetMainImage = async (imageId: number) => {
    try {
      await setMainVehicleImage(vehicleId.toString(), imageId);
      toast.success('Glavna slika uspješno postavljena!');
      onImageUploaded(); // Refresh images
    } catch (error) {
      console.error("Greška pri postavljanju glavne slike:", error);
      toast.error('Greška pri postavljanju glavne slike.');
    }
  };

  return (
    <Card title="Slike vozila" icon={<FaCamera />} className="mb-6">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50">
            <FaUpload className="mr-2 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Odaberi sliku</span>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          
          {selectedFile && (
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={handleImageUpload}
                disabled={isUploading}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md bg-[#F08080]/30 border border-white/20 rounded-xl hover:bg-[#F08080]/40 transition-colors shadow-lg disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <FaUpload className="mr-1.5" /> Upload
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nema slika za ovo vozilo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div 
                  className="relative h-48 rounded-lg overflow-hidden cursor-pointer border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => onOpenImageModal(image)}
                >
                  <Image
                    src={getSecureFileUrl(image.imageUrl)}
                    alt={`Slika vozila ${vehicleId}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                  {image.isMainImage && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center">
                      <FaStar className="mr-1" /> Glavna
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    {!image.isMainImage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMainImage(image.id);
                        }}
                        className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                        title="Postavi kao glavnu sliku"
                      >
                        <FaStar />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id);
                      }}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Obriši sliku"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default VehicleImagesSection;
