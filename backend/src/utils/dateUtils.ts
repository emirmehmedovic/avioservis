/**
 * Validates and parses a date string into a Date object
 * @param dateString - The date string to validate and parse
 * @returns A Date object if valid, null otherwise
 */
export const validateAndParseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  // Try to create a date object
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
};
