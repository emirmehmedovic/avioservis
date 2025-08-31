import { PrismaClient, XmlDispatchStatus } from '@prisma/client';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dayjs from 'dayjs';
import { FtpClientService, buildFtpConfigFromEnv } from './ftpClient';
import { generateXMLInvoiceBackend } from './xmlInvoiceBuilder';
import { generatePDFInvoiceBuffer, buildPDFInvoiceFileName, FuelingOperationForPDF } from './pdfInvoiceGenerator';

const prisma = new PrismaClient();

const WIZZ_TARGETS = new Set([
  'WIZZ AIR HUNGARY LTD',
  'WIZZ AIR MALTA LTD',
].map(s => s.replace(/\./g, '').toUpperCase()));

function normalizeName(name?: string | null): string {
  return (name || '').toUpperCase().replace(/\./g, '').trim();
}

function parseAllowedAirlineIdsFromEnv(): number[] {
  const raw = process.env.XML_INVOICE_AIRLINE_IDS || '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => parseInt(s, 10))
    .filter(n => !isNaN(n));
}

function isAirlineAllowed(airlineId: number, airlineName?: string | null): boolean {
  const allowedIds = parseAllowedAirlineIdsFromEnv();
  if (allowedIds.length > 0) {
    return allowedIds.includes(airlineId);
  }
  return WIZZ_TARGETS.has(normalizeName(airlineName));
}

export async function findEligibleOperationsForDate(targetDate: Date) {
  // Calculate local day bounds using TZ if provided (fallback naive)
  const start = dayjs(targetDate).startOf('day').toDate();
  const end = dayjs(targetDate).endOf('day').toDate();

  const allowedIds = parseAllowedAirlineIdsFromEnv();
  const where: any = {
    is_deleted: false,
    dateTime: { gte: start, lte: end },
  };
  if (allowedIds.length > 0) {
    where.airlineId = { in: allowedIds };
  }
  const operations = await prisma.fuelingOperation.findMany({
    where,
    include: { airline: true, tank: true },
    orderBy: { dateTime: 'asc' },
  } as any);

  return allowedIds.length > 0
    ? operations
    : operations.filter((op: any) => WIZZ_TARGETS.has(normalizeName(op.airline?.name)));
}

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function buildInvoiceFileName(op: any): string {
  const delivery = op.delivery_note_number || String(op.id);
  const year = new Date().getFullYear();
  return `Invoice-INV-${delivery}-${year}.xml`;
}

function getLocalArchivePath(opDate: Date, fileName: string): string {
  const dayStr = dayjs(opDate).format('YYYY-MM-DD');
  return path.join(__dirname, '../../private_uploads/xml_invoices', dayStr, fileName);
}

function getRemotePath(opDate: Date, fileName: string, baseDir: string): string {
  const dayStr = dayjs(opDate).format('YYYY-MM-DD');
  return path.posix.join(baseDir || '/invoices', dayStr, fileName);
}

export async function dispatchOneOperation(opId: number, force = false) {
  const op = await prisma.fuelingOperation.findUnique({
    where: { id: opId },
    include: { airline: true, tank: true },
  } as any);
  if (!op) throw new Error('Fueling operation not found');

  if (!isAirlineAllowed(op.airlineId, (op as any).airline?.name)) {
    throw new Error('Operation airline is not in WIZZ target list');
  }

  const existing = await prisma.xmlInvoiceDispatch.findUnique({ where: { fuelingOperationId: opId } });
  if (existing && existing.status === XmlDispatchStatus.SENT && !force) {
    return { skipped: true, reason: 'Already SENT', dispatch: existing };
  }

  // Build XML identical to frontend
  const xml = generateXMLInvoiceBackend(op as any);
  const sha = computeSha256(xml);
  const xmlFileName = buildInvoiceFileName(op);
  const xmlLocalPath = getLocalArchivePath(new Date(op.dateTime), xmlFileName);

  // Generate PDF invoice
  const pdfBuffer = await generatePDFInvoiceBuffer(op as unknown as FuelingOperationForPDF);
  const pdfFileName = buildPDFInvoiceFileName(op as unknown as FuelingOperationForPDF);
  const pdfLocalPath = getLocalArchivePath(new Date(op.dateTime), pdfFileName);

  // Ensure local dir
  fs.mkdirSync(path.dirname(xmlLocalPath), { recursive: true });
  fs.writeFileSync(xmlLocalPath, xml, 'utf-8');
  fs.writeFileSync(pdfLocalPath, pdfBuffer);

  // FTP upload or graceful fail if credentials missing
  const ftpConfig = buildFtpConfigFromEnv();
  const xmlRemotePath = getRemotePath(new Date(op.dateTime), xmlFileName, ftpConfig.baseDir || '/invoices');
  const pdfRemotePath = getRemotePath(new Date(op.dateTime), pdfFileName, ftpConfig.baseDir || '/invoices');
  const credsAvailable = Boolean(ftpConfig.host && ftpConfig.user && ftpConfig.password);
  const client = credsAvailable ? new FtpClientService(ftpConfig) : null;

  let record = existing;
  if (!record) {
    record = await prisma.xmlInvoiceDispatch.create({
      data: {
        fuelingOperationId: op.id,
        airlineId: op.airlineId,
        status: XmlDispatchStatus.PENDING,
        attempts: 0,
        xmlFileName: xmlFileName,
        xmlSha256: sha,
        remotePath: xmlRemotePath,
      },
    });
  }

  try {
    if (!credsAvailable) {
      const updated = await prisma.xmlInvoiceDispatch.update({
        where: { id: record.id },
        data: {
          status: XmlDispatchStatus.FAILED,
          attempts: { increment: 1 } as any,
          lastError: 'FTP credentials are missing in environment',
          xmlSha256: sha,
          xmlFileName: xmlFileName,
          remotePath: xmlRemotePath,
        },
      });
      return { skipped: false, success: false, error: 'FTP credentials missing', dispatch: updated };
    }
    await client!.connect();
    
    // Upload XML file
    await client!.uploadBuffer(Buffer.from(xml, 'utf-8'), xmlRemotePath);
    
    // Upload PDF file
    await client!.uploadBuffer(pdfBuffer, pdfRemotePath);
    
    await client!.close();

    const updated = await prisma.xmlInvoiceDispatch.update({
      where: { id: record.id },
      data: {
        status: XmlDispatchStatus.SENT,
        attempts: { increment: 1 } as any,
        dispatchedAt: new Date(),
        lastError: null,
        xmlSha256: sha,
        xmlFileName: xmlFileName,
        remotePath: xmlRemotePath,
      },
    });
    return { skipped: false, success: true, dispatch: updated };
  } catch (err: any) {
    try { await client?.close(); } catch {}
    const updated = await prisma.xmlInvoiceDispatch.update({
      where: { id: record.id },
      data: {
        status: XmlDispatchStatus.FAILED,
        attempts: { increment: 1 } as any,
        lastError: err?.message || String(err),
        xmlSha256: sha,
        xmlFileName: xmlFileName,
        remotePath: xmlRemotePath,
      },
    });
    return { skipped: false, success: false, error: err?.message, dispatch: updated };
  }
}

export async function dispatchDay(date: Date) {
  const operations = await findEligibleOperationsForDate(date);
  const results: any[] = [];
  for (const op of operations) {
    // eslint-disable-next-line no-await-in-loop
    const res = await dispatchOneOperation(op.id, false);
    results.push({ opId: op.id, ...res });
  }
  return { total: operations.length, results };
}

export async function dispatchRange(startDate: Date, endDate: Date) {
  const start = dayjs(startDate).startOf('day');
  const end = dayjs(endDate).endOf('day');
  const results: any[] = [];
  let current = start.clone();
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    // eslint-disable-next-line no-await-in-loop
    const dayResult = await dispatchDay(current.toDate());
    results.push({ date: current.format('YYYY-MM-DD'), ...dayResult });
    current = current.add(1, 'day');
  }
  const total = results.reduce((sum, r) => sum + (r.total || 0), 0);
  return { daysProcessed: results.length, total, days: results };
}

export async function prepareOneOperation(opId: number) {
  const op = await prisma.fuelingOperation.findUnique({
    where: { id: opId },
    include: { airline: true, tank: true },
  } as any);
  if (!op) throw new Error('Fueling operation not found');
  if (!isAirlineAllowed(op.airlineId, (op as any).airline?.name)) {
    throw new Error('Operation airline is not in target list');
  }
  const existing = await prisma.xmlInvoiceDispatch.findUnique({ where: { fuelingOperationId: opId } });
  const xmlFileName = buildInvoiceFileName(op);
  const ftpConfig = buildFtpConfigFromEnv();
  const xmlRemotePath = getRemotePath(new Date(op.dateTime), xmlFileName, ftpConfig.baseDir || '/invoices');
  const xml = generateXMLInvoiceBackend(op as any);
  const sha = computeSha256(xml);
  if (existing) {
    return existing;
  }
  const record = await prisma.xmlInvoiceDispatch.create({
    data: {
      fuelingOperationId: op.id,
      airlineId: op.airlineId,
      status: XmlDispatchStatus.PENDING,
      attempts: 0,
      lastError: null,
      xmlFileName: xmlFileName,
      xmlSha256: sha,
      remotePath: xmlRemotePath,
    },
  });
  return record;
}

export async function prepareDay(date: Date) {
  const operations = await findEligibleOperationsForDate(date);
  const results: any[] = [];
  for (const op of operations) {
    // eslint-disable-next-line no-await-in-loop
    const rec = await prepareOneOperation(op.id);
    results.push({ opId: op.id, recordId: rec.id });
  }
  return { total: operations.length, prepared: results.length, results };
}

export async function prepareRange(startDate: Date, endDate: Date) {
  const start = dayjs(startDate).startOf('day');
  const end = dayjs(endDate).endOf('day');
  const results: any[] = [];
  let current = start.clone();
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    // eslint-disable-next-line no-await-in-loop
    const dayResult = await prepareDay(current.toDate());
    results.push({ date: current.format('YYYY-MM-DD'), ...dayResult });
    current = current.add(1, 'day');
  }
  const total = results.reduce((sum, r) => sum + (r.total || 0), 0);
  return { daysProcessed: results.length, total, days: results };
}


