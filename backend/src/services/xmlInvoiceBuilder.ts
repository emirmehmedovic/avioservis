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

const formatAmountTwoDecimals = (value: any): string => {
  const number = parseFloat(value || '0');
  return number.toFixed(2);
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
  aarhus: 'AAR',
  agadir: 'AGA',
  alesund: 'AES',
  alghero: 'AHO',
  almaty: 'ALA',
  alta: 'ALF',
  amman: 'AMM',
  amsterdam: 'AMS',
  ankara: 'ESB',
  aqaba: 'AQJ',
  arad: 'ARW',
  assiut: 'ATZ',
  astana: 'NQZ',
  athens: 'ATH',
  aurelvlaicubucharest: 'BBU',
  bacau: 'BCM',
  bahrain: 'BAH',
  baku: 'GYD',
  banjaluka: 'BNX',
  barcelona: 'BCN',
  basel: 'MLH',
  beauvais: 'BVA',
  beirut: 'BEY',
  belfastinternational: 'BFS',
  belgrade: 'BEG',
  berlin: 'BER',
  bergen: 'BGO',
  billund: 'BLL',
  bishkek: 'FRU',
  bodrum: 'BJV',
  bordeaux: 'BOD',
  borgelarabalexandria: 'HBE',
  bratislava: 'BTS',
  brasov: 'GHV',
  bremen: 'BRE',
  brno: 'BRQ',
  brussels: 'BRU',
  bucharestbaneasa: 'BBU',
  bucharesthenricoanda: 'OTP',
  budapest: 'BUD',
  burgas: 'BOJ',
  bydgoszcz: 'BZG',
  cardiff: 'CWL',
  casablanca: 'CMN',
  castellon: 'CDT',
  catania: 'CTA',
  chania: 'CHQ',
  charleroi: 'CRL',
  chisinau: 'KIV',
  clujnapoca: 'CLJ',
  cologne: 'CGN',
  colognebonn: 'CGN',
  comiso: 'CIY',
  copenhagen: 'CPH',
  corfu: 'CFU',
  craiova: 'CRA',
  dammam: 'DMM',
  debrecen: 'DEB',
  dortmund: 'DTM',
  dubaialmaktoum: 'DWC',
  dubaiinternational: 'DXB',
  dubrovnik: 'DBV',
  edinburgh: 'EDI',
  eindhoven: 'EIN',
  faro: 'FAO',
  frankfurt: 'FRA',
  frankfurthahn: 'HHN',
  friedrichshafen: 'FDH',
  fuerteventura: 'FUE',
  gdansk: 'GDN',
  goteborglandvetter: 'GOT',
  grancanaria: 'LPA',
  grenoble: 'GNB',
  groningen: 'GRQ',
  gyumri: 'LWN',
  hamburg: 'HAM',
  hanover: 'HAJ',
  helsinki: 'HEL',
  heraklion: 'HER',
  hurghada: 'HRG',
  iasi: 'IAS',
  ibiza: 'IBZ',
  istanbulsabihagokcen: 'SAW',
  izmir: 'ADB',
  jeddah: 'JED',
  karlsruhebadenbaden: 'FKB',
  katowice: 'KTW',
  kaunas: 'KUN',
  kazan: 'KZN',
  kharkiv: 'HRK',
  kos: 'KGS',
  krakow: 'KRK',
  kukes: 'KFZ',
  kutaisi: 'KUT',
  kuwaitcity: 'KWI',
  kyivboryspil: 'KBP',
  kyivzhuliany: 'IEV',
  lameziaterme: 'SUF',
  larnaca: 'LCA',
  leedsbradford: 'LBA',
  leipzighalle: 'LEJ',
  lisbon: 'LIS',
  liverpool: 'LPL',
  londongatwick: 'LGW',
  londonluton: 'LTN',
  londonsouthend: 'SEN',
  londonstansted: 'STN',
  lubeck: 'LBC',
  lublin: 'LUZ',
  luxembourg: 'LUX',
  luxor: 'LXR',
  lviv: 'LWO',
  lyon: 'LYS',
  madinah: 'MED',
  maastricht: 'MST',
  malemaldives: 'MLE',
  malmo: 'MMX',
  malmoe: 'MMX',
  malta: 'MLA',
  marsaalam: 'RMF',
  memmingen: 'FMM',
  menorca: 'MAH',
  milanlinate: 'LIN',
  milanmalpensa: 'MXP',
  moscowvnukovo: 'VKO',
  mykonos: 'JMK',
  naples: 'NAP',
  nice: 'NCE',
  nuremberg: 'NUE',
  odesa: 'ODS',
  olsztynmazury: 'SZY',
  osijek: 'OSI',
  palanga: 'PLQ',
  pardubice: 'PED',
  parisbeauvais: 'BVA',
  parisorly: 'ORY',
  parma: 'PMF',
  pescara: 'PSR',
  pisa: 'PSA',
  plovdiv: 'PDV',
  porto: 'OPO',
  poznan: 'POZ',
  prague: 'PRG',
  pristina: 'PRN',
  qabala: 'GBB',
  reykjavikkeflavik: 'KEF',
  riga: 'RIX',
  riyadh: 'RUH',
  romeciampino: 'CIA',
  romefiumicino: 'FCO',
  saarbrucken: 'SCN',
  saintpetersburg: 'LED',
  salzburg: 'SZG',
  santander: 'SDR',
  sarajevo: 'SJJ',
  sharmelsheikh: 'SSH',
  sibiu: 'SBZ',
  simferopol: 'SIP',
  skelleftea: 'SFT',
  skopje: 'SKP',
  sofia: 'SOF',
  sohag: 'HMB',
  sphinxgiza: 'SPX',
  split: 'SPU',
  stuttgart: 'STR',
  tallinn: 'TLL',
  tampere: 'TMP',
  tashkent: 'TAS',
  telavivbengurion: 'TLV',
  thessaloniki: 'SKG',
  timisoara: 'TSR',
  tirana: 'TIA',
  tivat: 'TIV',
  treviso: 'TSF',
  trieste: 'TRS',
  turin: 'TRN',
  turkistan: 'HSA',
  turku: 'TKU',
  tuzla: 'TZL',
  vaxjo: 'VXO',
  venicemarcopolo: 'VCE',
  verona: 'VRN',
  vienna: 'VIE',
  vilnius: 'VNO',
  warsawchopin: 'WAW',
  warsawmodlin: 'WMI',
  wroclaw: 'WRO',
  zagreb: 'ZAG',
  zakynthos: 'ZTH',
  zaporizhzhia: 'OZH',
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
  const totalAmountTwoDecimals = formatAmountTwoDecimals(operation.total_amount);
  const pricePerKg = formatDecimal(operation.price_per_kg);

  const invoiceDate = dayjs(operation.dateTime).format('YYYY-MM-DD');

  // Use operation dateTime for all invoice dates to ensure consistency
  // InvoiceCreationDate and TaxPointDate must NOT be later than InvoiceIssueDate
  const operationDateTime = dayjs(operation.dateTime);
  const invoiceCreationDateTime = operationDateTime.format('YYYY-MM-DDTHH:mm:ss');
  const taxPointDateTime = operationDateTime.format('YYYY-MM-DDTHH:mm:ss');
  
  // Service date should use the actual operation date/time (Service Date)
  const serviceDateTime = operationDateTime.format('YYYY-MM-DDTHH:mm:ss');

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

  // Payment due date based on operation date (Issue Date) + 15 days
  const paymentDueDate = operationDateTime.add(15, 'day').format('YYYY-MM-DDTHH:mm:ss');

  const locationCode = 'TZL';
  const invoiceTransmissionId = `${locationCode}-${operation.id}-${invoiceDate}`;

  const flightNumber = operation.flight_number ? operation.flight_number.trim().toUpperCase() : 'N/A';
  const aircraftRegistration = operation.aircraft_registration ? operation.aircraft_registration.trim().toUpperCase() : 'N/A';
  const destination = mapDestinationToIata(operation.destination || undefined);

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTransmission xmlns="http://WizzAir.DI.Loaders.Fuel.IATA3.FuelInvoice_IATA3_v1_0">
  <InvoiceTransmissionHeader>
    <InvoiceTransmissionId>${invoiceTransmissionId}</InvoiceTransmissionId>
    <InvoiceCreationDate>${invoiceCreationDateTime}</InvoiceCreationDate>
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
      <TaxPointDate>${taxPointDateTime}</TaxPointDate>
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
        <ItemReferenceLocalDate ItemReferenceDateTypes="DTA">${serviceDateTime}</ItemReferenceLocalDate>
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
