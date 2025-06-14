import React, { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { fetchWithAuth } from '@/lib/apiService';
import { toast } from 'react-hot-toast';

interface TankManagementImageUploadProps {
  tankId?: number;
  existingImageUrl?: string;
  onImageUploaded?: (imageUrl: string) => void;
}

const TankManagementImageUpload: React.FC<TankManagementImageUploadProps> = ({
  tankId,
  existingImageUrl,
  onImageUploaded
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(existingImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // If we have a tankId, upload the image immediately
      if (tankId) {
        await uploadImage(file);
      } else {
        // Store the file for later upload when tank is created
        if (onImageUploaded) {
          onImageUploaded(URL.createObjectURL(file));
        }
      }
    }
  };
  
  const uploadImage = async (file: File) => {
    if (!tankId) return;
    
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetchWithAuth<{ image_url: string, message: string }>(`/api/fuel/tanks/${tankId}/image`, {
        method: 'POST',
        body: formData,
      });
      
      toast.success('Slika uspješno uploadana');
      
      // Call the callback with the new image URL
      if (onImageUploaded) {
        onImageUploaded(response.image_url);
      }
    } catch (error) {
      console.error('Error uploading tank image:', error);
      toast.error('Greška pri uploadu slike');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center">
        {imagePreview ? (
          <div className="relative w-full h-48 mb-2 rounded-lg overflow-hidden">
            <img 
              src={imagePreview} 
              alt="Tank preview" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 mb-2 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Kliknite za odabir slike</p>
          </div>
        )}
      </div>
      
      <div className="mt-2">
        <label htmlFor="tank-image" className="block text-sm font-medium text-gray-700 mb-1">
          {tankId ? 'Promijeni sliku' : 'Odaberi sliku'}
        </label>
        <input
          type="file"
          id="tank-image"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-red-50 file:text-red-700
            hover:file:bg-red-100
            cursor-pointer"
        />
        {isUploading && (
          <div className="mt-2 text-sm text-gray-500 flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </div>
        )}
      </div>
    </div>
  );
};

export default TankManagementImageUpload;
