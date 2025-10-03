'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plane,
  TrendingUp,
  Clock,
  RefreshCw,
} from 'lucide-react';
import ScheduleCalendar from './ScheduleCalendar';
import ScheduleComparison from './ScheduleComparison';
import ScheduleManager from './ScheduleManager';
import ScheduleCSVImport from './ScheduleCSVImport';
import ScheduleStatistics from './ScheduleStatistics';

export default function ScheduleTab() {
  const [selectedAirlineId, setSelectedAirlineId] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [airlines, setAirlines] = useState<Array<{ id: number; name: string }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadAirlines();
  }, []);

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

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleScheduleCreated = () => {
    handleRefresh();
  };

  const handleScheduleUpdated = () => {
    handleRefresh();
  };

  const handleScheduleDeleted = () => {
    handleRefresh();
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
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Raspored letenja</h2>
                <p className="text-blue-100 mt-1">
                  Planirajte i pratite realizaciju operacija točenja goriva
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-5 h-5" />
                  <span className="text-sm font-medium">Planiranje</span>
                </div>
                <p className="text-sm text-blue-100">
                  Unesite rasporede letenja po kompanijama i destinacijama
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Praćenje</span>
                </div>
                <p className="text-sm text-blue-100">
                  Pratite realizaciju u odnosu na planirane operacije
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">Analiza</span>
                </div>
                <p className="text-sm text-blue-100">
                  Analizirajte statistiku i trendove realizacije
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter po aviokompaniji
            </label>
            <select
              value={selectedAirlineId || ''}
              onChange={(e) =>
                setSelectedAirlineId(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sve aviokompanje</option>
              {airlines.map((airline) => (
                <option key={airline.id} value={airline.id}>
                  {airline.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            {selectedAirlineId && (
              <button
                onClick={() => setSelectedAirlineId(undefined)}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Poništi filter
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Schedule Manager & CSV Import */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ScheduleManager
            onScheduleCreated={handleScheduleCreated}
            onScheduleUpdated={handleScheduleUpdated}
            onScheduleDeleted={handleScheduleDeleted}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <ScheduleCSVImport onImportComplete={handleRefresh} />
        </motion.div>
      </div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        key={`calendar-${refreshKey}`}
      >
        <ScheduleCalendar airlineId={selectedAirlineId} onDateSelect={setSelectedDate} />
      </motion.div>

      {/* Comparison for Selected Date */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          key={`comparison-${selectedDate}-${refreshKey}`}
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Detaljna komparacija</h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Zatvori
              </button>
            </div>
            <ScheduleComparison date={selectedDate} />
          </div>
        </motion.div>
      )}

      {/* Statistics Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        key={`statistics-${refreshKey}`}
      >
        <ScheduleStatistics 
          selectedDate={selectedDate || undefined} 
          airlineId={selectedAirlineId} 
        />
      </motion.div>

      {/* Instructions */}
      {!selectedDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6"
        >
          <h4 className="font-semibold text-blue-900 mb-3">Kako koristiti raspored:</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-medium">1.</span>
              <span>
                Kliknite na "Dodaj novi raspored" da unesete planirane letove sa očekivanim brojem
                operacija točenja
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">2.</span>
              <span>
                Kalendar prikazuje status realizacije - zeleno (kompletno), žuto (djelimično),
                crveno (nerealizovano)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">3.</span>
              <span>
                Kliknite na datum u kalendaru da vidite detaljnu komparaciju planiranih i
                realizovanih operacija
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">4.</span>
              <span>
                Filtrirajte po aviokompaniji da vidite specifične rasporede i statistiku
              </span>
            </li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}

