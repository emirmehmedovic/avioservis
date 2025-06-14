'use client';

import React from 'react';
import { FaExclamationTriangle, FaTimes, FaSpinner } from 'react-icons/fa';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  confirmButtonColor?: string; // e.g., 'bg-red-600 hover:bg-red-700'
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = 'Potvrdi',
  cancelButtonText = 'Otkaži',
  isLoading = false,
  confirmButtonColor = 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity duration-300 ease-in-out" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full mx-4 animate-fadeInScaleUp">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmButtonColor.includes('red') ? 'bg-red-100' : 'bg-blue-100'} sm:mx-0 sm:h-10 sm:w-10`}>
              <FaExclamationTriangle className={`h-6 w-6 ${confirmButtonColor.includes('red') ? 'text-red-600' : 'text-blue-600'}`} aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            disabled={isLoading}
            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed ${isLoading ? 'cursor-wait' : ''} ${confirmButtonColor}`}
            onClick={onConfirm}
          >
            {isLoading ? (
              <FaSpinner className="animate-spin h-5 w-5 mr-2" />
            ) : null}
            {isLoading ? 'Procesiranje...' : confirmButtonText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={onCancel}
          >
            {cancelButtonText}
          </button>
           <button 
            type="button"
            onClick={onCancel} 
            className="absolute top-0 right-0 mt-4 mr-4 text-gray-400 hover:text-gray-600 transition-colors duration-150 ease-in-out disabled:opacity-70"
            disabled={isLoading}
            aria-label="Zatvori"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

// Simple CSS for animations (add to your global CSS or a relevant CSS module)
/*
@keyframes fadeInScaleUp {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeInScaleUp {
  animation: fadeInScaleUp 0.2s ease-out forwards;
}
*/
