import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import path from 'path';
import fs from 'fs';
import { resolveDocumentPath } from '../config/paths';

export const downloadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { documentId } = req.params;

  if (!documentId || isNaN(parseInt(documentId))) {
    res.status(400).json({ message: 'Invalid document ID provided.' });
    return;
  }

  try {
    const id = parseInt(documentId);
    const document = await prisma.fuelIntakeDocuments.findUnique({
      where: { id },
    });

    if (!document || !document.document_path) {
      res.status(404).json({ message: 'Document not found.' });
      return;
    }

    // Koristi novu funkciju za rješavanje putanja dokumenata koja radi na svim okruženjima
    const filePath = resolveDocumentPath(document.document_path);
    
    // Provjeri postoji li datoteka
    if (!fs.existsSync(filePath)) {
        console.error(`Physical document file not found on server at: ${filePath}`);
        res.status(404).json({ message: 'Physical document file not found on server.' });
        return;
    }

    // Set headers to prompt download
    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name || path.basename(filePath)}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        // Don't try to send another response if one has already been started
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error streaming file.' });
        }
        next(err); // Pass error to Express error handler
    });

    // No explicit res.end() or res.json() here as pipe handles it.

  } catch (error) {
    console.error('Error in downloadDocument:', error);
    // Pass to the generic error handler
    next(error);
  }
};

// New function to download fueling operation documents
export const downloadFuelingOperationDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { documentId } = req.params;

  if (!documentId || isNaN(parseInt(documentId))) {
    res.status(400).json({ message: 'Invalid document ID provided.' });
    return;
  }

  try {
    const id = parseInt(documentId);
    
    // Find the fueling operation document by ID using the AttachedDocument model
    const document = await prisma.attachedDocument.findUnique({
      where: { id },
      include: { fuelingOperation: true } // Include the related fueling operation
    });

    if (!document || !document.storagePath) {
      res.status(404).json({ message: 'Document not found.' });
      return;
    }

    // Verify this is a fueling operation document
    if (!document.fuelingOperationId) {
      res.status(400).json({ message: 'The requested document is not associated with a fueling operation.' });
      return;
    }

    // Log the document details for debugging
    console.log('Document details:', {
      id: document.id,
      storagePath: document.storagePath,
      originalFilename: document.originalFilename,
      fuelingOperationId: document.fuelingOperationId
    });

    // Koristi novu funkciju za rješavanje putanja dokumenata koja radi na svim okruženjima
    // Ako je storagePath null ili undefined, koristi samo ime datoteke za pretragu
    const searchPath = document.storagePath || `fuelop-${document.id}.pdf`;
    const filePath = resolveDocumentPath(searchPath);
    
    // Provjeri postoji li datoteka
    if (!fs.existsSync(filePath)) {
      // Pokušaj pronaći datoteku po ID-u u direktoriju za dokumente operacija točenja goriva
      console.error(`Physical document file not found on server at: ${filePath}`);
      console.log('Trying to find file by pattern...');
      
      // Pokušaj pronaći datoteku po obrascu imena
      const filePattern = `fuelop-*-*${document.id}*`;
      const cmd = `find ${path.join(process.cwd(), '..')} -name "${filePattern}" | head -n 1`;
      console.log(`Executing command: ${cmd}`);
      
      try {
        const { execSync } = require('child_process');
        const foundFile = execSync(cmd).toString().trim();
        
        if (foundFile) {
          console.log(`Found file by pattern: ${foundFile}`);
          if (fs.existsSync(foundFile)) {
            console.log('File exists, using this path');
            return res.sendFile(foundFile);
          }
        }
      } catch (err) {
        console.error('Error finding file by pattern:', err);
      }
      
      res.status(404).json({ message: 'Physical document file not found on server.' });
      return;
    }

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename || path.basename(filePath)}"`);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file.' });
      }
      next(err);
    });

  } catch (error) {
    console.error('Error in downloadFuelingOperationDocument:', error);
    next(error);
  }
};
