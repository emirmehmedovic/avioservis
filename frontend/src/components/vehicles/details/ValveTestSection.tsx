'use client';

import React, { useState, useEffect } from 'react';
import { ValveTestRecord, ValveTestType } from '@/types/valve';
import { FaEye, FaTrash, FaPlus, FaVial } from 'react-icons/fa';
import { formatDateForDisplay } from './serviceHelpers';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

import { getValveTestRecords, deleteValveTestRecord } from '@/lib/valveTestService';

interface ValveTestSectionProps {
  vehicleId: number;
  onViewTest: (test: ValveTestRecord) => void;
  onAddTest: () => void;
  onTestDeleted: () => void;
}

const ValveTestSection: React.FC<ValveTestSectionProps> = ({
  vehicleId,
  onViewTest,
  onAddTest,
  onTestDeleted
}) => {
  const [valveTests, setValveTests] = useState<ValveTestRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingTestId, setDeletingTestId] = useState<number | null>(null);

  useEffect(() => {
    fetchValveTests();
  }, [vehicleId]);

  const fetchValveTests = async () => {
    try {
      setIsLoading(true);
      const tests = await getValveTestRecords(vehicleId);
      setValveTests(tests);
    } catch (error) {
      console.error('Error fetching valve tests:', error);
      toast.error('Greška pri učitavanju testova ventila');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (window.confirm('Da li ste sigurni da želite obrisati ovaj test ventila?')) {
      try {
        setDeletingTestId(testId);
        await deleteValveTestRecord(testId);
        toast.success('Test ventila uspješno obrisan');
        fetchValveTests();
        onTestDeleted();
      } catch (error) {
        console.error('Error deleting valve test:', error);
        toast.error('Greška pri brisanju testa ventila');
      } finally {
        setDeletingTestId(null);
      }
    }
  };

  const formatTestType = (type: ValveTestType): string => {
    return type === ValveTestType.HECPV ? 'HECPV' : 'ILPCV';
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className="bg-[#8B5CF6]/20 p-2 rounded-xl border border-white/10 shadow-lg mr-3">
            <FaVial className="text-[#8B5CF6] h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Testovi ventila</h3>
            <p className="text-sm text-gray-500">Pregled svih testova ventila za vozilo</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onAddTest}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#8B5CF6] border border-[#8B5CF6]/70 rounded-xl hover:bg-[#8B5CF6]/80 transition-colors shadow-lg"
            title="Dodaj novi test ventila"
          >
            <FaPlus className="mr-1.5" /> Dodaj test
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : valveTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nema testova ventila za ovo vozilo.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip testa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broj vozila</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip crijeva</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max protok</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pritisak</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {valveTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDateForDisplay(test.testDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      test.testType === ValveTestType.HECPV 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {formatTestType(test.testType as ValveTestType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {test.vehicleNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {test.fuelHoseType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {/* test.maxFlowRate !== null ? `${test.maxFlowRate} L/min` : 'N/A' */}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {/* test.pressureReading !== null ? `${test.pressureReading} bar` : 'N/A' */}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onViewTest(test)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      title="Pregledaj test"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Obriši test"
                      disabled={deletingTestId === test.id}
                    >
                      {deletingTestId === test.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ValveTestSection;
