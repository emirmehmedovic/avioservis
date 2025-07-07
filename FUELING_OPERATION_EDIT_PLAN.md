# Plan za Implementaciju Uređivanja Fueling Operacija

## 1. Analiza Trenutnog Sistema

### 1.1 Trenutna Arhitektura
- **FuelingOperation model** - glavni entitet sa soft delete (`is_deleted`)
- **MRN sistem** - FIFO praćenje goriva po carinskim deklaracijama
- **MrnTransactionLeg** - transakcijski zapisi za praćenje kretanja goriva
- **MobileTankCustoms** - MRN zapisi za mobilne tankove
- **TankFuelByCustoms** - MRN zapisi za fiksne tankove

### 1.2 Ključni Izazovi
1. **FIFO Integritet** - moramo održati redoslijed MRN zapisa
2. **MRN Transakcije** - postojeći MrnTransactionLeg zapisi moraju biti ažurirani
3. **Tank Stanja** - ažuriranje trenutnih stanja u tankovima
4. **Dokumentacija** - praćenje promjena za audit trail

## 2. Strategija za Edit Funkcionalnost

### 2.1 Tipovi Promjena
1. **Nekritične promjene** - datum, vrijeme, napomene, dokumenti
2. **Kritične promjene** - količina (kg/litri), cijena, valuta
3. **Sistemske promjene** - tank, avio kompanija, destinacija

### 2.2 Pristup za Kritične Promjene
- **Revert + Recreate** strategija umjesto direktnog edit-a
- Prvo vraćamo originalnu količinu u MRN zapise
- Zatim kreiramo novu operaciju sa ispravljenim podacima
- Održavamo audit trail kroz Activity log

## 3. Detaljni Plan Implementacije

### 3.1 Backend Implementacija

#### 3.1.1 Novi Controller Metodi
```typescript
// fuelingOperation.controller.ts

// 1. Provjera mogućnosti edit-a
export const checkEditability = async (req: Request, res: Response) => {
  // Provjeri da li operacija može biti editovana
  // - nije starija od X dana
  // - nema povezanih operacija koje ovise o njoj
  // - nije u zatvorenom MRN-u
}

// 2. Edit operacije
export const editFuelingOperation = async (req: Request, res: Response) => {
  // Implementiraj revert + recreate logiku
}

// 3. Preview promjena
export const previewEditChanges = async (req: Request, res: Response) => {
  // Prikaži kako će promjene uticati na sistem
}
```

#### 3.1.2 Novi Servisi
```typescript
// fuelingOperationEdit.service.ts

export class FuelingOperationEditService {
  // 1. Analiza promjena
  async analyzeChanges(originalOp: FuelingOperation, newData: any): Promise<EditAnalysis>
  
  // 2. Provjera mogućnosti edit-a
  async canEdit(operationId: number): Promise<EditabilityCheck>
  
  // 3. Revert originalne operacije
  async revertOperation(operationId: number, tx: PrismaTransactionClient): Promise<void>
  
  // 4. Kreiranje nove operacije
  async createNewOperation(data: any, tx: PrismaTransactionClient): Promise<FuelingOperation>
  
  // 5. Ažuriranje MRN transakcija
  async updateMrnTransactions(originalOp: FuelingOperation, newOp: FuelingOperation, tx: PrismaTransactionClient): Promise<void>
}
```

#### 3.1.3 Validacija i Sigurnost
```typescript
// editValidation.schema.ts

const editFuelingOperationSchema = z.object({
  // Osnovni podaci
  dateTime: z.string().or(z.date()).optional(),
  aircraft_registration: z.string().min(1).optional(),
  airlineId: z.number().int().positive().optional(),
  destination: z.string().min(1).optional(),
  
  // Kritični podaci - zahtijevaju posebnu validaciju
  quantity_liters: z.number().positive().optional(),
  quantity_kg: z.number().positive().optional(),
  specific_density: z.number().positive().optional(),
  price_per_kg: z.number().positive().optional(),
  currency: z.enum(['BAM', 'EUR', 'USD']).optional(),
  
  // Ostali podaci
  tankId: z.number().int().positive().optional(),
  flight_number: z.string().optional(),
  operator_name: z.string().min(1).optional(),
  notes: z.string().optional(),
  tip_saobracaja: z.string().optional(),
  delivery_note_number: z.string().optional(),
  exd_number: z.string().max(50).optional(),
  k_number: z.string().max(50).optional(),
  
  // Edit metadata
  editReason: z.string().min(10, 'Razlog promjene je obavezan (min 10 karaktera)'),
  editNotes: z.string().optional(),
});
```

### 3.2 Frontend Implementacija

#### 3.2.1 Edit Modal Komponenta
```typescript
// EditOperationModal.tsx

interface EditOperationModalProps {
  operation: FuelingOperation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedData: any) => Promise<void>;
}

const EditOperationModal: React.FC<EditOperationModalProps> = ({
  operation,
  isOpen,
  onClose,
  onSave
}) => {
  // 1. Form state management
  // 2. Validation
  // 3. Preview promjena
  // 4. Confirmation dialog za kritične promjene
  // 5. Loading states
}
```

#### 3.2.2 Edit Form Komponenta
```typescript
// EditOperationForm.tsx

const EditOperationForm: React.FC<EditOperationFormProps> = ({
  originalOperation,
  formData,
  onChange,
  errors,
  isSubmitting
}) => {
  // 1. Polja za edit (slično AddOperationForm)
  // 2. Prikaz originalnih vrijednosti
  // 3. Highlight promjena
  // 4. Validacija u real-time
}
```

#### 3.2.3 Preview Komponenta
```typescript
// EditPreviewModal.tsx

const EditPreviewModal: React.FC<EditPreviewModalProps> = ({
  originalData,
  newData,
  changes,
  onConfirm,
  onCancel
}) => {
  // 1. Side-by-side comparison
  // 2. Impact analysis
  // 3. MRN breakdown preview
  // 4. Financial impact
}
```

### 3.3 API Endpoints

#### 3.3.1 Novi Endpoints
```typescript
// routes/fuelingOperations.ts

// 1. Provjera mogućnosti edit-a
router.get('/fueling-operations/:id/editability', checkEditability);

// 2. Preview promjena
router.post('/fueling-operations/:id/preview-edit', previewEditChanges);

// 3. Edit operacije
router.put('/fueling-operations/:id/edit', editFuelingOperation);

// 4. Dohvati edit historiju
router.get('/fueling-operations/:id/edit-history', getEditHistory);
```

## 4. Implementacijski Koraci

### 4.1 Faza 1: Backend Osnove
1. **Kreiraj edit servis** - `FuelingOperationEditService`
2. **Implementiraj validaciju** - edit schema i business rules
3. **Dodaj controller metode** - checkEditability, previewEditChanges
4. **Testiraj revert logiku** - unit testovi za MRN revert

### 4.2 Faza 2: Frontend Osnove
1. **Kreiraj EditModal komponentu** - osnovni UI
2. **Implementiraj EditForm** - form polja i validacija
3. **Dodaj preview funkcionalnost** - prikaz promjena
4. **Integriši sa postojećim tabelom** - edit dugmad

### 4.3 Faza 3: Kritične Funkcionalnosti
1. **Implementiraj revert + recreate** - glavna edit logika
2. **Dodaj MRN transakcije update** - ažuriranje MrnTransactionLeg
3. **Implementiraj audit trail** - Activity log za edit operacije
4. **Dodaj error handling** - rollback mehanizmi

### 4.4 Faza 4: Napredne Funkcionalnosti
1. **Batch edit** - edit više operacija odjednom
2. **Edit historija** - prikaz svih promjena na operaciji
3. **Approval workflow** - za kritične promjene
4. **Export edit log-a** - za audit potrebe

## 5. Sigurnost i Validacija

### 5.1 Business Rules
1. **Vremensko ograničenje** - edit samo operacija starijih od X dana
2. **Zavisnosti** - provjeri da li postoje operacije koje ovise o ovoj
3. **MRN status** - provjeri da li je MRN zatvoren
4. **Korisničke dozvole** - samo određene role mogu editovati

### 5.2 Validacija Promjena
1. **Količina** - ne može biti veća od dostupne u tanku
2. **Datum** - ne može biti u budućnosti
3. **Cijena** - mora biti u razumnim granicama
4. **Valuta** - konzistentnost sa postojećim pravilima

### 5.3 Audit Trail
1. **Activity log** - sve promjene se loguju
2. **Edit historija** - čuvanje svih verzija
3. **User tracking** - ko je napravio promjenu
4. **Timestamp** - kada je promjena napravljena

## 6. Testiranje

### 6.1 Unit Testovi
1. **Edit servis** - testiranje svih metoda
2. **Validacija** - testiranje business rules
3. **MRN revert** - testiranje FIFO logike
4. **Error handling** - testiranje rollback-a

### 6.2 Integration Testovi
1. **End-to-end edit** - kompletan flow
2. **MRN integritet** - provjera FIFO nakon edit-a
3. **Tank stanja** - provjera ažuriranja
4. **Audit trail** - provjera logovanja

### 6.3 Manual Testovi
1. **UI/UX testiranje** - korisnički interfejs
2. **Edge cases** - granični slučajevi
3. **Performance** - testiranje sa velikim količinama
4. **Security** - testiranje dozvola

## 7. Deployment i Monitoring

### 7.1 Deployment
1. **Database migracije** - ako su potrebne
2. **Backend deployment** - novi servisi i controlleri
3. **Frontend deployment** - nove komponente
4. **Configuration** - environment varijable

### 7.2 Monitoring
1. **Edit operacije** - broj i tip promjena
2. **Error rate** - greške u edit procesu
3. **Performance** - vrijeme izvršavanja
4. **User adoption** - koliko se koristi

## 8. Dokumentacija

### 8.1 Korisnička Dokumentacija
1. **User guide** - kako koristiti edit funkcionalnost
2. **Best practices** - preporučeni pristup
3. **Troubleshooting** - rješavanje problema
4. **FAQ** - česta pitanja

### 8.2 Tehnička Dokumentacija
1. **API dokumentacija** - novi endpoints
2. **Database schema** - promjene u modelima
3. **Architecture** - kako funkcioniše edit sistem
4. **Maintenance** - kako održavati sistem

## 9. Risk Assessment

### 9.1 Visoki Rizici
1. **Data integrity** - mogućnost gubitka podataka
2. **Performance** - sporost sa velikim količinama
3. **User error** - pogrešne promjene
4. **System complexity** - teško održavanje

### 9.2 Mitigacija
1. **Comprehensive testing** - detaljno testiranje
2. **Backup strategy** - backup prije svake promjene
3. **User training** - obuka korisnika
4. **Gradual rollout** - postepeno uvođenje

## 10. Zaključak

Implementacija edit funkcionalnosti za fueling operacije je kompleksan zadatak koji zahtijeva pažljivo planiranje i implementaciju. Ključni je održavanje FIFO integriteta i MRN praćenja, što zahtijeva "revert + recreate" pristup umjesto direktnog edit-a.

Predloženi plan osigurava:
- **Data integrity** - održavanje FIFO principa
- **Audit trail** - potpuno praćenje promjena
- **User experience** - intuitivan interfejs
- **System stability** - robustan error handling
- **Scalability** - mogućnost proširenja

Implementacija treba biti fazna, sa fokusom na osnovne funkcionalnosti u prvoj fazi, a napredne funkcionalnosti u kasnijim fazama. 