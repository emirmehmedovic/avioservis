'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { motion } from 'framer-motion';

interface DataDisplayProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DataDisplay({ title, value, icon, trend, className }: DataDisplayProps) {
  return (
    <Card className={cn("p-5 relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 z-0"></div>
      {icon && (
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-2xl"></div>
      )}
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {value}
          </h3>
          
          {trend && (
            <motion.div 
              className="flex items-center mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className={cn(
                "text-xs font-medium flex items-center px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "text-green-600 bg-green-500/10 border border-green-500/30" 
                  : "text-red-600 bg-red-500/10 border border-red-500/30"
              )}>
                {trend.isPositive ? (
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5L19 12L12 19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 19L5 12L12 5M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">od prošlog mjeseca</span>
            </motion.div>
          )}
        </div>
        
        {icon && (
          <motion.div 
            className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-500 backdrop-blur-sm border border-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </Card>
  );
}

interface DataGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function DataGrid({ children, columns = 4, className }: DataGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn(
      `grid gap-4 md:gap-6 ${gridCols[columns]}`,
      className
    )}>
      {children}
    </div>
  );
}
