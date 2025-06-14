import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
// import { formatDate } from '@/lib/utils'; // Privremeno komentarisano

// Privremena formatDate funkcija (idealno bi bilo koristiti onu iz @/lib/utils)
const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('hr-HR', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
};

// Ručno definirani tipovi na osnovu schema.prisma i API odgovora
// Zamjenjuju import iz @prisma/client koji ne radi na frontendu

interface ManualFuelIntakeDocument {
  id: number;
  fuel_intake_record_id?: number; 
  document_name: string; 
  document_path: string; 
  document_type: string;
  file_size_bytes: number;
  mime_type: string;     
  uploaded_at?: string;  
}

interface ManualFixedStorageTank {
  id: number;
  tank_name: string;
  tank_identifier: string;
  // Dodati ostala polja po potrebi
}

interface ManualFixedTankTransfer {
  id: number;
  affected_fixed_tank_id: number;
  quantity_liters_transferred: number;
  transfer_datetime: Date; 
  affectedFixedTank?: ManualFixedStorageTank; 
  // Dodati ostala polja po potrebi (npr. notes, fuel_intake_record_id)
}

// Glavni tip za detalje zapisa o ulazu goriva
export interface FuelIntakeRecordWithDetails {
  id: number;
  intake_datetime: Date;
  fuel_type: string;
  fuel_category?: string;
  delivery_vehicle_plate: string;
  delivery_vehicle_driver_name?: string | null;
  quantity_liters_received: number;
  quantity_kg_received: number;
  specific_gravity: number;
  refinery_name?: string | null;
  supplier_name?: string | null;
  delivery_note_number?: string | null;
  customs_declaration_number?: string | null;
  price_per_kg?: number | null;
  currency?: string | null;
  total_price?: number | null;
  documents: ManualFuelIntakeDocument[];
  fixedTankTransfers: ManualFixedTankTransfer[];
  // Dodati ostala polja iz FuelIntakeRecords modela po potrebi
  // (npr. createdAt, updatedAt)
}

interface FuelIntakeRecordDetailsModalProps {
  record: FuelIntakeRecordWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadDocument?: (document: ManualFuelIntakeDocument) => void;
}

export default function FuelIntakeRecordDetailsModal({
  record,
  isOpen,
  onClose,
  onDownloadDocument,
}: FuelIntakeRecordDetailsModalProps) {
  if (!isOpen || !record) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden overflow-y-auto max-h-[90vh] bg-white rounded-lg shadow-xl">
        {/* Required for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>Detalji Zapisa o Ulazu Goriva</DialogTitle>
        </DialogHeader>
        
        {/* Header with black glassmorphism effect */}
        <div className="p-6 text-white relative overflow-hidden">
          {/* Black glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/60 to-black/40 backdrop-blur-xl border border-white/20 z-0"></div>
          {/* Glass highlight effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
          <div className="flex flex-col space-y-1 relative z-10">
            <h2 className="text-2xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 10C20 10 18 14 12 14C6 14 4 10 4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Detalji Zapisa o Ulazu Goriva
            </h2>
            <p className="text-sm opacity-80">
              Pregled informacija o zapisu ulaska goriva, uključujući raspodjelu i dokumente.
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">ID: {record.id}</span>
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6 text-sm">
          {/* Osnovni Podaci o Zapisu */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12H15M9 16H15M9 8H15M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Osnovni Podaci
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Datum i Vrijeme Ulaza:</span>
                  <span className="font-medium text-gray-900">{formatDate(record.intake_datetime)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 w-40 flex-shrink-0">Tip Goriva:</span>
                  <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {record.fuel_type}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 w-40 flex-shrink-0">Kategorija:</span>
                  {record.fuel_category === 'Izvoz' ? (
                    <Badge className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-100">
                      Izvoz
                    </Badge>
                  ) : (
                    <Badge className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-100">
                      Domaće tržište
                    </Badge>
                  )}
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Dostavno Vozilo (Reg.):</span>
                  <span className="font-medium text-gray-900">{record.delivery_vehicle_plate}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Vozač:</span>
                  <span className="font-medium text-gray-900">{record.delivery_vehicle_driver_name || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Količina (L):</span>
                  <span className="font-medium text-gray-900">{record.quantity_liters_received.toLocaleString('bs-BA')} L</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Količina (KG):</span>
                  <span className="font-medium text-gray-900">{record.quantity_kg_received.toLocaleString('bs-BA')} KG</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Specifična Gustoća:</span>
                  <span className="font-medium text-gray-900">{record.specific_gravity.toFixed(4)}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Rafinerija:</span>
                  <span className="font-medium text-gray-900">{record.refinery_name || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Dobavljač:</span>
                  <span className="font-medium text-gray-900">{record.supplier_name || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Broj Dostavnice:</span>
                  <span className="font-medium text-gray-900">{record.delivery_note_number || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Broj carinske prijave/MRN:</span>
                  <span className="font-medium text-gray-900">{record.customs_declaration_number || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Cijena po KG:</span>
                  <span className="font-medium text-gray-900">
                    {typeof record.price_per_kg === 'number' ? record.price_per_kg.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}
                    {record.currency ? ` ${record.currency}` : ''}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Valuta:</span>
                  <span className="font-medium text-gray-900">{record.currency || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-500 w-40 flex-shrink-0">Ukupna cijena:</span>
                  <span className="font-medium text-gray-900">
                    {typeof record.total_price === 'number' ? record.total_price.toLocaleString('bs-BA', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}
                    {record.currency ? ` ${record.currency}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Raspodjela u Fiksne Tankove */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Raspodjela u Fiksne Tankove
              </h3>
            </div>
            {record.fixedTankTransfers && record.fixedTankTransfers.length > 0 ? (
              <div className="p-4">
                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold">Tank</TableHead> 
                        <TableHead className="text-right font-semibold">Količina (L)</TableHead>
                        <TableHead className="font-semibold">Datum i Vrijeme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.fixedTankTransfers.map((transfer, index) => (
                        <TableRow key={transfer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell>
                            {transfer.affectedFixedTank 
                              ? `${transfer.affectedFixedTank.tank_name} (${transfer.affectedFixedTank.tank_identifier})` 
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{transfer.quantity_liters_transferred.toLocaleString('bs-BA')} L</TableCell>
                          <TableCell>{formatDate(transfer.transfer_datetime)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nema raspodjela</h3>
                <p className="mt-1 text-sm text-gray-500">Nema zabilježenih raspodjela u fiksne tankove za ovaj ulaz.</p>
              </div>
            )}
          </section>

          {/* Priloženi Dokumenti */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9.41421C19 9.149 18.8946 8.89464 18.7071 8.70711L13.2929 3.29289C13.1054 3.10536 12.851 3 12.5858 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M13 3V8C13 8.55228 13.4477 9 14 9H19" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Priloženi Dokumenti
              </h3>
            </div>
            {record.documents && record.documents.length > 0 ? (
              <div className="p-4">
                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold">Naziv Dokumenta</TableHead>
                        <TableHead className="font-semibold">Tip Dokumenta</TableHead>
                        <TableHead className="text-right font-semibold">Veličina</TableHead>
                        <TableHead className="text-center font-semibold">Akcije</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.documents.map((doc, index) => (
                        <TableRow key={doc.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell>{doc.document_name}</TableCell>
                          <TableCell>{doc.document_type}</TableCell>
                          <TableCell className="text-right">{(doc.file_size_bytes / (1024*1024)).toFixed(2)} MB</TableCell>
                          <TableCell className="text-center">
                            {onDownloadDocument ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => onDownloadDocument(doc)}
                                className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 10V17M12 17L9 14M12 17L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M17 17V19C17 20.1046 16.1046 21 15 21H9C7.89543 21 7 20.1046 7 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M12 3V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Preuzmi
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Preuzimanje nije aktivno</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nema dokumenata</h3>
                <p className="mt-1 text-sm text-gray-500">Nema priloženih dokumenata za ovaj ulaz.</p>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Button 
            onClick={onClose} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center font-medium shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Zatvori
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 