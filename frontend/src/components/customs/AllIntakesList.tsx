"use client";

import { useState, useEffect, useCallback } from 'react';
import { getAllFixedTankIntakesList } from '@/lib/apiService';
import type { TankTransaction } from '@/types/fuel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AllIntakesListProps {
  startDate?: string;
  endDate?: string;
  title?: string;
  showDateFilterInfo?: boolean;
}

export default function AllIntakesList({
  startDate,
  endDate,
  title = "Lista Svih Prijema Goriva u Fiksne Rezervoare",
  showDateFilterInfo = true,
}: AllIntakesListProps) {
  const [intakeList, setIntakeList] = useState<TankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const { authToken } = useAuth();

  const fetchIntakes = useCallback(async () => {
    if (!authToken) {
      setError("Autentifikacija neophodna.");
      setIsLoading(false);
      return;
    }
    if (!startDate || !endDate) {
      // setError("Molimo odaberite period za prikaz.");
      // setIsLoading(false);
      // setIntakeList([]); // Clear list if dates are not set
      // return;
      // Or fetch all if no dates are provided - depends on desired behavior
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllFixedTankIntakesList(startDate, endDate);
      setIntakeList(data || []);
      
      // Calculate total quantity
      const total = data?.reduce((sum, transaction) => sum + transaction.quantityLiters, 0) || 0;
      setTotalQuantity(total);
    } catch (err: any) {
      setError(err.message || 'Greška pri dohvatu liste prijema.');
      setIntakeList([]);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) { // Only fetch if dates are provided
        fetchIntakes();
    }
  }, [fetchIntakes, startDate, endDate]);

  return (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h3>
      {showDateFilterInfo && startDate && endDate && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Prikazani su svi prijemi za period od {format(new Date(startDate), 'dd.MM.yyyy')} do {format(new Date(endDate), 'dd.MM.yyyy')}.
          </p>
          {!isLoading && !error && intakeList.length > 0 && (
            <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-md">
              <p className="font-medium text-indigo-800 dark:text-indigo-300">
                Ukupna količina primljenog goriva: <span className="font-bold">{totalQuantity.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} litara</span>
              </p>
            </div>
          )}
        </div>
      )}
       {showDateFilterInfo && (!startDate || !endDate) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Molimo odaberite period za prikaz prijema.
        </p>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center justify-center text-gray-500 dark:text-gray-400 py-3">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Dohvaćam listu prijema...</span>
        </div>
      )}
      {error && !isLoading && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400 rounded-md">
          <p>Greška: {error}</p>
        </div>
      )}
      {!isLoading && !error && intakeList.length === 0 && startDate && endDate && (
        <p className="mt-4 text-gray-500 dark:text-gray-400 py-3">Nema podataka o prijemu za odabrani period.</p>
      )}
      {!isLoading && !error && intakeList.length > 0 && (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Rezervoar</TableHead>
              <TableHead className="text-right">Količina (L)</TableHead>
              <TableHead>Dokument</TableHead>
              <TableHead>Napomena</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {intakeList.map((transaction, index) => (
              <TableRow key={`${transaction.id}-${index}-${transaction.transaction_datetime}`}>
                <TableCell>{format(new Date(transaction.transaction_datetime), 'dd.MM.yyyy HH:mm')}</TableCell>
                <TableCell>{transaction.tankName || transaction.sourceOrDestination}</TableCell>
                <TableCell className="text-right">{parseFloat(String(transaction.quantityLiters)).toFixed(2)}</TableCell>
                <TableCell>{transaction.relatedDocument}</TableCell>
                <TableCell>{transaction.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot>
            <TableRow className="font-medium">
              <TableCell colSpan={2} className="text-right">Ukupno:</TableCell>
              <TableCell className="text-right">{totalQuantity.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </tfoot>
        </Table>
      )}
    </div>
  );
}
