# Analiza Sistema Upravljanja Gorivom

## Pregled Sistema

Sistem za upravljanje gorivom prati tok goriva kroz nekoliko faza:

1. **Ulaz u Fiksne Tankove** - inicijalni prijem goriva s MRN evidencijom
2. **Fiksni Tankovi → Mobilne Cisterne** - transfer uz FIFO praćenje MRN-ova
3. **Mobilne Cisterne → Avioni** - točenje goriva s razlaganjem MRN-ova

### Ključne Komponente Sistema

1. **Fiksni Skladišni Tankovi** (`fixedStorageTanks`)
   - Primarno skladištenje goriva s MRN evidencijom (`TankFuelByCustoms`)
   - Izvor svog goriva u sistemu
   - Sadrže informacije o gustoći goriva pri ulazu

2. **Mobilne Cisterne** (`FuelTank` i `MobileTankCustoms`)
   - Prijelazno skladištenje za operativno točenje goriva
   - Održavaju odvojene MRN evidencije izvedene iz fiksnih tankova
   - Podložne nepodudarnostima u gustoći/volumenu

3. **Operacije Točenja** (`FuelingOperation`)
   - Finalni zapisi o točenju goriva u avione
   - Bilježe MRN raščlanjenost potrošenog goriva

## Analiza Praćenja MRN Zapisa

### Mehanizam Praćenja
- FIFO (First In, First Out) logika dosljedno primijenjena u:
  - `fuelTransferToTanker.controller.ts` (kod povlačenja iz fiksnih tankova)
  - `fuelingOperation.controller.ts` (kod točenja u avione)
  - Korištenje `removeFuelFromMrnRecordsByKg` utility funkcije za konzistentnu FIFO primjenu

### Identificirani Problemi

1. **Problem Varijacije Gustoće**:
   - Gustoća goriva varira između različitih pošiljki (0.785-0.805 kg/L)
   - Sistem točno prati kg prilikom oduzimanja od izvora, ali volumen (litre) ostaje fiksni
   - Ovo stvara nepodudarnosti tokom vremena gdje mobilni tankovi akumuliraju zapise goriva s kg=0 ali pozitivnim litrama

2. **Rješenje Zamjene Viška Goriva**:
   - `excessFuelExchangeService.ts` sada automatski upravlja zamjenom
   - Uklanja višak litara iz mobilnih tankova i zamjenjuje ekvivalentom iz fiksnih tankova s pravilnim kg vrijednostima
   - `processExcessFuelExchange` upravlja cijelim procesom zamjene u atomskim transakcijama

## Analiza Toka Podataka i Konzistentnosti

### Inicijalni Prijem (Fiksni Tankovi)
- Gorivo ulazi u fiksne tankove s carinskim evidencijama (MRN)
- Svaki MRN uključuje:
  - customs_declaration_number
  - remaining_quantity_liters/kg 
  - density_at_intake (kritično za precizne kg kalkulacije)

### Transfer u Mobilne Tankove
- **Kontroler**: `fuelTransferToTanker.controller.ts`
- **Proces**:
  1. Povlači gorivo iz fiksnih tankova koristeći FIFO na MRN zapisima
  2. Stvara odgovarajuće MRN zapise u mobilnim tankovima
  3. Koristi vrijednosti gustoće za izračun pravilnih kg vrijednosti

### Točenje u Avione
- **Kontroler**: `fuelingOperation.controller.ts`
- **Proces**:
  1. Povlači gorivo iz mobilnih tankova s FIFO prioritetom
  2. Generira detaljnu MRN raščlambu za svaku operaciju
  3. Ažurira preostale količine u mobilnim tankovima

## Potencijalne Tačke Neuspjeha

1. **Rukovanje Gustoćom**
   - Rizik: Nedosljedne vrijednosti gustoće dovode do grešaka u kalkulaciji
   - Uticaj: Mobilni tankovi akumuliraju višak litara s nula kg
   - Ublažavanje: Utility funkcije za gustoću pružaju standardizirane kalkulacije

2. **Sigurnost Transakcija**
   - Rizik: Nedosljednost baze podataka zbog nepotpunih operacija
   - Trenutno Stanje: Transakcijsko procesiranje implementirano u `excessFuelExchangeService.ts`
   - Preporuka: Proširiti korištenje transakcija na sve višekoračne operacije

3. **Rukovanje Greškama**
   - Rizik: Tihi neuspjesi ili nedosljedna stanja
   - Trenutno Stanje: Poboljšano logiranje implementirano u kontrolerima
   - Preporuka: Centralizirati strategiju rukovanja greškama

4. **Automatska Zamjena Viška**
   - Rizik: Ručna zamjena može biti zaboravljena, što dovodi do akumulacije
   - Trenutno Stanje: Cron posao (`excessFuelExchangeJob.ts`) koji se izvršava svaka 2 sata
   - Dobro funkcionira za trenutni obim (~10 transakcija/dan)

## Ključni Metrici i Konzistentnost

Sistem ispravno prioritizira **knjigovodstvo na bazi kilograma** za ukupni balans goriva. Ovaj pristup je ispravan jer:

1. Masa (kg) se čuva kroz cijeli sistem bez obzira na promjene volumena/gustoće
2. Precizno finansijsko praćenje zahtijeva kalkulacije na bazi kg
3. Sigurnosni propisi obično referiraju masu umjesto volumena

## Preporuke za Poboljšanje

### 1. Centralizirana FIFO Usluga
- **Problem**: Trenutno postoje multiple implementacije FIFO logike kroz različite kontrolere
- **Rješenje**: Kreirati dedicirani servis za konzistentne FIFO operacije
- **Implementacija**: 
  - Kreirati `fuelFifoService.ts` koji enkapsulira FIFO logiku
  - Zamijeniti postojeće implementacije u kontrolerima pozivima na centraliziranu uslugu
  - Osigurati konzistentno ponašanje kroz cijeli sistem

### 2. Sveobuhvatno Testiranje
- **Problem**: Nedovoljan test coverage za kompleksne operacije zamjene
- **Rješenje**: Implementirati integracijske testove za cijeli put toka goriva
- **Implementacija**:
  - Kreirati test scenarije za cijeli tok od ulaza do točenja
  - Fokusirati testove na granične slučajeve poput djelomičnog točenja i zamjene viška goriva
  - Implementirati automatizirane testove koji verificiraju konzistentnost MRN-ova

### 3. Sloj Validacije Podataka
- **Problem**: Moguće su nedosljednosti u podacima prije operacija
- **Rješenje**: Dodati pred-operacijsku validaciju za osiguravanje konzistentnosti podataka
- **Implementacija**:
  - Kreirati utility funkcije za validaciju stanja MRN zapisa
  - Implementirati provjere konzistentnosti prije izvršavanja kritičnih operacija
  - Dodati post-operacijsku validaciju kako bi se verificiralo da sistem ostaje konzistentan

### 4. Monitoring i Upozorenja
- **Problem**: Nema automatskog nadzora nad akumulacijom viška goriva
- **Rješenje**: Dodati metrike za praćenje akumulacije viška goriva
- **Implementacija**:
  - Dodati brojače viška litara u mobilnim tankovima
  - Implementirati upozorenja za neuspjele zamjene ili neuobičajene vrijednosti gustoće
  - Kreirati dashboard za nadgledanje zdravlja sistema goriva

### 5. Poboljšanja Performansi
- **Problem**: Neki upiti baze podataka mogu biti optimizirani
- **Rješenje**: Refaktorirati kritične database upite
- **Implementacija**:
  - Dodati indekse za često korištena polja pretrage (customs_declaration_number, mobile_tank_id)
  - Optimizirati MRN lookup upite u `getFixedTankWithOldestFuel`
  - Razmotriti caching za često pristupane podatke o tankovima

### 6. Poboljšanja Korisničkog Iskustva
- **Problem**: Nedovoljno povratnih informacija za korisnike o stanju viška goriva
- **Rješenje**: Poboljšati UI/UX za operacije vezane za višak goriva
- **Implementacija**:
  - Dodati vizualno upozorenje kada mobilni tank akumulira značajan višak litara
  - Implementirati interaktivni način pregledavanja historije zamjene viška
  - Omogućiti ručno pokretanje procesa zamjene viška s detaljnim izvještajem o rezultatima

### 7. Standardizacija Upravljanja Gustoćom
- **Problem**: Različite vrijednosti gustoće korištene kroz sistem
- **Rješenje**: Standardizirati pristup upravljanju gustoćom kroz cijeli sistem
- **Implementacija**:
  - Proširiti densityUtils modul s dodatnim funkcijama za konzistentnu konverziju
  - Zamijeniti sve direktne kalkulacije gustoće s pozivima na standardizirane funkcije
  - Dodati logging bilo kakvih neuobičajenih vrijednosti gustoće

### 8. Dokumentacija
- **Problem**: Nedovoljna dokumentacija o toku goriva i MRN praćenju
- **Rješenje**: Kreirati sveobuhvatnu dokumentaciju
- **Implementacija**:
  - Dokumentirati cijeli proces toka goriva s dijagramima
  - Kreirati reference za sve modele baze podataka vezane za gorivo
  - Dokumentirati procedure rukovanja anomalijama u sistemu goriva

## Zaključak

Sistem upravljanja gorivom pruža robusno praćenje goriva kroz njegov životni ciklus od prijema do točenja. Primarni izazov s viškom goriva (zapisi s nula-kg) je riješen kroz funkcionalnost automatske zamjene, koja održava konzistentnost i kg i litara koristeći pravilno MRN praćenje i rukovanje gustoćom.

Implementirane nadogradnje su značajno poboljšale pouzdanost sistema, a predložena dodatna poboljšanja će dodatno povećati robusnost i održivost sistema na duži rok.

## Appendix: Ključni Fajlovi Sistema

1. **Controllers**:
   - `fuelTransferToTanker.controller.ts` - Upravljanje transferima iz fiksnih u mobilne tankove
   - `fuelingOperation.controller.ts` - Upravljanje operacijama točenja goriva u avione
   - `fuelTankController.ts` - CRUD operacije za tankove goriva
   - `reserveFuel.controller.ts` - Upravljanje rezervnim gorivom i zamjenom viška

2. **Services**:
   - `excessFuelExchangeService.ts` - Servis za automatsku zamjenu viška goriva

3. **Utilities**:
   - `mrnUtils.ts` - Utility funkcije za rad s MRN zapisima
   - `densityUtils.ts` - Utility funkcije za kalkulacije gustoće
   - `transactionUtils.ts` - Utility funkcije za transakcijsko procesiranje

4. **Cron Jobs**:
   - `cron/excessFuelExchangeJob.ts` - Automatska zamjena viška goriva na rasporedu


eh sad ja imam jedno pitanje, kad bismo uklonili ovaj automatsko rješavanje i zamjenu viška goriva, nego da korisnik dobije žuto upozorenje u kartici gdje je mobilni tank, da se pojavio "višak" litara od tog MRN te opciju da vrati taj viša u tank iz kog je nasuto, što bi onda oduzelo samo te litre iz tog tanka, a korisnik bi mogao da "naspe" novo gorivo, koje ima MRN zapis