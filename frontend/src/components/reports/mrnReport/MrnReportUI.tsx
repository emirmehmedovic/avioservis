'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import Spinner from '@/components/ui/Spinner';
import { generateMrnReportPdf } from './MrnReportGenerator';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { FuelIntakeRecord } from '@/types/fuel';
import { MrnReportBalance, FuelOperation } from '@/types/mrnReport';

interface MrnReportUIProps {
  record: FuelIntakeRecord;
}

/**
 * Komponenta za prikaz i generisanje MRN izvještaja za jedan odabrani zapis
 */
const MrnReportUI: React.FC<MrnReportUIProps> = ({ record }) => {
  const [reportData, setReportData] = useState<{
    transactions: FuelOperation[];
    drainedFuel: any[];
    balance: MrnReportBalance;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record && record.id) {
      fetchMrnReportData(record.id);
    }
  }, [record]);

  const fetchMrnReportData = async (mrnId: number) => {
    setLoading(true);
    setError(null);
    try {
      interface MrnReportResponse {
        data: {
          transactionHistory: FuelOperation[];
          drainedFuel: any[];
          balance: MrnReportBalance;
        }
      }
      const response = await fetchWithAuth<MrnReportResponse>(`/api/fuel/intake-records/${mrnId}/mrn-report`);

      setReportData({
        transactions: response.data.transactionHistory || [],
        drainedFuel: response.data.drainedFuel || [],
        balance: response.data.balance || {
          totalIntakeLiters: 0,
          totalOutflowLiters: 0,
          totalDrainedLiters: 0,
          remainingLiters: 0,
        },
      });
    } catch (err) {
      console.error('Greška pri dohvaćanju podataka za MRN izvještaj:', err);
      setError('Greška pri dohvaćanju podataka za MRN izvještaj');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = () => {
    if (!record || !reportData) {
      alert('Podaci za izvještaj nisu dostupni.');
      return;
    }
    
    try {
      generateMrnReportPdf(
        record,
        reportData.transactions,
        reportData.drainedFuel,
        reportData.balance,
      );
    } catch (err) {
      console.error('Greška pri generiranju PDF-a:', err);
      alert('Greška pri generiranju PDF-a');
    }
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('bs-BA');
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Spinner /></div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
        <p>{error}</p>
        <button onClick={() => fetchMrnReportData(record.id)} className="text-red-700 hover:text-red-900">
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold mb-3">Detalji MRN-a: {record.customs_declaration_number}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <p><span className="font-semibold">Datum unosa:</span> {formatDate(record.intake_datetime)}</p>
              <p><span className="font-semibold">Dobavljač:</span> {record.supplier_name || 'N/A'}</p>
              <p><span className="font-semibold">Količina (L):</span> {record.quantity_liters_received.toLocaleString('bs-BA')}</p>
              <p><span className="font-semibold">Količina (kg):</span> {parseFloat(record.quantity_kg_received).toLocaleString('bs-BA', { maximumFractionDigits: 2 })}</p>
              <p><span className="font-semibold">Gustoća:</span> {record.specific_gravity.toLocaleString('bs-BA', { maximumFractionDigits: 4 })}</p>
            </div>
          </div>
          <Button
            onClick={handleGeneratePdf}
            variant="default" 
            className="flex items-center"
            disabled={!reportData || loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generiši PDF
          </Button>
        </div>
      </Card>
      
      {reportData && (
        <>
          <Card>
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3">Sažetak izvještaja</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-semibold">Ukupno izdano (L):</span> {reportData.balance.totalOutflowLiters.toLocaleString('bs-BA')}</p>
                  <p><span className="font-semibold">Ukupno drenirano (L):</span> {reportData.balance.totalDrainedLiters.toLocaleString('bs-BA')}</p>
                </div>
                <div>
                  <p><span className="font-semibold">Preostalo (L):</span> {reportData.balance.remainingLiters.toLocaleString('bs-BA')}</p>
                  <p><span className="font-semibold">Broj operacija:</span> {reportData.transactions.length}</p>
                </div>
              </div>
              
              {reportData.balance.accumulatedLiterVariance !== undefined && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p><span className="font-semibold">Akumulirana varijansa litara:</span>{' '}
                    <Badge variant={reportData.balance.accumulatedLiterVariance > 0.5 ? "destructive" : "default"}>
                      {reportData.balance.accumulatedLiterVariance.toFixed(2)} L
                    </Badge>
                  </p>
                  {reportData.balance.averageDensity !== undefined && (
                    <p className="mb-0"><span className="font-semibold">Prosječna gustoća operacija:</span> {reportData.balance.averageDensity.toFixed(4)} kg/L</p>
                  )}
                </div>
              )}
            </div>
          </Card>
          
          <Card>
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3">Historija transakcija</h2>
              <div className="max-h-[60vh] overflow-y-auto">
                {reportData.transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Registracija</TableHead>
                        <TableHead>Litri</TableHead>
                        <TableHead>Kilogrami</TableHead>
                        <TableHead>Gustoća</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.transactions.map((op: FuelOperation) => (
                        <TableRow key={op.id}>
                          <TableCell>{formatDate(op.date || op.dateTime)}</TableCell>
                          <TableCell>{op.transactionType}</TableCell>
                          <TableCell>{op.aircraft_registration || 'N/A'}</TableCell>
                          <TableCell>{(op.litersTransacted || op.quantity_liters)?.toLocaleString('bs-BA')}</TableCell>
                          <TableCell>{(op.kgTransacted || op.quantity_kg)?.toLocaleString('bs-BA')}</TableCell>
                          <TableCell>{(op.density || op.specific_density)?.toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-gray-500">Nema transakcija za ovaj MRN.</p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default MrnReportUI;