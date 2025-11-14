import { EmailDispatchStatus } from '@prisma/client';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);
import { EmailService, buildEmailConfigFromEnv, buildImapConfigFromEnv, buildEmailSubject, buildEmailBody, getAirlineEmailFromContact } from './emailService';
import { generatePDFInvoiceBuffer, buildPDFInvoiceFileName, FuelingOperationForPDF } from './pdfInvoiceGenerator';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../lib/prisma';

function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Merge invoice PDF with uploaded documents (delivery vouchers, etc.)
 * Similar to frontend pdfMerger logic
 */
async function mergeInvoiceWithDocuments(invoicePdfBuffer: Buffer, operation: any): Promise<Buffer> {
  try {
    console.log(`🔄 Starting PDF merge for operation ${operation.id}`);
    console.log(`📋 MERGE FUNCTION - documents array:`, JSON.stringify(operation.documents, null, 2));
    console.log(`📊 MERGE FUNCTION - documents count:`, operation.documents?.length || 0);

    // Create new PDF document  
    const mergedPdf = await PDFDocument.create();
    
    // Add invoice as first pages
    const invoicePdf = await PDFDocument.load(invoicePdfBuffer);
    const invoicePages = await mergedPdf.copyPages(invoicePdf, invoicePdf.getPageIndices());
    invoicePages.forEach((page) => mergedPdf.addPage(page));
    
    console.log(`✅ Invoice added (${invoicePages.length} pages)`);
    
    // Check if operation has uploaded documents
    if (operation.documents && operation.documents.length > 0) {
      console.log(`📁 Found ${operation.documents.length} documents to merge`);
      
      for (const doc of operation.documents) {
        try {
          // Only process PDF documents
          if (doc.mimeType === 'application/pdf' || doc.originalFilename?.toLowerCase().endsWith('.pdf')) {
            console.log(`📄 Processing PDF document: ${doc.originalFilename}`);
            
            console.log(`🔍 Raw storagePath: ${doc.storagePath}`);
          
            // Konstruiši putanju kao u frontend-u: preuzmi samo dio nakon 'private_uploads/'
            let fullDocumentPath;
            const storagePath = doc.storagePath as string;
            
            if (storagePath.includes('private_uploads/')) {
              // Isti pristup kao frontend: uzmi dio nakon 'private_uploads/'
              const privateUploadsMarker = 'private_uploads/';
              const startIndex = storagePath.indexOf(privateUploadsMarker);
              if (startIndex !== -1) {
                const relativePath = storagePath.substring(startIndex + privateUploadsMarker.length);
                console.log(`🔍 Relative path extracted: ${relativePath}`);
                // Konstruiši putanju iz backend root-a
                fullDocumentPath = path.join(process.cwd(), 'private_uploads', relativePath);
              } else {
                fullDocumentPath = path.join(process.cwd(), doc.storagePath);
              }
            } else {
              // Ako storagePath već je relativan, koristi ga direktno
              fullDocumentPath = path.join(process.cwd(), doc.storagePath);
            }
            
            console.log(`🔍 Final document path: ${fullDocumentPath}`);
            
            try {
              await fs.promises.access(fullDocumentPath);
              const docBuffer = await fs.promises.readFile(fullDocumentPath);
              console.log(`📖 Document loaded: ${docBuffer.length} bytes`);
              
              // Load and merge the PDF document
              const attachedPdf = await PDFDocument.load(docBuffer);
              const attachedPages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
              attachedPages.forEach((page) => mergedPdf.addPage(page));
              
              console.log(`✅ Document merged: ${doc.originalFilename} (${attachedPages.length} pages)`);
            } catch (accessError) {
              console.warn(`⚠️ Document file not found: ${fullDocumentPath}`);
              console.warn(`🔍 Attempting alternative paths...`);
              
              // Pokušaj alternativnu putanju
              const altPath1 = path.join(process.cwd(), 'backend', doc.storagePath);
              const altPath2 = doc.storagePath; // Možda je već apsolutna
              
              console.log(`🔍 Alt path 1: ${altPath1}`);
              console.log(`🔍 Alt path 2: ${altPath2}`);
              
              try {
                await fs.promises.access(altPath1);
                const docBuffer = await fs.promises.readFile(altPath1);
                console.log(`📖 Document loaded from alt path 1: ${docBuffer.length} bytes`);
                const attachedPdf = await PDFDocument.load(docBuffer);
                const attachedPages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
                attachedPages.forEach((page) => mergedPdf.addPage(page));
                console.log(`✅ Document merged: ${doc.originalFilename} (${attachedPages.length} pages)`);
              } catch {
                try {
                  await fs.promises.access(altPath2);
                  const docBuffer = await fs.promises.readFile(altPath2);
                  console.log(`📖 Document loaded from alt path 2: ${docBuffer.length} bytes`);
                  const attachedPdf = await PDFDocument.load(docBuffer);
                  const attachedPages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
                  attachedPages.forEach((page) => mergedPdf.addPage(page));
                  console.log(`✅ Document merged: ${doc.originalFilename} (${attachedPages.length} pages)`);
                } catch {
                  console.error(`❌ ALL PATHS FAILED for document: ${doc.originalFilename}`);
                }
              }
            }
          } else {
            console.log(`ℹ️ Skipping non-PDF document: ${doc.originalFilename} (${doc.mimeType})`);
          }
        } catch (docError) {
          console.error(`❌ Error processing document ${doc.originalFilename}:`, docError);
        }
      }
    } else {
      console.log(`ℹ️ No documents to merge for operation ${operation.id}`);
    }
    
    // Generate final merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const finalBuffer = Buffer.from(mergedPdfBytes);
    
    console.log(`🎉 PDF merge completed: ${finalBuffer.length} bytes total`);
    return finalBuffer;
    
  } catch (error) {
    console.error('❌ Error merging PDFs:', error);
    console.log('⚡ Fallback: Returning original invoice PDF');
    return invoicePdfBuffer; // Fallback to original invoice
  }
}

function getLocalArchivePath(opDate: Date, fileName: string): string {
  const dayStr = dayjs(opDate).format('YYYY-MM-DD');
  const baseDir = path.join(process.cwd(), 'private_uploads', 'email_invoices');
  return path.join(baseDir, dayStr, fileName);
}

export async function findEligibleOperationsForEmailDispatch(targetDate: Date) {
  // Calculate local day bounds
  const start = dayjs(targetDate).startOf('day').toDate();
  const end = dayjs(targetDate).endOf('day').toDate();

  const operations = await prisma.fuelingOperation.findMany({
    where: {
      is_deleted: false,
      dateTime: { gte: start, lte: end },
      // Only include operations where airline has email contact
      airline: {
        contact_details: {
          not: null,
        },
      },
    },
    include: { 
      airline: true, 
      tank: true,
      emailInvoiceDispatches: true,
    },
  });

  // Filter operations to only include those with valid email
  return operations.filter(op => {
    // Only include operations with valid email in contact details
    const email = getAirlineEmailFromContact(op.airline?.contact_details);
    return email !== null;
  });
}

export async function dispatchOneEmailOperation(opId: number, force = false) {
  console.log(`🚀 START: dispatchOneEmailOperation called with opId=${opId}, force=${force}`);
  
  const op = await prisma.fuelingOperation.findUnique({
    where: { id: opId },
    include: { airline: true, tank: true, emailInvoiceDispatches: true, documents: true },
  });
  
  if (!op) {
    console.error(`❌ Fueling operation ${opId} not found`);
    throw new Error('Fueling operation not found');
  }
  
  console.log(`📋 Operation ${opId} found:`, {
    id: op.id,
    aircraft: op.aircraft_registration,
    airline: op.airline?.name,
    documentsCount: op.documents?.length || 0
  });
  
  // EXPLICIT DEBUG: Show all documents
  console.log(`🔍 EXPLICIT DEBUG - RAW documents array:`, JSON.stringify(op.documents, null, 2));

  // Check if airline has email contact
  const emailTo = getAirlineEmailFromContact(op.airline?.contact_details);
  if (!emailTo) {
    throw new Error('Airline does not have valid email contact');
  }

  // Check if already sent
  const existingSent = op.emailInvoiceDispatches?.find((dispatch: any) => dispatch.status === EmailDispatchStatus.SENT);
  if (existingSent && !force) {
    return { skipped: true, reason: 'Already SENT', dispatch: existingSent };
  }

  // Check if any record exists (to avoid unique constraint error)
  const existingAny = op.emailInvoiceDispatches?.find((dispatch: any) => dispatch.fuelingOperationId === opId);
  console.log(`📋 Existing record check for operation ${opId}:`, existingAny ? 'FOUND' : 'NOT FOUND');

  // Generate Invoice PDF
  const originalInvoicePdfBuffer = await generatePDFInvoiceBuffer(op as unknown as FuelingOperationForPDF);
  
  // Merge invoice with uploaded documents (delivery vouchers, etc.)
  const mergedPdfBuffer = await mergeInvoiceWithDocuments(originalInvoicePdfBuffer, op);
  
  const pdfFileName = buildPDFInvoiceFileName(op as unknown as FuelingOperationForPDF);
  const pdfLocalPath = getLocalArchivePath(new Date(op.dateTime), pdfFileName);
  const sha = computeSha256(mergedPdfBuffer);

  // Ensure local dir and save merged PDF (async)
  await fs.promises.mkdir(path.dirname(pdfLocalPath), { recursive: true });
  await fs.promises.writeFile(pdfLocalPath, mergedPdfBuffer);

  // Build email content
  const emailSubject = buildEmailSubject(op);
  const emailBody = buildEmailBody(op);

  // Email configuration
  const emailConfig = buildEmailConfigFromEnv();
  const imapConfig = buildImapConfigFromEnv();
  const emailService = new EmailService(emailConfig, imapConfig);

  // Create or update record
  let record = existingAny;
  if (!record) {
    record = await prisma.emailInvoiceDispatch.create({
      data: {
        fuelingOperationId: op.id,
        airlineId: op.airlineId,
        status: EmailDispatchStatus.PENDING,
        attempts: 0,
        emailTo: emailTo,
        emailSubject: emailSubject,
        emailBody: emailBody,
        pdfFileName: pdfFileName,
        pdfSha256: sha,
      },
    });
  }

  try {
    // Check email service configuration
    const isEmailConfigured = Boolean(emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass);
    
    if (!isEmailConfigured) {
      const updated = await prisma.emailInvoiceDispatch.update({
        where: { id: record.id },
        data: {
          status: EmailDispatchStatus.FAILED,
          attempts: { increment: 1 } as any,
          lastError: 'Email configuration is missing',
          emailTo: emailTo,
          emailSubject: emailSubject,
          emailBody: emailBody,
          pdfFileName: pdfFileName,
          pdfSha256: sha,
        },
      });
      return { skipped: false, success: false, error: 'Email configuration missing', dispatch: updated };
    }

    // Send email with single merged PDF (Invoice + uploaded documents)
    // BCC: Internal copy for monitoring and records
    const result = await emailService.sendEmail({
      to: emailTo,
      subject: emailSubject,
      html: emailBody,
      bcc: 'jasmin.omic@hifapetrol.ba, emirmehmedovic321@gmail.com', // Internal monitoring
      attachments: [{
        filename: pdfFileName,
        content: mergedPdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    console.log(`📧 Email sent with merged PDF: ${pdfFileName} (${mergedPdfBuffer.length} bytes)`);

    if (result.success) {
      const updated = await prisma.emailInvoiceDispatch.update({
        where: { id: record.id },
        data: {
          status: EmailDispatchStatus.SENT,
          attempts: { increment: 1 } as any,
          dispatchedAt: new Date(),
          lastError: null,
          emailTo: emailTo,
          emailSubject: emailSubject,
          emailBody: emailBody,
          pdfFileName: pdfFileName,
          pdfSha256: sha,
        },
      });
      return { skipped: false, success: true, dispatch: updated };
    } else {
      const updated = await prisma.emailInvoiceDispatch.update({
        where: { id: record.id },
        data: {
          status: EmailDispatchStatus.FAILED,
          attempts: { increment: 1 } as any,
          lastError: result.error || 'Unknown email sending error',
          emailTo: emailTo,
          emailSubject: emailSubject,
          emailBody: emailBody,
          pdfFileName: pdfFileName,
          pdfSha256: sha,
        },
      });
      console.log(`❌ Email sending failed for operation ${opId}:`, result.error);
      return { skipped: false, success: false, error: result.error, dispatch: updated };
    }
  } catch (err: any) {
    console.error(`💥 Error in dispatchOneEmailOperation(${opId}):`, err);
    const updated = await prisma.emailInvoiceDispatch.update({
      where: { id: record.id },
      data: {
        status: EmailDispatchStatus.FAILED,
        attempts: { increment: 1 } as any,
        lastError: err.message,
        emailTo: emailTo,
        emailSubject: emailSubject,
        emailBody: emailBody,
        pdfFileName: pdfFileName,
        pdfSha256: sha,
      },
    });
    return { skipped: false, success: false, error: err.message, dispatch: updated };
  } finally {
    console.log(`🏁 END: dispatchOneEmailOperation(${opId}) completed`);
  }
}

export async function dispatchEmailRange(startDate: Date, endDate: Date) {
  const results = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);

  while (current.isSameOrBefore(end, 'day')) {
    const operations = await findEligibleOperationsForEmailDispatch(current.toDate());
    
    const dayResult = {
      date: current.format('YYYY-MM-DD'),
      operations: operations.length,
      results: [] as any[],
    };

    for (const op of operations) {
      try {
        const result = await dispatchOneEmailOperation(op.id);
        dayResult.results.push({ opId: op.id, ...result });
      } catch (error: any) {
        dayResult.results.push({ opId: op.id, error: error.message });
      }
    }

    results.push(dayResult);
    current = current.add(1, 'day');
  }

  const total = results.reduce((sum, day) => sum + day.operations, 0);
  return { daysProcessed: results.length, total, days: results };
}

export async function prepareOneEmailOperation(opId: number) {
  const op = await prisma.fuelingOperation.findUnique({
    where: { id: opId },
    include: { airline: true, tank: true, emailInvoiceDispatches: true, documents: true },
  });
  
  if (!op) throw new Error('Fueling operation not found');
  
  const emailTo = getAirlineEmailFromContact(op.airline?.contact_details);
  if (!emailTo) {
    throw new Error('Airline does not have valid email contact');
  }

  const existing = op.emailInvoiceDispatches?.find((dispatch: any) => dispatch.status === EmailDispatchStatus.SENT);
  if (existing) {
    return existing;
  }

  // Generate Invoice PDF and merge with documents for preparation
  const originalInvoicePdfBuffer = await generatePDFInvoiceBuffer(op as unknown as FuelingOperationForPDF);
  const mergedPdfBuffer = await mergeInvoiceWithDocuments(originalInvoicePdfBuffer, op);
  
  const pdfFileName = buildPDFInvoiceFileName(op as unknown as FuelingOperationForPDF);
  const pdfLocalPath = getLocalArchivePath(new Date(op.dateTime), pdfFileName);
  const sha = computeSha256(mergedPdfBuffer);

  // Save merged PDF locally (async)
  await fs.promises.mkdir(path.dirname(pdfLocalPath), { recursive: true });
  await fs.promises.writeFile(pdfLocalPath, mergedPdfBuffer);

  const emailSubject = buildEmailSubject(op);
  const emailBody = buildEmailBody(op);

  const record = await prisma.emailInvoiceDispatch.create({
    data: {
      fuelingOperationId: op.id,
      airlineId: op.airlineId,
      status: EmailDispatchStatus.PENDING,
      attempts: 0,
      lastError: null,
      emailTo: emailTo,
      emailSubject: emailSubject,
      emailBody: emailBody,
      pdfFileName: pdfFileName,
      pdfSha256: sha,
    },
  });
  
  return record;
}

export async function prepareEmailDay(date: Date) {
  const operations = await findEligibleOperationsForEmailDispatch(date);
  const results = [];
  
  for (const op of operations) {
    try {
      const record = await prepareOneEmailOperation(op.id);
      results.push({ opId: op.id, success: true, record });
    } catch (error: any) {
      results.push({ opId: op.id, success: false, error: error.message });
    }
  }
  
  return results;
}

export async function prepareEmailRange(startDate: Date, endDate: Date) {
  const results = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const operations = await findEligibleOperationsForEmailDispatch(currentDate);
    
    for (const op of operations) {
      try {
        const record = await prepareOneEmailOperation(op.id);
        results.push({ opId: op.id, success: true, record, date: new Date(currentDate) });
      } catch (error: any) {
        results.push({ opId: op.id, success: false, error: error.message, date: new Date(currentDate) });
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return results;
}
