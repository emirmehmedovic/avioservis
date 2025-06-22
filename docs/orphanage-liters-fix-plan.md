# Plan za rješavanje problema "Orphanage Liters" (Višak Goriva)

## Opis problema

Uočen je kritični problem u sistemu upravljanja gorivom, posebno kod rukovanja viškom goriva ("orphanage liters"). Trenutna implementacija ima sljedeće nedostatke:

1. **Dupliranje goriva**: Prilikom prebacivanja viška goriva, višak se dodaje i u izvorni tank i u ciljni (EXCESS FUEL) tank, umjesto da se samo prebaci.
2. **Neispravno umanjenje**: Količina goriva u mobilnoj cisterni se ne umanjuje ispravno nakon automatskog prebacivanja viška.
3. **Nesinkronizirane transakcije**: Moguće je da transakcije nisu u potpunosti atomične, što dovodi do djelomičnih ili nekonzistentnih izmjena.

## Analiza koda

Glavni dio logike se nalazi u `utils/excessFuelExchangeService.ts` funkciji `processExcessFuelExchange`:

### Trenutna implementacija

1. Funkcija dobavlja fiksni tank s najstarijim gorivom (FIFO princip) za zamjenu
2. Zatim unutar transakcije:
   - **Korak 1**: Smanjuje `remaining_quantity_liters` u mobilnom tanku MRN zapisu
   - **Korak 2**: Kreira zapis o višku goriva u `TankReserveFuel` modelu, ali ne ažurira stanje fiksnog tanka
   - **Korak 3**: Prenosi istu količinu litara (s ispravnim kg) iz fiksnog u mobilni tank:
     - Umanjuje količinu goriva u MRN zapisu fiksnog tanka
     - Dodaje novi MRN zapis u mobilni tank

### Identificirani problemi

1. **Nedostatak atomičnosti**: Ako dio transakcije ne uspije, mogući su djelomični transferi koji ostavljaju sistem u nekonzistentnom stanju.
2. **Nepotpuna validacija**: Ne vrši se potpuna validacija dostupnih količina prije započinjanja transakcije.
3. **Nedostatak rollback-a**: Ne postoji eksplicitni rollback mehanizam za slučaj djelomičnog uspjeha transakcije.
4. **Neispravno računanje**: Kod za smanjenje količine u mobilnom tanku (`decrement` operacija) možda ne funkcionira kako se očekuje.

## Plan implementacije

### 1. Refaktorisanje modela transakcije

Refaktorisati `processExcessFuelExchange` funkciju za bolju atomičnost i validaciju:

```typescript
export async function processExcessFuelExchange(
  mobileId: number, 
  excessLiters: number, 
  sourceMrnId: number, 
  sourceMrn: string, 
  sourceMrnDensity: number | null
): Promise<ExcessFuelExchangeResult> {
  // Validacija i priprema kao prije...
  
  return await prisma.$transaction(async (tx) => {
    // 1. Eksplicitno dohvatiti trenutno stanje mobilnog tanka (za validaciju)
    const currentMobileTank = await tx.mobileTankCustoms.findUnique({
      where: { id: sourceMrnId }
    });
    
    if (!currentMobileTank || currentMobileTank.remaining_quantity_liters.lessThan(excessLiters)) {
      throw new Error(`Nedovoljno goriva u mobilnom tanku za transfer: ${currentMobileTank?.remaining_quantity_liters || 0}L < ${excessLiters}L`);
    }
    
    // 2. Smanjiti količinu u mobilnom tanku (koristiti apsolutne vrijednosti)
    const updatedRemainingLiters = currentMobileTank.remaining_quantity_liters.sub(new Decimal(excessLiters));
    
    const updatedMobileTank = await tx.mobileTankCustoms.update({
      where: { id: sourceMrnId },
      data: {
        remaining_quantity_liters: updatedRemainingLiters
      }
    });
    
    logger.debug(`Umanjeno stanje: ${currentMobileTank.remaining_quantity_liters} -> ${updatedMobileTank.remaining_quantity_liters} (diff: ${excessLiters}L)`);
    
    // 3. Transfer viška i kreiranje zapisa kao prije...
    
    // 4. Dodavanje novog MRN zapisa u mobilni tank
    // Ostatak logike ostaje isti...
    
    // 5. Dodatna provjera na kraju transakcije
    const finalMobileTank = await tx.mobileTankCustoms.findUnique({
      where: { id: sourceMrnId }
    });
    
    logger.info(`Finalno stanje mobilnog tanka MRN ID=${sourceMrnId}: ${finalMobileTank?.remaining_quantity_liters}L`);
    
    // Nastavak logike i vraćanje rezultata...
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Najviši nivo izolacije
    timeout: 10000 // 10 sekundi timeout za transakciju
  });
}
```

### 2. Poboljšano logiranje i praćenje

Dodati detaljnije logiranje prije, tijekom i nakon svake operacije za lakše praćenje i dijagnostiku:

```typescript
// Primjer poboljšanog logiranja
logger.info({
  action: 'mobileTankUpdate',
  mobileId: sourceMrnId,
  excessLiters,
  beforeValue: currentMobileTank.remaining_quantity_liters.toString(),
  afterValue: updatedMobileTank.remaining_quantity_liters.toString(),
  success: true,
  timestamp: new Date()
});
```

### 3. Ispravka logike prebacivanja viška

1. **Izbjegavanje duplikacije**: Osigurati da se višak goriva uklanja iz izvornog tanka prije nego što se dodaje u ciljni tank.
2. **Potvrda transakcije**: Dodati eksplicitnu provjeru uspješnosti svakog koraka prije nastavka.
3. **Rukovanje greškom**: Poboljšati rukovanje greškom i logging za lakše dijagnosticiranje problema.

### 4. Dodatni sigurnosni mehanizmi

1. Dodati provjeru konzistentnosti nakon završetka transakcije da se osigura da je ukupna količina goriva u sistemu ostala ista.
2. Implementirati periodičnu pozadinsku provjeru za identifikaciju i izvještavanje o nekonzistentnim stanjima.

## Testiranje

1. Napisati test skriptu koja simulira transfer viška goriva iz mobilne cisterne.
2. Provjeriti da se:
   - Količina u mobilnoj cisterni ispravno smanjuje
   - Novi MRN zapis u mobilnoj cisterni ispravno dodaje s odgovarajućim kg vrijednosti
   - Stanje u fiksnom tanku ispravno ažurira
   - Ne dolazi do duplikacije goriva

## Očekivani rezultati

Nakon implementacije, sustav bi trebao:
1. Ispravno prebacivati višak goriva bez dupliranja količina
2. Održavati konzistentno stanje goriva u cijelom sistemu
3. Pružati jasno logiranje i izvještavanje o transferima
4. Biti otporan na greške i probleme u mreži ili bazi podataka

## Vremenski okvir

- Implementacija: 1-2 dana
- Testiranje: 1 dan
- Deployment i monitoring: 1 dan

## Reference

- `utils/excessFuelExchangeService.ts` - Glavna implementacija logike za rukovanje viškom goriva
- `controllers/fuelTransferToTanker.controller.ts` - Kontroler za transfer goriva
- `controllers/reserveFuel.controller.ts` - Kontroler za rezervno gorivo
