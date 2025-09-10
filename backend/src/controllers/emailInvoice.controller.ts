import { Request, Response } from 'express';
import { PrismaClient, EmailDispatchStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { 
  dispatchOneEmailOperation, 
  dispatchEmailRange, 
  findEligibleOperationsForEmailDispatch,
  prepareEmailDay,
  prepareEmailRange
} from '../services/emailInvoiceDispatch.service';
import { manualRetryFailedEmails } from '../cron/emailInvoiceCron';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getEmailInvoiceDispatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      airlineId, 
      startDate, 
      endDate,
      paymentStatus,
      deliveryNote
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (status) {
      where.status = status as EmailDispatchStatus;
    }

    if (airlineId) {
      where.airlineId = Number(airlineId);
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Delivery note filter - search in fuelingOperation.delivery_note_number
    if (deliveryNote) {
      where.fuelingOperation = {
        delivery_note_number: {
          contains: deliveryNote as string,
          mode: 'insensitive'
        }
      };
    }

    const [dispatches, total] = await Promise.all([
      prisma.emailInvoiceDispatch.findMany({
        where,
        include: {
          airline: {
            select: { id: true, name: true, contact_details: true }
          },
          fuelingOperation: {
            select: {
              id: true,
              dateTime: true,
              aircraft_registration: true,
              quantity_liters: true,
              quantity_kg: true,
              price_per_kg: true,
              total_amount: true,
              currency: true,
              delivery_note_number: true,
              destination: true,
              flight_number: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.emailInvoiceDispatch.count({ where })
    ]);

    // Convert Decimal fields to numbers for JSON serialization
    const serializedDispatches = dispatches.map(dispatch => ({
      ...dispatch,
      fuelingOperation: dispatch.fuelingOperation ? {
        ...dispatch.fuelingOperation,
        quantity_liters: dispatch.fuelingOperation.quantity_liters ? Number(dispatch.fuelingOperation.quantity_liters) : null,
        quantity_kg: dispatch.fuelingOperation.quantity_kg ? Number(dispatch.fuelingOperation.quantity_kg) : null,
        price_per_kg: dispatch.fuelingOperation.price_per_kg ? Number(dispatch.fuelingOperation.price_per_kg) : null,
        total_amount: dispatch.fuelingOperation.total_amount ? Number(dispatch.fuelingOperation.total_amount) : null,
      } : null
    }));

    res.status(200).json({
      dispatches: serializedDispatches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching email invoice dispatches:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Greška pri dohvaćanju email faktura' 
    });
  }
};

export const dispatchEmailInvoiceForOperation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { operationId } = req.params;
    const { force = false } = req.body;

    if (!operationId) {
      res.status(400).json({ 
        success: false, 
        message: 'ID operacije je obavezan' 
      });
      return;
    }

    const result = await dispatchOneEmailOperation(Number(operationId), Boolean(force));
    
    if (result.skipped) {
      res.status(200).json({
        success: true,
        skipped: true,
        message: result.reason,
        dispatch: result.dispatch
      });
    } else if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email faktura uspješno poslana',
        dispatch: result.dispatch
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Slanje email fakture neuspješno: ${result.error}`,
        dispatch: result.dispatch
      });
    }
  } catch (error: any) {
    console.error('Error dispatching email invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri slanju email fakture' 
    });
  }
};

export const dispatchEmailInvoicesForDay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    
    if (!date) {
      res.status(400).json({ 
        success: false, 
        message: 'Datum je obavezan' 
      });
      return;
    }

    const targetDate = dayjs(date).toDate();
    if (!targetDate || isNaN(targetDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravan format datuma' 
      });
      return;
    }

    const operations = await findEligibleOperationsForEmailDispatch(targetDate);
    const results = [];
    
    for (const op of operations) {
      try {
        const result = await dispatchOneEmailOperation(op.id);
        results.push({ 
          operationId: op.id, 
          aircraft_registration: op.aircraft_registration,
          airline: op.airline?.name,
          ...result 
        });
      } catch (error: any) {
        results.push({ 
          operationId: op.id, 
          aircraft_registration: op.aircraft_registration,
          airline: op.airline?.name,
          success: false, 
          error: error.message 
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && !('skipped' in r && r.skipped)).length;
    const skipped = results.filter(r => 'skipped' in r && r.skipped).length;

    res.status(200).json({
      success: true,
      message: `Obradeno ${operations.length} operacija za ${date}`,
      summary: {
        total: operations.length,
        successful,
        failed,
        skipped
      },
      results
    });
  } catch (error: any) {
    console.error('Error dispatching email invoices for day:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri slanju email faktura za dan' 
    });
  }
};

export const dispatchEmailInvoicesForRange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      res.status(400).json({ 
        success: false, 
        message: 'Početni i završni datum su obavezni' 
      });
      return;
    }

    const start = dayjs(startDate).toDate();
    const end = dayjs(endDate).toDate();
    
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravan format datuma' 
      });
      return;
    }

    if (start > end) {
      res.status(400).json({ 
        success: false, 
        message: 'Početni datum mora biti prije završnog datuma' 
      });
      return;
    }

    const result = await dispatchEmailRange(start, end);
    
    res.status(200).json({
      success: true,
      message: `Obradeno ${result.daysProcessed} dana, ukupno ${result.total} operacija`,
      result
    });
  } catch (error: any) {
    console.error('Error dispatching email invoices for range:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri slanju email faktura za period' 
    });
  }
};

export const prepareEmailInvoicesForDay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    
    if (!date) {
      res.status(400).json({ 
        success: false, 
        message: 'Datum je obavezan' 
      });
      return;
    }

    const targetDate = dayjs(date).toDate();
    if (!targetDate || isNaN(targetDate.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravan format datuma' 
      });
      return;
    }

    const results = await prepareEmailDay(targetDate);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Pripremljeno ${successful} email faktura za ${date}`,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });
  } catch (error: any) {
    console.error('Error preparing email invoices for day:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri pripremi email faktura za dan' 
    });
  }
};

export const prepareEmailInvoicesForRange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      res.status(400).json({ 
        success: false, 
        message: 'Start date i end date su obavezni' 
      });
      return;
    }

    const start = dayjs(startDate).toDate();
    const end = dayjs(endDate).toDate();
    
    if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) {
      res.status(400).json({ 
        success: false, 
        message: 'Neispravan format datuma' 
      });
      return;
    }

    if (start > end) {
      res.status(400).json({ 
        success: false, 
        message: 'Start date ne može biti nakon end date' 
      });
      return;
    }

    const results = await prepareEmailRange(start, end);
    
    const successful = results.filter((r: any) => r.success).length;
    const failed = results.filter((r: any) => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Pripremljeno ${successful} email faktura za period ${startDate} - ${endDate}`,
      summary: {
        successful,
        failed
      },
      results
    });
  } catch (error: any) {
    console.error('Error preparing email invoices for range:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri pripremi email faktura za period' 
    });
  }
};

export const previewEmailTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { operationId } = req.params;

    if (!operationId) {
      res.status(400).json({ 
        success: false, 
        message: 'ID operacije je obavezan' 
      });
      return;
    }

    const operation = await prisma.fuelingOperation.findUnique({
      where: { id: Number(operationId) },
      include: { airline: true, tank: true },
    });

    if (!operation) {
      res.status(404).json({ 
        success: false, 
        message: 'Operacija nije pronađena' 
      });
      return;
    }

    const { buildEmailSubject, buildEmailBody, getAirlineEmailFromContact } = await import('../services/emailService');
    
    const emailTo = getAirlineEmailFromContact(operation.airline?.contact_details);
    const emailSubject = buildEmailSubject(operation);
    const emailBody = buildEmailBody(operation);

    res.status(200).json({
      success: true,
      preview: {
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
        hasValidEmail: !!emailTo,
        airline: operation.airline?.name,
        operationDate: operation.dateTime,
        deliveryNumber: operation.delivery_note_number || operation.id
      }
    });
  } catch (error: any) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri generisanju email preview-a' 
    });
  }
};

export const getEmailInvoiceStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalDispatches,
      sentDispatches,
      failedDispatches,
      pendingDispatches,
      dispatchesByAirline
    ] = await Promise.all([
      prisma.emailInvoiceDispatch.count({ where }),
      prisma.emailInvoiceDispatch.count({ 
        where: { ...where, status: EmailDispatchStatus.SENT } 
      }),
      prisma.emailInvoiceDispatch.count({ 
        where: { ...where, status: EmailDispatchStatus.FAILED } 
      }),
      prisma.emailInvoiceDispatch.count({ 
        where: { ...where, status: EmailDispatchStatus.PENDING } 
      }),
      prisma.emailInvoiceDispatch.groupBy({
        by: ['airlineId'],
        where,
        _count: { id: true },
        _sum: { attempts: true },
      })
    ]);

    // Get airline names for the groupBy result
    const airlineIds = dispatchesByAirline.map(item => item.airlineId);
    const airlines = await prisma.airline.findMany({
      where: { id: { in: airlineIds } },
      select: { id: true, name: true }
    });

    const airlineMap = new Map(airlines.map(a => [a.id, a.name]));
    
    const dispatchesByAirlineWithNames = dispatchesByAirline.map(item => ({
      airlineId: item.airlineId,
      airlineName: airlineMap.get(item.airlineId) || 'Unknown',
      count: item._count.id,
      totalAttempts: item._sum.attempts || 0
    }));

    res.status(200).json({
      success: true,
      stats: {
        total: totalDispatches,
        sent: sentDispatches,
        failed: failedDispatches,
        pending: pendingDispatches,
        byAirline: dispatchesByAirlineWithNames
      }
    });
  } catch (error: any) {
    console.error('Error fetching email invoice stats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Greška pri dohvaćanju statistika email faktura' 
    });
  }
};

export const updateEmailInvoicePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentNote } = req.body;

    if (!id || !paymentStatus) {
      res.status(400).json({ message: 'ID i payment status su obavezni' });
      return;
    }

    // Validate paymentStatus enum
    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      res.status(400).json({ message: 'Nevaljan payment status' });
      return;
    }

    const dispatch = await prisma.emailInvoiceDispatch.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!dispatch) {
      res.status(404).json({ message: 'Email invoice dispatch nije pronađen' });
      return;
    }

    const updateData: any = {
      paymentStatus,
      paymentNote: paymentNote || null,
    };

    // Set payment received date when marking as PAID
    if (paymentStatus === PaymentStatus.PAID) {
      updateData.paymentReceivedAt = new Date();
    } else if (paymentStatus === PaymentStatus.PENDING) {
      updateData.paymentReceivedAt = null;
    }

    const updated = await prisma.emailInvoiceDispatch.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    res.json({ 
      success: true, 
      message: 'Payment status uspješno ažuriran',
      dispatch: updated 
    });

  } catch (err) {
    console.error('updateEmailInvoicePaymentStatus error:', err);
    res.status(500).json({ 
      message: 'Greška pri ažuriranju payment status-a', 
      error: String(err) 
    });
  }
};

export const externalEmailPaymentUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { invoiceNumber, paymentStatus, paymentDate, referenceNumber, note } = req.body;

    if (!invoiceNumber || !paymentStatus) {
      res.status(400).json({ message: 'invoiceNumber i paymentStatus su obavezni' });
      return;
    }

    // Validate paymentStatus enum
    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      res.status(400).json({ message: 'Nevaljan payment status' });
      return;
    }

    // Find dispatch by delivery note number (invoice number)
    const dispatch = await prisma.emailInvoiceDispatch.findFirst({
      where: {
        fuelingOperation: {
          delivery_note_number: invoiceNumber
        }
      },
      include: {
        fuelingOperation: true
      }
    });

    if (!dispatch) {
      res.status(404).json({ message: `Email faktura sa brojem ${invoiceNumber} nije pronađena` });
      return;
    }

    const updateData: any = {
      paymentStatus,
      paymentNote: note || null,
    };

    // Set payment received date when marking as PAID
    if (paymentStatus === PaymentStatus.PAID) {
      updateData.paymentReceivedAt = paymentDate ? new Date(paymentDate) : new Date();
    } else if (paymentStatus === PaymentStatus.PENDING) {
      updateData.paymentReceivedAt = null;
    }

    const updated = await prisma.emailInvoiceDispatch.update({
      where: { id: dispatch.id },
      data: updateData,
    });

    res.json({ 
      success: true, 
      message: `Payment status za email fakturu ${invoiceNumber} uspješno ažuriran na ${paymentStatus}`,
      dispatch: updated 
    });

  } catch (err) {
    console.error('externalEmailPaymentUpdate error:', err);
    res.status(500).json({ 
      message: 'Greška pri vanjskom ažuriranju payment status-a', 
      error: String(err) 
    });
  }
};

/**
 * GET /api/invoices/email/dispatch/:id/download
 * Download the PDF that was sent via email
 */
export const downloadEmailInvoicePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({ message: 'Neispravan ID dispatch-a' });
      return;
    }

    console.log(`📥 Download request for email dispatch ${id}`);

    const dispatch = await prisma.emailInvoiceDispatch.findUnique({
      where: { id },
      include: { 
        fuelingOperation: { 
          include: { 
            airline: true, 
            tank: true 
          } 
        } 
      },
    });
    
    if (!dispatch || !dispatch.fuelingOperation) {
      res.status(404).json({ message: 'Email dispatch ili operacija nije pronađena' });
      return;
    }

    console.log(`📁 Looking for PDF file: ${dispatch.pdfFileName}`);

    // Rekonstruiraj putanju do PDF-a (ista logika kao u emailInvoiceDispatch.service.ts)
    const opDate = new Date(dispatch.fuelingOperation.dateTime);
    const dayStr = dayjs(opDate).format('YYYY-MM-DD');
    const baseDir = path.join(process.cwd(), 'private_uploads', 'email_invoices');
    const pdfPath = path.join(baseDir, dayStr, dispatch.pdfFileName);

    console.log(`📁 Full path: ${pdfPath}`);

    // Provjeri da li fajl postoji
    if (!fs.existsSync(pdfPath)) {
      console.log(`❌ PDF file not found at: ${pdfPath}`);
      res.status(404).json({ 
        message: 'PDF fajl nije pronađen. Možda je stariji zapis koji nema spremljen PDF.',
        filePath: pdfPath 
      });
      return;
    }

    console.log(`✅ PDF file found, sending to client`);

    // Pošalji PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${dispatch.pdfFileName}"`);
    res.status(200).sendFile(pdfPath);

  } catch (err) {
    console.error('downloadEmailInvoicePdf error:', err);
    res.status(500).json({ 
      message: 'Greška pri preuzimanju PDF-a', 
      error: String(err) 
    });
  }
};

export const retryFailedEmailDispatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.body;
    
    console.log(`🔄 Manual retry request for failed email dispatches${date ? ` for date: ${date}` : ' (today)'}`);
    
    const result = await manualRetryFailedEmails(date);
    
    res.status(200).json({
      success: true,
      message: `Retry completed: ${result.successful} successful, ${result.failed} failed`,
      data: result
    });
    
  } catch (err) {
    console.error('retryFailedEmailDispatches error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Greška pri retry-u failed email dispatches', 
      error: String(err) 
    });
  }
};
