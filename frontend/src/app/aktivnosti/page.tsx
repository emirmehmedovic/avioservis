'use client';

import React from 'react';
import ActivityLog from '@/components/activities/ActivityLog';
import { FileText, Clock, AlertCircle } from 'lucide-react';

export default function AktivnostiPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-md bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg p-6 mb-6">
        {/* Subtle red shadows in corners */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 -translate-y-1/2 translate-x-1/4 z-0"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#e53e3e] rounded-full filter blur-3xl opacity-5 translate-y-1/2 -translate-x-1/4 z-0"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div className="flex items-center">
            <div className="mr-4 p-3 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
              <FileText className="h-8 w-8 text-[#e53e3e]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Evidencija Aktivnosti</h1>
              <p className="text-gray-300 mt-1">Prati sve promjene u sistemu</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-black/30 backdrop-blur-md p-4 rounded-xl mb-6 border border-white/10 shadow-lg">
        <div className="flex items-start">
          <div className="p-2 bg-[#4FC3C7]/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg mr-3">
            <AlertCircle className="h-5 w-5 text-[#4FC3C7]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">O evidenciji aktivnosti</h3>
            <p className="text-sm text-white/70 mt-1">
              Ovdje možete pratiti sve aktivnosti korisnika u sistemu. Koristite filtere za pretraživanje specifičnih događaja.
            </p>
          </div>
        </div>
      </div>
      
      <ActivityLog />
    </div>
  );
}
