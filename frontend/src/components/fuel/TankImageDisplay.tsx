import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { formatImageUrl, logImageUrl } from '@/lib/imageUtils';
import './tankImageStyles.css';

interface TankImageDisplayProps {
  imageUrl?: string;
  tankName?: string;
  className?: string;
  height?: string;
}

const TankImageDisplay: React.FC<TankImageDisplayProps> = ({
  imageUrl,
  tankName = 'Tank',
  className = '',
  height = 'h-40'
}) => {
  // Format the image URL using the utility function
  const getImageUrl = (url: string) => {
    const formattedUrl = formatImageUrl(url);
    logImageUrl('TankImageDisplay', url, formattedUrl);
    return formattedUrl || '';
  };

  return (
    <div className={`w-full ${height} overflow-hidden ${className}`}>
      {imageUrl ? (
        <div className="relative w-full h-full">
          <img 
            src={getImageUrl(imageUrl)} 
            alt={`Slika tanka ${tankName}`} 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Error loading image:', imageUrl);
              // Hide the image on error
              e.currentTarget.style.display = 'none';
              // Show the fallback by adding a class to the parent div
              e.currentTarget.parentElement?.classList.add('image-error');
            }}
          />
          {/* Fallback that will be shown when the image-error class is added */}
          <div className="image-error-fallback h-full w-full bg-gray-100 flex items-center justify-center absolute top-0 left-0 opacity-0 pointer-events-none">
            <PhotoIcon className="h-12 w-12 text-gray-400" />
            <span className="text-sm text-gray-500 ml-2">Greška pri učitavanju slike</span>
          </div>
        </div>
      ) : (
        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
          <PhotoIcon className="h-12 w-12 text-gray-400" />
          <span className="text-sm text-gray-500 ml-2">Nema slike</span>
        </div>
      )}
    </div>
  );
};

export default TankImageDisplay;
