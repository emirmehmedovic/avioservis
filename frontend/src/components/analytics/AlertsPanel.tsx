'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Activity,
  DollarSign,
  X,
  ChevronRight
} from 'lucide-react';

export interface AnomalyAlert {
  id: string;
  type: 'destination_decline' | 'airline_decline' | 'volume_spike' | 'volume_drop' | 'revenue_anomaly' | 'operational_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntity: {
    type: 'destination' | 'airline' | 'overall';
    id?: number;
    name: string;
  };
  metrics: {
    current: number;
    previous: number;
    changePercent: number;
    threshold: number;
  };
  detectedAt: Date;
  recommendations: string[];
}

export interface AlertsPanelProps {
  alerts: AnomalyAlert[];
  onDismissAlert?: (alertId: string) => void;
  onViewDetails?: (alert: AnomalyAlert) => void;
  className?: string;
}

const ALERT_TYPE_CONFIG = {
  destination_decline: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Pad destinacije'
  },
  airline_decline: {
    icon: TrendingDown,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Pad aviokompanje'
  },
  volume_spike: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Rast volumena'
  },
  volume_drop: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Pad volumena'
  },
  revenue_anomaly: {
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Anomalija prometa'
  },
  operational_anomaly: {
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Operacijska anomalija'
  }
};

const SEVERITY_CONFIG = {
  critical: {
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: 'Kritično',
    priority: 4
  },
  high: {
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    label: 'Visoko',
    priority: 3
  },
  medium: {
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    label: 'Srednje',
    priority: 2
  },
  low: {
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    label: 'Nisko',
    priority: 1
  }
};

export default function AlertsPanel({ 
  alerts, 
  onDismissAlert, 
  onViewDetails,
  className = '' 
}: AlertsPanelProps) {
  
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('bs-BA').format(Math.round(num));
  };

  const formatGrowth = (growth: number): string => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sortiranje po severity i datumu
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityDiff = SEVERITY_CONFIG[b.severity].priority - SEVERITY_CONFIG[a.severity].priority;
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  if (alerts.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nema aktivnih upozorenja</h3>
          <p className="text-gray-600">
            Svi pokazatelji su u normalnim okvirima. Sistem kontinuirano prati anomalije.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Upozorenja ({alerts.length})
            </h3>
          </div>
          
          {/* Summary by severity */}
          <div className="flex items-center space-x-2">
            {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
              const count = alerts.filter(alert => alert.severity === severity).length;
              if (count === 0) return null;
              
              return (
                <div
                  key={severity}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                >
                  {count} {config.label.toLowerCase()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <div className="p-6 space-y-4">
          {sortedAlerts.map((alert, index) => {
            const typeConfig = ALERT_TYPE_CONFIG[alert.type];
            const severityConfig = SEVERITY_CONFIG[alert.severity];
            const TypeIcon = typeConfig.icon;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-lg p-4 ${severityConfig.borderColor} ${severityConfig.bgColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                      <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {alert.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig.bgColor} ${severityConfig.color}`}>
                          {severityConfig.label}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.description}
                      </p>
                      
                      {/* Metrics */}
                      <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                        <span>
                          <strong>Entitet:</strong> {alert.affectedEntity.name}
                        </span>
                        <span>
                          <strong>Promjena:</strong> {formatGrowth(alert.metrics.changePercent)}
                        </span>
                        <span>
                          <strong>Trenutno:</strong> {formatNumber(alert.metrics.current)}
                        </span>
                        <span>
                          <strong>Prethodno:</strong> {formatNumber(alert.metrics.previous)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Otkriveno: {formatDate(alert.detectedAt)}
                      </div>
                      
                      {/* Recommendations preview */}
                      {alert.recommendations.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          <strong>Preporuka:</strong> {alert.recommendations[0]}
                          {alert.recommendations.length > 1 && (
                            <span className="text-gray-500"> (+{alert.recommendations.length - 1} više)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(alert)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Prikaži detalje"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    
                    {onDismissAlert && (
                      <button
                        onClick={() => onDismissAlert(alert.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Odbaci upozorenje"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {alerts.length > 5 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Prikaži sva upozorenja ({alerts.length})
          </button>
        </div>
      )}
    </div>
  );
}
