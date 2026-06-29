import { Request, Response } from 'express';
import { XmlDispatchStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { dispatchDay, dispatchOneOperation, findEligibleOperationsForDate, dispatchRange, prepareDay, prepareRange } from '../services/xmlInvoiceDispatch.service';
import { generateXMLInvoiceBackend } from '../services/xmlInvoiceBuilder';
import { FtpClientService, buildFtpConfigFromEnv } from '../services/ftpClient';
import { prisma } from '../lib/prisma';

// Helper function to update expired and overdue invoices
const updateExpiredAndOverdueInvoices = async () => {
  const now = new Date();
  const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
  const fifteenDaysAgo = dayjs().subtract(15, 'days').toDate();
  
  // Mark invoices as OVERDUE if sent 7+ days ago and still PENDING
  await prisma.xmlInvoiceDispatch.updateMany({
    where: {
      status: XmlDispatchStatus.SENT,
      paymentStatus: PaymentStatus.PENDING,
      dispatchedAt: {
        lte: sevenDaysAgo,
        gt: fifteenDaysAgo
      }
    },
    data: {
      paymentStatus: PaymentStatus.OVERDUE
    }
  });

  // Mark invoices as EXPIRED if sent 15+ days ago and not PAID
  await prisma.xmlInvoiceDispatch.updateMany({
    where: {
      status: XmlDispatchStatus.SENT,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
      dispatchedAt: {
        lte: fifteenDaysAgo
      }
    },
    data: {
      paymentStatus: PaymentStatus.EXPIRED
    }
  });
};

export const listDispatches = async (req: Request, res: Response) => {
  try {
    // First, update any expired and overdue invoices
    await updateExpiredAndOverdueInvoices();

    const { startDate, endDate, airlineId, status, paymentStatus } = req.query;
    const where: any = {};
    
    // Filter by related fueling operation date (what users expect)
    const opDateFilter: any = {};
    if (startDate) opDateFilter.gte = dayjs(startDate as string).startOf('day').toDate();
    if (endDate) opDateFilter.lte = dayjs(endDate as string).endOf('day').toDate();
    if (Object.keys(opDateFilter).length > 0) {
      where.fuelingOperation = { dateTime: opDateFilter };
    }
    
    if (airlineId) where.airlineId = parseInt(airlineId as string, 10);
    
    if (typeof status === 'string') {
      const s = status.toUpperCase();
      if (s === 'PENDING' || s === 'SENT' || s === 'FAILED') where.status = s;
    }

    if (typeof paymentStatus === 'string') {
      const ps = paymentStatus.toUpperCase();
      if (Object.values(PaymentStatus).includes(ps as PaymentStatus)) {
        where.paymentStatus = ps;
      }
    }

    const rows = await prisma.xmlInvoiceDispatch.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      include: {
        fuelingOperation: {
          include: { airline: true, tank: true },
        },
        airline: true,
      },
    } as any);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri dohvaćanju dispatch zapisa', error: String(err) });
  }
};

export const manualDispatchDay = async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || dayjs().format('YYYY-MM-DD');
    const result = await dispatchDay(new Date(dateStr));
    res.status(200).json(result);
  } catch (err) {
    console.error('manualDispatchDay error:', err);
    res.status(500).json({ message: 'Greška pri manualnom dispatch-u', error: String(err) });
  }
};

export const manualDispatchOperation = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const force = (req.query.force as string) === 'true';
    const result = await dispatchOneOperation(id, force);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri manualnom slanju', error: String(err) });
  }
};

export const listEligibleForDate = async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || dayjs().format('YYYY-MM-DD');
    const ops = await findEligibleOperationsForDate(new Date(dateStr));
    res.json({ total: ops.length, operations: ops.map((o: any) => ({ id: o.id, airlineId: o.airlineId, airline: o.airline?.name, dateTime: o.dateTime })) });
  } catch (err) {
    console.error('listEligibleForDate error:', err);
    res.status(500).json({ message: 'Greška pri dohvaćanju eligible operacija', error: String(err) });
  }
};

export const manualDispatchRange = async (req: Request, res: Response) => {
  try {
    const start = (req.query.start as string) || dayjs().format('YYYY-MM-DD');
    const end = (req.query.end as string) || start;
    const result = await dispatchRange(new Date(start), new Date(end));
    res.json(result);
  } catch (err) {
    console.error('manualDispatchRange error:', err);
    res.status(500).json({ message: 'Greška pri manualnom dispatch-u opsega', error: String(err) });
  }
};

export const prepareDispatchDay = async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || dayjs().format('YYYY-MM-DD');
    const result = await prepareDay(new Date(dateStr));
    res.json(result);
  } catch (err) {
    console.error('prepareDispatchDay error:', err);
    res.status(500).json({ message: 'Greška pri pripremi dispatch-a', error: String(err) });
  }
};

export const prepareDispatchRange = async (req: Request, res: Response) => {
  try {
    const start = (req.query.start as string) || dayjs().format('YYYY-MM-DD');
    const end = (req.query.end as string) || start;
    const result = await prepareRange(new Date(start), new Date(end));
    res.json(result);
  } catch (err) {
    console.error('prepareDispatchRange error:', err);
    res.status(500).json({ message: 'Greška pri pripremi dispatch-a (opseg)', error: String(err) });
  }
};

export const downloadXmlDispatch = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const dispatch: any = await (prisma as any).xmlInvoiceDispatch.findUnique({
      where: { id },
      include: { fuelingOperation: { include: { airline: true, tank: true } } },
    } as any);
    if (!dispatch || !dispatch.fuelingOperation) {
      res.status(404).json({ message: 'Dispatch ili operacija nije pronađena' });
      return;
    }
    const xml = generateXMLInvoiceBackend(dispatch.fuelingOperation as any);
    const filename = dispatch.xmlFileName || `Invoice-INV-${dispatch.fuelingOperation.delivery_note_number || dispatch.fuelingOperation.id}-${new Date().getFullYear()}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(xml);
  } catch (err) {
    console.error('downloadXmlDispatch error:', err);
    res.status(500).json({ message: 'Greška pri generisanju XML-a', error: String(err) });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
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

    const dispatch = await prisma.xmlInvoiceDispatch.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!dispatch) {
      res.status(404).json({ message: 'XML invoice dispatch nije pronađen' });
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

    const updated = await prisma.xmlInvoiceDispatch.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    res.json({ 
      success: true, 
      message: 'Payment status uspješno ažuriran',
      dispatch: updated 
    });

  } catch (err) {
    console.error('updatePaymentStatus error:', err);
    res.status(500).json({ 
      message: 'Greška pri ažuriranju payment status-a', 
      error: String(err) 
    });
  }
};

export const externalPaymentUpdate = async (req: Request, res: Response): Promise<void> => {
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
    const dispatch = await prisma.xmlInvoiceDispatch.findFirst({
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
      res.status(404).json({ message: `Faktura sa brojem ${invoiceNumber} nije pronađena` });
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

    const updated = await prisma.xmlInvoiceDispatch.update({
      where: { id: dispatch.id },
      data: updateData,
    });

    res.json({ 
      success: true, 
      message: `Payment status za fakturu ${invoiceNumber} uspješno ažuriran na ${paymentStatus}`,
      dispatch: updated 
    });

  } catch (err) {
    console.error('externalPaymentUpdate error:', err);
    res.status(500).json({ 
      message: 'Greška pri vanjskom ažuriranju payment status-a', 
      error: String(err) 
    });
  }
};

export const runPaymentStatusUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    await updateExpiredAndOverdueInvoices();
    
    const updatedCounts = await prisma.xmlInvoiceDispatch.groupBy({
      by: ['paymentStatus'],
      where: {
        status: XmlDispatchStatus.SENT
      },
      _count: true
    });

    res.json({ 
      success: true, 
      message: 'Payment status ažuriranje pokrenuto',
      counts: updatedCounts
    });

  } catch (err) {
    console.error('runPaymentStatusUpdate error:', err);
    res.status(500).json({ 
      message: 'Greška pri pokretanju payment status ažuriranja', 
      error: String(err) 
    });
  }
};

export const testSftpConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = buildFtpConfigFromEnv();
    
    // Validate required fields
    if (!config.host || !config.user || !config.password) {
      res.status(400).json({ 
        message: 'SFTP kredencijali nisu konfigurisani. Provjerite SFTP_HOST, SFTP_USERNAME, SFTP_PASSWORD u .env fajlu.' 
      });
      return;
    }

    const client = new FtpClientService(config);
    
    try {
      await client.connect();
      
      // Test upload a small test file
      const testContent = `Test SFTP connection - ${new Date().toISOString()}`;
      const testBuffer = Buffer.from(testContent, 'utf8');
      const testFileName = `test-connection-${Date.now()}.txt`;
      
      await client.uploadBuffer(testBuffer, testFileName);
      
      await client.close();
      
      res.json({ 
        success: true, 
        message: 'SFTP konekcija uspješna! Test fajl je uspješno uploadovan.',
        config: {
          host: config.host,
          port: config.port,
          user: config.user,
          protocol: config.protocol
        },
        testFile: testFileName
      });
      
    } catch (connectionError) {
      await client.close();
      throw connectionError;
    }
    
  } catch (err) {
    console.error('SFTP connection test error:', err);
    res.status(500).json({ 
      message: 'SFTP konekcija neuspješna', 
      error: String(err),
      details: err instanceof Error ? err.message : 'Nepoznata greška'
    });
  }
};


