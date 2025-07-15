import { PDFDocument } from 'pdf-lib';
import { downloadDocument } from '@/lib/apiService';

/**
 * Spaja fakturu i prikačeni PDF dokument u jedan PDF
 * @param invoicePdfBytes - bytes generisane fakture
 * @param operation - fueling operacija koja može imati prikačene dokumente
 * @returns Promise<Uint8Array> - spojeni PDF kao bytes
 */
export const mergeInvoiceWithAttachedDocument = async (
  invoicePdfBytes: Uint8Array,
  operation: any
): Promise<Uint8Array> => {
  try {
    console.log('🔍 Početak spajanja PDF-ova...');
    console.log('📄 Operacija:', operation);
    console.log('📋 Dokumenti:', operation.documents);
    
    // Kreiraj novi PDF dokument
    const mergedPdf = await PDFDocument.create();
    
    // Dodaj fakturu kao prvu stranicu
    const invoicePdf = await PDFDocument.load(invoicePdfBytes);
    const invoicePages = await mergedPdf.copyPages(invoicePdf, invoicePdf.getPageIndices());
    invoicePages.forEach((page) => mergedPdf.addPage(page));
    
    console.log(`✅ Faktura dodana (${invoicePages.length} stranica)`);
    
    // Provjeri da li operacija ima prikačene dokumente
    if (operation.documents && operation.documents.length > 0) {
      console.log(`📁 Pronađeno ${operation.documents.length} dokumenata`);
      
      // Pronađi prvi PDF dokument
      const pdfDocument = operation.documents.find((doc: any) => 
        doc.mimeType === 'application/pdf' || 
        doc.originalFilename?.toLowerCase().endsWith('.pdf')
      );
      
      if (pdfDocument) {
        console.log('📄 Pronađen PDF dokument:', pdfDocument);
        
        try {
          // Preuzmi PDF dokument sa servera koristeći istu logiku kao u postojećem kodu
          let relativePath = '';
          const storagePath = pdfDocument.storagePath as string;
          
          if (storagePath) {
            const privateUploadsMarker = 'private_uploads/';
            const startIndex = storagePath.indexOf(privateUploadsMarker);
            if (startIndex !== -1) {
              relativePath = storagePath.substring(startIndex + privateUploadsMarker.length);
            } else {
              console.error('Could not find "private_uploads/" in storagePath:', storagePath);
              throw new Error('Neispravna putanja do dokumenta');
            }
          } else {
            console.error('storagePath is missing for document:', pdfDocument);
            throw new Error('Putanja do dokumenta nedostaje');
          }
          
          // Koristi postojeći downloadDocument funkciju
          const { downloadDocument } = await import('@/lib/apiService');
          const secureUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/${relativePath}`;
          
          console.log('🌐 Pokušavam preuzeti dokument sa URL-a:', secureUrl);
          
          // Koristi fetchWithAuth umjesto običnog fetch-a
          const { fetchWithAuth } = await import('@/lib/apiService');
          const response = await fetchWithAuth(secureUrl, {
            method: 'GET',
            returnRawResponse: true
          }) as Response;
          
          if (response.ok) {
            const attachedPdfBytes = await response.arrayBuffer();
            console.log(`📥 Dokument preuzet (${attachedPdfBytes.byteLength} bajtova)`);
            
            // Učitaj prikačeni PDF
            const attachedPdf = await PDFDocument.load(new Uint8Array(attachedPdfBytes));
            const attachedPages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
            
            // Dodaj stranice prikačenog PDF-a
            attachedPages.forEach((page) => mergedPdf.addPage(page));
            
            console.log(`✅ Uspješno spojeno ${attachedPages.length} stranica prikačenog dokumenta`);
          } else {
            console.warn('❌ Nije moguće preuzeti prikačeni dokument:', response.statusText);
            console.warn('Response status:', response.status);
          }
        } catch (error) {
          console.error('❌ Greška pri preuzimanju prikačenog dokumenta:', error);
        }
      } else {
        console.log('ℹ️ Nema PDF dokumenata za spajanje');
      }
    } else {
      console.log('ℹ️ Operacija nema prikačenih dokumenata');
    }
    
    // Generiši finalni PDF
    const mergedPdfBytes = await mergedPdf.save();
    console.log(`✅ Finalni PDF generisan (${mergedPdfBytes.length} bajtova)`);
    return mergedPdfBytes;
    
  } catch (error) {
    console.error('❌ Greška pri spajanju PDF-ova:', error);
    throw error;
  }
};

/**
 * Spaja fakturu i prikačeni PDF dokument, zatim downloaduje spojeni PDF
 * @param invoicePdfBytes - bytes generisane fakture
 * @param operation - fueling operacija
 * @param filename - ime fajla za download
 */
export const mergeAndDownloadInvoice = async (
  invoicePdfBytes: Uint8Array,
  operation: any,
  filename: string
): Promise<void> => {
  try {
    const mergedPdfBytes = await mergeInvoiceWithAttachedDocument(invoicePdfBytes, operation);
    
    // Kreiraj blob i downloaduj
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Greška pri spajanju i download-u PDF-a:', error);
    throw error;
  }
}; 