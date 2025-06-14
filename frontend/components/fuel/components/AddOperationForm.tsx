import React from 'react';
import { AirlineFE, FuelTankFE, FuelingOperationFormData } from '../types';

interface AddOperationFormProps {
  formData: FuelingOperationFormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleAddOperation: (e: React.FormEvent) => void;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  modalAvailableDestinations: string[];
  airlines: AirlineFE[];
  tanks: FuelTankFE[];
  onCancel: () => void;
}

const AddOperationForm: React.FC<AddOperationFormProps> = ({
  formData,
  handleInputChange,
  handleAddOperation,
  selectedFiles,
  setSelectedFiles,
  modalAvailableDestinations,
  airlines,
  tanks,
  onCancel
}) => {
  return (
    <form onSubmit={handleAddOperation}>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700">
            Datum i Vrijeme
          </label>
          <div className="mt-1">
            <input
              type="datetime-local"
              name="dateTime"
              id="dateTime"
              value={formData.dateTime}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="aircraft_registration" className="block text-sm font-medium text-gray-700">
            Registracija Aviona
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="aircraft_registration"
              id="aircraft_registration"
              value={formData.aircraft_registration}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="flight_number" className="block text-sm font-medium text-gray-700">
            Broj Leta
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="flight_number"
              id="flight_number"
              value={formData.flight_number}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label htmlFor="airlineId" className="block text-sm font-medium text-gray-700">Avio Kompanija</label>
          <div className="mt-1">
            <select
              id="airlineId"
              name="airlineId"
              value={formData.airlineId}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            >
              <option value="">Odaberite avio kompaniju</option>
              {airlines.map((airline) => (
                <option key={airline.id} value={airline.id}>
                  {airline.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700">Destinacija</label>
          <div className="mt-1">
            {(modalAvailableDestinations || []).length > 0 ? (
              <select
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              >
                <option value="">Odaberite destinaciju</option>
                {(modalAvailableDestinations || []).map((dest) => (
                  <option key={dest} value={dest}>
                    {dest}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="destination"
                id="destination"
                value={formData.destination}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
                placeholder="Unesite destinaciju ručno"
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="tankId" className="block text-sm font-medium text-gray-700">
            Tanker
          </label>
          <div className="mt-1">
            <select
              id="tankId"
              name="tankId"
              value={formData.tankId}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            >
              <option value="">Odaberite tanker</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id} disabled={tank.current_liters <= 0}>
                  {tank.identifier} - {tank.name} ({tank.current_liters.toLocaleString('hr-HR')} L)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="quantity_liters" className="block text-sm font-medium text-gray-700">
            Količina (litara)
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="quantity_liters"
              id="quantity_liters"
              min="0"
              step="0.01"
              value={formData.quantity_liters}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="specific_density" className="block text-sm font-medium text-gray-700">
            Specifična gustoća
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="specific_density"
              id="specific_density"
              min="0.1"
              step="0.01"
              value={formData.specific_density}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="quantity_kg" className="block text-sm font-medium text-gray-700">
            Količina (kg)
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="quantity_kg"
              id="quantity_kg"
              min="0"
              step="0.01"
              value={formData.quantity_kg}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="price_per_kg" className="block text-sm font-medium text-gray-700">
            Cijena po kilogramu
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="price_per_kg"
              id="price_per_kg"
              min="0"
              step="0.01"
              value={formData.price_per_kg}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Valuta plaćanja
          </label>
          <div className="mt-1">
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            >
              <option value="BAM">BAM (Konvertibilna marka)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (Američki dolar)</option>
            </select>
          </div>
        </div>

        <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ukupan iznos plaćanja
          </label>
          <div className="text-2xl font-bold text-gray-900 flex items-center justify-between">
            <span>{(formData.total_amount || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-lg font-medium text-gray-500">{formData.currency}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Izračunato na osnovu: {(formData.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg × {(formData.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} {formData.currency}/kg
          </p>
        </div>

        <div>
          <label htmlFor="tip_saobracaja" className="block text-sm font-medium text-gray-700">
            Tip Saobraćaja
          </label>
          <div className="mt-1">
            <select
              id="tip_saobracaja"
              name="tip_saobracaja"
              value={formData.tip_saobracaja}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            >
              <option value="Izvoz">Izvoz</option>
              <option value="Unutarnji saobraćaj">Unutarnji saobraćaj</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="operator_name" className="block text-sm font-medium text-gray-700">
            Ime Operatera
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="operator_name"
              id="operator_name"
              value={formData.operator_name}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Napomene
          </label>
          <div className="mt-1">
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="document" className="block text-sm font-medium text-gray-700">
            Dokumenti (Opcionalno)
          </label>
          <div className="mt-1">
            <input
              type="file"
              name="document"
              id="document"
              onChange={handleInputChange}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
              multiple
            />
            <p className="mt-1 text-xs text-gray-500">Možete odabrati više dokumenata odjednom</p>
          </div>
          {(selectedFiles || []).length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Odabrani dokumenti:</p>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded mb-1">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-500 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="rgba(99, 102, 241, 0.1)"/>
                        <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Odustani
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Spremi
        </button>
      </div>
    </form>
  );
};

export default AddOperationForm;
