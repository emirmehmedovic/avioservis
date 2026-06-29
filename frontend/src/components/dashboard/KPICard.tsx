'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { LucideIcon, ArrowUp, ArrowDown, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  isHero?: boolean;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  loading?: boolean;
  error?: string | null;
  link?: string;
  onRetry?: () => void;
}

const KPICard = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  isHero = false,
  trend,
  loading,
  error,
  link,
  onRetry
}: KPICardProps) => {
  const cardContent = (
    <Card className={`rounded-2xl shadow-md border-0 h-full overflow-hidden ${
      isHero ? 'bg-slate-900' : 'bg-white'
    }`}>
      <CardContent className="p-5">
        {loading ? (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl ${isHero ? 'bg-white/10' : 'bg-slate-100'} animate-pulse`} />
              <div className={`w-8 h-8 rounded-full ${isHero ? 'bg-white/10' : 'bg-slate-100'} animate-pulse`} />
            </div>
            <div className="space-y-2 pt-1">
              <div className={`w-20 h-3 ${isHero ? 'bg-white/10' : 'bg-slate-100'} rounded animate-pulse`} />
              <div className={`w-28 h-9 ${isHero ? 'bg-white/10' : 'bg-slate-100'} rounded animate-pulse`} />
              <div className={`w-24 h-3 ${isHero ? 'bg-white/10' : 'bg-slate-100'} rounded animate-pulse`} />
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            className="space-y-3 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`text-sm font-medium ${isHero ? 'text-red-400' : 'text-red-500'}`}>
              Greška prilikom učitavanja
            </div>
            <p className={`text-xs ${isHero ? 'text-white/50' : 'text-slate-400'}`}>{error}</p>
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className={`mt-2 ${isHero ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-300 text-slate-600'}`}
              >
                <RefreshCw size={14} className="mr-1" />
                Pokušaj ponovo
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Top row: icon + arrow */}
            <div className="flex items-start justify-between mb-5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                isHero ? 'bg-white/15' : iconBgColor
              }`}>
                <Icon className={`h-5 w-5 ${isHero ? 'text-white' : iconColor}`} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                isHero ? 'border-white/20 bg-white/5' : 'border-slate-200 bg-slate-50'
              }`}>
                <ArrowUpRight size={14} className={isHero ? 'text-white/50' : 'text-slate-400'} />
              </div>
            </div>

            {/* Label */}
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
              isHero ? 'text-white/50' : 'text-slate-400'
            }`}>
              {title}
            </p>

            {/* Big number */}
            <div className="flex items-baseline gap-1.5 mb-3">
              <p className={`text-4xl font-bold leading-none ${isHero ? 'text-white' : 'text-slate-900'}`}>
                {typeof value === 'number' ? value.toLocaleString('bs-BA', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1
                }) : value}
              </p>
              {unit && (
                <span className={`text-sm font-medium ${isHero ? 'text-white/50' : 'text-slate-400'}`}>
                  {unit}
                </span>
              )}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className={`text-xs mb-3 ${isHero ? 'text-white/40' : 'text-slate-400'}`}>
                {subtitle}
              </p>
            )}

            {/* Trend badge */}
            {trend && (
              <div className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                trend.direction === 'up'
                  ? isHero
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                  : isHero
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-red-50 text-red-600'
              }`}>
                {trend.direction === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {Math.abs(trend.value).toFixed(1)}% od prošle sedmice
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );

  if (link && !loading && !error) {
    return (
      <Link href={link}>
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="h-full cursor-pointer"
        >
          {cardContent}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={!loading && !error ? { y: -3, transition: { duration: 0.15 } } : {}}
      className="h-full"
    >
      {cardContent}
    </motion.div>
  );
};

export default KPICard;
