# Plan za Rješavanje Problema s Transferom Goriva

## Sažetak Problema

U trenutnoj implementaciji, operacija transferta goriva iz fiksne cisterne u mobilnu cisternu blokira se zbog detekcije nekonzistentnosti u podacima. Ova nekonzistentnost proizlazi iz činjenice da se validacija bazira na usporedbi **volumena goriva (litre)**, što je podložno prirodnim varijacijama zbog temperature, tlaka i drugih vanjskih faktora.

```
[WARN] Tank TANK 2 (ID: 32) is inconsistent. Difference: 236.40 L, Tank Qty: 21257.00 L, MRN Sum: 21020.60 L, Tolerance: 106.29 L
```

Trenutna tolerancija od 0.5% (ili minimalno 50L) nije dovoljna da obuhvati ove prirodne varijacije.

## Ključno Rješenje

Prebaciti fokus provjere konzistentnosti s **litara** na **kilograme**, budući da je **masa konstantna** bez obzira na vanjske faktore poput temperature. Ovo je u skladu s komentarom u kodu koji kaže "KG is authoritative".

## Plan Implementacije

### 1. Izmjene u `utils/fuelConsistencyUtils.ts`

Modificirati funkciju `verifyTankConsistency` da koristi kilograme kao primarnu mjeru za provjeru konzistentnosti:

```typescript
export async function verifyTankConsistency(
  tankId: number, 
  tx?: Prisma.TransactionClient
): Promise<TankConsistencyResult> {
  const client = tx || prisma;
  
  // 1. Dohvatiti podatke o tanku, uključujući i kilograme
  const tank = await client.fixedStorageTanks.findUnique({
    where: { id: tankId },
    select: { 
      id: true, 
      tank_name: true, 
      current_quantity_liters: true,
      current_quantity_kg: true // Dodano - dohvaćamo i kg
    }
  });
  
  // Ostatak koda...
  
  // 2. Izračunati sumu kg za MRN zapise
  const sumMrnQuantitiesKg = mrnRecords.reduce(
    (sum, record) => sum.plus(record.remainingQuantityKg || 0),
    new Decimal(0)
  );
  
  // 3. Definirati toleranciju za kg (manja nego za litre)
  const currentQuantityKg = new Decimal(tank.current_quantity_kg);
  const differenceKg = currentQuantityKg.minus(sumMrnQuantitiesKg).abs();
  const toleranceKg = Decimal.max(currentQuantityKg.mul(0.001), new Decimal(20)); // 0.1% ili 20kg
  
  // 4. Primarno koristiti provjeru po kg
  const isConsistentByKg = differenceKg.lessThanOrEqualTo(toleranceKg);
  
  // 5. Sekundarno koristiti provjeru po litrama, ali s većom tolerancijom
  const sumMrnQuantitiesLiters = mrnRecords.reduce(
    (sum, record) => sum.plus(record.remainingQuantityLiters),
    new Decimal(0)
  );
  
  const currentQuantityLiters = new Decimal(tank.current_quantity_liters);
  const differenceLiters = currentQuantityLiters.minus(sumMrnQuantitiesLiters).abs();
  const toleranceLiters = Decimal.max(currentQuantityLiters.mul(0.02), new Decimal(200)); // 2% ili 200L
  
  // 6. Tank smatramo konzistentnim ako je konzistentan po kg ili po litrama s povećanom tolerancijom
  const isConsistent = isConsistentByKg || differenceLiters.lessThanOrEqualTo(toleranceLiters);
  
  // Ažuriramo logiranje
  if (!isConsistent) {
    logger.warn(
      `Tank ${tank.tank_name} (ID: ${tankId}) is inconsistent. ` +
      `KG: Difference: ${differenceKg.toFixed(2)} kg, Tank: ${currentQuantityKg.toFixed(2)} kg, MRN Sum: ${sumMrnQuantitiesKg.toFixed(2)} kg, Tolerance: ${toleranceKg.toFixed(2)} kg | ` +
      `Liters: Difference: ${differenceLiters.toFixed(2)} L, Tank: ${currentQuantityLiters.toFixed(2)} L, MRN Sum: ${sumMrnQuantitiesLiters.toFixed(2)} L, Tolerance: ${toleranceLiters.toFixed(2)} L`
    );
  }
  
  // 7. Vratiti rezultat s obje provjere
  return {
    tankId: tank.id,
    tankName: tank.tank_name,
    isConsistent,
    isConsistentByKg,
    currentQuantityLiters,
    currentQuantityKg,
    sumMrnQuantitiesLiters,
    sumMrnQuantitiesKg,
    differenceLiters,
    differenceKg,
    toleranceLiters,
    toleranceKg,
    mrnRecords,
  };
}
```

### 2. Ažuriranje `TankConsistencyResult` Interface-a

Potrebno je dopuniti interface da uključi nove polja koja vraća funkcija:

```typescript
export interface TankConsistencyResult {
  tankId: number;
  tankName: string;
  isConsistent: boolean;
  isConsistentByKg: boolean; // Novo polje
  currentQuantityLiters: Decimal;
  currentQuantityKg: Decimal; // Novo polje
  sumMrnQuantitiesLiters: Decimal;
  sumMrnQuantitiesKg: Decimal; // Novo polje
  differenceLiters: Decimal;
  differenceKg: Decimal; // Novo polje
  toleranceLiters: Decimal;
  toleranceKg: Decimal; // Novo polje
  mrnRecords: {
    id: number;
    customsDeclarationNumber: string;
    remainingQuantityLiters: Decimal;
    remainingQuantityKg: Decimal | null;
    dateAdded: Date;
  }[];
}
```

### 3. Sporedni Problem: Negativne Vrijednosti

Dodati validaciju za negativne vrijednosti u MRN zapisima:

```typescript
// Ako su negativne vrijednosti u MRN zapisima problem, dodati logiku za filtriranje ili tretiranje takvih slučajeva
const validMrnRecords = mrnRecords.filter(record => {
  const hasNegativeValues = 
    (record.remainingQuantityLiters && record.remainingQuantityLiters.isNegative()) || 
    (record.remainingQuantityKg && record.remainingQuantityKg.isNegative());
  
  if (hasNegativeValues) {
    logger.warn(`Ignoring negative values in MRN record ID=${record.id}, MRN=${record.customsDeclarationNumber}: L=${record.remainingQuantityLiters}, KG=${record.remainingQuantityKg}`);
    // Ovisno o dogovorenoj politici:
    // 1. Možemo vratiti false da se zapis ignorira
    // 2. Ili vratiti true i posebno tretirati negativne vrijednosti u kalkulaciji
    return false; // Za sada, ignoriramo zapise s negativnim vrijednostima
  }
  return true;
});

// Koristiti validMrnRecords umjesto mrnRecords za kalkulacije
```

## Očekivani Rezultati

1. Operacije prebacivanja goriva iz fiksne cisterne u mobilnu cisternu će raditi bez prekida
2. Prirodne varijacije u volumenu goriva neće više uzrokovati probleme jer će se provjera primarno bazirati na masi
3. Ako se ipak dogodi stvarna nekonzistentnost, sistem će je detektirati i spriječiti potencijalno problematične operacije

## Vremenski Okvir

**Procjena**: 2-3 sata za implementaciju i testiranje.

1. Implementacija izmjena u `fuelConsistencyUtils.ts` - 1 sat
2. Testiranje na razvojnom okruženju - 1 sat
3. Dokumentacija izmjena - 30 min

## Sljedeći Koraci Nakon Implementacije

1. Commitati sve izmjene (rate limit, frontend ispravci, backend fix) s odgovarajućim opisom
2. Push-ati promjene na GitHub
3. Pratiti rad sistema u produkciji da se osigura da su sve operacije uspješne
