'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import ReportGenerator from './ReportGenerator';
import MyReports from './MyReports';

export default function GenerateReportTab() {
  const [activeSubTab, setActiveSubTab] = useState<'generate' | 'my-reports'>('generate');
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);

  const handleReportGenerated = (reportUrl: string) => {
    setGeneratedReportUrl(reportUrl);
    setActiveSubTab('my-reports');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Generiši izvještaj</h2>
                <p className="text-blue-100 mt-1">
                  Kreiraj detaljne analitičke izvještaje za bilo koji period
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm font-medium">Automatski template</span>
                </div>
                <p className="text-sm text-blue-100">
                  Sistem automatski odlučuje tip izvještaja na osnovu perioda
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Komparacija</span>
                </div>
                <p className="text-sm text-blue-100">
                  Usporedi dva perioda ili sa prethodnim periodima
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-medium">Fleksibilni periodi</span>
                </div>
                <p className="text-sm text-blue-100">
                  Od dana do mjeseca, sa filterima po kompaniji i destinaciji
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sub Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-2"
      >
        <div className="flex space-x-1">
          {[
            { id: 'generate', name: 'Generiši novi', icon: FileText },
            { id: 'my-reports', name: 'Moji izvještaji', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSubTab === tab.id
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {activeSubTab === 'generate' && (
          <ReportGenerator onReportGenerated={handleReportGenerated} />
        )}

        {activeSubTab === 'my-reports' && (
          <MyReports />
        )}
      </motion.div>

      {/* Success Message */}
      {generatedReportUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">Izvještaj je uspješno generiran!</h4>
              <p className="text-sm text-green-700 mb-3">
                Vaš izvještaj je spreman za pregled. Možete ga pronaći u "Moji izvještaji" tabu.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(generatedReportUrl, '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Pregledaj izvještaj
                </button>
                <button
                  onClick={() => setGeneratedReportUrl(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Zatvori
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-6"
      >
        <h4 className="font-semibold text-blue-900 mb-3">Kako koristiti generiranje izvještaja:</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-medium">1.</span>
            <span>
              <strong>Odaberite period:</strong> Unesite početni i završni datum za analizu
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">2.</span>
            <span>
              <strong>Komparacija (opciono):</strong> Označite "Komparacija dva perioda" za usporedbu
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">3.</span>
            <span>
              <strong>Filteri (opciono):</strong> Odaberite aviokompaniju ili destinaciju za fokusiranu analizu
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">4.</span>
            <span>
              <strong>Generiši:</strong> Kliknite "Generiši izvještaj" i sistem će kreirati detaljni izvještaj
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">5.</span>
            <span>
              <strong>Pregled:</strong> Izvještaj se otvara u novom tabu sa svim dijagramima i tabelama
            </span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
