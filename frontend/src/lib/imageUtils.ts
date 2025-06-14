/**
 * Utility functions for handling image URLs
 */

// Get the API base URL from environment variable or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Formats an image URL for proper display in the application
 * Handles various URL formats that might be returned from the backend
 * 
 * @param url The original image URL from the backend
 * @returns A properly formatted URL for the frontend
 */
export const formatImageUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  
  // If the URL is already a full URL, just add a timestamp and return
  if (url.startsWith('http')) {
    const hasQueryParams = url.includes('?');
    const timestamp = new Date().getTime();
    return `${url}${hasQueryParams ? '&' : '?'}t=${timestamp}`;
  }
  
  // For paths that start with '/public', we need to use the API base URL
  // because these files are served by the backend, not the frontend
  if (url.startsWith('/public/')) {
    const path = url.substring(7); // Remove '/public/' prefix
    const hasQueryParams = path.includes('?');
    const timestamp = new Date().getTime();
    return `${API_BASE_URL}/${path}${hasQueryParams ? '&' : '?'}t=${timestamp}`;
  }
  
  // For other relative paths, make sure they start with a slash
  let fixedUrl = url;
  if (!fixedUrl.startsWith('/')) {
    fixedUrl = '/' + fixedUrl;
  }
  
  // Add a timestamp to prevent caching issues
  const hasQueryParams = fixedUrl.includes('?');
  const timestamp = new Date().getTime();
  return `${fixedUrl}${hasQueryParams ? '&' : '?'}t=${timestamp}`;
};

/**
 * Logs information about an image URL for debugging purposes
 * 
 * @param context The context where the URL is being used
 * @param originalUrl The original URL
 * @param formattedUrl The formatted URL
 */
export const logImageUrl = (
  context: string,
  originalUrl: string | undefined | null,
  formattedUrl: string | undefined | null
): void => {
  console.log(`[${context}] Original URL: ${originalUrl || 'none'}`);
  console.log(`[${context}] Formatted URL: ${formattedUrl || 'none'}`);
};
