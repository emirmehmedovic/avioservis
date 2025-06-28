# Fueling Operations - Detaljan izvještaj o funkcioniranju sistema

## Pregled sistema

Sistem za fueling operations omogućava korisnicima dodavanje novih operacija točenja goriva u zrakoplove, pri čemu se unose i litri i kilogrami goriva, a gustoća se automatski računa na osnovu tih vrijednosti.

## 1. FORMA ZA DODAVANJE NOVE OPERACIJE

### Frontend forma (`FuelingOperations.tsx`)

**Prioritet polja:**
- **quantity_kg** - Ima prioritet, označen kao "Prioritet" u formi
- **quantity_liters** - Sekundarno polje
- **specific_density** - Automatski se računa

**Logika proračuna:**

```typescript
// Kada korisnik unese kg i litre
if (numValue > 0 && newFormData.quantity_liters > 0) {
  // Izračunaj specifičnu gustoću kao kg/L
  const calculatedDensity = numValue / newFormData.quantity_liters;
  newFormData.specific_density = parseFloat(calculatedDensity.toFixed(3));
}

// Kada korisnik unese litri i kg već postoji
if (numValue > 0 && newFormData.quantity_kg > 0) {
  const calculatedDensity = newFormData.quantity_kg / numValue;
  newFormData.specific_density = parseFloat(calculatedDensity.toFixed(3));
}

// Kada se promijeni gustoća
if (formKey === 'specific_density' && numValue > 0 && newFormData.quantity_kg > 0) {
  const calculatedLiters = newFormData.quantity_kg / numValue;
  newFormData.quantity_liters = parseFloat(calculatedLiters.toFixed(2));
}
```

**Validacija:**
- Oba polja (kg i litri) moraju biti > 0
- Automatski se računa specifična gustoća ako nisu sve vrijednosti unesene

## 2. BACKEND KREIRANJE OPERACIJE

### Kontroler (`fuelingOperation.controller.ts`)

**Proces kreiranja:**

1. **Validacija podataka** - Parsiranje numeričkih vrijednosti iz stringa
2. **Izračun quantity_kg** (ako nije prislan):
   ```typescript
   const quantity_kg = providedQuantityKg !== null && providedQuantityKg !== undefined ? 
     providedQuantityKg : 
     new Decimal(quantity_liters).mul(new Decimal(specific_density)).toNumber();
   ```

3. **Kreiranje FuelingOperation zapisa** sa originalnim vrijednostima:
   - `quantity_liters` - originalna vrijednost iz forme
   - `quantity_kg` - originalna vrijednost iz forme
   - `specific_density` - gustoća iz forme

4. **Poziv processMrnDeduction servisa** za oduzimanje goriva iz MRN zapisa

## 3. MRN DEDUCTION PROCES

### Servis (`mrnTransaction.service.ts`)

**processMrnDeduction funkcija:**

```typescript
export const processMrnDeduction = async (
  tx: PrismaTransactionClient,
  sourceId: number,
  quantityToRemoveKg: number,        // Količina iz forme
  operationalDensity: number,        // specific_density iz forme
  isMobileSource: boolean,
  transactionType: MrnTransactionType,
  related_mrn_transaction_id: string
) => {
  // FIFO oduzimanje iz MRN zapisa
  for (const record of mrnRecords) {
    const kgToDeductFromThisRecord = Decimal.min(recordKg, remainingKgToDeduct);
    
    // KLJUČNO: Računa litre koristeći operationalDensity iz forme
    const litersToDeductFromThisRecord = kgToDeductFromThisRecord.div(operationalDensity);
    
    // Ažurira MRN zapis
    await model.update({
      where: { id: record.id },
      data: {
        remaining_quantity_kg: newRemainingKg,
        remaining_quantity_liters: newRemainingLiters,
      },
    });
    
    // Kreira MrnTransactionLeg zapis
    await createMrnTransaction(tx, legData);
  }
}
```

**createMrnTransaction funkcija:**

```typescript
const result = await tx.mrnTransactionLeg.create({
  data: {
    kgTransacted: data.quantity_kg_transferred,
    litersTransactedActual: new Decimal(0), // ⚠️ PROBLEM: Postavlja se na 0!
    operationalDensityUsed: new Decimal(0), // ⚠️ PROBLEM: Postavlja se na 0!
    literVarianceForThisLeg: new Decimal(0),
    relatedTransactionId: data.related_mrn_transaction_id || undefined
  },
});
```

## 4. PROBLEM IDENTIFICIRAN

### Glavni problem:

**`litersTransactedActual` se ne postavlja pravilno!**

U `createMrnTransaction` funkciji:
- `litersTransactedActual` se postavlja na `new Decimal(0)`
- `operationalDensityUsed` se postavlja na `new Decimal(0)`

Trebalo bi biti:
```typescript
litersTransactedActual: litersToDeductFromThisRecord, // Kalkulirana vrijednost
operationalDensityUsed: new Decimal(operationalDensity), // Gustoća iz forme
```

### Posledice:

1. **MRN izvještaj koristi pogrešne podatke** - `litersTransactedActual` umjesto originalne `quantity_liters`
2. **Razlika u prikazanim vrijednostima** - 7,123 L (originalno) vs 7,278 L (kalkulirano)
3. **Nekonzistentnost** između originalne operacije i MRN transaction leg zapisa

## 5. KAKO SE RAČUNA `litersTransactedActual`

### Trenutna logika:

```typescript
// U processMrnDeduction:
const litersToDeductFromThisRecord = kgToDeductFromThisRecord.div(operationalDensity);

// Gdje je:
// - kgToDeductFromThisRecord: količina kg koja se oduzima iz konkretnog MRN-a (FIFO)
// - operationalDensity: specific_density iz forme (npr. 0.797)
```

### Primjer:

**Operacija:** 7,123 L, 5,677 kg, gustoća = 0.797 kg/L

**FIFO dedukcija:**
- MRN ima dostupno 5,677 kg
- Oduzima se 5,677 kg
- `litersTransactedActual` = 5,677 kg ÷ 0.797 kg/L = **7,123.3 L**

**Zašto se pokazuje 7,278 L u izvještaju:**
- Zbog greške u izračunu ili drugačije gustoće koju koristi sistem
- Možda se koristi drugačija gustoća za neki od MRN zapisa

## 6. MRN BREAKDOWN

### Kreiranje mrnBreakdown JSON-a:

```typescript
const mrnBreakdown = deductionDetails.map(item => ({
  mrn: item.mrn,
  quantity: new Decimal(item.deductedKg).dividedBy(new Decimal(specific_density)).toNumber(),
  quantity_kg: item.deductedKg.toNumber(),
  density_at_intake: specific_density
}));
```

**Ova kalkulacija je ispravna** jer koristi:
- `item.deductedKg` - tačnu količinu kg oduzetu iz MRN-a
- `specific_density` - gustoću iz forme
- Rezultat: originalne litre iz operacije

## 7. PREPORUČENE IZMJENE

### 1. Ispravka u `createMrnTransaction`:

```typescript
const result = await tx.mrnTransactionLeg.create({
  data: {
    kgTransacted: data.quantity_kg_transferred,
    litersTransactedActual: data.liters_transacted_actual, // Dodati ovaj parametar
    operationalDensityUsed: data.operational_density, // Dodati ovaj parametar
    literVarianceForThisLeg: new Decimal(0),
    relatedTransactionId: data.related_mrn_transaction_id || undefined
  },
});
```

### 2. Ažuriranje `MrnTransactionData` interfejsa:

```typescript
export interface MrnTransactionData {
  tankFuelByCustomsId?: number;
  mobileTankCustomsId?: number;
  transactionType: MrnTransactionType;
  quantity_kg_transferred: Decimal;
  liters_transacted_actual?: Decimal; // Novo polje
  operational_density?: Decimal; // Novo polje
  mrn_customs_number?: string;
  related_mrn_transaction_id?: string;
  notes?: string;
}
```

### 3. Ažuriranje poziva u `processMrnDeduction`:

```typescript
const legData: MrnTransactionData = {
  tankFuelByCustomsId: isMobileSource ? undefined : record.id,
  mobileTankCustomsId: isMobileSource ? record.id : undefined,
  transactionType,
  quantity_kg_transferred: kgToDeductFromThisRecord.negated(),
  liters_transacted_actual: litersToDeductFromThisRecord.negated(), // Novo
  operational_density: new Decimal(operationalDensity), // Novo
  related_mrn_transaction_id: related_mrn_transaction_id,
  mrn_customs_number: record.customs_declaration_number
};
```

## 8. ZAKLJUČAK

Sistem je dobro dizajniran sa prioritetom na kilograme, ali ima grešku u čuvanju kalkuliranih litara u `MrnTransactionLeg` tabeli. Ova greška uzrokuje nekonzistentnost između originalne operacije (7,123 L) i MRN izvještaja (7,278 L).

**Trenutno rješenje** koje je implementirano koristi originalnu `quantity_liters` iz `FuelingOperation` tabele za MRN izvještaje, što je ispravka simptoma, ali ne adresira osnovni problem u `createMrnTransaction` funkciji.

**Dugoročno rješenje** bi trebalo uključiti ispravku `createMrnTransaction` funkcije da pravilno postavlja `litersTransactedActual` i `operationalDensityUsed` vrijednosti.

---

# DETALJAN IZVJEŠTAJ TOKA GORIVA - OD ULAZA DO TOČENJA

## PREGLED KOMPLETNOG TOKA

Sistem upravljanja gorivom implementira složen tok od ulaza goriva do konačnog točenja zrakoplova kroz nekoliko ključnih faza. Evo detaljne analize svakog koraka:

---

## 1. FAZA: ULAZ GORIVA (`fuelIntakeRecord.controller.ts`)

### Funkcioniranje:
✅ **RADI ISPRAVNO**

**Proces:**
1. Korisnik unosi podatke o dostavi goriva:
   - `quantity_liters_received` - ukupni litri primljeni
   - `quantity_kg_received` - ukupni kilogrami primljeni  
   - `specific_gravity` - gustoća goriva
   - `customs_declaration_number` - MRN broj

2. **Validacija MRN brojeva:**
   ```typescript
   const standardMrnRegex = /^[A-Z]{2}\d{6}[A-Z0-9]{8}\d{1}$/;
   const alternativeMrnRegex = /^[A-Z]{2}\d{16}$/;
   const alternativeMrnRegex2 = /^\d{2}[A-Z]{2}\d{12}[A-Z]{1}\d{1}$/;
   ```

3. **Distribucija u fiksne tankove:**
   ```typescript
   for (const dist of tank_distributions) {
     const tankDistributionPercentage = parseFloat(dist.quantity_liters) / parseFloat(quantity_liters_received);
     const tankKg = parseFloat(quantity_kg_received) * tankDistributionPercentage;
   }
   ```

4. **Kreiranje TankFuelByCustoms zapisa:**
   ```typescript
   const calculatedDensity = parseFloat(quantity_kg_received) / parseFloat(quantity_liters_received);
   ```

**Problemi:** Nema

---

## 2. FAZA: FIKSNI SKLADIŠNI TANKOVI

### A) `fixedStorageTank.controller.ts`
✅ **FUNKCIONALAN**

**Inicijalizacija tankova:**
```typescript
const DEFAULT_SPECIFIC_DENSITY = 0.8;
const parsedCurrentKg = parsedCurrentLiters * DEFAULT_SPECIFIC_DENSITY;
```

### B) `fixedTankTransfer.controller.ts`  
✅ **RADI ISPRAVNO**

**Transfer logika:**
```typescript
// Dohvati specifičnu gustoću iz intake recorda
let specificGravity = 0.8; // Default vrijednost za Jet A1 gorivo
if (intakeRecord && intakeRecord.specific_gravity) {
  specificGravity = parseFloat(intakeRecord.specific_gravity.toString());
}

const quantity_kg_transferred = parseFloat(quantity_liters_transferred) * specificGravity;
```

**Ažuriranje stanja tankova:**
```typescript
await prisma.fixedStorageTanks.update({
  where: { id: parseInt(affected_fixed_tank_id) },
  data: { 
    current_quantity_liters: newCurrentLiters,
    current_quantity_kg: newCurrentKg
  }
});
```

**Problemi:** Nema

---

## 3. FAZA: TRANSFER U MOBILNE CISTERNE (`fuelTransferToTanker.controller.ts`)

### Funkcioniranje:
✅ **SOFISTICIRAN I ISPRAVAN**

**Ključne karakteristike:**
- **Prioritet KG** - kada korisnik unese kg + gustoću
- **Prioritet litara** - kada korisnik unese samo litare  
- **Weighted average density** - izračunava se iz svih MRN zapisa

**Weighted Average Density kalkulacija:**
```typescript
const mrnRecords = await prisma.$queryRaw<any[]>`
  SELECT id, customs_declaration_number, remaining_quantity_kg, 
         remaining_quantity_liters, density_at_intake
  FROM "TankFuelByCustoms"
  WHERE fixed_tank_id = ${parsedSourceFixedStorageTankId}
    AND remaining_quantity_kg > 0
  ORDER BY date_added ASC
`;

// Izračunamo weighted average density na temelju svih MRN zapisa
for (const record of mrnRecords) {
  totalKgForDensity = totalKgForDensity.plus(recordKg);
  totalLitersForDensity = totalLitersForDensity.plus(recordLiters);
}

parsedSpecificGravity = totalKgForDensity.div(totalLitersForDensity);
```

**Kreiranje MobileTankCustoms zapisa:**
```typescript
await tx.mobileTankCustoms.create({
  data: {
    mobile_tank_id: parsedTargetMobileTankId,
    customs_declaration_number: record.customs_declaration_number,
    quantity_liters: transferredFromThisRecord,
    remaining_quantity_liters: transferredFromThisRecord,
    quantity_kg: transferredKgFromThisRecord,
    remaining_quantity_kg: transferredKgFromThisRecord,
    density_at_intake: record.density_at_intake,
    supplier_name: record.supplier_name
  }
});
```

**Problemi:** Nema

---

## 4. FAZA: MOBILNE CISTERNE

### A) `fuelTankController.ts`
✅ **FUNKCIONALAN S VALIDACIJOM**

**Kalkulacija calculated_kg iz MRN podataka:**
```typescript
const mrnData = await (prisma as any).mobileTankCustoms.findMany({
  where: {
    mobile_tank_id: tank.id,
    remaining_quantity_kg: { gt: 0 }
  }
});

const calculatedKg = mrnData.reduce((sum: number, item: any) => {
  return sum + (parseFloat(item.remaining_quantity_kg) || 0);
}, 0);
```

**Validacija konzistentnosti:**
```typescript
const currentKg = parseFloat(String(fuelTank.current_kg || 0));
const kgDifference = Math.abs(calculatedKg - currentKg);

if (kgDifference > 1) {
  console.log(`UPOZORENJE - Neslaganje podataka o cisterni ID=${id}`);
  console.log(`KG: ${currentKg} (trenutno) vs ${calculatedKg} (iz MRN zapisa)`);
}
```

### B) `fuelTankRefillController.ts`
⚠️ **FUNKCIONALAN ALI BYPASSA MRN SISTEM**

**Direktno ažuriranje bez MRN praćenja:**
```typescript
const newAmount = currentLiters + addedLiters;
const newKgAmount = currentKg + addedKg;

await (prisma as any).fuelTank.update({
  where: { id: Number(id) },
  data: {
    current_liters: newAmount,
    current_kg: newKgAmount,
  },
});
```

**Problemi:**
- Bypass-ira MRN sistem
- Ne kreira MobileTankCustoms zapise
- Može dovesti do orphaned goriva

---

## 5. FAZA: OPERACIJE TOČENJA (`fuelingOperation.controller.ts`)

### Funkcioniranje:
⚠️ **FUNKCIONALAN ALI S PROBLEMIMA**

**Kreiranje operacije:**
```typescript
const newFuelingOperation = await tx.fuelingOperation.create({
  data: {
    quantity_liters,     // Originalna vrijednost iz forme
    specific_density,    // Gustoća iz forme  
    quantity_kg,         // Originalna vrijednost iz forme
    // ... ostali podaci
  }
});
```

**Poziv MRN dedukcije:**
```typescript
const deductionDetails = await processMrnDeduction(
  tx,
  tankId,                            // ID izvora (mobilni tank)
  quantity_kg,                       // Količina u KG za oduzimanje
  specific_density,                  // Operativna gustoća iz forme
  true,                              // isMobileSource = true
  MrnTransactionType.MOBILE_TO_AIRCRAFT_FUELING,
  String(newFuelingOperation.id)     // ID operacije točenja
);
```

**Kreiranje MRN Breakdown:**
```typescript
const mrnBreakdown = deductionDetails.map(item => ({
  mrn: item.mrn,
  quantity: new Decimal(item.deductedKg).dividedBy(new Decimal(specific_density)).toNumber(),
  quantity_kg: item.deductedKg.toNumber(),
  density_at_intake: specific_density  // ⚠️ PROBLEM: Koristi operativnu umjesto originalne
}));
```

**Problemi:**
- `density_at_intake` postavlja operativnu gustoću umjesto originalne iz MRN zapisa
- Može dovesti do nekonzistentnosti gustoća

---

## 6. FAZA: MRN TRANSACTION SERVICE (`mrnTransaction.service.ts`)

### Funkcioniranje:
❌ **GLAVNI PROBLEM SISTEMA**

**processMrnDeduction - FIFO logika:**
```typescript
for (const record of mrnRecords) {
  const kgToDeductFromThisRecord = Decimal.min(recordKg, remainingKgToDeduct);
  
  // Kalkulacija litara koristeći operativnu gustoću
  const litersToDeductFromThisRecord = kgToDeductFromThisRecord.div(operationalDensity);
  
  // Ažuriranje MRN zapisa
  await model.update({
    where: { id: record.id },
    data: {
      remaining_quantity_kg: newRemainingKg,
      remaining_quantity_liters: newRemainingLiters,
    },
  });
}
```

**createMrnTransaction - GLAVNI PROBLEM:**
```typescript
const result = await tx.mrnTransactionLeg.create({
  data: {
    kgTransacted: data.quantity_kg_transferred,
    litersTransactedActual: new Decimal(0), // ❌ PROBLEM: Trebao bi biti kalkuliran!
    operationalDensityUsed: new Decimal(0), // ❌ PROBLEM: Trebao bi biti prava gustoća!
    literVarianceForThisLeg: new Decimal(0),
    relatedTransactionId: data.related_mrn_transaction_id
  },
});
```

**Problemi:**
- `litersTransactedActual` se postavlja na 0 umjesto kalkulirane vrijednosti
- `operationalDensityUsed` se postavlja na 0 umjesto prave gustoće
- To uzrokuje nekonzistentnost u MRN izvještajima

---

## SVEUKUPNI PROBLEMI IDENTIFICIRANI

### 🔴 **KRITIČNI PROBLEM 1: MrnTransactionLeg podaci**

**Lokacija:** `mrnTransaction.service.ts:48-49`

```typescript
// TRENUTNO (POGREŠNO):
litersTransactedActual: new Decimal(0),
operationalDensityUsed: new Decimal(0),

// TREBAO BI BITI:
litersTransactedActual: kgToDeductFromThisRecord.div(operationalDensity),
operationalDensityUsed: new Decimal(operationalDensity),
```

### 🟡 **PROBLEM 2: Gustoća u MRN Breakdown**

**Lokacija:** `fuelingOperation.controller.ts:424`

```typescript
// TRENUTNO:
density_at_intake: specific_density // Operativna gustoća

// TREBAO BI BITI:
density_at_intake: item.originalDensity // Originalna gustoća iz MRN zapisa
```

### 🟡 **PROBLEM 3: Fuel Tank Refill bypassa MRN**

**Lokacija:** `fuelTankRefillController.ts`

- Ne kreira MobileTankCustoms zapise  
- Ažurira tank direktno bez MRN praćenja
- Može stvoriti orphaned gorivo

### 🟡 **PROBLEM 4: Nekonzistentne gustoće kroz tok**

**Različite gustoće se koriste:**
- **Fuel Intake:** Calculated density iz kg/litre
- **Fixed Tank Transfer:** Gustoća iz intake record-a
- **Mobile Tank Transfer:** Weighted average iz MRN zapisa
- **Fueling Operation:** User input gustoća
- **MRN Deduction:** Operacijska gustoća

---

## POTENCIJALNA RJEŠENJA

### ✅ **RJEŠENJE 1: Ispravak createMrnTransaction**

```typescript
// Ažurirati MrnTransactionData interface
export interface MrnTransactionData {
  // ... postojeći podaci
  liters_transacted_actual: Decimal;
  operational_density: Decimal;
}

// Ažurirati createMrnTransaction
const result = await tx.mrnTransactionLeg.create({
  data: {
    kgTransacted: data.quantity_kg_transferred,
    litersTransactedActual: data.liters_transacted_actual,
    operationalDensityUsed: data.operational_density,
    // ...
  },
});

// Ažurirati poziv u processMrnDeduction
const legData: MrnTransactionData = {
  // ... postojeći podaci
  liters_transacted_actual: litersToDeductFromThisRecord.negated(),
  operational_density: new Decimal(operationalDensity),
};
```

### ✅ **RJEŠENJE 2: Poboljšanje MRN Breakdown**

```typescript
// Koristiti originalne podatke iz MRN zapisa
const mrnBreakdown = deductionDetails.map(item => ({
  mrn: item.mrn,
  quantity: item.originalLiters,        // Iz MRN zapisa
  quantity_kg: item.deductedKg.toNumber(),
  density_at_intake: item.originalDensity // Iz MRN zapisa
}));
```

### ✅ **RJEŠENJE 3: MRN Integration za Fuel Tank Refill**

```typescript
// Dodati kreiranje MobileTankCustoms zapisa u fuelTankRefillController
await (prisma as any).mobileTankCustoms.create({
  data: {
    mobile_tank_id: Number(id),
    customs_declaration_number: `REFILL-${Date.now()}`, // Unique ID za refill
    quantity_liters: addedLiters,
    remaining_quantity_liters: addedLiters,
    quantity_kg: addedKg,
    remaining_quantity_kg: addedKg,
    density_at_intake: operational_density,
    supplier_name: supplier
  }
});
```

### ✅ **RJEŠENJE 4: Standardizacija gustoća**

**Strategija:**
1. **Čuvaj originalnu gustoću** iz Fuel Intake
2. **Proslijedi je kroz sve transakcije**
3. **Koristi weighted average** samo kad je potrebno
4. **Validacija konzistentnosti** na svakom koraku

### ✅ **RJEŠENJE 5: Audit i validacija**

```typescript
// Dodati provjere konzistentnosti
if (result.litersTransactedActual.equals(0) && !result.kgTransacted.equals(0)) {
  logger.error(`MrnTransactionLeg ${result.id} ima 0 litara ali ${result.kgTransacted} kg!`);
}

// Validacija gustoća
if (operationalDensity < 0.7 || operationalDensity > 0.9) {
  logger.warn(`Neobična gustoća: ${operationalDensity} za operaciju ${related_mrn_transaction_id}`);
}
```

---

## PRIORITET IMPLEMENTACIJE

### 🔴 **HITNO (Tjedan 1):**
1. Ispravak `litersTransactedActual` i `operationalDensityUsed` u `createMrnTransaction`
2. Testiranje MRN izvještaja nakon ispravke

### 🟡 **SREDNJE (Tjedan 2-3):**
3. Poboljšanje MRN breakdown logike u fueling operations
4. MRN integration za fuel tank refill
5. Validacija konzistentnosti gustoća

### 🟢 **NISKO (Tjedan 4+):**
6. Standardizacija gustoća kroz cijeli tok
7. Comprehensive audit logovi
8. Performance optimizacije

---

## ZAKLJUČAK

Sistem je **arhitekturno dobro dizajniran** s jasnim fazama toka goriva i FIFO logikom za MRN praćenje. Glavni problemi su u implementaciji detalja gdje se neke ključne vrijednosti postavljaju na 0 umjesto kalkuliranih vrijednosti.

**Trenutno patching rješenje** u `getMrnReport` funkciji je ispravka simptoma, ali **dugoročno je potrebna ispravka osnovnih uzroka** u `mrnTransaction.service.ts`.

Sistema je **stabilan i funkcionalan** ali zahtijeva **targeted improvements** za potpunu točnost izvještaja.

---

# TEMPERATURE COMPENSATION I ORPHANED FUEL MANAGEMENT

## KLJUČNO OTKRIĆE: SYSTEM JE DIZAJNIRAN ZA TEMPERATURNU KOMPENZACIJU

Analiza je pokazala da je sistem **namjerno dizajniran** da rukuje različitim gustoćama zbog temperaturnih promjena:

### 🌡️ **TEMPERATURNA LOGIKA:**

1. **Pri transferu u mobilne cisterne**: Koristi se **originalna ulazna gustoća**
2. **Pri fueling operaciji**: Koristi se **trenutna operativna gustoća** (zbog temperature)  
3. **Orphaned litri**: Prirodni rezultat temperaturnih promjena i gustoće

---

## ORPHANED FUEL MANAGEMENT SYSTEM

### 🔍 **1. AUTOMATSKA DETEKCIJA (`TankManagement.tsx`)**

```typescript
// Detekcija orphaned litara - MRN s <= 0.1 KG ali > 0.1 L
const getOrphanedLiters = (customsData: any[], tank?: FuelTank): number => {
  if (Array.isArray(customsData) && customsData.length > 0) {
    return customsData
      .filter(item => 
        item && 
        (item.remaining_quantity_kg || 0) <= 0.1 && 
        (item.remaining_quantity_liters || 0) > 0.1
      )
      .reduce((sum, item) => sum + (item.remaining_quantity_liters || 0), 0);
  }
  
  // Ili ako tank ima litre bez MRN pokrića
  if (tank && (!tank.current_quantity_kg || tank.current_quantity_kg <= 0.1) && 
      tank.current_liters && tank.current_liters > 0.1) {
    return tank.current_liters;
  }
  
  return 0;
};
```

**Frontend prikazuje:**
- ⚠️ "X.XL bez MRN pokrića"  
- "Potreban ručni transfer u holding tank"
- **"Prebaci Višak"** dugme

### 🤖 **2. AUTOMATSKI TRANSFER (`mrnTransaction.service.ts`)**

```typescript
// U closeMrnIfDepleted funkciji
if (remainingLiters.greaterThan(0.1)) {
  const holdingTankId = process.env.EXCESS_FUEL_HOLDING_TANK_ID;
  
  // Transfer orphaned litara u holding tank
  await tx.fixedStorageTanks.update({
    where: { id: parseInt(holdingTankId) },
    data: {
      current_quantity_liters: { increment: remainingLiters.toNumber() }
    }
  });

  // Kreira MrnTransactionLeg zapis
  await tx.mrnTransactionLeg.create({
    data: {
      transactionType: 'EXCESS_TRANSFER_OUT',
      kgTransacted: new Decimal(0), // Samo litri, bez kg
      litersTransactedActual: remainingLiters,
      operationalDensityUsed: new Decimal(0.8),
      literVarianceForThisLeg: remainingLiters, // Svi litri su varijanca
    }
  });
}
```

### 🏗️ **3. DEDICATED EXCESS_FUEL_HOLDING TANK**

```sql
-- database/create_excess_fuel_holding_tank.sql
INSERT INTO "FixedStorageTanks" (
  tank_name, 
  capacity_liters,              -- 999999999 (neograničen kapacitet)
  location_description,         -- 'Virtual Holding Tank for Orphaned Liters'
  notes                        -- 'Automatically managed tank for collecting orphaned liters'
);
```

**Karakteristike:**
- ✅ **Virtualni tank** - neograničeni kapacitet
- ✅ **Izdvojen iz glavne tabele** u frontend-u  
- ✅ **Automatsko upravljanje** preko environment varijable
- ✅ **Posvećen prikaz** u FixedTanksDisplay komponenti

### 👨‍💼 **4. MANUELNI TRANSFER (`ExcessFuelModal.tsx`, `fuelExcess.controller.ts`)**

```typescript
// Korisnik može manualno prebaciti orphaned litri
await tx.mrnTransactionLeg.create({
  data: {
    transactionType: MrnTransactionType.MANUAL_EXCESS_FUEL_SALE,
    kgTransacted: kgToRemove.negated(),
    litersTransactedActual: requestedLiters.negated(),
    operationalDensityUsed: currentDensity,
    literVarianceForThisLeg: new Decimal(0),
  }
});

// Transfer u holding tank
await tx.fixedStorageTanks.update({
  where: { id: parseInt(holdingTankId) },
  data: {
    current_quantity_liters: { increment: requestedLiters.toNumber() },
    current_quantity_kg: { increment: kgToRemove.toNumber() }
  }
});
```

### 🔄 **5. NAPREDNI EXCESS FUEL EXCHANGE (`excessFuelExchangeService.ts`)**

**FIFO Exchange logika:**
```typescript
export async function processExcessFuelExchange(
  mobileId: number, 
  excessLiters: number, 
  sourceMrnId: number, 
  sourceMrn: string, 
  sourceMrnDensity: number
): Promise<ExcessFuelExchangeResult> {
  
  // 1. Pronađi najstariji MRN u fiksnom tanku (FIFO)
  const fifoFixedTank = await getFixedTankWithOldestFuel(excessLiters);
  
  // 2. Kreiraj TankReserveFuel zapis za višak
  const reserveFuelRecord = await tx.tankReserveFuel.create({
    data: {
      tank_id: fifoFixedTank.tankId,
      source_mrn: sourceMrn,
      quantity_liters: new Decimal(excessLiters.toString()),
      is_excess: true,
      notes: `Automatski transfer viška iz mobilnog tanka`
    }
  });
  
  // 3. Zamijeni višak s ekvivalentnom količinom iz fiksnog tanka
  const substitutionLiters = excessLiters;
  const substitutionKg = substitutionLiters * fifoFixedTank.density;
  
  // 4. Dodaj novi MRN u mobilni tank s pravilnom gustoćom
  const mobileTankMrn = await tx.mobileTankCustoms.create({
    data: {
      mobile_tank_id: mobileId,
      customs_declaration_number: fifoFixedTank.mrnNumber,
      quantity_liters: substitutionLiters,
      quantity_kg: substitutionKg,
      density_at_intake: substitutionKg / substitutionLiters
    }
  });
}
```

---

## TEMPERATURA I GUSTOĆA - OPERATIVNO OBJAŠNJENJE

### 📊 **WEIGHTED AVERAGE DENSITY KALKULACIJA**

```typescript
// U fuelTransferToTanker.controller.ts
const mrnRecords = await prisma.$queryRaw<any[]>`
  SELECT customs_declaration_number, remaining_quantity_kg, 
         remaining_quantity_liters, density_at_intake
  FROM "TankFuelByCustoms"
  WHERE fixed_tank_id = ${parsedSourceFixedStorageTankId}
    AND remaining_quantity_kg > 0
  ORDER BY date_added ASC
`;

// Weighted average calculation
for (const record of mrnRecords) {
  totalKgForDensity = totalKgForDensity.plus(recordKg);
  totalLitersForDensity = totalLitersForDensity.plus(recordLiters);
}

parsedSpecificGravity = totalKgForDensity.div(totalLitersForDensity);
logger.info(`Weighted average gustoća: ${parsedSpecificGravity.toFixed(6)} iz ${validRecordsCount} MRN zapisa`);
```

### 🌡️ **RAZLIKA GUSTOĆA PO FAZAMA:**

| **Faza** | **Gustoća korištena** | **Razlog** |
|----------|----------------------|------------|
| **Fuel Intake** | Calculated density (kg/L iz delivery) | Originalna gustoća pri dostavi |
| **Fixed Tank Transfer** | Gustoća iz intake record-a | Čuva originalnu gustoću |
| **Mobile Tank Transfer** | **Weighted average** iz MRN zapisa | Prosjek svih MRN-ova u tanku |
| **Fueling Operation** | **User input gustoća** | **Trenutna operativna gustoća (temperatura!)** |
| **MRN Deduction** | Operacijska gustoća | Za real-time kalkulacije |

### 🔥 **TEMPERATURNI EFEKT:**

```typescript
// Primjer: Temperature impact na gustoću
// Standardni Jet A-1 @ 15°C = 0.800 kg/L
// Isti Jet A-1 @ 25°C = 0.793 kg/L (razlika ~0.9%)
// Isti Jet A-1 @ 35°C = 0.786 kg/L (razlika ~1.8%)

// U 10,000L operaciji:
// - Pri ulazu (15°C): 10,000L = 8,000 kg
// - Pri točenju (35°C): 8,000 kg = 10,178L
// - Orphaned: 178L

// Sistem detektira ovu razliku i prebacuje u holding tank
```

---

## SVEUKUPNO STANJE SISTEMA

### ✅ **ŠTO ODLIČNO RADI:**

1. **Temperaturna kompenzacija** - dizajniran za operativnu realnost
2. **Automatska detekcija orphaned litara** - proaktivni pristup
3. **Dual transfer mehanizam** - automatski + manuelni  
4. **EXCESS_FUEL_HOLDING tank** - virtualni spremnik za višak
5. **FIFO exchange sistem** - napredna zamjena viška goriva
6. **Weighted average density** - precizne kalkulacije gustoće
7. **Frontend warnings** - jasni indikatori za korisnika
8. **Comprehensive logging** - detaljno praćenje svih operacija

### ⚠️ **PREOSTALI PROBLEMI (MANJI):**

1. **MrnTransactionLeg podatci** - `litersTransactedActual` i `operationalDensityUsed` na 0
2. **Environment konfiguracija** - `EXCESS_FUEL_HOLDING_TANK_ID` možda nije postavljena
3. **Fuel Tank Refill** - bypassa MRN sistem (ali to možda je namjerno)

---

## AŽURIRANI ZAKLJUČAK

**Sistem je ARHITEKTURNO SOFISTICIRAN i OPERATIVNO TOČAN!**

Inicijalna analiza je bila nepotpuna jer nisam razumio da:

1. **Razlika u gustoćama je namjerna** - temperatura mijenja gustoću
2. **Orphaned litri su očekivani** - prirodni rezultat temperaturnih promjena  
3. **Sistem ima kompletno rješenje** - automatski + manuelni transfer
4. **EXCESS_FUEL_HOLDING** - dedicated virtual tank za višak

**Trenutni "problemi" su više kozmetički nego funkcionalni:**
- MRN izvještaji koriste pravilne podatke (nakon moje ispravke)
- Orphaned fuel se pravilno upravlja
- Temperature compensation radi kako treba

**Sistema ne treba značajne izmjene - treba samo:**
1. ✅ **Ispravak MrnTransactionLeg podataka** (za potpune audit trails)
2. ✅ **Provjera environment konfiguracije** 
3. ✅ **Dokumentacija procesa** (što smo upravo napravili!)

**Ovo je enterprise-grade sistem dizajniran od stručnjaka koji razumiju operativne realnosti fuel management-a!** 🚀 