import React from 'react';
import { FuelingOperation } from '../types';
import { formatDate } from '../utils/helpers';

interface OperationsTableProps {
  operations: FuelingOperation[];
  handleRowClick: (operation: FuelingOperation) => void;
}

const OperationsTable: React.FC<OperationsTableProps> = ({ operations, handleRowClick }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Datum i Vrijeme</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Registracija</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Avio Kompanija</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Destinacija</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Količina (L)</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Gustoća</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Količina (kg)</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Cijena/kg</th>
            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Valuta</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Avio cisterna</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tip saobraćaja</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Operater</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {operations.map((operation, index) => (
            <tr 
              key={operation.id} 
              onClick={() => handleRowClick(operation)} 
              className={index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'} 
              style={{cursor: 'pointer'}}
            >
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatDate(operation.dateTime)}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 19L13 4.00001L20 14.5L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 4L9.04401 13.1224C9.01443 13.1921 9.01443 13.2685 9.04401 13.3382L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 19L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {operation.aircraft_registration || 'N/A (Sistemska letjelica)'}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{operation.airline.name}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{operation.destination}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-center">
                {operation.currency || 'BAM'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8H21L19 16H5L3 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 8V6C7 4.89543 7.89543 4 9 4H15C16.1046 4 17 4.89543 17 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="17" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {operation.tank?.identifier || 'N/A'} - {operation.tank?.name || 'N/A'}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {operation.tip_saobracaja ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {operation.tip_saobracaja}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">N/A</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{operation.operator_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OperationsTable;
