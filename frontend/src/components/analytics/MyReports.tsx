'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  Eye, 
  Trash2, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { getMyReports, deleteReport, Report } from '@/services/reportService';

export default function MyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyReports();
      setReports(data);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Greška pri učitavanju izvještaja');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj izvještaj?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteReport(id);
      setReports(reports.filter(report => report.id !== id));
    } catch (err: any) {
      console.error('Error deleting report:', err);
      alert(err.message || 'Greška pri brisanju izvještaja');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewReport = (accessToken: string) => {
    window.open(`/reports/${accessToken}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTemplateLabel = (template: string) => {
    switch (template) {
      case 'daily': return 'Dnevni';
      case 'weekly': return 'Sedmični';
      case 'monthly': return 'Mjesečni';
      case 'comparison': return 'Komparativni';
      default: return template;
    }
  };

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'daily': return Calendar;
      case 'weekly': return BarChart3;
      case 'monthly': return TrendingUp;
      case 'comparison': return TrendingUp;
      default: return FileText;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Učitavam izvještaje...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <FileText className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Moji izvještaji</h3>
          <p className="text-sm text-gray-600">
            {reports.length} {reports.length === 1 ? 'izvještaj' : 'izvještaja'}
          </p>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">Nema izvještaja</p>
          <p className="text-gray-500 text-sm">Generirajte svoj prvi izvještaj koristeći formu iznad</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {React.createElement(getTemplateIcon(report.template), { className: "w-5 h-5 text-blue-600" })}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{report.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {getTemplateLabel(report.template)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(report.generated_at)}
                        </span>
                        {report._count && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {report._count.accesses} pregleda
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <span>Period 1:</span>
                      <span className="font-medium">
                        {new Date(report.period1_start).toLocaleDateString('bs-BA')} - {new Date(report.period1_end).toLocaleDateString('bs-BA')}
                      </span>
                    </div>
                    {report.period2_start && report.period2_end && (
                      <div className="flex items-center gap-2">
                        <span>Period 2:</span>
                        <span className="font-medium">
                          {new Date(report.period2_start).toLocaleDateString('bs-BA')} - {new Date(report.period2_end).toLocaleDateString('bs-BA')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewReport(report.access_token)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Pregledaj
                  </button>
                  
                  <button
                    onClick={() => handleViewReport(report.access_token)}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Link
                  </button>
                  
                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={deletingId === report.id}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    {deletingId === report.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
