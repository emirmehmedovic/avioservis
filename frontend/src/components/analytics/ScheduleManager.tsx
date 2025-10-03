'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Save,
  Trash2,
  Calendar,
  Plane,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  CreateScheduleData,
  UpdateScheduleData,
  FlightSchedule,
} from '@/services/flightScheduleService';

interface ScheduleManagerProps {
  onScheduleCreated?: (schedule: FlightSchedule) => void;
  onScheduleUpdated?: (schedule: FlightSchedule) => void;
  onScheduleDeleted?: (id: number) => void;
  editSchedule?: FlightSchedule | null;
  onCancelEdit?: () => void;
}

interface Airline {
  id: number;
  name: string;
}

export default function ScheduleManager({
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleDeleted,
  editSchedule,
  onCancelEdit,
}: ScheduleManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateScheduleData>({
    airlineId: 0,
    destination: '',
    flight_number: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    expected_operations: 1,
    notes: '',
  });

  useEffect(() => {
    loadAirlines();
  }, []);

  useEffect(() => {
    if (editSchedule) {
      setFormData({
        airlineId: editSchedule.airlineId,
        destination: editSchedule.destination,
        flight_number: editSchedule.flight_number || '',
        scheduled_date: editSchedule.scheduled_date.split('T')[0],
        expected_operations: editSchedule.expected_operations,
        notes: editSchedule.notes || '',
      });
      setIsOpen(true);
    }
  }, [editSchedule]);

  const loadAirlines = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/airlines', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAirlines(data);
      }
    } catch (error) {
      console.error('Error loading airlines:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.airlineId || !formData.destination || !formData.scheduled_date) {
      setError('Molimo popunite sva obavezna polja');
      return;
    }

    try {
      setLoading(true);

      if (editSchedule) {
        // Update
        const updated = await updateSchedule(editSchedule.id, formData as UpdateScheduleData);
        setSuccessMessage('Raspored uspješno ažuriran!');
        if (onScheduleUpdated) {
          onScheduleUpdated(updated);
        }
        if (onCancelEdit) {
          onCancelEdit();
        }
      } else {
        // Create
        const created = await createSchedule(formData);
        setSuccessMessage('Raspored uspješno kreiran!');
        if (onScheduleCreated) {
          onScheduleCreated(created);
        }
      }

      // Reset form
      setFormData({
        airlineId: 0,
        destination: '',
        flight_number: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        expected_operations: 1,
        notes: '',
      });

      setTimeout(() => {
        setSuccessMessage(null);
        setIsOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Došlo je do greške');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editSchedule) return;
    
    if (!confirm('Da li ste sigurni da želite obrisati ovaj raspored?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteSchedule(editSchedule.id);
      setSuccessMessage('Raspored uspješno obrisan!');
      if (onScheduleDeleted) {
        onScheduleDeleted(editSchedule.id);
      }
      if (onCancelEdit) {
        onCancelEdit();
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Došlo je do greške');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setError(null);
    setSuccessMessage(null);
    setFormData({
      airlineId: 0,
      destination: '',
      flight_number: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      expected_operations: 1,
      notes: '',
    });
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && !editSchedule && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-full bg-blue-600 text-white rounded-xl shadow-sm p-4 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Dodaj novi raspored</span>
        </motion.button>
      )}

      {/* Form */}
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
                  <Calendar className="w-6 h-6 text-blue-600" />
                  {editSchedule ? 'Uredi raspored' : 'Novi raspored'}
                </h3>
                <button
                  onClick={handleCancel}
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
                  <p className="text-sm text-red-800">{error}</p>
                </motion.div>
              )}

              {/* Success Message */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2"
                >
                  <Save className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{successMessage}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Airline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-1">
                        <Plane className="w-4 h-4" />
                        Aviokompanija *
                      </div>
                    </label>
                    <select
                      value={formData.airlineId}
                      onChange={(e) => setFormData({ ...formData, airlineId: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value={0}>Odaberite aviokompaniju</option>
                      {airlines.map((airline) => (
                        <option key={airline.id} value={airline.id}>
                          {airline.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Destinacija *
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="npr. Dortmund, Basel, Memmingen"
                      required
                    />
                  </div>

                  {/* Flight Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Broj leta
                    </label>
                    <input
                      type="text"
                      value={formData.flight_number}
                      onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="npr. W61234"
                    />
                  </div>

                  {/* Scheduled Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Datum *
                      </div>
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Expected Operations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Očekivan broj operacija *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.expected_operations}
                      onChange={(e) =>
                        setFormData({ ...formData, expected_operations: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Napomene
                    </div>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Dodatne informacije..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Sprema se...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editSchedule ? 'Ažuriraj' : 'Spremi'}
                      </>
                    )}
                  </button>

                  {editSchedule && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-5 h-5" />
                      Obriši
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                  >
                    <X className="w-5 h-5" />
                    Otkaži
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



