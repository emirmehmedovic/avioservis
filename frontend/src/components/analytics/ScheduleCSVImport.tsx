'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Save,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  previewCSVImport,
  importCSV,
  downloadCSVTemplate,
  bulkDeleteSchedules,
} from '@/services/flightScheduleService';

interface ScheduleCSVImportProps {
  onImportComplete?: () => void;
}

export default function ScheduleCSVImport({ onImportComplete }: ScheduleCSVImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importType, setImportType] = useState<'arrival' | 'departure' | 'both'>('departure');
  const [preview, setPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteBeforeImport, setDeleteBeforeImport] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setPreview(null);
      setImportResult(null);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvContent) {
      setError('Molimo učitajte CSV fajl');
      return;
    }

    try {
      setPreviewing(true);
      setError(null);
      const result = await previewCSVImport(csvContent, importType);
      setPreview(result.preview);
    } catch (err: any) {
      setError(err.message || 'Greška prilikom pregleda CSV fajla');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Da li ste sigurni da želite obrisati sve postojeće rasporede? Ova akcija se ne može poništiti!')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      const result = await bulkDeleteSchedules();
      alert(`${result.count} rasporeda je obrisano`);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Greška prilikom brisanja');
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async () => {
    if (!csvContent) {
      setError('Molimo učitajte CSV fajl');
      return;
    }

    let confirmMessage = 'Da li ste sigurni da želite importovati rasporede?';
    if (deleteBeforeImport) {
      confirmMessage = 'Da li ste sigurni? Prvo će biti obrisani svi postojeći rasporedi, a zatim importovani novi!';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setImporting(true);
      setError(null);

      // Delete existing schedules if option is selected
      if (deleteBeforeImport) {
        await bulkDeleteSchedules();
      }

      const result = await importCSV(csvContent, importType);
      setImportResult(result);
      
      if (result.results.imported > 0 && onImportComplete) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Greška prilikom importa');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadCSVTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flight_schedule_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Greška prilikom preuzimanja template-a');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCsvContent('');
    setPreview(null);
    setImportResult(null);
    setError(null);
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-full bg-green-600 text-white rounded-xl shadow-sm p-4 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">Importuj raspored iz CSV</span>
        </motion.button>
      )}

      {/* Import Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-green-600" />
                  CSV Import rasporeda
                </h3>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </motion.div>
              )}

              {/* Success Message */}
              {importResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Import završen!</p>
                      <div className="mt-2 text-sm text-green-800">
                        <p>• Ukupno redova: {importResult.results.total}</p>
                        <p>• Importovano: {importResult.results.imported}</p>
                        <p>• Preskočeno: {importResult.results.skipped}</p>
                        {importResult.results.errorCount > 0 && (
                          <p className="text-orange-600">• Greške: {importResult.results.errorCount}</p>
                        )}
                      </div>
                      
                      {/* Skipped Reasons Breakdown */}
                      {importResult.results.skippedReasons && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm font-medium text-blue-900 mb-1">Razlozi preskakanja:</p>
                          <div className="text-xs text-blue-800 space-y-1">
                            {importResult.results.skippedReasons.wrongType > 0 && (
                              <p>• Pogrešan tip leta (Arrival/Departure): {importResult.results.skippedReasons.wrongType}</p>
                            )}
                            {importResult.results.skippedReasons.alreadyExists > 0 && (
                              <p>• Već postoji u bazi: {importResult.results.skippedReasons.alreadyExists}</p>
                            )}
                            {importResult.results.skippedReasons.airlineNotFound > 0 && (
                              <p>• Aviokompanija ne postoji: {importResult.results.skippedReasons.airlineNotFound}</p>
                            )}
                            {importResult.results.skippedReasons.other > 0 && (
                              <p>• Ostali razlozi: {importResult.results.skippedReasons.other}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {importResult.results.errors && importResult.results.errors.length > 0 && (
                        <div className="mt-2 text-xs text-orange-700">
                          <p className="font-medium">Greške:</p>
                          {importResult.results.errors.map((err: string, i: number) => (
                            <p key={i}>• {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Download Template */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">CSV Format</h4>
                    <p className="text-sm text-blue-700">
                      Preuzmi template fajl da vidiš tačan format koji je potreban
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Template
                  </button>
                </div>
              </div>

              {/* Import Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip letova za import
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setImportType('departure')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      importType === 'departure'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Samo odlasci
                  </button>
                  <button
                    onClick={() => setImportType('arrival')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      importType === 'arrival'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Samo dolasci
                  </button>
                  <button
                    onClick={() => setImportType('both')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      importType === 'both'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Oba
                  </button>
                </div>
              </div>

              {/* Delete Options */}
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-3">Opcije brisanja</h4>
                
                <label className="flex items-start gap-3 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteBeforeImport}
                    onChange={(e) => setDeleteBeforeImport(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-red-900">
                      Obriši sve postojeće rasporede prije importa
                    </span>
                    <p className="text-xs text-red-700 mt-1">
                      Ovo će obrisati sve postojeće rasporede pa tek onda importovati nove
                    </p>
                  </div>
                </label>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Brišem...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Obriši sve rasporede odmah
                    </>
                  )}
                </button>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Učitaj CSV fajl
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {csvContent && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Fajl učitan ({csvContent.split('\n').length} redova)
                  </p>
                )}
              </div>

              {/* Preview Section */}
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    Pregled CSV fajla
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-white rounded border">
                      <p className="text-2xl font-bold text-gray-900">{preview.totalRows}</p>
                      <p className="text-xs text-gray-600">Ukupno redova</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                      <p className="text-2xl font-bold text-green-600">{preview.validRows}</p>
                      <p className="text-xs text-gray-600">Validno</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-2xl font-bold text-red-600">{preview.invalidRows}</p>
                      <p className="text-xs text-gray-600">Nevaljano</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-600">{preview.willBeSkipped}</p>
                      <p className="text-xs text-gray-600">Preskočeno</p>
                    </div>
                  </div>

                  {preview.missingAirlines && preview.missingAirlines.length > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900">
                            Aviokompanje koje ne postoje u bazi:
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            {preview.missingAirlines.join(', ')}
                          </p>
                          <p className="text-xs text-orange-600 mt-2">
                            Dodajte ove aviokompanje prije importa ili će biti preskočene
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {preview.samples && preview.samples.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Primjeri:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {preview.samples.map((sample: any, i: number) => (
                          <div key={i} className="text-xs bg-white p-2 rounded border">
                            <p>
                              <span className="font-medium">{sample.airline}</span> →{' '}
                              {sample.destination} ({sample.iataCode}) -{' '}
                              {new Date(sample.date).toLocaleString('bs-BA', { timeZone: 'UTC' })} - {sample.flightType}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.errors && preview.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-900 mb-1">Greške:</p>
                      <div className="space-y-1">
                        {preview.errors.map((err: string, i: number) => (
                          <p key={i} className="text-xs text-red-700">
                            {err}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreview}
                  disabled={!csvContent || previewing}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  {previewing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Pregledam...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Pregled
                    </>
                  )}
                </button>

                <button
                  onClick={handleImport}
                  disabled={!csvContent || importing || !preview || preview.validRows === 0}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Importujem...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Importuj
                    </>
                  )}
                </button>

                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
                >
                  <X className="w-5 h-5" />
                  Zatvori
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
