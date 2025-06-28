import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { VehicleStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Privremeno rješenje dok se ne sredi problem s Prisma tipovima na frontendu
export const formatDate = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Error';
  }
};

export const formatDateTime = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Error';
  }
}

export function getStatusColor(status: VehicleStatus): string {
  switch (status) {
    case VehicleStatus.ACTIVE:
      return "bg-green-500 hover:bg-green-600"; // Green for active
    case VehicleStatus.INACTIVE:
      return "bg-gray-500 hover:bg-gray-600";    // Gray for inactive
    case VehicleStatus.MAINTENANCE:
      return "bg-orange-500 hover:bg-orange-600"; // Orange for maintenance
    case VehicleStatus.OUT_OF_SERVICE:
      return "bg-red-500 hover:bg-red-600";       // Red for out of service
    default:
      return "bg-gray-400 hover:bg-gray-500";     // Default gray
  }
}

export function getInitials(name?: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name.split(" ").filter(Boolean); // Filter out empty strings from multiple spaces

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    // If single word, take first two letters, or one if it's a single letter word
    return parts[0].substring(0, 2).toUpperCase();
  }

  // For multiple words, take the first letter of the first two words
  const firstInitial = parts[0][0];
  const secondInitial = parts[1][0];
  
  return `${firstInitial}${secondInitial}`.toUpperCase();
}

/**
 * Formatira broj s dvije decimale i dodaje tisuću separator (točku)
 * Koristi se za prikaz količina goriva u litrama
 * 
 * @param value Broj koji treba formatirati
 * @returns Formatirani broj s dvije decimalne znamenke i tisućama odvojenima s točkom
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0,00';
  }
  
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Constructs a secure URL for accessing files.
 * Vehicle images are served directly via Nginx from public/uploads/
 * Other documents are served through secure API endpoints.
 *
 * @param filePath The original path to the file from the database, e.g., /uploads/vehicles/my-image.jpg
 * @returns The full URL for the file, or a placeholder if the path is invalid.
 */
export const getSecureFileUrl = (filePath: string | null | undefined): string => {
  if (!filePath) {
    // Return a placeholder image if the path is not provided. Ensure this placeholder exists in your `public` folder.
    return '/images/placeholder.png';
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  // Vehicle images are served directly via Nginx (public/uploads/vehicles/)
  if (filePath.includes('/uploads/vehicles/')) {
    return `${apiBaseUrl}${filePath}`;
  }

  // Vehicle documents are served directly via Nginx (public/uploads/*)
  if (filePath.includes('/uploads/filter_documents/') || 
      filePath.includes('/uploads/technical_documents/') || 
      filePath.includes('/uploads/hose_documents/')) {
    return `${apiBaseUrl}${filePath}`;
  }

  // Other files (like fueling operation documents) are served through secure API
  const securePath = filePath.startsWith('/uploads/') ? filePath.substring('/uploads/'.length) : filePath;
  return `${apiBaseUrl}/api/documents/${securePath}`;
};
