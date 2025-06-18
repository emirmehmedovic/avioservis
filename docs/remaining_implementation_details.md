# Preostali Zadaci - MRN Fuel System Enhancement

📅 **Kreiran:** 18.06.2025  
🎯 **Cilj:** Finalizacija robusnog MRN fuel tracking sistema s kilogram-centričnom logikom

---

## 📋 Pregled Stanja

### ✅ **Kompletni Zadaci:**
- [x] Backend KG-centrična logika implementirana
- [x] Automatski transfer viška litara u holding tank
- [x] EXCESS_FUEL_HOLDING tank vizualno izdvojen u frontend
- [x] Database connectivity and display issues riješeni
- [x] MRN transaction service refaktoriran
- [x] API endpoint za manual excess fuel processing
- [x] Prisma schema ažuriran s novim enum vrijednostima

### 🔄 **Preostali Zadaci:**

---

## 1. 📊 Verifikacija Holding Tank-a u Total Fuel Calculations

### **Problem:**
Potrebno provjeriti da li se volumen `EXCESS_FUEL_HOLDING` tank-a uključuje u ukupne kalkulacije goriva u frontend.

### **Lokacija:**
- `frontend/src/components/fuel/FixedTanksDisplay.tsx`
- Možda i `TankManagement.tsx` ako se tamo računaju ukupni zbroji

### **Detaljne Upute:**

#### **Korak 1: Provjeri Current Implementation**
```bash
# Provjeri kako se računaju totals u FixedTanksDisplay.tsx
grep -n "totalFuel\|setTotalFuel" frontend/src/components/fuel/FixedTanksDisplay.tsx
```

#### **Korak 2: Analiziraj Logic**
Provjeri da li se u funkciji koja računa `totalFuel` i `totalFuelKg`:
- Uključuje li se holding tank u kalkulacije?
- Treba li biti uključen ili izdvojen?

#### **Korak 3: Implementiraj Fix (ako je potreban)**
```typescript
// Ako holding tank treba biti uključen u totals:
const calculateTotals = () => {
  let totalLiters = 0;
  let totalKg = 0;
  
  // Include all tanks (including holding tank) in totals
  tanks.forEach(tank => {
    totalLiters += tank.current_quantity_liters || 0;
    totalKg += tank.current_kg || 0;
  });
  
  setTotalFuel(totalLiters);
  setTotalFuelKg(totalKg);
};
```

#### **Korak 4: Testiranje**
- Refresh frontend
- Provjeri da li se brojevi u total summary poklapaju s očekivanim vrijednostima
- Posebno provjeri kad holding tank ima sadržaj

---

## 2. 🧪 Testiranje Automatic Excess Liter Transfer

### **Problem:**
Potrebno testirati da li se automatic transfer viška litara pokreće ispravno kada se MRN iscrpi po kilogramima.

### **Trenutno Stanje:**
- Logika implementirana u `mrnTransaction.service.ts` → `closeMrnIfDepleted()`
- Pokreće se kad `remaining_quantity_kg <= 0.001`
- Prebacuje litre > 0.1L u holding tank

### **Detaljne Upute:**

#### **Korak 1: Pripremi Test Environment**
```sql
-- 1. Provjeri trenutno stanje holding tank-a
SELECT * FROM "FixedStorageTanks" WHERE id = 29;

-- 2. Pronađi ili kreiraj test MRN s malim KG ali više litara
SELECT * FROM "TankFuelByCustoms" 
WHERE remaining_quantity_kg > 0 AND remaining_quantity_kg < 5
AND remaining_quantity_liters > 10;
```

#### **Korak 2: Simuliraj MRN Depletion**
Možeš koristiti jedan od ova pristupa:

**Opcija A: Manual Database Update (Za test)**
```sql
-- Pripremi test scenario - postavi MRN da ima 0.001 KG ali 15L
UPDATE "TankFuelByCustoms" 
SET remaining_quantity_kg = 0.001, remaining_quantity_liters = 15.5
WHERE id = [TEST_MRN_ID];
```

**Opcija B: Kroz Fueling Operation**
- Kreiraj fueling operation koja će iscrpiti exact amount KG-a
- Proverti da li se automatic transfer pokrene

#### **Korak 3: Pokreni Test**
```typescript
// U backend/src/services/mrnTransaction.service.ts
// Možeš dodati test funkciju:
export const testExcessTransfer = async (mrnRecordId: number) => {
  await prisma.$transaction(async (tx) => {
    await closeMrnIfDepleted(tx, mrnRecordId, false);
  });
};
```

#### **Korak 4: Verifikacija**
Provjeri:
- `MrnTransactionLeg` - da li je kreiran zapis s `EXCESS_TRANSFER_OUT`
- `FixedStorageTanks` (holding tank) - da li su se povećali litri
- Source MRN - da li su se litri postavili na 0
- Console logs - da li su se ispisali odgovarajući logs

---

## 3. 🔍 Verifikacija MRN Report Endpoint

### **Problem:**
Endpoint `/api/mrn-report` je implementiran ali možda nije potpuno testiran.

### **Lokacija:**
- `backend/src/controllers/fuelIntakeRecord.controller.ts` → `getMrnReport()`
- `backend/src/routes/fuelIntakeRecord.routes.ts`

### **Detaljne Upute:**

#### **Korak 1: Test API Call**
```bash
# Test GET request
curl -X GET "http://localhost:3001/api/mrn-report?mrn=TEST_MRN_NUMBER" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Korak 2: Provjeri Response Format**
Očekivani response:
```json
{
  "mrn": "TEST_MRN_NUMBER",
  "totalKgReceived": 1000.50,
  "totalKgDeducted": 856.20,
  "remainingKg": 144.30,
  "netLiterVariance": -12.5,
  "transactions": [
    {
      "transactionType": "INITIAL_INTAKE",
      "kgTransacted": 1000.50,
      "litersTransactedActual": 1250.00,
      "timestamp": "2025-06-18T10:00:00Z"
    }
  ]
}
```

#### **Korak 3: Fix Issues (ako postoje)**
Mogući problemi:
- TypeScript errors s field names
- Missing includes u Prisma query
- Date formatting issues

---

## 4. 🔧 Verifikacija Manual Excess Fuel Endpoints

### **Problem:**
Endpoints `POST /api/excess` i `GET /api/excess/history` su implementirani ali trebaju verifikaciju.

### **Lokacija:**
- `backend/src/controllers/fuelExcess.controller.ts`
- `backend/src/routes/fuelExcess.routes.ts`

### **Detaljne Upute:**

#### **Korak 1: Test POST /api/excess**
```bash
# Test manual excess fuel processing
curl -X POST "http://localhost:3001/api/excess" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tankId": 1,
    "excessLiters": 25.5,
    "reason": "Manual transfer test",
    "operationalDensity": 0.82
  }'
```

#### **Korak 2: Test GET /api/excess/history**
```bash
# Test excess fuel history retrieval
curl -X GET "http://localhost:3001/api/excess/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Korak 3: Provjeri Functionality**
- Da li se litri pravilno prebacuju iz source tank-a u holding tank?
- Da li se kreiraju pravilni Activity zapisi?
- Da li se response vraća u očekivanom formatu?

---

## 5. 🎨 UI Tooltip Fix za MRN Breakdown

### **Problem:**
MRN tooltip u `TankManagement.tsx` možda ne prikazuje točne MRN detalje pod novom logikom.

### **Lokacija:**
- `frontend/src/components/fuel/TankManagement.tsx`
- Tooltip koji prikazuje MRN breakdown info

### **Detaljne Upute:**

#### **Korak 1: Lociranje Tooltip Code**
```bash
# Pronađi MRN tooltip implementation
grep -n -A 5 -B 5 "tooltip\|Tooltip" frontend/src/components/fuel/TankManagement.tsx
```

#### **Korak 2: Provjeri Data Source**
- Da li tooltip koristi `adaptCustomsDataFormat()` funkciju?
- Da li prikazuje podatke iz backend-a ili radi lokalne kalkulacije?
- Da li se podaci ažuriraju kad se MRN promijeni?

#### **Korak 3: Verifiraj Accuracy**
- Poredi podatke u tooltip-u s podacima iz baze
- Posebno provjeri:
  - `remaining_quantity_kg`
  - `remaining_quantity_liters` 
  - `accumulatedLiterVariance`

#### **Korak 4: Fix Implementation (ako je potreban)**
```typescript
// Primjer ispravke tooltip-a
const formatMrnTooltip = (customsData: any) => {
  return customsData.map((mrn: any) => 
    `${mrn.customs_declaration_number}: ${mrn.remaining_quantity_kg}kg (${mrn.remaining_quantity_liters}L)`
  ).join('\n');
};
```

---

## 6. 🎯 Final Integration Testing

### **Problem:**
End-to-end testiranje kompletnog fuel flow-a s novom logikom.

### **Scenario za Testiranje:**

#### **Test 1: Normal Fueling Operation**
1. Imaj tank s MRN-om koji ima i KG i litre
2. Kreiraj fueling operation koja ne iscrpljuje MRN kompletno
3. Provjeri da li se KG i litri pravilno oduzimaju

#### **Test 2: MRN Depletion s Excess Liters**
1. Kreiraj scenario gdje MRN ima ~1kg ali 20L
2. Fueling operation od 1kg
3. Provjeri da li se automatic transfer pokreće
4. Verifiraj holding tank dobiva 20L

#### **Test 3: Holding Tank Display**
1. Nakon excess transfer-a
2. Provjeri da li se holding tank prikazuje ispravno u UI
3. Verifiraj da li je amber styling primijenjen

---

## 📝 **Tracking Progress**

Označavaj zadatke kako ih završavaš:

- [x] ~~**Task 1**: Holding tank u total calculations~~ ✅ **ZAVRŠENO** - Holding tank se pravilno uključuje u ukupne kalkulacije
- [x] ~~**Task 2**: Automatic excess transfer testing~~ ✅ **ZAVRŠENO** - Automatic transfer se pokreće kad MRN ostane 0 KG + liters > 0.1L (podešeno s 0.001 na 0.1)
- [x] ~~**Task 3**: MRN Report endpoint verification~~ ✅ **ZAVRŠENO** - GET /api/fuel/mrn-report/:mrn endpoint implementiran i funkcionalan
- [x] ~~**Task 4**: Manual excess fuel endpoints verification~~ ✅ **ZAVRŠENO** - POST /api/fuel/excess i GET /api/fuel/excess/history endpointi funkcionalni
- [x] ~~**Task 5**: MRN tooltip accuracy fix~~ ✅ **ZAVRŠENO** - MRN tooltip prikazuje točne remaining quantities i pune MRN brojeve
- [ ] **Task 6**: End-to-end integration testing

---

## 🔧 **Korisni Debug Commands**

```bash
# Restart backend servera
cd backend && npm run dev

# Provjeri Prisma schema
npx prisma studio

# Provjeri console logs
tail -f backend/logs/app.log

# Database query za holding tank
psql $DATABASE_URL -c "SELECT * FROM \"FixedStorageTanks\" WHERE id = 29;"
```

---

## 📞 **Kontakt Info**

Za bilo kakva pitanja ili pojašnjenja tokom implementacije ovih zadataka, referiraj se na:
- `docs/Finalna_promjena.md` - osnovni plan
- `docs/analiza_toka_goriva.md` - detaljna analiza
- Ovaj dokument - specifične implementacijske upute

**Sretno s implementacijom! 🚀**
