import { FuelingOperation } from '../types';
import dayjs from 'dayjs';

// Helper function to safely parse and format numbers
const formatDecimal = (value: any): string => {
  const number = parseFloat(value || '0');
  return number.toFixed(6);
};

const formatAmountTwoDecimals = (value: any): string => {
  const number = parseFloat(value || '0');
  return number.toFixed(2);
};

// Map human-readable destination names to IATA 3-letter codes
const normalizeDestination = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z]/g, ''); // remove non-letters (spaces, hyphens, etc.)
};

const DESTINATION_IATA_MAP: Record<string, string> = {
  memmingen: 'FMM',
  dortmund: 'DTM',
  basel: 'MLH',
  vienna: 'VIE',
  berlin: 'BER',
  frankfurthahn: 'HHN',
  goteborglandvetter: 'GOT',
  cologne: 'CGN',
  larnaca: 'LCA',
  malmo: 'MMX',
  malmoe: 'MMX',
  hamburg: 'HAM',
  maastricht: 'MST',
  beauvais: 'BVA',
  parisbeauvais: 'BVA',
};

const mapDestinationToIata = (destination?: string): string => {
  if (!destination) return 'TZL';
  const trimmed = destination.trim();
  const normalized = normalizeDestination(trimmed);
  if (DESTINATION_IATA_MAP[normalized]) {
    return DESTINATION_IATA_MAP[normalized];
  }
  // If already a 3-letter code, just uppercase it
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  // Fallback to original uppercased (keeps current behavior for non-mapped names)
  return trimmed.toUpperCase();
};

/**
 * Generate an XML invoice for a single fueling operation in IATA format
 */
export const generateXMLInvoice = (operation: FuelingOperation): string => {
  // Safely parse all numeric values at the beginning
  const quantityLiters = formatDecimal(operation.quantity_liters);
  const quantityKg = formatDecimal(operation.quantity_kg);
  const totalAmount = formatDecimal(operation.total_amount);
  const totalAmountTwoDecimals = formatAmountTwoDecimals(operation.total_amount);
  const pricePerKg = formatDecimal(operation.price_per_kg);

  // Format the date in YYYY-MM-DD format
  const invoiceDate = dayjs(operation.dateTime).format('YYYY-MM-DD');
  
  // Get customer details from airline data in the system
  const getCustomerDetails = (airline: any) => {
    if (!airline) return null;
    // Map for Wizz Air entities (keys are normalized to uppercase, no dots, trimmed)
    const wizzAirEntities: Record<string, {
      vatNumber: string;
      name: string;
      street: string;
      city: string;
      countryCode: string;
      postalCode: string;
    }> = {
      'WIZZ AIR HUNGARY LTD': {
        vatNumber: '26648525244',
        name: 'Wizz Air Hungary Ltd.',
        street: 'Lechner Ödön fasor 6',
        city: 'Budapest',
        countryCode: 'HU',
        postalCode: '1095'
      },
      'WIZZ AIR MALTA LTD': {
        vatNumber: 'MT16818421006',
        name: 'Wizz Air Malta Limited',
        street: 'Skyparks Business Centre, Level 2, Malta International Airport',
        city: 'Luqa',
        countryCode: 'MT',
        postalCode: 'LQA 4000'
      },
      'WIZZ AIR UK LTD': {
        vatNumber: 'GB289124477',
        name: 'Wizz Air UK Ltd.',
        street: 'Percival House, 134 Percival Way, London Luton Airport',
        city: 'Luton',
        countryCode: 'GB',
        postalCode: 'LU2 9NU'
      },
      'WIZZ AIR ABU DHABI LLC': {
        vatNumber: '100476688500003',
        name: 'Wizz Air Abu Dhabi L.L.C.',
        street: 'Business Park 01, Plot P6, Office 208, Abu Dhabi International Airport',
        city: 'Abu Dhabi',
        countryCode: 'AE',
        postalCode: '00000'
      }
    };
    // Normalize name for matching
    const normalizedName: string = (airline.name || '').toUpperCase().replace(/\./g, '').trim();
    if (wizzAirEntities[normalizedName]) {
      return wizzAirEntities[normalizedName];
    }
    // Fallback: parse from DB as before
    const address = airline.address || '';
    const addressParts = address.split(',').map((part: string) => part.trim());
    let city = 'N/A';
    let postalCode = 'N/A';
    if (addressParts.length > 0) {
      const lastPart = addressParts[addressParts.length - 1];
      const postalCodeMatch = lastPart.match(/(\d{4,5})\s*(.+)/);
      if (postalCodeMatch) {
        postalCode = postalCodeMatch[1];
        city = postalCodeMatch[2];
      } else {
        city = lastPart;
      }
    }
    return {
      vatNumber: airline.taxId || 'N/A',
      name: airline.name || 'N/A',
      street: addressParts.length > 1 ? addressParts.slice(0, -1).join(', ') : address,
      city: city,
      countryCode: airline.country_code || 'BA',
      postalCode: postalCode
    };
  };
  
  const customerDetails = getCustomerDetails(operation.airline);
  
  // Ensure correct time format for all date/time fields
  const invoiceDateTime = dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm:ss');
  const taxPointDate = dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm:ss');
  const paymentDueDate = dayjs(invoiceDate).add(15, 'day').format('YYYY-MM-DDTHH:mm:ss');

  // Generate a unique invoice transmission ID
  const locationCode = 'TZL';
  const invoiceTransmissionId = `${locationCode}-${operation.id}-${invoiceDate}`;
  
  // Validate and format flight data
  const flightNumber = operation.flight_number ? operation.flight_number.trim().toUpperCase() : 'N/A';
  const aircraftRegistration = operation.aircraft_registration ? operation.aircraft_registration.trim().toUpperCase() : 'N/A';
  const destination = mapDestinationToIata(operation.destination);
  
  // Format the XML content
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTransmission xmlns="http://WizzAir.DI.Loaders.Fuel.IATA3.FuelInvoice_IATA3_v1_0">
  <InvoiceTransmissionHeader>
    <InvoiceTransmissionId>${invoiceTransmissionId}</InvoiceTransmissionId>
    <InvoiceCreationDate>${invoiceDateTime}</InvoiceCreationDate>
    <Version>IATA:FuelInvoiceV3.2.1</Version>
  </InvoiceTransmissionHeader>
  <Invoice>
    <InvoiceHeader>
      <CustomerEntityID>${operation.airline?.taxId || '01-09-964332'}</CustomerEntityID>
      <IssuingEntityID>4200468580006</IssuingEntityID>
      <InvoiceNumber>INV-${operation.delivery_note_number || operation.id}-${new Date().getFullYear()}</InvoiceNumber>
      <InvoiceIssueDate>${invoiceDate}</InvoiceIssueDate>
      <InvoiceType InvoiceTransactionType="FI">INV</InvoiceType>
      <InvoiceDeliveryLocation>${locationCode}</InvoiceDeliveryLocation>
      <InvoicePaymentTermsType>EF14</InvoicePaymentTermsType>
      <InvoicePaymentTermsDateBasis>ID</InvoicePaymentTermsDateBasis>
      <InvoicePaymentTermsNetDueDate>${paymentDueDate}</InvoicePaymentTermsNetDueDate>
      <InvoicePaymentTermsNetDueDays>15</InvoicePaymentTermsNetDueDays>
      <InvoicePaymentTermsDescription>Payment due 15 days from invoice issue date</InvoicePaymentTermsDescription>
      <TaxInvoiceNumber>INV-${operation.delivery_note_number || operation.id}-${new Date().getFullYear()}</TaxInvoiceNumber>
      <TaxPointDate>${taxPointDate}</TaxPointDate>
      <InvoiceCurrencyCode>${operation.currency || 'BAM'}</InvoiceCurrencyCode>
      <InvoiceTotalAmount>${totalAmountTwoDecimals}</InvoiceTotalAmount>
      <InvoiceIDDetails InvoiceIDType="II">
        <InvoiceIDVATRegistrationNumber>4200468580006</InvoiceIDVATRegistrationNumber>
        <InvoiceIDName1>HIFA-PETROL d.o.o. Sarajevo</InvoiceIDName1>
        <InvoiceIDStreet1>Hotonj bb</InvoiceIDStreet1>
        <InvoiceIDCity>Vogosca</InvoiceIDCity>
        <InvoiceIDCountryCode>BA</InvoiceIDCountryCode>
        <InvoiceIDPostalCode>71320</InvoiceIDPostalCode>
      </InvoiceIDDetails>
      <InvoiceIDDetails InvoiceIDType="BT">
        <InvoiceIDVATRegistrationNumber>${customerDetails?.vatNumber || 'N/A'}</InvoiceIDVATRegistrationNumber>
        <InvoiceIDName1>${customerDetails?.name || 'N/A'}</InvoiceIDName1>
        <InvoiceIDStreet1>${customerDetails?.street || 'N/A'}</InvoiceIDStreet1>
        <InvoiceIDCity>${customerDetails?.city || 'N/A'}</InvoiceIDCity>
        <InvoiceIDCountryCode>${customerDetails?.countryCode || 'BA'}</InvoiceIDCountryCode>
        <InvoiceIDPostalCode>${customerDetails?.postalCode || 'N/A'}</InvoiceIDPostalCode>
      </InvoiceIDDetails>
    </InvoiceHeader>
    <SubInvoiceHeader>
      <InvoiceLine>
        <ItemNumber>1</ItemNumber>
        <ItemQuantity>
          <ItemQuantityType>DL</ItemQuantityType>
          <ItemQuantityFlag>GR</ItemQuantityFlag>
          <ItemQuantityQty>${quantityKg}</ItemQuantityQty>
          <ItemQuantityUOM>KG</ItemQuantityUOM>
        </ItemQuantity>
        <ItemDeliveryLocation>TZL</ItemDeliveryLocation>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="FNO">${flightNumber}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="ARN">${aircraftRegistration}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="DTN">${destination}</ItemDeliveryReferenceValue>
        <ItemReferenceLocalDate ItemReferenceDateTypes="DTA">${invoiceDateTime}</ItemReferenceLocalDate>
        <ItemInvoiceAmount>${totalAmountTwoDecimals}</ItemInvoiceAmount>
        <SubItem>
          <SubItemProduct>
            <SubItemProductID>${operation.tank?.fuel_type || 'JETA1'}</SubItemProductID>
            <SubItemPricingUnitRateType>UR</SubItemPricingUnitRateType>
            <SubItemPricingUnitRate>${pricePerKg}</SubItemPricingUnitRate>
            <SubItemPricingUOM>KG</SubItemPricingUOM>
            <SubItemPricingUOMFactor>1</SubItemPricingUOMFactor>
            <SubItemPricingCurrencyCode>${operation.currency || 'BAM'}</SubItemPricingCurrencyCode>
            <SubItemPricingAmount>${quantityKg}</SubItemPricingAmount>
            <SubItemInvoiceUOM>KG</SubItemInvoiceUOM>
            <SubItemQuantity>
              <SubItemInvoiceQuantity>${quantityKg}</SubItemInvoiceQuantity>
              <SubItemQuantityType>DL</SubItemQuantityType>
              <SubItemQuantityFlag>GR</SubItemQuantityFlag>
            </SubItemQuantity>
            <SubItemInvoiceUnitRate>${pricePerKg}</SubItemInvoiceUnitRate>
            <SubItemInvoiceAmount>${totalAmount}</SubItemInvoiceAmount>
          </SubItemProduct>
        </SubItem>
      </InvoiceLine>
    </SubInvoiceHeader>
    <InvoiceSummary>
      <InvoiceLineCount>1</InvoiceLineCount>
      <TotalInvoiceLineAmount>${totalAmount}</TotalInvoiceLineAmount>
      <TotalInvoiceTaxAmount>0</TotalInvoiceTaxAmount>
    </InvoiceSummary>
  </Invoice>
  <InvoiceTransmissionSmry>
    <InvoiceMessageCount>1</InvoiceMessageCount>
  </InvoiceTransmissionSmry>
</InvoiceTransmission>`;

  return xmlContent;
};

/**
 * Generate a consolidated XML invoice for multiple fueling operations in IATA format
 */
export const generateConsolidatedXMLInvoice = (operations: FuelingOperation[], filterDescription: string): string => {
  if (!operations || operations.length === 0) {
    throw new Error('No operations to generate invoice for');
  }

  // Sort operations by date
  const sortedOperations = [...operations].sort((a, b) => 
    new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );
  
  // Get the first and last operation for date range
  const firstOperation = sortedOperations[0];
  const lastOperation = sortedOperations[sortedOperations.length - 1];
  
  // Format the dates
  const startDate = dayjs(firstOperation.dateTime).format('YYYY-MM-DD');
  const endDate = dayjs(lastOperation.dateTime).format('YYYY-MM-DD');
  // Use firstOperation dateTime for invoice creation to ensure consistency
  const invoiceDateTime = dayjs(firstOperation.dateTime).format('YYYY-MM-DDTHH:mm:ss');
  const invoiceDate = dayjs(firstOperation.dateTime).format('YYYY-MM-DD');
  
  // Generate a unique invoice transmission ID
  const locationCode = 'TZL';
  const invoiceTransmissionId = `${locationCode}-CONS-${dayjs().format('YYYYMMDD')}-${firstOperation.airline?.id || 'UNKNOWN'}`;
  
  // Calculate totals
  const totalAmount = operations.reduce((sum, op) => sum + (op.total_amount || 0), 0);
  const totalAmountTwoDecimals = formatAmountTwoDecimals(totalAmount);
  
  // Calculate payment due date (15 days from issue date)
  const paymentDueDate = dayjs(invoiceDate).add(15, 'day').format('YYYY-MM-DDTHH:mm:ss[Z]');
  const taxPointDate = dayjs(firstOperation.dateTime).format('YYYY-MM-DDTHH:mm:ss[Z]');
  
  // Get customer details from airline data in the system
  const getCustomerDetails = (airline: any) => {
    if (!airline) return null;
    
    // Parse address to extract city and postal code if available
    const address = airline.address || '';
    const addressParts = address.split(',').map((part: string) => part.trim());
    
    // Try to extract city and postal code from address
    let city = 'N/A';
    let postalCode = 'N/A';
    
    if (addressParts.length > 0) {
      // Last part might be postal code + city
      const lastPart = addressParts[addressParts.length - 1];
      const postalCodeMatch = lastPart.match(/(\d{4,5})\s*(.+)/);
      if (postalCodeMatch) {
        postalCode = postalCodeMatch[1];
        city = postalCodeMatch[2];
      } else {
        city = lastPart;
      }
    }
    
    return {
      vatNumber: airline.taxId || 'N/A',
      name: airline.name || 'N/A',
      street: addressParts.length > 1 ? addressParts.slice(0, -1).join(', ') : address,
      city: city,
      countryCode: airline.country_code || 'BA',
      postalCode: postalCode
    };
  };
  
  const customerDetails = getCustomerDetails(firstOperation.airline);
  
  // Determine the most common currency
  const currencyCounts = operations.reduce((acc, op) => {
    const currency = op.currency || 'BAM';
    acc[currency] = (acc[currency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let mostCommonCurrency = 'BAM';
  let maxCount = 0;
  for (const [currency, count] of Object.entries(currencyCounts)) {
    if (count > maxCount) {
      mostCommonCurrency = currency;
      maxCount = count;
    }
  }
  
  // Generate invoice lines XML
  const invoiceLines = sortedOperations.map((operation, index) => {
    const quantityLiters = parseFloat(operation.quantity_liters as any || '0');
    const quantityKg = parseFloat(operation.quantity_kg as any || '0');
    const operationDate = dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm:ss');
    
    // Validate and format flight data for each operation
    const flightNumber = operation.flight_number ? operation.flight_number.trim().toUpperCase() : 'N/A';
    const aircraftRegistration = operation.aircraft_registration ? operation.aircraft_registration.trim().toUpperCase() : 'N/A';
    const destination = mapDestinationToIata(operation.destination);
    
    return `
      <InvoiceLine>
        <ItemNumber>${index + 1}</ItemNumber>
        <ItemQuantity>
          <ItemQuantityType>DL</ItemQuantityType>
          <ItemQuantityFlag>GR</ItemQuantityFlag>
          <ItemQuantityQty>${quantityKg.toFixed(6)}</ItemQuantityQty>
          <ItemQuantityUOM>KG</ItemQuantityUOM>
        </ItemQuantity>
        <ItemDeliveryLocation>TZL</ItemDeliveryLocation>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="FNO">${flightNumber}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="ARN">${aircraftRegistration}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="DTN">${destination}</ItemDeliveryReferenceValue>
        <ItemReferenceLocalDate ItemReferenceDateTypes="DTA">${operationDate}</ItemReferenceLocalDate>
        <ItemInvoiceAmount>${formatAmountTwoDecimals(operation.total_amount || 0)}</ItemInvoiceAmount>
        <SubItem>
          <SubItemProduct>
            <SubItemProductID>${operation.tank?.fuel_type || 'JETA1'}</SubItemProductID>
            <SubItemPricingUnitRateType>UR</SubItemPricingUnitRateType>
            <SubItemPricingUnitRate>${operation.price_per_kg || 0}</SubItemPricingUnitRate>
            <SubItemPricingUOM>KG</SubItemPricingUOM>
            <SubItemPricingUOMFactor>1</SubItemPricingUOMFactor>
            <SubItemPricingCurrencyCode>${operation.currency || 'BAM'}</SubItemPricingCurrencyCode>
            <SubItemPricingAmount>${quantityKg.toFixed(6)}</SubItemPricingAmount>
            <SubItemInvoiceUOM>KG</SubItemInvoiceUOM>
            <SubItemQuantity>
              <SubItemInvoiceQuantity>${quantityKg.toFixed(6)}</SubItemInvoiceQuantity>
              <SubItemQuantityType>DL</SubItemQuantityType>
              <SubItemQuantityFlag>GR</SubItemQuantityFlag>
            </SubItemQuantity>
            <SubItemInvoiceUnitRate>${operation.price_per_kg || 0}</SubItemInvoiceUnitRate>
            <SubItemInvoiceAmount>${operation.total_amount || 0}</SubItemInvoiceAmount>
          </SubItemProduct>
        </SubItem>
      </InvoiceLine>`;
  }).join('');
  
  // Format the XML content
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTransmission xmlns="http://WizzAir.DI.Loaders.Fuel.IATA3.FuelInvoice_IATA3_v1_0">
  <InvoiceTransmissionHeader>
    <InvoiceTransmissionId>${invoiceTransmissionId}</InvoiceTransmissionId>
    <InvoiceCreationDate>${invoiceDateTime}</InvoiceCreationDate>
    <Version>IATA:FuelInvoiceV3.2.1</Version>
  </InvoiceTransmissionHeader>
  <Invoice>
    <InvoiceHeader>
      <CustomerEntityID>${firstOperation.airline?.taxId || '01-09-964332'}</CustomerEntityID>
      <IssuingEntityID>4200468580006</IssuingEntityID>
      <InvoiceNumber>CONS-INV-${dayjs().format('YYYYMMDD')}-${new Date().getFullYear()}</InvoiceNumber>
      <InvoiceIssueDate>${invoiceDate}</InvoiceIssueDate>
      <InvoiceType InvoiceTransactionType="FI">INV</InvoiceType>
      <InvoiceDeliveryLocation>${locationCode}</InvoiceDeliveryLocation>
      <InvoicePaymentTermsType>EF14</InvoicePaymentTermsType>
      <InvoicePaymentTermsDateBasis>ID</InvoicePaymentTermsDateBasis>
      <InvoicePaymentTermsNetDueDate>${paymentDueDate}</InvoicePaymentTermsNetDueDate>
      <InvoicePaymentTermsNetDueDays>15</InvoicePaymentTermsNetDueDays>
      <InvoicePaymentTermsDescription>Payment due 15 days from invoice issue date</InvoicePaymentTermsDescription>
      <TaxInvoiceNumber>CONS-INV-${dayjs().format('YYYYMMDD')}-${new Date().getFullYear()}</TaxInvoiceNumber>
      <TaxPointDate>${taxPointDate}</TaxPointDate>
      <InvoiceCurrencyCode>${mostCommonCurrency}</InvoiceCurrencyCode>
      <InvoiceTotalAmount>${totalAmountTwoDecimals}</InvoiceTotalAmount>
      <InvoiceIDDetails InvoiceIDType="II">
        <InvoiceIDVATRegistrationNumber>4200468580006</InvoiceIDVATRegistrationNumber>
        <InvoiceIDName1>HIFA-PETROL d.o.o. Sarajevo</InvoiceIDName1>
        <InvoiceIDStreet1>Hotonj bb</InvoiceIDStreet1>
        <InvoiceIDCity>Vogosca</InvoiceIDCity>
        <InvoiceIDCountryCode>BA</InvoiceIDCountryCode>
        <InvoiceIDPostalCode>71320</InvoiceIDPostalCode>
      </InvoiceIDDetails>
      <InvoiceIDDetails InvoiceIDType="BT">
        <InvoiceIDVATRegistrationNumber>${customerDetails?.vatNumber || 'N/A'}</InvoiceIDVATRegistrationNumber>
        <InvoiceIDName1>${customerDetails?.name || 'N/A'}</InvoiceIDName1>
        <InvoiceIDStreet1>${customerDetails?.street || 'N/A'}</InvoiceIDStreet1>
        <InvoiceIDCity>${customerDetails?.city || 'N/A'}</InvoiceIDCity>
        <InvoiceIDCountryCode>${customerDetails?.countryCode || 'BA'}</InvoiceIDCountryCode>
        <InvoiceIDPostalCode>${customerDetails?.postalCode || 'N/A'}</InvoiceIDPostalCode>
      </InvoiceIDDetails>
    </InvoiceHeader>
    <SubInvoiceHeader>${invoiceLines}
    </SubInvoiceHeader>
    <InvoiceSummary>
      <InvoiceLineCount>${operations.length}</InvoiceLineCount>
      <TotalInvoiceLineAmount>${totalAmount}</TotalInvoiceLineAmount>
      <TotalInvoiceTaxAmount>0</TotalInvoiceTaxAmount>
    </InvoiceSummary>
  </Invoice>
  <InvoiceTransmissionSmry>
    <InvoiceMessageCount>1</InvoiceMessageCount>
  </InvoiceTransmissionSmry>
</InvoiceTransmission>`;

  return xmlContent;
};

/**
 * Helper function to download XML content as a file
 */
export const downloadXML = (xmlContent: string, filename: string): void => {
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
