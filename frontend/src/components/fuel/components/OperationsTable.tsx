import React from 'react';
import { FuelingOperation } from '../types';
import { formatDate } from '../utils/helpers';
import { TrashIcon } from '@heroicons/react/24/outline';

interface OperationsTableProps {
  operations: FuelingOperation[];
  handleRowClick: (operation: FuelingOperation) => void;
  handleDeleteOperation?: (operation: FuelingOperation, e: React.MouseEvent) => void;
}

const OperationsTable: React.FC<OperationsTableProps> = ({ operations, handleRowClick, handleDeleteOperation }) => {
  return (
    <div className="border border-gray-200 rounded-lg" style={{ width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ width: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh', position: 'relative' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', minWidth: '1200px' }} className="divide-y divide-gray-200">
        <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '90px', wordWrap: 'break-word' }}>Datum i Vrijeme</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '80px', wordWrap: 'break-word' }}>Registracija</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '90px', wordWrap: 'break-word' }}>Avio Kompanija</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '80px', wordWrap: 'break-word' }}>Destinacija</th>
            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900" style={{ width: '60px', wordWrap: 'break-word' }}>Tip goriva</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900" style={{ width: '70px', wordWrap: 'break-word' }}>Količina (L)</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900" style={{ width: '60px', wordWrap: 'break-word' }}>Gustoća</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900" style={{ width: '70px', wordWrap: 'break-word' }}>Količina (kg)</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900" style={{ width: '70px', wordWrap: 'break-word' }}>Cijena/kg</th>
            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900" style={{ width: '60px', wordWrap: 'break-word' }}>Rabat (%)</th>
            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900" style={{ width: '50px', wordWrap: 'break-word' }}>Valuta</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '100px', wordWrap: 'break-word' }}>Avio cisterna</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '80px', wordWrap: 'break-word' }}>Broj dostavnice</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '80px', wordWrap: 'break-word' }}>Tip saobraćaja</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" style={{ width: '80px', wordWrap: 'break-word' }}>Operater</th>
            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900" style={{ width: '50px', wordWrap: 'break-word' }}>Akcije</th>
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
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">{formatDate(operation.dateTime)}</td>
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">
                {operation.aircraft_registration || 'N/A (Sistemska letjelica)'}
              </td>
              <td className="px-3 py-4 text-sm font-medium text-gray-900 table-cell-wrap">{operation.airline?.name || 'N/A'}</td>
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">{operation.destination}</td>
              <td className="px-3 py-4 text-sm text-center table-cell-wrap">
                {operation.tank?.fuel_type?.toLowerCase() === 'jet a-1'.toLowerCase() ? (
                  <div className="flex justify-center">
                    <img 
                      src="/JET A-1.svg" 
                      alt="JET A-1" 
                      className="w-10 h-10 object-contain" 
                    />
                  </div>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {operation.tank?.fuel_type || 'N/A'}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.quantity_liters || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} L
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.specific_density || 0).toLocaleString('hr-HR', { minimumFractionDigits: 3 })}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {(operation.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                {operation.discount_percentage ? (
                  <span className="text-indigo-600">{operation.discount_percentage}%</span>
                ) : (
                  <span className="text-gray-400">0%</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-center">
                {operation.currency || 'BAM'}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">
                <span style={{ wordBreak: 'break-word' }}>
                  {operation.tank?.identifier || 'N/A'} - {operation.tank?.name || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">
                {operation.delivery_note_number ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13 3V9H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ wordBreak: 'break-word', width: 'calc(100% - 24px)' }}>
                      {operation.delivery_note_number}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">N/A</span>
                )}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">
                {operation.tip_saobracaja ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" style={{ wordBreak: 'break-word' }}>
                    {operation.tip_saobracaja}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">N/A</span>
                )}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500 table-cell-wrap">{operation.operator_name}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                {handleDeleteOperation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click
                      handleDeleteOperation(operation, e);
                    }}
                    className="p-1.5 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors inline-flex items-center justify-center"
                    title="Obriši operaciju točenja"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default OperationsTable;
