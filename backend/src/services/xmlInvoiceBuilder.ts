import dayjs from 'dayjs';
import { Prisma } from '@prisma/client';

// Types aligned with frontend `FuelingOperation` shape used in XML generator
export interface FuelingOperationForXml {
  id: number;
  dateTime: Date | string;
  aircraft_registration?: string | null;
  airline?: { id: number; name: string; address?: string | null; taxId?: string | null; country_code?: string | null } | null;
  destination?: string | null;
  quantity_liters: Prisma.Decimal | number | string;
  quantity_kg: Prisma.Decimal | number | string;
  tank?: { fuel_type?: string | null } | null;
  flight_number?: string | null;
  currency?: string | null;
  price_per_kg: Prisma.Decimal | number | string;
  total_amount: Prisma.Decimal | number | string;
  delivery_note_number?: string | null;
}

const formatDecimal = (value: any): string => {
  const number = parseFloat(value || '0');
  return number.toFixed(6);
};

// Copy of destination mapping logic used on frontend
const normalizeDestination = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
};

const DESTINATION_IATA_MAP: Record<string, string> = {
  memmingen: 'FMM',
  dortmund: 'DTM',
  basel: 'MLH',
  vienna: 'VIE',
  berlin: 'BER',
  frankfurthahn: 'HHN',
  cologne: 'CGN',
  malmo: 'MMX',
  malmoe: 'MMX',
  hamburg: 'HAM',
  maastricht: 'MST',
  parisbeauvais: 'BVA',
};

const mapDestinationToIata = (destination?: string | null): string => {
  if (!destination) return 'TZL';
  const trimmed = destination.trim();
  const normalized = normalizeDestination(trimmed);
  if (DESTINATION_IATA_MAP[normalized]) return DESTINATION_IATA_MAP[normalized];
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  return trimmed.toUpperCase();
};

// Mirrors frontend generateXMLInvoice exactly in structure and fields
export const generateXMLInvoiceBackend = (operation: FuelingOperationForXml): string => {
  const quantityLiters = formatDecimal(operation.quantity_liters);
  const quantityKg = formatDecimal(operation.quantity_kg);
  const totalAmount = formatDecimal(operation.total_amount);
  const pricePerKg = formatDecimal(operation.price_per_kg);

  const invoiceDate = dayjs(operation.dateTime).format('YYYY-MM-DD');

  const getCustomerDetails = (airline: any) => {
    if (!airline) return null;
    const wizzAirEntities: Record<string, { vatNumber: string; name: string; street: string; city: string; countryCode: string; postalCode: string; }> = {
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
    const normalizedName: string = (airline.name || '').toUpperCase().replace(/\./g, '').trim();
    if (wizzAirEntities[normalizedName]) {
      return wizzAirEntities[normalizedName];
    }
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

  const invoiceDateTime = dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm:ss');
  const taxPointDate = dayjs(operation.dateTime).format('YYYY-MM-DDTHH:mm:ss');
  const paymentDueDate = dayjs(invoiceDate).add(15, 'day').format('YYYY-MM-DDTHH:mm:ss');

  const locationCode = 'TZL';
  const invoiceTransmissionId = `${locationCode}-${operation.id}-${invoiceDate}`;

  const flightNumber = operation.flight_number ? operation.flight_number.trim().toUpperCase() : 'N/A';
  const aircraftRegistration = operation.aircraft_registration ? operation.aircraft_registration.trim().toUpperCase() : 'N/A';
  const destination = mapDestinationToIata(operation.destination || undefined);

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
      <InvoiceTotalAmount>${totalAmount}</InvoiceTotalAmount>
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
        <ItemInvoiceAmount>${totalAmount}</ItemInvoiceAmount>
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




