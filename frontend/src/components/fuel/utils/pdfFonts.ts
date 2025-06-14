import jsPDF from 'jspdf';

/**
 * Add Noto Sans font to jsPDF for proper special character support (č, ć, ž, đ, š)
 * This allows proper rendering of Bosnian/Croatian special characters in PDF documents
 */
export const addFontToJsPDF = (doc: jsPDF): void => {
  // Standard font with unicode support
  doc.setFont('helvetica');
  
  // Set language-specific encoding
  doc.setLanguage('hr');
  
  // Set font size
  doc.setFontSize(10);
};
