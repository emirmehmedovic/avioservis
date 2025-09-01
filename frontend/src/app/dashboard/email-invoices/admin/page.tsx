'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'react-hot-toast';
import { 
  CogIcon, 
  PlayIcon, 
  StopIcon, 
  ArrowPathIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  getEmailInvoiceStats,
  manualDispatchEmailRange,
  prepareEmailInvoicesForDay,
  prepareEmailInvoicesForRange,
  EmailInvoiceStats
} from '@/lib/emailInvoiceApiService';
// Role check handled by RoleBasedAuth in layout - no frontend role restriction needed

export default function EmailInvoicesAdminPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EmailInvoiceStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD')
  });

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getEmailInvoiceStats({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      setStats(data);
    } catch (error: any) {
      toast.error(error?.message || 'Greška pri učitavanju statistika');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [dateRange.startDate, dateRange.endDate]);

  const handlePrepareDay = async () => {
    try {
      setLoading(true);
      const result = await prepareEmailInvoicesForDay(selectedDate) as any;
      toast.success(`Pripremljeno ${result.summary?.successful || 0} email dispatch zapisa za ${selectedDate}`);
      await loadStats();
    } catch (error: any) {
      toast.error(error?.message || 'Greška pri pripremi email dispatch zapisa');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareRange = async () => {
    try {
      setLoading(true);
      const result = await prepareEmailInvoicesForRange(dateRange.startDate, dateRange.endDate) as any;
      toast.success(`Pripremljeno ${result.summary?.successful || 0} email dispatch zapisa za period ${dateRange.startDate} - ${dateRange.endDate}`);
      await loadStats();
    } catch (error: any) {
      toast.error(error?.message || 'Greška pri pripremi email dispatch zapisa za period');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchRange = async () => {
    try {
      setLoading(true);
      const result = await manualDispatchEmailRange(dateRange.startDate, dateRange.endDate) as any;
      toast.success(`Uspješno poslano ${result.summary?.successful || 0} email faktura za period ${dateRange.startDate} - ${dateRange.endDate}`);
      await loadStats();
    } catch (error: any) {
      toast.error(error?.message || 'Greška pri slanju email faktura za period');
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRate = () => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.sent / stats.total) * 100);
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
                  <CogIcon className="h-8 w-8 text-white" />
                </div>
                Email Invoices - Admin Panel
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Napredne kontrole za upravljanje email invoice sistemom
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <a
                href="/dashboard/email-invoices"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Vrati se na Email Fakture
              </a>
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Email Invoices */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-100" />
              </div>
              <div className="ml-4">
                <p className="text-blue-100 text-sm font-medium">Ukupno Email Faktura</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
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
                <p className="text-2xl font-bold">{stats?.sent || 0}</p>
              </div>
            </div>
          </div>

          {/* Failed Invoices */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-100" />
              </div>
              <div className="ml-4">
                <p className="text-red-100 text-sm font-medium">Neuspješno</p>
                <p className="text-2xl font-bold">{stats?.failed || 0}</p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-purple-100" />
              </div>
              <div className="ml-4">
                <p className="text-purple-100 text-sm font-medium">Stopa Uspješnosti</p>
                <p className="text-2xl font-bold">{getSuccessRate()}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Filtriranje po periodu
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                📅 Početni datum
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
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
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Prepare Day Actions */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <PlayIcon className="h-5 w-5 text-blue-600" />
              </div>
              Priprema email dispatch zapisa
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Pripremi email dispatch zapise za određeni dan bez slanja email-ova
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Datum
                </label>
                <input
                  type="date"
                  id="selectedDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={handlePrepareDay}
                disabled={loading}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                ) : (
                  <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
                )}
                Pripremi za dan
              </button>
            </div>
          </div>

          {/* Bulk Prepare Actions */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-full">
                <ClockIcon className="h-5 w-5 text-green-600" />
              </div>
              Masovna priprema email dispatch zapisa
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Pripremi email dispatch zapise za izabrani period bez slanja email-ova
            </p>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <strong>Period:</strong> {dateRange.startDate} do {dateRange.endDate}
              </div>
              <button
                onClick={handlePrepareRange}
                disabled={loading}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                ) : (
                  <ClockIcon className="-ml-1 mr-2 h-4 w-4" />
                )}
                Pripremi za period
              </button>
              <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
                ℹ️ Ova akcija će pripremiti email dispatch zapise koji mogu kasnije biti ručno poslani.
              </div>
            </div>
          </div>

          {/* Bulk Dispatch Actions */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-full">
                <ArrowPathIcon className="h-5 w-5 text-orange-600" />
              </div>
              Masovno slanje email faktura
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Pošalji sve email fakture za izabrani period
            </p>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <strong>Period:</strong> {dateRange.startDate} do {dateRange.endDate}
              </div>
              <button
                onClick={handleDispatchRange}
                disabled={loading}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                ) : (
                  <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
                )}
                Pošalji za period
              </button>
              <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                ⚠️ Ova akcija će pokušati poslati sve email fakture za odabrani period. Koristi oprezno.
              </div>
            </div>
          </div>
        </div>

              {/* Airlines Statistics */}
        {stats?.byAirline && stats.byAirline.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-full">
                <ChartBarIcon className="h-5 w-5 text-indigo-600" />
              </div>
              Statistike po aviokompanijama
            </h3>
            <div className="overflow-hidden rounded-lg">
              <div className="overflow-x-auto max-w-full">
                <div className="min-w-[600px]">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aviokompanija
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Broj Faktura
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ukupno Pokušaja
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prosjek
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.byAirline.map((airline) => (
                        <tr key={airline.airlineId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {airline.airlineName}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {airline.count}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {airline.totalAttempts}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {airline.count > 0 ? (airline.totalAttempts / airline.count).toFixed(1) : '0'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Email Invoice System Information
          </h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Automatsko slanje</p>
                  <p className="text-xs text-blue-700">Svaki dan u 23:50</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 1.05A2 2 0 0012 10.93V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3a2 2 0 012-2h5a2 2 0 012 2v7a2 2 0 01-2 2h-5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Email adrese</p>
                  <p className="text-xs text-blue-700">Contact_details polje aviokompanija</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">PDF prilozi</p>
                  <p className="text-xs text-blue-700">Automatski generisani prilozi</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Status praćenje</p>
                  <p className="text-xs text-blue-700">Puno praćenje i retry mogućnosti</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
