# Plan ažuriranja MRN izvještaja

## Trenutno stanje

Nakon implementacije nove logike za MRN transakcije u `mrnTransaction.service.ts`, došlo je do neusklađenosti između:
- Podataka koje vraća backend kroz `/api/fuel/mrn-report/:mrn` (polje `transactions` umjesto `fuelingOperations`)
- Strukture koju očekuje frontend u `FuelIntakeReport.tsx` (očekuje `fuelingOperations` i pristupa poljima koja možda više ne postoje)

Ovo rezultira greškom: `TypeError: Cannot read properties of undefined (reading 'forEach')` jer komponenta pokušava pristupiti nepostojećem polju `fuelingOperations`.

## Plan implementacije

### 1. Backend provjere i poboljšanja

- [x] **Ažurirati `getMrnReport` kontroler**
  - [x] Provjeriti strukturu objekta koji vraća endpoint `/api/fuel/mrn-report/:mrn`
  - [x] Osigurati da uvijek vraća polje `transactions` (čak i kao prazan niz) umjesto `fuelingOperations`
  - [x] Mapirati `MrnTransactionLeg` zapise u format koji očekuje frontend
  - [x] Dodati potrebna polja koja možda nedostaju u transakcijama (npr. `mrnBreakdown`)

- [x] **Poboljšati logove i dijagnostiku**
  - [x] Dodati detaljnije logiranje u `getMrnReport` za lakše dijagnosticiranje problema
  - [x] Implementirati bolje rukovanje greškama s detaljnijim porukama

### 2. Frontend ažuriranje (FuelIntakeReport.tsx)

- [x] **Tipovi i strukture**
  - [x] Ažurirati tipove i interfaceje da odražavaju novu strukturu podataka
  - [x] Uskladiti očekivani format MRN izvještaja s onim što vraća backend

- [x] **Dohvat i obrada podataka**
  - [x] Ažurirati `fetchMrnBalances` funkciju
    - [x] Promijeniti destrukturiranje iz `const { intake, fuelingOperations } = mrnDetail` u `const { intake, transactions } = mrnDetail`
    - [x] Dodati provjere za null/undefined prije pristupa svojstvima
  
- [x] **Obrada transakcija**
  - [x] Zamijeniti `fuelingOperations.forEach(...)` sa `transactions?.forEach(...)`
  - [x] Ažurirati pristup poljima unutar transakcijskih objekata prema novoj strukturi
  - [x] Dodati provjere za null/undefined za sva polja koja se koriste
  
- [x] **Prikaz podataka u UI**
  - [x] Ažurirati tabelu i komponente za vizualizaciju da ispravno prikazuju nove podatke
  - [x] Provjeriti formatiranje i poravnanje podataka

### 3. Integracija i testiranje

- [x] **Provjeriti ispravnost podataka**
  - [x] Potvrditi da podaci o MRN intakeovima i balansima odgovaraju očekivanjima
  - [x] Verificirati da su podaci o transakcijama ispravno prikazani

- [x] **Testirati granične slučajeve**
  - [x] Testirati slučaj praznog odgovora (nema transakcija)
  - [x] Testirati slučaj s nedostajućim poljima
  - [x] Testirati s različitim tipovima transakcija

- [x] **Testirati generiranje izvještaja**
  - [x] Potvrditi da generiranje PDF-a radi ispravno s novom strukturom podataka
  - [x] Usporediti s očekivanim formatom

### 4. Refaktoring i optimizacije

- [x] **Pojednostaviti logiku**
  - [x] Ukloniti redundantni kod za izračune koji se sada obavljaju u backendu
  - [x] Dokumentirati nova očekivanja i strukture podataka

- [x] **Poboljšati performanse**
  - [x] Minimizirati broj API poziva
  - [x] Implementirati caching za MRN izvještaje gdje je prikladno

### 5. Dokumentacija 

- [x] **Ažurirati komentare u kodu**
  - [x] Dodati JSDoc komentare za kritične funkcije
  - [x] Objasniti glavne promjene u logici obrade MRN podataka

- [x] **Ažurirati tehničku dokumentaciju**
  - [x] Dokumentirati promijenjene strukture API odgovora
  - [x] Zabilježiti ključne algoritamske promjene u obradi MRN podataka

## Prioriteti

1. Prvo riješiti TypeError grešku (ažuriranje strukture podataka)
2. Zatim uskladiti prikaz u UI-u
3. Na kraju dodati poboljšanja i optimizacije
