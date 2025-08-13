import { Request, Response } from 'express';
import { PrismaClient, XmlDispatchStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { dispatchDay, dispatchOneOperation, findEligibleOperationsForDate, dispatchRange, prepareDay, prepareRange } from '../services/xmlInvoiceDispatch.service';
import { generateXMLInvoiceBackend } from '../services/xmlInvoiceBuilder';

const prisma = new PrismaClient();

export const listDispatches = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, airlineId, status } = req.query;
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


