'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  Eye, 
  Download,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  PieChart,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { getReport, Report } from '@/services/reportService';
import DailyReportTemplate from './reportTemplates/DailyReportTemplate';
import WeeklyReportTemplate from './reportTemplates/WeeklyReportTemplate';
import MonthlyReportTemplate from './reportTemplates/MonthlyReportTemplate';
import ComparisonReportTemplate from './reportTemplates/ComparisonReportTemplate';

interface ReportViewerProps {
  token: string;
  onBack?: () => void;
}

export default function ReportViewer({ token, onBack }: ReportViewerProps) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}.${month}.${year}`;
  };

  useEffect(() => {
    // Provjeri da li je korisnik ulogovan prije učitavanja izvještaja
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') || localStorage.getItem('token') : null;
    
    if (!authToken) {
      console.log('🔴 NO AUTH TOKEN, setting authError to true');
      setAuthError(true);
      setLoading(false);
      return;
    }
    
    console.log('🔴 AUTH TOKEN FOUND, loading report');
    loadReport();
  }, [token]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthError(false);
      
      const response = await getReport(token);
      setReport(response.data.report);
      setReportData(response.data.reportData);
    } catch (err: any) {
      console.error('Error loading report:', err);
      
      // Provjeri da li je greška autentifikacije
      if (err.status === 401 || err.message?.includes('Unauthorized')) {
        setAuthError(true);
        setError('Morate biti ulogovani da biste pristupili izvještaju');
      } else {
        setError(err.message || 'Greška pri učitavanju izvještaja');
      }
    } finally {
      setLoading(false);
    }
  };


  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'daily': return '📅';
      case 'weekly': return '📊';
      case 'monthly': return '📈';
      case 'comparison': return '⚖️';
      default: return '📄';
    }
  };

  const getTemplateLabel = (template: string) => {
    switch (template) {
      case 'daily': return 'Dnevni izvještaj';
      case 'weekly': return 'Sedmični izvještaj';
      case 'monthly': return 'Mjesečni izvještaj';
      case 'comparison': return 'Komparativni izvještaj';
      default: return template;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Učitavam izvještaj...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Potrebna autentifikacija
            </h1>
            <p className="text-gray-600 mb-6">
              Morate biti ulogovani da biste pristupili ovom izvještaju.
            </p>
            <div className="space-y-3">
                <button
                  onClick={() => {
                    // Spremi trenutni URL u localStorage za redirect nakon login-a
                    if (typeof window !== 'undefined') {
                      const currentPath = window.location.pathname;
                      console.log('🔴 SAVING redirectAfterLogin (first button):', currentPath);
                      localStorage.setItem('redirectAfterLogin', currentPath);
                      
                      // Provjeri da li je spremljeno
                      const saved = localStorage.getItem('redirectAfterLogin');
                      console.log('🔴 VERIFIED saved (first button):', saved);
                    }
                    console.log('🔴 NAVIGATING to /login (first button)');
                    router.push('/login');
                  }}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Uloguj se
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Nazad
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Provjeri da li je greška vezana za autentifikaciju
    const isAuthError = error.includes('Authentication required') || 
                       error.includes('No authentication token found') ||
                       error.includes('Unauthorized');
    
    if (isAuthError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Potrebna autentifikacija
              </h1>
              <p className="text-gray-600 mb-6">
                Morate biti ulogovani da biste pristupili ovom izvještaju.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Spremi trenutni URL u localStorage za redirect nakon login-a
                    if (typeof window !== 'undefined') {
                      const currentPath = window.location.pathname;
                      console.log('🔴 SAVING redirectAfterLogin:', currentPath);
                      localStorage.setItem('redirectAfterLogin', currentPath);
                      
                      // Provjeri da li je spremljeno
                      const saved = localStorage.getItem('redirectAfterLogin');
                      console.log('🔴 VERIFIED saved:', saved);
                    }
                    console.log('🔴 NAVIGATING to /login');
                    router.push('/login');
                  }}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Uloguj se
                </button>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Nazad
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Obična greška
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Greška</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Povratak
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Izvještaj nije pronađen</h2>
          <p className="text-gray-600">Traženi izvještaj ne postoji ili je obrisan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Povratak
                </button>
              )}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getTemplateIcon(report.template)}</span>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{report.title}</h1>
                  <p className="text-sm text-gray-600">{getTemplateLabel(report.template)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {report.generated_by_user?.username || 'Nepoznato'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Izvještaj automatski generisan iz programa
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(report.generated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full space-y-8">
          {/* Report Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacije o izvještaju</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Period 1</h4>
                <p className="text-gray-600">
                  {formatDate(report.period1_start)} - {formatDate(report.period1_end)}
                </p>
              </div>
              {report.period2_start && report.period2_end && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Period 2</h4>
                  <p className="text-gray-600">
                    {formatDate(report.period2_start)} - {formatDate(report.period2_end)}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Report Data - Template Rendering */}
          {reportData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {report.template === 'daily' && (
                <DailyReportTemplate reportData={reportData} />
              )}
              
              {report.template === 'weekly' && (
                <WeeklyReportTemplate reportData={reportData} />
              )}
              
              {report.template === 'monthly' && (
                <MonthlyReportTemplate reportData={reportData} />
              )}
              
              {report.template === 'comparison' && (
                <ComparisonReportTemplate reportData={reportData} />
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
