'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Fuel, 
  DollarSign, 
  Activity 
} from 'lucide-react';

interface AnalyticsLoaderProps {
  type?: 'weekly' | 'monthly' | 'custom';
  message?: string;
}

export default function AnalyticsLoader({ 
  type = 'weekly', 
  message 
}: AnalyticsLoaderProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'weekly':
        return {
          title: 'Učitavam sedmičnu analizu...',
          icon: Calendar,
          color: 'blue'
        };
      case 'monthly':
        return {
          title: 'Učitavam mjesečnu analizu...',
          icon: BarChart3,
          color: 'purple'
        };
      case 'custom':
        return {
          title: 'Učitavam prilagođenu analizu...',
          icon: TrendingUp,
          color: 'green'
        };
      default:
        return {
          title: 'Učitavam analizu...',
          icon: BarChart3,
          color: 'blue'
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Main Loader */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center"
        >
          {/* Animated Icon */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className={`w-16 h-16 mx-auto mb-6 p-4 rounded-full bg-${config.color}-100`}
          >
            <IconComponent className={`w-8 h-8 text-${config.color}-600`} />
          </motion.div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {config.title}
          </h3>

          {/* Message */}
          {message && (
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <motion.div
              className={`h-2 bg-${config.color}-600 rounded-full`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut",
                repeatType: "reverse"
              }}
            />
          </div>

          {/* Loading Steps */}
          <div className="space-y-3">
            {[
              { icon: Fuel, label: 'Učitavam podatke o potrošnji...', delay: 0 },
              { icon: DollarSign, label: 'Analiziram prihode...', delay: 0.5 },
              { icon: Activity, label: 'Generiram chart-ove...', delay: 1 },
              { icon: TrendingUp, label: 'Računam trendove...', delay: 1.5 }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.delay }}
                className="flex items-center gap-3 text-sm text-gray-600"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    delay: step.delay 
                  }}
                >
                  <step.icon className="w-4 h-4" />
                </motion.div>
                <span>{step.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Skeleton Cards Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 grid grid-cols-2 gap-4"
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Compact loader for inline use
export function CompactAnalyticsLoader({ 
  message = 'Učitavam...' 
}: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 mx-auto mb-4"
        >
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </motion.div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Skeleton loader for charts
export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="animate-pulse">
        {/* Header */}
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        
        {/* Chart Area */}
        <div className="h-80 bg-gray-100 rounded-lg flex items-end justify-center gap-2 p-4">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-gray-200 rounded-t"
              style={{ 
                width: '40px',
                height: `${Math.random() * 200 + 50}px`
              }}
              animate={{ 
                height: [`${Math.random() * 200 + 50}px`, `${Math.random() * 200 + 50}px`]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: i * 0.1 
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
