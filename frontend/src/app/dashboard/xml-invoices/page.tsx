'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { listXmlDispatches, manualDispatchDay, manualDispatchOperation, XmlInvoiceDispatch, prepareDispatchDay, downloadXmlDispatchFile, testSftpConnection, updatePaymentStatus, runPaymentStatusUpdate } from '@/lib/apiService';
import { toast } from 'react-hot-toast';


export default function XmlInvoicesPage() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'sent'>('dispatch');
  const [rows, setRows] = useState<XmlInvoiceDispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string>(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [status, setStatus] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [nextCronText, setNextCronText] = useState<string>('');

  const statusCounts = useMemo(() => {
    const counts = { PENDING: 0, SENT: 0, FAILED: 0 } as Record<string, number>;
    rows.forEach(r => { if (r.status in counts) counts[r.status]++; });
    return counts;
  }, [rows]);

  const paymentCounts = useMemo(() => {
    const counts = { PENDING: 0, PAID: 0, OVERDUE: 0, EXPIRED: 0 } as Record<string, number>;
    rows.forEach(r => { if (r.paymentStatus in counts) counts[r.paymentStatus]++; });
    return counts;
  }, [rows]);

  const financialSummary = useMemo(() => {
    let totalPaid = 0;
    let totalExpected = 0;
    let totalOverdue = 0;
    let totalExpired = 0;
    let currency = '';

    rows.forEach(r => {
      const op = r.fuelingOperation as any;
      const total = op?.total_amount ? Number(op.total_amount) : 0;
      currency = op?.currency || currency || 'EUR';

      if (r.paymentStatus === 'PAID') {
        totalPaid += total;
      } else if (r.paymentStatus === 'PENDING') {
        totalExpected += total;
      } else if (r.paymentStatus === 'OVERDUE') {
        totalOverdue += total;
      } else if (r.paymentStatus === 'EXPIRED') {
        totalExpired += total;
      }
    });

    return {
      totalPaid,
      totalExpected,
      totalOverdue,
      totalExpired,
      totalOutstanding: totalExpected + totalOverdue + totalExpired,
      grandTotal: totalPaid + totalExpected + totalOverdue + totalExpired,
      currency
    };
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      const params: any = { startDate, endDate };
      if (status) params.status = status;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      
      // Filter based on active tab
      if (activeTab === 'sent') {
        params.status = 'SENT'; // Only show sent invoices in sent tab
      }
      
      const data = await listXmlDispatches(params);
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri učitavanju XML dispatch zapisa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [startDate, endDate, status, paymentStatus, activeTab]);

  useEffect(() => {
    const updateCron = () => {
      const now = dayjs();
      let next = now.hour(23).minute(55).second(0).millisecond(0);
      if (now.isAfter(next)) {
        next = next.add(1, 'day');
      }
      const diffMs = next.diff(now);
      const totalMins = Math.max(0, Math.floor(diffMs / 60000));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setNextCronText(`Sljedeće automatsko slanje: 23:55 (za ${hours}h ${mins}m)`);
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

  const onTestSftpConnection = async () => {
    try {
      toast.loading('Testiranje SFTP konekcije...');
      const result = await testSftpConnection();
      toast.dismiss();
      if (result.success) {
        toast.success('SFTP konekcija uspješna!');
      } else {
        toast.error(`SFTP greška: ${result.message || 'Nepoznata greška'}`);
      }
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.message || 'Greška pri testiranju SFTP konekcije');
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

  const onUpdatePaymentStatus = async (dispatchId: number, newPaymentStatus: string, note?: string) => {
    try {
      await updatePaymentStatus(dispatchId, newPaymentStatus, note);
      toast.success('Payment status uspješno ažuriran');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri ažuriranju payment status-a');
    }
  };

  const onRunPaymentStatusUpdate = async () => {
    try {
      toast.loading('Pokretanje automatskog ažuriranja...');
      const result = await runPaymentStatusUpdate();
      toast.dismiss();
      toast.success('Automatsko ažuriranje završeno');
      load();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.message || 'Greška pri automatskom ažuriranju');
    }
  };

  const isInvoiceExpired = (dispatchedAt: string | null) => {
    if (!dispatchedAt) return false;
    const sent = dayjs(dispatchedAt);
    const fifteenDaysLater = sent.add(15, 'days');
    return dayjs().isAfter(fifteenDaysLater);
  };

  const getPaymentStatusLabel = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'PAID': return 'Plaćeno';
      case 'EXPIRED': return 'Isteklo';
      case 'OVERDUE': return 'Kašnjenje';
      default: return 'Na čekanju';
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'EXPIRED': return 'bg-red-100 text-red-700 border-red-200';
      case 'OVERDUE': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const exportToExcel = async () => {
    try {
      // Dynamic imports to avoid SSR issues
      const XLSX = await import('xlsx');

      // Prepare invoice data
      const invoiceData = rows.map((r, index) => {
        const op = r.fuelingOperation as any;
        const liters = op?.quantity_liters ? Number(op.quantity_liters) : 0;
        const kg = op?.quantity_kg ? Number(op.quantity_kg) : 0;
        const price = op?.price_per_kg ? Number(op.price_per_kg) : 0;
        const total = op?.total_amount ? Number(op.total_amount) : 0;
        const currency = op?.currency || '';

        return {
          'Br.': index + 1,
          'Datum kreiranja': dayjs(r.createdAt).format('DD.MM.YYYY'),
          'Datum operacije': op?.dateTime ? dayjs(op.dateTime).format('DD.MM.YYYY HH:mm') : '',
          'ID Operacije': r.fuelingOperationId,
          'Kompanija': op?.airline?.name || '',
          'Let broj': op?.flight_number || '',
          'Registracija': op?.aircraft_registration || '',
          'Destinacija': op?.destination || '',
          'Dostavnica': op?.delivery_note_number || '',
          'Litara': liters,
          'Kilograma': kg,
          'Cijena/kg': price,
          'Ukupno': total,
          'Valuta': currency,
          'Status slanja': r.status,
          'Status plaćanja': getPaymentStatusLabel(r.paymentStatus),
          'Pokušaja': r.attempts,
          'XML Fajl': r.xmlFileName,
          'Datum slanja': r.dispatchedAt ? dayjs(r.dispatchedAt).format('DD.MM.YYYY HH:mm') : '',
          'Datum plaćanja': r.paymentReceivedAt ? dayjs(r.paymentReceivedAt).format('DD.MM.YYYY HH:mm') : '',
          'Greška': r.lastError || '',
          'Napomena': r.paymentNote || ''
        };
      });

      // Prepare financial summary data
      const summaryData = [
        { 'Kategorija': 'PLAĆENO', 'Iznos': financialSummary.totalPaid, 'Valuta': financialSummary.currency, 'Broj faktura': paymentCounts.PAID },
        { 'Kategorija': 'NA ČEKANJU', 'Iznos': financialSummary.totalExpected, 'Valuta': financialSummary.currency, 'Broj faktura': paymentCounts.PENDING },
        { 'Kategorija': 'KAŠNJENJE', 'Iznos': financialSummary.totalOverdue, 'Valuta': financialSummary.currency, 'Broj faktura': paymentCounts.OVERDUE },
        { 'Kategorija': 'ISTEKLO', 'Iznos': financialSummary.totalExpired, 'Valuta': financialSummary.currency, 'Broj faktura': paymentCounts.EXPIRED },
        { 'Kategorija': '', 'Iznos': '', 'Valuta': '', 'Broj faktura': '' }, // Empty row
        { 'Kategorija': 'UKUPNO NAPLAĆENO', 'Iznos': financialSummary.totalPaid, 'Valuta': financialSummary.currency, 'Broj faktura': '' },
        { 'Kategorija': 'UKUPNO DUGUJE', 'Iznos': financialSummary.totalOutstanding, 'Valuta': financialSummary.currency, 'Broj faktura': '' },
        { 'Kategorija': 'UKUPNA VRIJEDNOST', 'Iznos': financialSummary.grandTotal, 'Valuta': financialSummary.currency, 'Broj faktura': '' }
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Add invoice sheet with auto-sized columns
      const invoiceSheet = XLSX.utils.json_to_sheet(invoiceData);
      
      // Auto-size columns for invoice sheet
      const invoiceColWidths = [
        { wch: 5 },   // Br.
        { wch: 12 },  // Datum kreiranja
        { wch: 16 },  // Datum operacije
        { wch: 12 },  // ID Operacije
        { wch: 25 },  // Kompanija
        { wch: 12 },  // Let broj
        { wch: 15 },  // Registracija
        { wch: 15 },  // Destinacija
        { wch: 15 },  // Dostavnica
        { wch: 10 },  // Litara
        { wch: 12 },  // Kilograma
        { wch: 12 },  // Cijena/kg
        { wch: 15 },  // Ukupno
        { wch: 8 },   // Valuta
        { wch: 12 },  // Status slanja
        { wch: 15 },  // Status plaćanja
        { wch: 10 },  // Pokušaja
        { wch: 25 },  // XML Fajl
        { wch: 16 },  // Datum slanja
        { wch: 16 },  // Datum plaćanja
        { wch: 30 },  // Greška
        { wch: 25 }   // Napomena
      ];
      invoiceSheet['!cols'] = invoiceColWidths;

      // Add financial summary at the bottom of invoice sheet
      const invoiceStartRow = invoiceData.length + 3; // Leave 2 empty rows
      
      // Add summary title
      XLSX.utils.sheet_add_aoa(invoiceSheet, [
        [''],
        ['FINANSIJSKI SAŽETAK'],
        ['']
      ], { origin: `A${invoiceStartRow}` });

      // Add summary data
      const summaryRows = [
        ['Status', 'Broj faktura', 'Iznos', 'Valuta'],
        ['PLAĆENO', paymentCounts.PAID, financialSummary.totalPaid, financialSummary.currency],
        ['NA ČEKANJU', paymentCounts.PENDING, financialSummary.totalExpected, financialSummary.currency],
        ['KAŠNJENJE', paymentCounts.OVERDUE, financialSummary.totalOverdue, financialSummary.currency],
        ['ISTEKLO', paymentCounts.EXPIRED, financialSummary.totalExpired, financialSummary.currency],
        [''],
        ['UKUPNO NAPLAĆENO', '', financialSummary.totalPaid, financialSummary.currency],
        ['UKUPNO DUGUJE', '', financialSummary.totalOutstanding, financialSummary.currency],
        ['UKUPNA VRIJEDNOST', '', financialSummary.grandTotal, financialSummary.currency]
      ];
      
      XLSX.utils.sheet_add_aoa(invoiceSheet, summaryRows, { origin: `A${invoiceStartRow + 3}` });

      XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Fakture');

      // Add financial summary sheet with auto-sized columns
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      const summaryColWidths = [
        { wch: 20 },  // Kategorija
        { wch: 15 },  // Iznos
        { wch: 8 },   // Valuta
        { wch: 12 }   // Broj faktura
      ];
      summarySheet['!cols'] = summaryColWidths;
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Finansijski sažetak');

      // Add metadata sheet with auto-sized columns
      const metadataSheet = XLSX.utils.json_to_sheet([
        { 'Parametar': 'Izvještaj generiran', 'Vrijednost': dayjs().format('DD.MM.YYYY HH:mm:ss') },
        { 'Parametar': 'Korisnik', 'Vrijednost': 'XML Invoice System' },
        { 'Parametar': 'Period od', 'Vrijednost': startDate },
        { 'Parametar': 'Period do', 'Vrijednost': endDate },
        { 'Parametar': 'Aktivni tab', 'Vrijednost': activeTab === 'dispatch' ? 'Dispatch & Slanje' : 'Poslane fakture' },
        { 'Parametar': 'Filter status', 'Vrijednost': status || 'Svi' },
        { 'Parametar': 'Filter payment status', 'Vrijednost': paymentStatus || 'Svi' },
        { 'Parametar': 'Broj zapisa', 'Vrijednost': rows.length }
      ]);
      const metadataColWidths = [
        { wch: 25 },  // Parametar
        { wch: 30 }   // Vrijednost
      ];
      metadataSheet['!cols'] = metadataColWidths;
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

      // Generate filename
      const filename = `XML_Fakture_${startDate}_${endDate}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

      // Save file using native browser download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel fajl je uspješno exportovan!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Greška pri exportovanju Excel fajla');
    }
  };

  const renderDispatchTab = () => (
    <div className="space-y-6">
      {/* Actions for dispatch tab */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onTestSftpConnection} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          Test SFTP
        </button>
        <button onClick={onPrepareDay} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Pripremi današnje (PENDING)
        </button>
        <button onClick={onManualDay} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14"/>
            <path d="M12 5l7 7-7 7"/>
          </svg>
          Pošalji današnje
        </button>
        <button onClick={onRetryFailed} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Pošalji neuspjele
        </button>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3"/>
            <path d="M21 3v5h-5"/>
          </svg>
          Osvježi
        </button>
        <button onClick={exportToExcel} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="21"/>
            <line x1="8" y1="13" x2="16" y2="21"/>
          </svg>
          Exportuj Excel
        </button>
      </div>

      {/* Status summary for dispatch */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-2">Sažetak:</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">PENDING: {statusCounts.PENDING}</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">SENT: {statusCounts.SENT}</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">FAILED: {statusCounts.FAILED}</span>
      </div>
    </div>
  );

  const renderSentTab = () => (
    <div className="space-y-6">
      {/* Actions for sent tab */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onRunPaymentStatusUpdate} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Ažuriraj statuse automatski
        </button>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3"/>
            <path d="M21 3v5h-5"/>
          </svg>
          Osvježi
        </button>
        <button onClick={exportToExcel} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="21"/>
            <line x1="8" y1="13" x2="16" y2="21"/>
          </svg>
          Exportuj Excel
        </button>
      </div>

      {/* Payment status summary */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-2">Status plaćanja:</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">Na čekanju: {paymentCounts.PENDING}</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Plaćeno: {paymentCounts.PAID}</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Kašnjenje: {paymentCounts.OVERDUE}</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">Isteklo: {paymentCounts.EXPIRED}</span>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header + Tab Navigation */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">XML fakture (Wizz)</h1>
              <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {nextCronText}
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setActiveTab('dispatch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'dispatch' 
                    ? 'bg-white text-indigo-900 shadow-md border border-indigo-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14"/>
                  <path d="M12 5l7 7-7 7"/>
                </svg>
                Dispatch & Slanje
                {activeTab === 'dispatch' && <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'sent' 
                    ? 'bg-white text-green-900 shadow-md border border-green-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                Poslane fakture
                {activeTab === 'sent' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
              </button>
            </div>
          </div>

          {/* Tab content - actions and summaries */}
          <div className="mt-5">
            {activeTab === 'dispatch' ? renderDispatchTab() : renderSentTab()}
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Od</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Do</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {activeTab === 'dispatch' && (
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Svi</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SENT">SENT</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
            )}
            {activeTab === 'sent' && (
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Status plaćanja</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Svi</option>
                  <option value="PENDING">Na čekanju</option>
                  <option value="PAID">Plaćeno</option>
                  <option value="OVERDUE">Kašnjenje</option>
                  <option value="EXPIRED">Isteklo</option>
                </select>
              </div>
            )}
            <div className="flex items-end justify-between gap-2">
              <button onClick={load} className="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition shadow-sm">Primijeni filtere</button>
              <div className="flex gap-2">
                <button onClick={setToday} className="px-2 py-2 rounded-lg bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200 transition">Danas</button>
                <button onClick={setYesterday} className="px-2 py-2 rounded-lg bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200 transition">Juče</button>
              </div>
            </div>
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
              {activeTab === 'sent' && <th className="px-3 py-2 text-left">Status plaćanja</th>}
              <th className="px-3 py-2 text-left">Pokušaja</th>
              <th className="px-3 py-2 text-left">Naziv fajla</th>
              {activeTab === 'dispatch' && <th className="px-3 py-2 text-left">Greška</th>}
              <th className="px-3 py-2 text-left">Akcije</th>
            </tr>
            </thead>
            <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={activeTab === 'sent' ? 14 : 13}>Učitavanje...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={activeTab === 'sent' ? 14 : 13}>Nema zapisa</td></tr>
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
                {activeTab === 'sent' && (
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded text-xs ${getPaymentStatusColor(r.paymentStatus)}`}>
                        {getPaymentStatusLabel(r.paymentStatus)}
                      </span>
                      {isInvoiceExpired(r.dispatchedAt || null) && r.paymentStatus === 'PENDING' && (
                        <span className="text-xs text-red-600">Istekla valuta</span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-3 py-2">{r.attempts}</td>
                <td className="px-3 py-2">{r.xmlFileName}</td>
                {activeTab === 'dispatch' && (
                  <td className="px-3 py-2 max-w-xs truncate" title={r.lastError || ''}>{r.lastError || ''}</td>
                )}
                <td className="px-3 py-2">
                  <div className="flex gap-2 flex-wrap">
                    {activeTab === 'dispatch' && (
                      <button onClick={() => onRetryOne(r.fuelingOperationId)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Pošalji ponovo</button>
                    )}
                    <button onClick={() => downloadXmlDispatchFile(r.id, r.xmlFileName)} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">XML</button>
                    {activeTab === 'sent' && (
                      <>
                        <select 
                          onChange={(e) => onUpdatePaymentStatus(r.id, e.target.value)}
                          value={r.paymentStatus}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="PENDING">Na čekanju</option>
                          <option value="PAID">Plaćeno</option>
                          <option value="OVERDUE">Kašnjenje</option>
                          <option value="EXPIRED">Isteklo</option>
                        </select>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ); })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        {rows.length > 0 && (
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Finansijski sažetak
                <span className="text-sm font-normal text-gray-500">({rows.length} faktura)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Plaćeno */}
                <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Plaćeno</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(financialSummary.totalPaid, financialSummary.currency)}
                      </p>
                      <p className="text-xs text-green-600">{paymentCounts.PAID} faktura</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Na čekanju */}
                <div className="bg-white rounded-lg border border-yellow-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Na čekanju</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {formatCurrency(financialSummary.totalExpected, financialSummary.currency)}
                      </p>
                      <p className="text-xs text-yellow-600">{paymentCounts.PENDING} faktura</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Kašnjenje */}
                <div className="bg-white rounded-lg border border-orange-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Kašnjenje</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {formatCurrency(financialSummary.totalOverdue, financialSummary.currency)}
                      </p>
                      <p className="text-xs text-orange-600">{paymentCounts.OVERDUE} faktura</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Isteklo */}
                <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700">Isteklo</p>
                      <p className="text-2xl font-bold text-red-900">
                        {formatCurrency(financialSummary.totalExpired, financialSummary.currency)}
                      </p>
                      <p className="text-xs text-red-600">{paymentCounts.EXPIRED} faktura</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ukupni sažetak */}
              <div className="pt-4 border-t border-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
                    <p className="text-sm font-medium text-indigo-700">Ukupno naplaćeno</p>
                    <p className="text-xl font-bold text-indigo-900">
                      {formatCurrency(financialSummary.totalPaid, financialSummary.currency)}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                    <p className="text-sm font-medium text-amber-700">Ukupno duguje</p>
                    <p className="text-xl font-bold text-amber-900">
                      {formatCurrency(financialSummary.totalOutstanding, financialSummary.currency)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                    <p className="text-sm font-medium text-purple-700">Ukupna vrijednost</p>
                    <p className="text-xl font-bold text-purple-900">
                      {formatCurrency(financialSummary.grandTotal, financialSummary.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}