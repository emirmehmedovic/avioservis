'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { listXmlDispatches, manualDispatchDay, manualDispatchOperation, XmlInvoiceDispatch, prepareDispatchDay, downloadXmlDispatchFile } from '@/lib/apiService';
import { toast } from 'react-hot-toast';

export default function XmlInvoicesPage() {
  const [rows, setRows] = useState<XmlInvoiceDispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [status, setStatus] = useState<string>('');
  const [nextCronText, setNextCronText] = useState<string>('');

  const statusCounts = useMemo(() => {
    const counts = { PENDING: 0, SENT: 0, FAILED: 0 } as Record<string, number>;
    rows.forEach(r => { if (r.status in counts) counts[r.status]++; });
    return counts;
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listXmlDispatches({ startDate, endDate, status: status || undefined });
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri učitavanju XML dispatch zapisa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [startDate, endDate, status]);

  useEffect(() => {
    const updateCron = () => {
      const now = dayjs();
      let next = now.hour(23).minute(0).second(0).millisecond(0);
      if (now.isAfter(next)) {
        next = next.add(1, 'day');
      }
      const diffMs = next.diff(now);
      const totalMins = Math.max(0, Math.floor(diffMs / 60000));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setNextCronText(`Sljedeće automatsko slanje: 23:00 (za ${hours}h ${mins}m)`);
    };
    updateCron();
    const id = setInterval(updateCron, 30000);
    return () => clearInterval(id);
  }, []);

  const onRetryOne = async (opId: number) => {
    try {
      await manualDispatchOperation(opId, true);
      toast.success('Ponovno slanje pokrenuto');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri ručnom slanju');
    }
  };

  const onRetryFailed = async () => {
    try {
      const failedOps = rows.filter(r => r.status === 'FAILED').map(r => r.fuelingOperationId);
      if (failedOps.length === 0) {
        toast('Nema neuspjelih zapisa');
        return;
      }
      for (const opId of failedOps) {
        // eslint-disable-next-line no-await-in-loop
        await manualDispatchOperation(opId, true);
      }
      toast.success('Ponovno slanje za neuspjele pokrenuto');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri batch slanju');
    }
  };

  const onManualDay = async () => {
    try {
      const resp = await manualDispatchDay(dayjs().format('YYYY-MM-DD'));
      toast.success(`Manualni dispatch pokrenut (ukupno: ${resp?.total ?? '—'})`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri manualnom dispatch-u dana');
    }
  };

  const onPrepareDay = async () => {
    try {
      const resp = await prepareDispatchDay(dayjs().format('YYYY-MM-DD'));
      toast.success(`Priprema završena (ukupno: ${resp?.total ?? '—'}, pripremljeno: ${resp?.prepared ?? '—'})`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri pripremi za današnji dan');
    }
  };

  const setToday = () => {
    const d = dayjs().format('YYYY-MM-DD');
    setStartDate(d);
    setEndDate(d);
  };

  const setYesterday = () => {
    const y = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    setStartDate(y);
    setEndDate(y);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header + actions */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">XML fakture (Wizz)</h1>
              <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {nextCronText}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onPrepareDay} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v6l4 2"/></svg>
                Pripremi današnje (PENDING)
              </button>
              <button onClick={onManualDay} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Pošalji današnje
              </button>
              <button onClick={onRetryFailed} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M3.51 15a9 9 0 0 1 14.13-3.36L21 12"/><path d="M20.49 9A9 9 0 0 1 6.36 12L3 12"/></svg>
                Pošalji neuspjele
              </button>
              <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M5 19A9 9 0 0 0 19 5l1 1"/></svg>
                Osvježi
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Od</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Do</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Svi</option>
                <option value="PENDING">PENDING</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
            <div className="flex items-end justify-between gap-2">
              <button onClick={load} className="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition shadow-sm">Primijeni filtere</button>
              <div className="flex gap-2">
                <button onClick={setToday} className="px-2 py-2 rounded-lg bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200 transition">Danas</button>
                <button onClick={setYesterday} className="px-2 py-2 rounded-lg bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200 transition">Juče</button>
              </div>
            </div>
          </div>

          {/* Status summary */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Sažetak:</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">PENDING: {statusCounts.PENDING}</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">SENT: {statusCounts.SENT}</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">FAILED: {statusCounts.FAILED}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left">Datum</th>
              <th className="px-3 py-2 text-left">Operacija</th>
              <th className="px-3 py-2 text-left">Kompanija</th>
              <th className="px-3 py-2 text-left">Destinacija</th>
              <th className="px-3 py-2 text-left">Dostavnica</th>
              <th className="px-3 py-2 text-left">Litara</th>
              <th className="px-3 py-2 text-left">Kilograma</th>
              <th className="px-3 py-2 text-left">Cijena/kg</th>
              <th className="px-3 py-2 text-left">Ukupno</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Pokušaja</th>
              <th className="px-3 py-2 text-left">Naziv fajla</th>
              <th className="px-3 py-2 text-left">Greška</th>
              <th className="px-3 py-2 text-left">Akcije</th>
            </tr>
            </thead>
            <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={8}>Učitavanje...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={8}>Nema zapisa</td></tr>
            ) : rows.map(r => {
              const op = r.fuelingOperation as any;
              const liters = op?.quantity_liters ? Number(op.quantity_liters) : 0;
              const kg = op?.quantity_kg ? Number(op.quantity_kg) : 0;
              const price = op?.price_per_kg ? Number(op.price_per_kg) : 0;
              const total = op?.total_amount ? Number(op.total_amount) : 0;
              const currency = op?.currency || '';
              return (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">{dayjs(r.createdAt).format('DD.MM.YYYY')}</td>
                <td className="px-3 py-2">#{r.fuelingOperationId}
                  <div className="text-xs text-gray-500">{op?.dateTime ? dayjs(op.dateTime).format('DD.MM.YYYY') : ''}</div>
                </td>
                <td className="px-3 py-2">{op?.airline?.name || ''}<div className="text-xs text-gray-500">{op?.flight_number} / {op?.aircraft_registration}</div></td>
                <td className="px-3 py-2">{op?.destination || ''}</td>
                <td className="px-3 py-2">{op?.delivery_note_number || ''}</td>
                <td className="px-3 py-2">{liters.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">{kg.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">{price.toLocaleString('bs-BA', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} {currency}</td>
                <td className="px-3 py-2 font-medium">{total.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${r.status === 'SENT' ? 'bg-green-100 text-green-700' : r.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2">{r.attempts}</td>
                <td className="px-3 py-2">{r.xmlFileName}</td>
                <td className="px-3 py-2 max-w-xs truncate" title={r.lastError || ''}>{r.lastError || ''}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => onRetryOne(r.fuelingOperationId)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Pošalji ponovo</button>
                    <button onClick={() => downloadXmlDispatchFile(r.id, r.xmlFileName)} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">XML</button>
                  </div>
                </td>
              </tr>
            ); })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


