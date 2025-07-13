# Plan Implementacije Kumulativnog Tank Sistema

## Pregled
Implementacija sistema gdje se sve gorivo skladišti u jednom velikom kumulativnom tanku (3x kapacitet), dok se prikazuje kao raspoređeno u 3 virtuelna display tanka za vizuelne potrebe.

## 1. Analiza Trenutne Situacije

### Postojeće komponente:
- `FixedStorageTanks` - trenutni tankovi sa realnim kapacitetima
- `TankFuelByCustoms` - MRN zapisi po tankovima
- `FixedTankTransfers` - transferi između tankova
- `FuelIntakeRecords` - unos goriva
- `FuelingOperation` - tocenje goriva

### Trenutni problemi:
- Kompleksna FIFO logika zbog ostataka u više tankova
- Optimalna raspodjela ne prati stvarni FIFO redoslijed
- Transferi kompliciraju praćenje ostataka

## 2. Nova Arhitektura

### 2.1 Kumulativni Tank (Realni)
- **Svrha**: Skladištenje svog goriva u jednom mjestu
- **Kapacitet**: 3x veći od najvećeg postojećeg tanka
- **FIFO**: Jednostavno praćenje u jednom mjestu
- **Operacije**: Sve operacije se rade na ovom tanku

### 2.2 Display Tankovi (Virtuelni)
- **Svrha**: Samo vizuelni prikaz raspoređenog goriva
- **Podaci**: Trenutno L, trenutno kg
- **Izračun**: Ekvivalentna raspodjela iz kumulativnog tanka
- **Funkcionalnost**: Samo prikaz, bez operacija

## 3. Baza Podataka - Promjene

### 3.1 Nova Tablica: `DisplayTanks`
```sql
model DisplayTanks {
  id                    Int      @id @default(autoincrement())
  display_name          String   // "Tank 1", "Tank 2", "Tank 3"
  display_identifier    String   @unique
  fuel_type             String
  virtual_capacity_liters Float  // Originalni kapacitet za prikaz
  virtual_current_liters Float   // Izračunata količina
  virtual_current_kg    Float    // Izračunata količina u kg
  display_order         Int      // Redoslijed prikaza
  is_active             Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([fuel_type])
  @@index([display_order])
}
```

### 3.2 Modifikacija: `FixedStorageTanks`
```sql
-- Dodati kolonu za oznaku kumulativnog tanka
ALTER TABLE "FixedStorageTanks" 
ADD COLUMN is_cumulative_tank BOOLEAN DEFAULT FALSE;

-- Povećati kapacitete postojećih tankova na 3x
-- (Ovo će se raditi kroz migraciju)
```

### 3.3 Modifikacija: `TankFuelByCustoms`
```sql
-- Dodati kolonu za praćenje da li je MRN u kumulativnom tanku
ALTER TABLE "TankFuelByCustoms" 
ADD COLUMN is_cumulative BOOLEAN DEFAULT FALSE;
```

## 4. Backend Implementacija

### 4.1 Migracije
1. **Kreiranje DisplayTanks tablice**
2. **Dodavanje kolona u postojeće tablice**
3. **Povećanje kapaciteta postojećih tankova**
4. **Migracija postojećih podataka**

### 4.2 Novi API Endpointi

#### 4.2.1 Display Tankovi
```typescript
// GET /api/fuel/display-tanks
export const getDisplayTanks = async (fuelType?: string) => {
  // Dohvati display tankove s izračunatim količinama
}

// PUT /api/fuel/display-tanks/:id
export const updateDisplayTank = async (id: number, data: Partial<DisplayTank>) => {
  // Ažuriraj display tank (samo prikaz podaci)
}
```

#### 4.2.2 Kumulativni Tank Operacije
```typescript
// GET /api/fuel/cumulative-tank/:fuelType
export const getCumulativeTank = async (fuelType: string) => {
  // Dohvati kumulativni tank za određeni tip goriva
}

// POST /api/fuel/cumulative-tank/calculate-display
export const calculateDisplayDistribution = async (fuelType: string) => {
  // Izračunaj ekvivalentnu raspodjelu za display tankove
}
```

### 4.3 Modifikacija Postojećih Endpointa

#### 4.3.1 Fuel Intake
```typescript
// Modifikacija createFuelIntake
export const createFuelIntake = async (data: CreateFuelIntakePayload) => {
  // 1. Kreiraj FuelIntakeRecord
  // 2. Dodaj gorivo u kumulativni tank
  // 3. Kreiraj TankFuelByCustoms u kumulativnom tanku
  // 4. Izračunaj i ažuriraj display tankove
}
```

#### 4.3.2 Fueling Operations
```typescript
// Modifikacija fueling operacija
export const createFuelingOperation = async (data: FuelingOperationData) => {
  // 1. Oduzmi gorivo iz kumulativnog tanka (FIFO)
  // 2. Kreiraj FuelingOperation
  // 3. Izračunaj i ažuriraj display tankove
}
```

#### 4.3.3 Tank Transfers
```typescript
// Modifikacija transfera
export const transferFuelBetweenFixedTanks = async (data: TransferData) => {
  // 1. Izvrši transfer u kumulativnom tanku
  // 2. Kreiraj FixedTankTransfers
  // 3. Izračunaj i ažuriraj display tankove
}
```

### 4.4 Logika Izračunavanja Display Tankova

#### 4.4.1 Ekvivalentna Raspodjela
```typescript
const calculateDisplayDistribution = (cumulativeTank: FixedStorageTank, displayTanks: DisplayTank[]) => {
  const totalLiters = cumulativeTank.current_quantity_liters;
  const totalKg = cumulativeTank.current_quantity_kg;
  
  // Jednostavna ekvivalentna raspodjela
  const litersPerTank = totalLiters / displayTanks.length;
  const kgPerTank = totalKg / displayTanks.length;
  
  return displayTanks.map(tank => ({
    ...tank,
    virtual_current_liters: litersPerTank,
    virtual_current_kg: kgPerTank
  }));
}
```

#### 4.4.2 Ažuriranje Display Tankova
```typescript
const updateDisplayTanks = async (fuelType: string) => {
  // 1. Dohvati kumulativni tank
  // 2. Dohvati display tankove
  // 3. Izračunaj raspodjelu
  // 4. Ažuriraj display tankove
}
```

## 5. Frontend Implementacija

### 5.1 Novi Komponenti

#### 5.1.1 DisplayTanksTable
```typescript
// components/fuel/DisplayTanksTable.tsx
interface DisplayTanksTableProps {
  fuelType: string;
  displayTanks: DisplayTank[];
  onRefresh: () => void;
}
```

#### 5.1.2 CumulativeTankInfo
```typescript
// components/fuel/CumulativeTankInfo.tsx
interface CumulativeTankInfoProps {
  fuelType: string;
  cumulativeTank: FixedStorageTank;
}
```

### 5.2 Modifikacija Postojećih Komponenti

#### 5.2.1 NewFuelIntakeFormWizard
```typescript
// Modifikacija distributeOptimallyByMRN
const distributeOptimallyByMRN = async () => {
  // 1. Dohvati kumulativni tank
  // 2. Provjeri kapacitet
  // 3. Kreiraj raspodjelu u kumulativni tank
  // 4. Izračunaj display tankove
}
```

#### 5.2.2 FixedTanksPage
```typescript
// Dodati prikaz display tankova
// Dodati prikaz kumulativnog tanka
// Modifikacija postojećih operacija
```

### 5.3 API Service Modifikacije

#### 5.3.1 Novi API Pozivi
```typescript
// services/fuelService.ts
export const getDisplayTanks = async (fuelType?: string) => {
  return await apiService.get(`/api/fuel/display-tanks${fuelType ? `?fuelType=${fuelType}` : ''}`);
}

export const getCumulativeTank = async (fuelType: string) => {
  return await apiService.get(`/api/fuel/cumulative-tank/${fuelType}`);
}

export const calculateDisplayDistribution = async (fuelType: string) => {
  return await apiService.post('/api/fuel/cumulative-tank/calculate-display', { fuelType });
}
```

## 6. Migracija Podataka

### 6.1 Faza 1: Priprema
1. Kreiranje novih tablica
2. Dodavanje novih kolona
3. Povećanje kapaciteta

### 6.2 Faza 2: Migracija Podataka
1. Identifikacija postojećih tankova
2. Kreiranje kumulativnog tanka
3. Migracija MRN podataka u kumulativni tank
4. Kreiranje display tankova
5. Izračunavanje početne raspodjele

### 6.3 Faza 3: Validacija
1. Provjera integriteta podataka
2. Testiranje novih funkcionalnosti
3. Provjera kompatibilnosti

## 7. Testiranje

### 7.1 Unit Testovi
- Logika izračunavanja display tankova
- API endpointi
- Migracija podataka

### 7.2 Integration Testovi
- Kompletni flow unos -> prikaz -> operacije
- Transferi između tankova
- FIFO logika

### 7.3 E2E Testovi
- Korisnički scenariji
- UI funkcionalnost
- Performanse

## 8. Deployment Plan

### 8.1 Pre-deployment
1. Backup baze podataka
2. Testiranje na staging okruženju
3. Dokumentacija promjena

### 8.2 Deployment
1. Izvršavanje migracija
2. Deployment novog koda
3. Validacija funkcionalnosti

### 8.3 Post-deployment
1. Monitoring performansi
2. Provjera integriteta podataka
3. Korisnička podrška

## 9. Rizici i Mitigacija

### 9.1 Rizici
- Gubitak podataka tijekom migracije
- Performanse s velikim kumulativnim tankom
- Kompleksnost izračunavanja display tankova

### 9.2 Mitigacija
- Detaljni backup plan
- Optimizacija upita
- Jednostavna logika izračunavanja

## 10. Vremenski Plan

### 10.1 Tjedan 1-2: Backend
- Kreiranje migracija
- Implementacija novih API endpointa
- Modifikacija postojećih endpointa

### 10.2 Tjedan 3: Frontend
- Implementacija novih komponenti
- Modifikacija postojećih komponenti
- API integracija

### 10.3 Tjedan 4: Testiranje i Deployment
- Kompletno testiranje
- Migracija podataka
- Deployment

## 11. Kriteriji Uspjeha

### 11.1 Funkcionalni
- ✅ Sve gorivo se skladišti u kumulativnom tanku
- ✅ Display tankovi prikazuju ekvivalentnu raspodjelu
- ✅ FIFO logika radi ispravno
- ✅ Optimalna raspodjela radi bez problema

### 11.2 Tehnički
- ✅ Performanse su zadržane
- ✅ Integritet podataka je očuvan
- ✅ Backward kompatibilnost je zadržana

### 11.3 Korisnički
- ✅ UI je intuitivan
- ✅ Funkcionalnost je jasna
- ✅ Nema gubitka funkcionalnosti 