import React, { useState, useEffect } from 'react';
import { FuelPriceRule } from '@/types/fuel'; // Assuming global type
import { AirlineFE, FuelTankFE, FuelingOperationFormData } from '../types';

// Prošireni tip za FuelingOperationFormData koji uključuje usd_exchange_rate
interface ExtendedFuelingOperationFormData extends FuelingOperationFormData {
  usd_exchange_rate?: string;
}

interface AddOperationFormProps {
  fuelPriceRules: FuelPriceRule[];
  formData: ExtendedFuelingOperationFormData;
  textInputs?: {
    quantity_liters: string;
    quantity_kg: string;
    price_per_kg: string;
    discount_percentage: string;
  };
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
  textInputs = {
    quantity_liters: '',
    quantity_kg: '',
    price_per_kg: '',
    discount_percentage: ''
  },
  handleInputChange,
  handleAddOperation,
  selectedFiles,
  setSelectedFiles,
  modalAvailableDestinations,
  airlines,
  tanks,
  onCancel,
  fuelPriceRules // Destructure new prop
}) => {
  const [suggestedPrice, setSuggestedPrice] = useState<string | null>(null);
  const [isPriceManuallySet, setIsPriceManuallySet] = useState<boolean>(false);
  const [priceRuleMessage, setPriceRuleMessage] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  // useEffect for price suggestion
  useEffect(() => {
    if (formData.airlineId && formData.currency && !isPriceManuallySet && fuelPriceRules && fuelPriceRules.length > 0) {
      const rule = fuelPriceRules.find(
        (r: FuelPriceRule) => r.airlineId === parseInt(formData.airlineId) && r.currency.toUpperCase() === formData.currency.toUpperCase()
      );
      if (rule) {
        const priceFromRule = rule.price.toString(); // Assuming price is Decimal or number
        setSuggestedPrice(priceFromRule);
        handleInputChange({
          target: {
            name: 'price_per_kg',
            value: priceFromRule,
          },
        } as React.ChangeEvent<HTMLInputElement>); 
        setPriceRuleMessage(`Automatska cijena: ${priceFromRule} ${formData.currency} (prema pravilu).`);
      } else {
        setSuggestedPrice(null);
        setPriceRuleMessage('Nema pravila za odabranu avio-kompaniju i valutu. Unesite cijenu ručno.');
      }
    } else if (formData.airlineId && formData.currency && !isPriceManuallySet && (!fuelPriceRules || fuelPriceRules.length === 0)) {
      // This case handles when airline and currency are selected, but rules are missing or empty
      setSuggestedPrice(null);
      setPriceRuleMessage('Pravila o cijenama nisu dostupna ili su prazna. Unesite cijenu ručno.');
    } else if (!formData.airlineId || !formData.currency) {
      setSuggestedPrice(null);
      setPriceRuleMessage('Odaberite avio-kompaniju i valutu za prijedlog cijene.');
    }
  }, [formData.airlineId, formData.currency, fuelPriceRules || [], isPriceManuallySet]); // Removed handleInputChange to break potential loop

  // Reset manual flag if airline or currency changes
  useEffect(() => {
    setIsPriceManuallySet(false);
    // When airline/currency changes, if a price was manually set, it might be good to clear the message
    // or re-evaluate. The main useEffect will handle re-evaluation.
  }, [formData.airlineId, formData.currency]);

  // Napomena: Uklonjen je useEffect za postavljanje kursa pri promjeni valute
  // jer je ta logika sada direktno u onChange handleru dropdown menija za valutu

  const handleSubmitWrapper = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null); // Reset error on new submission

    const selectedTank = tanks.find(tank => tank.id === parseInt(formData.tankId));
    const quantityKg = parseFloat(textInputs.quantity_kg);

    if (selectedTank && quantityKg > 0) {
      const availableKg = Number(selectedTank.current_kg || 0);
      if (quantityKg > availableKg) {
        setCustomError(`Nedovoljno goriva u cisterni. Traženo: ${quantityKg.toFixed(2)} kg, Dostupno: ${availableKg.toFixed(2)} kg.`);
        return;
      }
    }

    handleAddOperation(e);
  };

  return (
    <form onSubmit={handleSubmitWrapper} className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        {customError && (
          <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
            <span className="font-medium">Greška prilikom validacije:</span> {customError}
          </div>
        )}
    
        
        {/* Main form content */}
        <div className="space-y-8">
          {/* Flight Information Section */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Informacije o Letu
            </h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      required
                      placeholder="Unesite destinaciju ručno"
                    />
                  )}
                </div>
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  >
                    <option value="Izvoz">Izvoz</option>
                    <option value="Unutarnji saobraćaj">Unutarnji saobraćaj</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {/* Fuel Information Section */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Informacije o Gorivu
            </h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Odaberite tanker</option>
                    {tanks.map((tank) => {
                      // Izračunaj približne kg na osnovi litara i standardne gustoće 0.8 (ako nemamo current_kg)
                      const tankKg = tank.current_kg !== undefined ? 
                        tank.current_kg : 
                        (tank.current_liters || 0) * 0.8;

                      return (
                        <option key={tank.id} value={tank.id} disabled={(tank.current_liters || 0) <= 0}>
                          {tank.identifier} - {tank.name} ({Number(tankKg).toFixed(1)} kg | {Number(tank.current_liters || 0).toFixed(1)} L)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* PRIORITET: Prvo prikazujemo polje za kilograme */}
              <div>
                <label htmlFor="quantity_kg" className="flex items-center text-sm font-medium text-gray-700">
                  Količina goriva (kg) <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Prioritet</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="quantity_kg"
                    id="quantity_kg"
                    step="0.01"
                    min="0"
                    placeholder="npr. 0.55"
                    value={textInputs.quantity_kg}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-indigo-700 border-2 rounded-md pr-12"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-indigo-700 font-medium sm:text-sm">kg</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-indigo-700">Unesite stvarnu masu goriva u kilogramima</p>
              </div>

              <div>
                <label htmlFor="quantity_liters" className="block text-sm font-medium text-gray-500">
                  Količina goriva (litara)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="quantity_liters"
                    id="quantity_liters"
                    step="0.01"
                    min="0"
                    placeholder="npr. 0.55"
                    value={textInputs.quantity_liters}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md pr-12"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">L</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Unesite količinu goriva u litrama</p>
              </div>

              <div>
                <label htmlFor="specific_density" className="block text-sm font-medium text-gray-700">
                  Specifična gustoća (kg/L)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="specific_density"
                    id="specific_density"
                    min="0.1"
                    step="0.001"
                    value={isNaN(formData.specific_density) ? '0.000' : formData.specific_density.toFixed(3)}
                    readOnly
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    title="Automatski izračunato iz količine u kg i litrama"
                  />
                  <p className="mt-1 text-xs text-gray-500">Specifična gustoća se automatski izračunava na osnovu odnosa kg i litara</p>
                </div>
              </div>

              {/* Polje za litre sada se nalazi iznad polja za specifičnu gustoću */}
            </div>
          </div>
          {/* Currency and Price Section - Highlighted */}
          <div className="bg-yellow-100 p-4 rounded-md my-4">
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Valuta</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency || ''} // Handle undefined value
                  onChange={(e) => {
                    console.log('Currency dropdown changed to:', e.target.value);
                    
                    // Samo pozovemo handleInputChange da ažurira formData
                    // Parent komponenta će se pobrinuti za postavljanje exchange rate
                    handleInputChange(e);
                    
                    // Reset manual flag on currency change
                    setIsPriceManuallySet(false);
                  }}
                  className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="">Odaberite valutu</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="BAM">BAM</option>
                  {/* Add other currencies as needed */}
                </select>
              </div>
              
              {/* USD Exchange Rate - Only shown when USD is selected */}
              {formData.currency === 'USD' && (
                <div>
                  <label htmlFor="usd_exchange_rate" className="block text-sm font-medium text-gray-700">
                    Kurs USD u BAM
                    <span className="ml-1 text-xs text-gray-500">(npr. 1.85)</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="usd_exchange_rate"
                      id="usd_exchange_rate"
                      value={(formData as any).usd_exchange_rate || ''}
                      onChange={handleInputChange}
                      placeholder="Unesite trenutni kurs"
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      required={formData.currency === 'USD'}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Unesite trenutni kurs konverzije USD u BAM</p>
                </div>
              )}
              
              {/* EUR Exchange Rate - Hidden but automatically set */}
              {formData.currency === 'EUR' && (
                <div>
                  <input
                    type="hidden"
                    name="usd_exchange_rate"
                    id="usd_exchange_rate"
                    value="1.955830"
                  />
                </div>
              )}
              {/* Price Rule Message Display */}
              {priceRuleMessage && (
                <div className="mt-3 text-sm col-span-1 md:col-span-2"> 
                  {!suggestedPrice && priceRuleMessage.includes("Nema pravila") ? (
                    <p className="text-orange-600 p-2 bg-orange-50 rounded-md flex items-center">
                      <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.031-1.742 3.031H4.42c-1.526 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.75a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" clipRule="evenodd"></path></svg>
                      {priceRuleMessage}
                    </p>
                  ) : priceRuleMessage.includes("Pravila o cijenama nisu dostupna") ? (
                    <p className="text-gray-600 p-2 bg-gray-100 rounded-md flex items-center">
                      <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                      {priceRuleMessage}
                    </p>
                  ) : suggestedPrice ? (
                    <p className="text-green-600 p-2 bg-green-50 rounded-md flex items-center">
                        <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                      {priceRuleMessage}
                    </p>
                  ) : (
                    <p className="text-blue-600 p-2 bg-blue-50 rounded-md flex items-center">
                      <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                      {priceRuleMessage} 
                    </p>
                  )}
                </div>
              )}
              {isPriceManuallySet && suggestedPrice && suggestedPrice !== textInputs.price_per_kg && (
                <div className="mt-2 col-span-1 md:col-span-2"> 
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange({ target: { name: 'price_per_kg', value: suggestedPrice } } as React.ChangeEvent<HTMLInputElement>);
                        setIsPriceManuallySet(false);
                        setPriceRuleMessage(`Automatska cijena: ${suggestedPrice} ${formData.currency} (vraćeno na pravilo).`);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium p-2 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors w-full text-left flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      Koristi automatsku cijenu ({suggestedPrice} {formData.currency})
                    </button>
              </div>
              )}
            </div>
          </div>



          {/* Payment Information Section */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informacije o Plaćanju
            </h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div>
                <label htmlFor="price_per_kg" className="block text-sm font-medium text-gray-700">
                  Cijena po kilogramu
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="price_per_kg"
                    id="price_per_kg"
                    pattern="^\d*(\.\d{0,5})?$"
                    placeholder="npr. 0.55"
                    value={textInputs.price_per_kg}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md pr-12"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{formData.currency}</span>
                  </div>
                </div>

              </div>

              <div>
                <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700">
                  Rabat (%)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="discount_percentage"
                    id="discount_percentage"
                    pattern="^\d*(\.\d{0,2})?$"
                    placeholder="0"
                    value={textInputs.discount_percentage}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md pr-12"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              {/* Drugi dropdown za valutu je uklonjen da bi se izbjegao konflikt */}

              <div className="sm:col-span-2 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ukupan iznos plaćanja
                </label>
                <div className="text-2xl font-bold text-gray-900 flex items-center justify-between">
                  <span>{(formData.total_amount || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</span>
                  <span className="text-lg font-medium text-gray-500">{formData.currency}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Izračunato na osnovu: {(formData.quantity_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} kg × {(formData.price_per_kg || 0).toLocaleString('hr-HR', { minimumFractionDigits: 5 })} {formData.currency}/kg
                  {formData.discount_percentage > 0 && (
                    <span className="ml-1 text-indigo-600"> - {formData.discount_percentage}% rabat</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Dodatne Informacije
            </h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="delivery_note_number" className="block text-sm font-medium text-gray-700">
                  Broj dostavnice
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="delivery_note_number"
                    id="delivery_note_number"
                    value={formData.delivery_note_number}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Dokumenti
            </h3>
            
            <div className="mt-1">
              <label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-2">
                Dokumenti (Opcionalno)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-300 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="document" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Odaberite datoteke</span>
                      <input
                        type="file"
                        name="document"
                        id="document"
                        onChange={handleInputChange}
                        className="sr-only"
                        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                        multiple
                      />
                    </label>
                    <p className="pl-1">ili ih prevucite ovdje</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, Word, TXT, PNG, JPG do 10MB</p>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Možete odabrati više dokumenata odjednom</p>
            </div>
            
            {(selectedFiles || []).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Odabrani dokumenti:</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded mb-1 hover:bg-indigo-50 transition-colors">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-indigo-500 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
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
      </div>

      <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Odustani
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Spremi
        </button>
      </div>
    </form>
  );
};

export default AddOperationForm;