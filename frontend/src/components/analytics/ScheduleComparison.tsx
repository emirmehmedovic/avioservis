'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  AlertTriangle,
  Plane,
  MapPin,
  Clock,
  User,
  Droplet,
  FileText,
} from 'lucide-react';
import { getScheduleComparison, ScheduleComparison as ScheduleComparisonType } from '@/services/flightScheduleService';

interface ScheduleComparisonProps {
  date: string;
}

export default function ScheduleComparison({ date }: ScheduleComparisonProps) {
  const [comparisonData, setComparisonData] = useState<ScheduleComparisonType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (date) {
      loadComparison();
    }
  }, [date]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const data = await getScheduleComparison(date);
      setComparisonData(data);
    } catch (error) {
      console.error('Error loading comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'missing':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'missing':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Kompletno';
      case 'partial':
        return 'Djelimično';
      case 'missing':
        return 'Nedostaje';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Učitavam komparaciju...</p>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Odaberite datum da vidite komparaciju</p>
      </div>
    );
  }

  const formattedDate = new Date(date).toLocaleDateString('bs-BA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{formattedDate}</h3>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{comparisonData.summary.totalScheduled}</p>
            <p className="text-sm text-gray-600">Planirano</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{comparisonData.summary.totalCompleted}</p>
            <p className="text-sm text-gray-600">Kompletno</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{comparisonData.summary.totalPartial}</p>
            <p className="text-sm text-gray-600">Djelimično</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{comparisonData.summary.totalMissing}</p>
            <p className="text-sm text-gray-600">Nedostaje</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{comparisonData.summary.totalUnscheduled}</p>
            <p className="text-sm text-gray-600">Neplanirano</p>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <p className="text-2xl font-bold text-indigo-600">{comparisonData.summary.totalOperations}</p>
            <p className="text-sm text-gray-600">Ukupno op.</p>
          </div>
        </div>
      </div>

      {/* Scheduled Flights */}
      {comparisonData.comparison.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Planirani letovi</h4>
          
          <div className="space-y-4">
            {comparisonData.comparison.map((item, index) => (
              <motion.div
                key={item.schedule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border rounded-lg p-4 ${getStatusColor(item.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Plane className="w-5 h-5 text-gray-700" />
                        <span className="font-semibold text-gray-900">
                          {item.schedule.airline.name}
                        </span>
                      </div>
                      {item.schedule.flight_number && (
                        <span className="px-2 py-1 bg-white rounded text-sm font-mono">
                          {item.schedule.flight_number}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {item.schedule.destination}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(item.schedule.scheduled_date).toLocaleTimeString('bs-BA', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}
                      </div>
                    </div>

                    {item.schedule.notes && (
                      <p className="text-sm text-gray-600 mt-2">{item.schedule.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div className="text-right">
                      <p className="text-sm font-medium">{getStatusLabel(item.status)}</p>
                      <p className="text-xs text-gray-600">
                        {item.realized.count} / {item.schedule.expected_operations} operacija
                      </p>
                    </div>
                  </div>
                </div>

                {/* Realized Operations */}
                {item.realized.operations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Realizovane operacije:
                    </p>
                    <div className="space-y-2">
                      {item.realized.operations.map((op) => (
                        <div
                          key={op.id}
                          className="flex items-center justify-between bg-white rounded p-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-gray-500" />
                              <span>{op.operator_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Droplet className="w-4 h-4 text-blue-500" />
                              <span>{op.quantity_liters.toLocaleString()} L</span>
                            </div>
                          </div>
                          <span className="text-gray-600">
                            {new Date(op.dateTime).toLocaleTimeString('bs-BA', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled Operations */}
      {comparisonData.unscheduled.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Neplanirane operacije
          </h4>
          
          <div className="space-y-3">
            {comparisonData.unscheduled.map((op, index) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-orange-200 bg-orange-50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Plane className="w-5 h-5 text-gray-700" />
                      <span className="font-semibold text-gray-900">
                        {op.airline.name}
                      </span>
                      {op.flight_number && (
                        <span className="px-2 py-1 bg-white rounded text-sm font-mono">
                          {op.flight_number}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {op.destination}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {op.operator_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplet className="w-4 h-4 text-blue-500" />
                        {op.quantity_liters.toLocaleString()} L
                      </div>
                    </div>
                  </div>

                  <span className="text-sm text-gray-600">
                    {new Date(op.dateTime).toLocaleTimeString('bs-BA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {comparisonData.comparison.length === 0 && comparisonData.unscheduled.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nema podataka za ovaj datum</p>
        </div>
      )}
    </div>
  );
}

