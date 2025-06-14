import { FuelingOperation } from '../types';
import dayjs from 'dayjs';

/**
 * Generate an XML invoice for a single fueling operation in IATA format
 */
export const generateXMLInvoice = (operation: FuelingOperation): string => {
  // Format the date in YYYY-MM-DD format
  const invoiceDate = dayjs(operation.dateTime).format('YYYY-MM-DD');
  const invoiceDateTime = dayjs(operation.dateTime).format('YYYY-MM-DDTkk:mm:ss');
  
  // Generate a unique invoice transmission ID
  const locationCode = operation.destination?.substring(0, 3).toUpperCase() || 'TZL';
  const invoiceTransmissionId = `${locationCode}-${operation.id}-${invoiceDate}`;
  
  // Calculate the quantity in liters and kilograms
  const quantityLiters = operation.quantity_liters || 0;
  const quantityKg = operation.quantity_kg || 0;
  
  // Format the XML content
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTransmission xmlns="http://WizzAir.DI.Loaders.Fuel.IATA3.FuelInvoice_IATA3_v1_0">
  <InvoiceTransmissionHeader>
    <InvoiceTransmissionId>${invoiceTransmissionId}</InvoiceTransmissionId>
    <InvoiceCreationDate>${invoiceDateTime}</InvoiceCreationDate>
    <Version>V3_NS_Minimal</Version>
  </InvoiceTransmissionHeader>
  <Invoice>
    <InvoiceHeader>
      <CustomerEntityID>${operation.airline?.taxId || '01-09-964332'}</CustomerEntityID>
      <IssuingEntityID>4200468580006</IssuingEntityID>
      <InvoiceNumber>${operation.id}</InvoiceNumber>
      <InvoiceIssueDate>${invoiceDate}</InvoiceIssueDate>
      <InvoiceType InvoiceTransactionType="CA">INV</InvoiceType>  
      <InvoiceDeliveryLocation>${locationCode}</InvoiceDeliveryLocation>
      <TaxInvoiceNumber>${operation.id}</TaxInvoiceNumber>
      <InvoiceCurrencyCode>${operation.currency || 'BAM'}</InvoiceCurrencyCode>
      <InvoiceTotalAmount>${operation.total_amount || 0}</InvoiceTotalAmount>
    </InvoiceHeader>
    <SubInvoiceHeader>
      <InvoiceLine>
        <ItemNumber>1</ItemNumber>
        <ItemQuantity>
          <ItemQuantityType>DL</ItemQuantityType>
          <ItemQuantityFlag>GR</ItemQuantityFlag>
          <ItemQuantityQty>${quantityKg.toFixed(2)}</ItemQuantityQty>
          <ItemQuantityUOM>KG</ItemQuantityUOM>
        </ItemQuantity>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="FNO">${operation.flight_number || 'N/A'}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="ARN">${operation.aircraft_registration || 'N/A'}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="DTN">${operation.destination || 'N/A'}</ItemDeliveryReferenceValue>
        <ItemReferenceLocalDate ItemReferenceDateTypes="DTA">${invoiceDateTime}</ItemReferenceLocalDate>
        <ItemInvoiceAmount>${operation.total_amount || 0}</ItemInvoiceAmount>
        <SubItem>
          <SubItemProduct>
            <SubItemProductID>${operation.tank?.fuel_type || 'JETA1'}</SubItemProductID>
            <SubItemPricingUnitRateType>UR</SubItemPricingUnitRateType>
            <SubItemPricingUnitRate>${operation.price_per_kg || 0}</SubItemPricingUnitRate>
            <SubItemPricingUOM>KG</SubItemPricingUOM>
            <SubItemPricingUOMFactor>1</SubItemPricingUOMFactor>
            <SubItemPricingCurrencyCode>${operation.currency || 'BAM'}</SubItemPricingCurrencyCode>
            <SubItemPricingAmount>${quantityKg.toFixed(2)}</SubItemPricingAmount>
            <SubItemInvoiceUOM>KG</SubItemInvoiceUOM>
            <SubItemQuantity>
              <SubItemInvoiceQuantity>${quantityKg.toFixed(2)}</SubItemInvoiceQuantity>
              <SubItemQuantityType>DL</SubItemQuantityType>
              <SubItemQuantityFlag>GR</SubItemQuantityFlag>
            </SubItemQuantity>
            <SubItemInvoiceUnitRate>${operation.price_per_kg || 0}</SubItemInvoiceUnitRate>
            <SubItemInvoiceAmount>${operation.total_amount || 0}</SubItemInvoiceAmount>
          </SubItemProduct>
        </SubItem>
      </InvoiceLine>
    </SubInvoiceHeader>
    <InvoiceSummary>
      <InvoiceLineCount>1</InvoiceLineCount>
      <TotalInvoiceLineAmount>${operation.total_amount || 0}</TotalInvoiceLineAmount>
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
  const invoiceDateTime = dayjs().format('YYYY-MM-DDTkk:mm:ss');
  const invoiceDate = dayjs().format('YYYY-MM-DD');
  
  // Generate a unique invoice transmission ID
  const locationCode = firstOperation.destination?.substring(0, 3).toUpperCase() || 'TZL';
  const invoiceTransmissionId = `${locationCode}-CONS-${dayjs().format('YYYYMMDD')}-${firstOperation.airline?.id || 'UNKNOWN'}`;
  
  // Calculate totals
  const totalAmount = operations.reduce((sum, op) => sum + (op.total_amount || 0), 0);
  
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
    const quantityLiters = operation.quantity_liters || 0;
    const quantityKg = operation.quantity_kg || 0;
    const operationDate = dayjs(operation.dateTime).format('YYYY-MM-DDTkk:mm:ss');
    
    return `
      <InvoiceLine>
        <ItemNumber>${index + 1}</ItemNumber>
        <ItemQuantity>
          <ItemQuantityType>DL</ItemQuantityType>
          <ItemQuantityFlag>GR</ItemQuantityFlag>
          <ItemQuantityQty>${quantityKg.toFixed(2)}</ItemQuantityQty>
          <ItemQuantityUOM>KG</ItemQuantityUOM>
        </ItemQuantity>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="FNO">${operation.flight_number || 'N/A'}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="ARN">${operation.aircraft_registration || 'N/A'}</ItemDeliveryReferenceValue>
        <ItemDeliveryReferenceValue ItemDeliveryReferenceType="DTN">${operation.destination || 'N/A'}</ItemDeliveryReferenceValue>
        <ItemReferenceLocalDate ItemReferenceDateTypes="DTA">${operationDate}</ItemReferenceLocalDate>
        <ItemInvoiceAmount>${operation.total_amount || 0}</ItemInvoiceAmount>
        <SubItem>
          <SubItemProduct>
            <SubItemProductID>${operation.tank?.fuel_type || 'JETA1'}</SubItemProductID>
            <SubItemPricingUnitRateType>UR</SubItemPricingUnitRateType>
            <SubItemPricingUnitRate>${operation.price_per_kg || 0}</SubItemPricingUnitRate>
            <SubItemPricingUOM>KG</SubItemPricingUOM>
            <SubItemPricingUOMFactor>1</SubItemPricingUOMFactor>
            <SubItemPricingCurrencyCode>${operation.currency || 'BAM'}</SubItemPricingCurrencyCode>
            <SubItemPricingAmount>${quantityKg.toFixed(2)}</SubItemPricingAmount>
            <SubItemInvoiceUOM>KG</SubItemInvoiceUOM>
            <SubItemQuantity>
              <SubItemInvoiceQuantity>${quantityKg.toFixed(2)}</SubItemInvoiceQuantity>
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
    <Version>V3_NS_Minimal</Version>
  </InvoiceTransmissionHeader>
  <Invoice>
    <InvoiceHeader>
      <CustomerEntityID>${firstOperation.airline?.taxId || '01-09-964332'}</CustomerEntityID>
      <IssuingEntityID>4200468580006</IssuingEntityID>
      <InvoiceNumber>CONS-${dayjs().format('YYYYMMDD')}</InvoiceNumber>
      <InvoiceIssueDate>${invoiceDate}</InvoiceIssueDate>
      <InvoiceType InvoiceTransactionType="CA">INV</InvoiceType>  
      <InvoiceDeliveryLocation>${locationCode}</InvoiceDeliveryLocation>
      <TaxInvoiceNumber>CONS-${dayjs().format('YYYYMMDD')}</TaxInvoiceNumber>
      <InvoiceCurrencyCode>${mostCommonCurrency}</InvoiceCurrencyCode>
      <InvoiceTotalAmount>${totalAmount}</InvoiceTotalAmount>
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
