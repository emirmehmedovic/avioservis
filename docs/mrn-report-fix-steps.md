# Koraci za Popravak MRN Izvještaja

## Uvod

Ovaj dokument sadrži detaljne korake za rješavanje problema s MRN izvještajem koji ne prikazuje podatke o operacijama točenja goriva. Problem je identificiran u funkciji `getMrnReport` u `fuelIntakeRecord.controller.ts` koja ne uspijeva ispravno dohvatiti i poslati podatke frontendu.

## Faza 1: Popravak Backend Funkcije `getMrnReport`

### Korak 1: Ispravljanje Dohvaćanja Podataka

1. Otvorite `fuelIntakeRecord.controller.ts`
2. Pronađite funkciju `getMrnReport`
3. Izmijenite dio koji dohvaća operacije točenja da ispravno koristi `relatedTransactionId`:

```typescript
// Dohvati povezane FuelingOperation zapise ako postoje
let fuelingOperations: any[] = [];

if (transactionLegs.length > 0) {
  // Izdvoji sve relatedTransactionId vrijednosti koji nisu null
  const relatedIds = transactionLegs
    .map(leg => leg.relatedTransactionId)
    .filter(id => id !== null);
  
  console.log('Related Transaction IDs:', relatedIds);
  
  if (relatedIds.length > 0) {
    // Dohvati povezane operacije točenja
    fuelingOperations = await prisma.fuelingOperation.findMany({
      where: {
        id: {
          in: relatedIds
        }
      },
      include: {
        aircraft: true,
        tank: true,
        user: true
      }
    });
    
    console.log(`Pronađeno ${fuelingOperations.length} povezanih operacija točenja`);
  }
}
```

### Korak 2: Izolacija "Dummy" Operacija

1. Pronađite logiku koja stvara "dummy" operacije
2. Osigurajte da se "dummy" operacije dodaju odvojeno i ne miješaju s pravim operacijama:

```typescript
// Dodaj dummy operacije u posebno polje
const combinedFuelingOperations = [
  ...fuelingOperations,  // Prvo stvarne operacije
  ...dummyFuelingOperations  // Zatim dummy operacije
];

console.log(`Kombinirana lista operacija: ${combinedFuelingOperations.length} ukupno`);
```

### Korak 3: Standardizacija API Odgovora

1. Pronađite dio koda gdje se formira konačni API odgovor
2. Osigurajte da se operacije šalju pod konzistentnim imenom koje frontend očekuje:

```typescript
return {
  mrn,
  transactionLegs,
  // Ovdje koristimo očekivano ime koje frontend traži
  fuelingOperations: combinedFuelingOperations,
  totalConsumption,
  // Ostala polja...
};
```

## Faza 2: Debugging i Praćenje Izvršavanja

### Korak 4: Dodavanje Detaljnih Logova

1. Dodajte logove na ključnim mjestima za lakše debugiranje:

```typescript
// Na početku funkcije
console.log(`getMrnReport pozvan za MRN: ${mrnId}`);

// Nakon dohvaćanja MRN podataka
console.log('MRN podaci:', mrn);

// Nakon dohvaćanja transakcija
console.log(`Pronađeno ${transactionLegs.length} transakcijskih zapisa`);

// Nakon dohvaćanja operacija
console.log('Detalji pronađenih operacija točenja:', 
  fuelingOperations.map(op => ({
    id: op.id,
    aircraft: op.aircraft?.registration,
    datetime: op.operation_datetime
  }))
);

// Prije slanja odgovora
console.log('Struktura API odgovora:', 
  Object.keys(responseObject).map(key => `${key}: ${Array.isArray(responseObject[key]) ? responseObject[key].length + ' items' : 'object'}`)
);
```

## Faza 3: Testiranje i Verifikacija

### Korak 5: Testiranje API Endpointa

1. Pokrenite backend aplikaciju
2. Koristite Postman ili curl za testiranje endpointa:

```bash
curl -X GET "http://localhost:3001/api/fuel-intake-records/mrn-report/123" \
  -H "Authorization: Bearer [token]" | jq
```

3. Provjerite da odgovor sadrži polje `fuelingOperations` s očekivanim podacima

### Korak 6: Provjera na Frontendu

1. Pokrenite frontend aplikaciju
2. Generirajte MRN izvještaj za testni MRN
3. Provjerite u konzoli preglednika da li su podaci ispravno primljeni (Network tab)
4. Potvrdite da PDF izvještaj sadrži sve potrebne detalje o operacijama točenja

## Faza 4: Ujednačavanje Naziva Polja

### Korak 7: Usklađivanje Naziva Polja

Ako još uvijek postoje problemi s prikazom podataka, provjerite i uskladite nazive polja između backenda i frontenda.

Ključna polja koja treba provjeriti:
- `operation_datetime` vs. `dateTime` ili `date` 
- `quantity_liters` vs. `litersTransacted`
- `quantity_kg` vs. `kgTransacted`
- `specific_density` vs. `density`

## Dodatni Resursi

- [FuelingOperation model](link-to-model-file)
- [MrnTransactionLeg model](link-to-model-file)
- [Frontend FuelIntakeReport komponenta](link-to-component)
