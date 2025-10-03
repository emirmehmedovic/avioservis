'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Plane,
  MapPin,
  Clock,
} from 'lucide-react';
import { getMonthSchedules, MonthScheduleData, FlightSchedule } from '@/services/flightScheduleService';

interface ScheduleCalendarProps {
  airlineId?: number;
  onDateSelect?: (date: string) => void;
}

export default function ScheduleCalendar({ airlineId, onDateSelect }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState<MonthScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadMonthData();
  }, [currentDate, airlineId]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await getMonthSchedules(year, month, airlineId);
      setMonthData(data);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; currentMonth: boolean }> = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        currentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        currentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        currentMonth: false,
      });
    }

    return days;
  };

  const getDayData = (date: Date) => {
    if (!monthData) return null;
    
    // Use UTC date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    return monthData.dailyData.find((d) => {
      const dDate = new Date(d.date);
      const dYear = dDate.getUTCFullYear();
      const dMonth = String(dDate.getUTCMonth() + 1).padStart(2, '0');
      const dDay = String(dDate.getUTCDate()).padStart(2, '0');
      return `${dYear}-${dMonth}-${dDay}` === dateKey;
    });
  };

  const getDayStatus = (date: Date) => {
    const dayData = getDayData(date);
    if (!dayData) return null;

    const { schedules, operations } = dayData;
    if (schedules.length === 0) return null;

    const expectedOps = schedules.reduce((sum, s) => sum + s.expected_operations, 0);
    const realizedOps = operations.length;

    if (realizedOps >= expectedOps) return 'completed';
    if (realizedOps > 0) return 'partial';
    return 'missing';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    setSelectedDate(dateStr);
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
  };

  const monthName = currentDate.toLocaleDateString('bs-BA', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            {monthName}
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Danas
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stats */}
        {monthData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{monthData.stats.totalSchedules}</p>
              <p className="text-sm text-gray-600">Planirano</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{monthData.stats.totalRealizedOperations}</p>
              <p className="text-sm text-gray-600">Realizovano</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {monthData.stats.realizationRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Realizacija</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{monthData.stats.totalExpectedOperations}</p>
              <p className="text-sm text-gray-600">Očekivano</p>
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Učitavam...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayData = getDayData(day.date);
              const status = getDayStatus(day.date);
              const today = isToday(day.date);

              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => day.currentMonth && handleDateClick(day.date)}
                  disabled={!day.currentMonth}
                  className={`
                    relative aspect-square rounded-lg p-2 transition-all
                    ${!day.currentMonth ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    ${today ? 'ring-2 ring-blue-500' : ''}
                    ${status === 'completed' ? 'bg-green-100 hover:bg-green-200' : ''}
                    ${status === 'partial' ? 'bg-yellow-100 hover:bg-yellow-200' : ''}
                    ${status === 'missing' ? 'bg-red-100 hover:bg-red-200' : ''}
                    ${!status && day.currentMonth ? 'bg-gray-50 hover:bg-gray-100' : ''}
                  `}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {day.date.getDate()}
                  </div>

                  {dayData && (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-xs text-gray-600">
                        {dayData.schedules.length} plan
                      </div>
                      <div className="text-xs text-gray-600">
                        {dayData.operations.length} real
                      </div>
                    </div>
                  )}

                  {status && (
                    <div className="absolute top-1 right-1">
                      {status === 'completed' && <Check className="w-4 h-4 text-green-600" />}
                      {status === 'partial' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                      {status === 'missing' && <X className="w-4 h-4 text-red-600" />}
                    </div>
                  )}

                  {today && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded border border-green-300"></div>
            <span className="text-sm text-gray-600">Kompletno realizovano</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-100 rounded border border-yellow-300"></div>
            <span className="text-sm text-gray-600">Djelimično realizovano</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 rounded border border-red-300"></div>
            <span className="text-sm text-gray-600">Nije realizovano</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-50 rounded border border-gray-300"></div>
            <span className="text-sm text-gray-600">Nema plana</span>
          </div>
        </div>
      </div>
    </div>
  );
}

