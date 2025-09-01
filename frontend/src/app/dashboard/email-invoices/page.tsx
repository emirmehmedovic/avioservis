'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon, EnvelopeIcon, ArrowPathIcon, CogIcon } from '@heroicons/react/24/outline';
import {
  listEmailDispatches,
  manualDispatchEmailDay,
  manualDispatchEmailOperation,
  getEmailInvoiceStats,
  previewEmailTemplate,
  updateEmailInvoicePaymentStatus,
  EmailInvoiceDispatch,
  EmailPreview
} from '@/lib/emailInvoiceApiService';
// Role check handled by backend API - no frontend role restriction needed

export default function EmailInvoicesPage() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'sent'>('dispatch');
  const [rows, setRows] = useState<EmailInvoiceDispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string>(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [status, setStatus] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [nextCronText, setNextCronText] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<EmailInvoiceDispatch | null>(null);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);

  const statusCounts = useMemo(() => {
    const counts = { PENDING: 0, SENT: 0, FAILED: 0 } as Record<string, number>;
    rows.forEach(r => { if (r.status in counts) counts[r.status]++; });
    return counts;
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
      
      const data = await listEmailDispatches(params);
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri učitavanju email dispatch zapisa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [startDate, endDate, status, paymentStatus, activeTab]);

  useEffect(() => {
    const updateCron = () => {
      const now = dayjs();
      let next = now.hour(23).minute(50).second(0).millisecond(0);
      if (now.isAfter(next)) {
        next = next.add(1, 'day');
      }
      const diffMs = next.diff(now);
      const totalMins = Math.max(0, Math.floor(diffMs / 60000));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setNextCronText(`Sljedeće automatsko slanje: 23:50 (za ${hours}h ${mins}m)`);
    };

    updateCron();
    const interval = setInterval(updateCron, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleManualDispatchDay = async () => {
    try {
      setLoading(true);
      const result = await manualDispatchEmailDay(startDate) as any;
      toast.success(`Uspješno poslano ${result.summary?.successful || 0} email faktura za ${startDate}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri slanju email faktura');
    } finally {
      setLoading(false);
    }
  };

  const handleManualDispatchOperation = async (operationId: number, force = false) => {
    try {
      const result = await manualDispatchEmailOperation(operationId, force) as any;
      if (result.success) {
        toast.success('Email faktura uspješno poslana');
        await load();
      } else {
        toast.error(result.message || 'Greška pri slanju email fakture');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri slanju email fakture');
    }
  };

  const handlePreviewEmail = async (operationId: number) => {
    try {
      setPreviewLoading(true);
      const preview = await previewEmailTemplate(operationId);
      setEmailPreview(preview);
      setShowPreviewModal(true);
    } catch (e: any) {
      toast.error(e?.message || 'Greška pri pregledu email template-a');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'SENT':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'PENDING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700';
      case 'OVERDUE':
        return 'bg-red-100 text-red-700';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-700';
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Plaćeno';
      case 'OVERDUE':
        return 'Dospjelo';
      case 'EXPIRED':
        return 'Isteklo';
      case 'PENDING':
      default:
        return 'Na čekanju';
    }
  };

  const handleUpdatePaymentStatus = (dispatch: EmailInvoiceDispatch) => {
    setSelectedDispatch(dispatch);
    setShowPaymentModal(true);
  };

  const handlePaymentStatusSubmit = async (newStatus: string, note?: string) => {
    if (!selectedDispatch) return;
    
    try {
      setPaymentModalLoading(true);
      await updateEmailInvoicePaymentStatus(
        selectedDispatch.id, 
        newStatus as 'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED', 
        note
      );
      toast.success('Status plaćanja uspješno ažuriran');
      setShowPaymentModal(false);
      setSelectedDispatch(null);
      await load(); // Reload data
    } catch (error: any) {
      toast.error(error?.message || 'Greška pri ažuriranju status plaćanja');
    } finally {
      setPaymentModalLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen overflow-x-hidden">
      <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <EnvelopeIcon className="h-8 w-8 text-white" />
              </div>
              Email Fakture
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Upravljanje i praćenje automatski poslanih email faktura aviokompanijama
            </p>
          </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <a
            href="/dashboard/email-invoices/admin"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CogIcon className="-ml-1 mr-2 h-4 w-4" />
            Admin Panel
          </a>
          <button
            onClick={handleManualDispatchDay}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <EnvelopeIcon className="-ml-1 mr-2 h-4 w-4" />
            )}
            Ručno pošalji za dan
          </button>
        </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Email Invoices */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EnvelopeIcon className="h-8 w-8 text-blue-100" />
            </div>
            <div className="ml-4">
              <p className="text-blue-100 text-sm font-medium">Ukupno Email Faktura</p>
              <p className="text-2xl font-bold">{rows.length}</p>
            </div>
          </div>
        </div>

        {/* Sent Invoices */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-100" />
            </div>
            <div className="ml-4">
              <p className="text-green-100 text-sm font-medium">Uspješno Poslano</p>
              <p className="text-2xl font-bold">{statusCounts.SENT}</p>
            </div>
          </div>
        </div>

        {/* Failed Invoices */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-8 w-8 text-red-100" />
            </div>
            <div className="ml-4">
              <p className="text-red-100 text-sm font-medium">Neuspješno</p>
              <p className="text-2xl font-bold">{statusCounts.FAILED}</p>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowPathIcon className="h-8 w-8 text-purple-100" />
            </div>
            <div className="ml-4">
              <p className="text-purple-100 text-sm font-medium">Stopa Uspješnosti</p>
              <p className="text-2xl font-bold">
                {rows.length > 0 ? Math.round((statusCounts.SENT / rows.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cron Info */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Automatsko slanje</p>
              <p className="text-sm text-gray-600">{nextCronText}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Svaki dan u 23:50
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`${
                activeTab === 'dispatch'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors`}
            >
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4" />
                Svi dispatch zapisi ({statusCounts.PENDING + statusCounts.SENT + statusCounts.FAILED})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`${
                activeTab === 'sent'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors`}
            >
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                Poslane email fakture ({statusCounts.SENT})
              </div>
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filteri
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                📅 Početni datum
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                📅 Završni datum
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                🏷️ Status Slanja
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Svi statusi</option>
                <option value="PENDING">⏳ Na čekanju</option>
                <option value="SENT">✅ Poslano</option>
                <option value="FAILED">❌ Neuspješno</option>
              </select>
            </div>
            <div>
              <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                💰 Status Plaćanja
              </label>
              <select
                id="paymentStatus"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Svi statusi</option>
                <option value="PENDING">⏳ Na čekanju</option>
                <option value="PAID">✅ Plaćeno</option>
                <option value="OVERDUE">⚠️ Dospjelo</option>
                <option value="EXPIRED">❌ Isteklo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg">
          <div className="overflow-x-auto max-w-full">
            <div className="min-w-[1200px]">
              <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Datum
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Op.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Kompanija
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Dest.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Dost.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Litara
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  kg
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  €/kg
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Ukupno
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Slanje
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Plaćanje
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Email
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Pok.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  PDF
                </th>
                {activeTab === 'dispatch' && (
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Greška
                  </th>
                )}
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'dispatch' ? 15 : 14} className="px-3 py-4 text-center">
                    <div className="flex justify-center">
                      <ArrowPathIcon className="animate-spin h-6 w-6 text-gray-400" />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'dispatch' ? 15 : 14} className="px-3 py-4 text-center text-gray-500">
                    Nema podataka za prikazane filtere
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const op = row.fuelingOperation;
                  const liters = op?.quantity_liters ? Number(op.quantity_liters) : 0;
                  const kg = op?.quantity_kg || 0;
                  const price = op?.price_per_kg || 0;
                  const total = op?.total_amount ? Number(op.total_amount) : 0;
                  const currency = op?.currency || 'BAM';
                  
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {/* Datum */}
                      <td className="px-2 py-2 text-xs">
                        <div>{dayjs(row.createdAt).format('DD.MM')}</div>
                        <div className="text-gray-500">{dayjs(row.createdAt).format('HH:mm')}</div>
                      </td>
                      
                      {/* Operacija */}
                      <td className="px-2 py-2 text-xs">
                        #{row.fuelingOperationId}
                        <div className="text-gray-500">
                          {op?.dateTime ? dayjs(op.dateTime).format('DD.MM') : ''}
                        </div>
                      </td>
                      
                      {/* Kompanija */}
                      <td className="px-2 py-2 text-xs">
                        <div className="font-medium truncate" title={row.airline.name}>
                          {row.airline.name.length > 12 ? row.airline.name.substring(0,12) + '...' : row.airline.name}
                        </div>
                        <div className="text-gray-500">
                          {op?.flight_number || '-'}
                        </div>
                      </td>
                      
                      {/* Destinacija */}
                      <td className="px-2 py-2 text-xs">{op?.destination || '-'}</td>
                      
                      {/* Dostavnica */}
                      <td className="px-2 py-2 text-xs">{op?.delivery_note_number || '-'}</td>
                      
                      {/* Litara */}
                      <td className="px-2 py-2 text-xs">
                        {liters.toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      
                      {/* Kilograma */}
                      <td className="px-2 py-2 text-xs">
                        {Number(kg).toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      
                      {/* Cijena/kg */}
                      <td className="px-2 py-2 text-xs">
                        {Number(price).toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      
                      {/* Ukupno */}
                      <td className="px-2 py-2 text-xs font-medium">
                        {total.toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
                      </td>
                      
                      {/* Status Slanja */}
                      <td className="px-2 py-2">
                        <span className={`px-1 py-1 rounded text-xs ${
                          row.status === 'SENT' ? 'bg-green-100 text-green-700' : 
                          row.status === 'FAILED' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {row.status === 'SENT' ? '✓' : row.status === 'FAILED' ? '✗' : '⏳'}
                        </span>
                      </td>

                      {/* Status Plaćanja */}
                      <td className="px-2 py-2">
                        <span className={`px-1 py-1 rounded text-xs ${getPaymentStatusClass(row.paymentStatus)}`}>
                          {row.paymentStatus === 'PAID' ? '💰' : 
                           row.paymentStatus === 'OVERDUE' ? '⚠️' : 
                           row.paymentStatus === 'EXPIRED' ? '❌' : '⏳'}
                        </span>
                        {row.paymentReceivedAt && (
                          <div className="text-xs text-gray-500">
                            {dayjs(row.paymentReceivedAt).format('DD.MM')}
                          </div>
                        )}
                      </td>
                      
                      {/* Email adresa */}
                      <td className="px-2 py-2 text-xs">
                        <div className="font-mono text-xs truncate" title={row.emailTo}>
                          {row.emailTo.length > 20 ? row.emailTo.substring(0,20) + '...' : row.emailTo}
                        </div>
                      </td>
                      
                      {/* Pokušaji */}
                      <td className="px-2 py-2 text-xs text-center">{row.attempts}</td>
                      
                      {/* PDF fajl */}
                      <td className="px-2 py-2 text-center">
                        <span className="text-lg" title={row.pdfFileName}>📄</span>
                      </td>
                      
                      {/* Greška (samo u dispatch tab) */}
                      {activeTab === 'dispatch' && (
                        <td className="px-2 py-2 text-xs max-w-xs truncate text-red-600" title={row.lastError || ''}>
                          {row.lastError || ''}
                        </td>
                      )}
                      
                      {/* Akcije */}
                      <td className="px-2 py-2">
                        <div className="flex gap-1 flex-wrap justify-center">
                          <button
                            onClick={() => handlePreviewEmail(row.fuelingOperationId)}
                            className="px-1 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                            disabled={loading || previewLoading}
                            title="Pregled email template-a"
                          >
                            👁️
                          </button>
                          
                          <button
                            onClick={() => handleUpdatePaymentStatus(row)}
                            className="px-1 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            disabled={loading}
                            title="Ažuriraj status plaćanja"
                          >
                            💰
                          </button>
                          {activeTab === 'dispatch' && (
                            <button
                              onClick={() => handleManualDispatchOperation(row.fuelingOperationId, false)}
                              className="px-1 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              disabled={loading}
                              title="Pošalji ponovo"
                            >
                              📧
                            </button>
                          )}
                          <button
                            onClick={() => handleManualDispatchOperation(row.fuelingOperationId, true)}
                            className="px-1 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                            disabled={loading}
                            title="Prinudno pošalji"
                          >
                            🔄
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
              </table>
            </div>
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
                Financijski pregled email faktura
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Count */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ukupno email faktura</p>
                      <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <EnvelopeIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Sent Count */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Poslane email fakture</p>
                      <p className="text-2xl font-bold text-green-600">{statusCounts.SENT}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Failed Count */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Neuspešne email fakture</p>
                      <p className="text-2xl font-bold text-red-600">{statusCounts.FAILED}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <XCircleIcon className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Stopa uspešnosti</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {rows.length > 0 ? Math.round((statusCounts.SENT / rows.length) * 100) : 0}%
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <ArrowPathIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Finansijski sažetak</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ukupna količina (litara)</p>
                    <p className="text-xl font-bold text-blue-600">
                      {rows.reduce((sum, row) => sum + (Number(row.fuelingOperation?.quantity_liters) || 0), 0)
                        .toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ukupna količina (kg)</p>
                    <p className="text-xl font-bold text-green-600">
                      {rows.reduce((sum, row) => sum + (Number(row.fuelingOperation?.quantity_kg) || 0), 0)
                        .toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ukupan iznos</p>
                    <p className="text-xl font-bold text-purple-600">
                      {rows.reduce((sum, row) => sum + (Number(row.fuelingOperation?.total_amount) || 0), 0)
                        .toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BAM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreviewModal && emailPreview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Email Template Preview</h3>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>

              {/* Email Details */}
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">To:</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                      {emailPreview.to || 'No email found'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Airline:</label>
                    <p className="mt-1 text-sm text-gray-900">{emailPreview.airline}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject:</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {emailPreview.subject}
                  </p>
                </div>

                {!emailPreview.hasValidEmail && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          ⚠️ No valid email address found in airline contact details. Email cannot be sent.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Body Preview */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Content:</label>
                <div className="border rounded-lg overflow-hidden">
                  <div 
                    className="w-full h-96 overflow-auto bg-white"
                    style={{ maxHeight: '500px' }}
                    dangerouslySetInnerHTML={{ __html: emailPreview.body }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {emailPreview.hasValidEmail && (
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      handleManualDispatchOperation(Number(emailPreview.deliveryNumber), false);
                    }}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    Send This Email
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {showPaymentModal && selectedDispatch && (
        <PaymentStatusModal
          dispatch={selectedDispatch}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedDispatch(null);
          }}
          onSubmit={handlePaymentStatusSubmit}
          loading={paymentModalLoading}
        />
      )}
      </div>
    </div>
  );
}

// Payment Status Modal Component
function PaymentStatusModal({ 
  dispatch, 
  onClose, 
  onSubmit, 
  loading 
}: { 
  dispatch: EmailInvoiceDispatch; 
  onClose: () => void; 
  onSubmit: (status: string, note?: string) => void; 
  loading: boolean; 
}) {
  const [selectedStatus, setSelectedStatus] = useState<'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED'>(dispatch.paymentStatus);
  const [note, setNote] = useState(dispatch.paymentNote || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedStatus, note);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Ažuriraj Status Plaćanja
          </h3>
          
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Faktura:</strong> {dispatch.fuelingOperation?.delivery_note_number || dispatch.fuelingOperationId}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Aviokompanija:</strong> {dispatch.airline.name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Trenutni status:</strong> <span className={`px-2 py-1 rounded text-xs ${{
                'PAID': 'bg-green-100 text-green-700',
                'OVERDUE': 'bg-red-100 text-red-700',
                'EXPIRED': 'bg-gray-100 text-gray-700',
                'PENDING': 'bg-yellow-100 text-yellow-700'
              }[dispatch.paymentStatus]}`}>
                {{
                  'PAID': 'Plaćeno',
                  'OVERDUE': 'Dospjelo',
                  'EXPIRED': 'Isteklo',
                  'PENDING': 'Na čekanju'
                }[dispatch.paymentStatus]}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novi status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="PENDING">⏳ Na čekanju</option>
                <option value="PAID">✅ Plaćeno</option>
                <option value="OVERDUE">⚠️ Dospjelo</option>
                <option value="EXPIRED">❌ Isteklo</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Napomena (opcionalno)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Dodajte napomenu o plaćanju..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Otkaži
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Ažuriranje...' : 'Ažuriraj Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

