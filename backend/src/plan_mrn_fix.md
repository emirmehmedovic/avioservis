# Plan za popravak MRN izvještaja i FuelingOperations

## Problem
MRN izvještaj ne prikazuje povezane operacije točenja jer `relatedTransactionId` u `MrnTransactionLeg` zapisima je uvijek `null`. Glavni razlog: kontroler `fuelingOperation.controller.ts` ne stvara pravilne `MrnTransactionLeg` zapise pri točenju.

## Rješenje
Preraditi `createFuelingOperation` da koristi postojeći servis `mrnTransaction.service.ts` za pravilno kreiranje transakcijskih zapisa.

## Zadaci

### 1. Refaktoriranje `createFuelingOperation` funkcije
- **1.1** Ukloniti postojeću manualnu FIFO logiku i zamijeniti je pozivom na servis
  - Zadržati osnovni tok stvaranja `FuelingOperation` zapisa
  - Ukloniti kod koji ručno manipulira s `mobileTankCustoms` zapisima
  - Ukloniti kod za izradu `mrnBreakdown` polja

- **1.2** Implementirati poziv na `processMrnDeduction` servis
  - Prilagoditi parametre da koriste podatke iz novostvorenog `FuelingOperation` zapisa
  - Proslijediti `fuelingOperation.id` kao `related_mrn_transaction_id`
  - Zadržati algoritam za izračun cijene i ostalih potrebnih vrijednosti  

- **1.3** Omotati cijeli proces u Prisma transakciju
  - Koristiti `prisma.$transaction` za atomičnost operacija
  - Osigurati da se sve operacije izvrše ili nijedna (rollback pri grešci)

### 2. Ažuriranje logike za `mrnBreakdown` polje
- **2.1** Prilagoditi kako se `mrnBreakdown` postavlja
  - Dohvatiti rezultat `processMrnDeduction` funkcije
  - Format rezultata pretvoriti u odgovarajući JSON string
  - Ažurirati `FuelingOperation` zapis s novim `mrnBreakdown` stringom

### 3. Testiranje izmjena
- **3.1** Kreiranje nove operacije točenja
  - Kreirati novu operaciju kroz API
  - Provjeriti da li su pravilno kreirani `MrnTransactionLeg` zapisi
  - Potvrditi da `relatedTransactionId` nije null

- **3.2** Testiranje MRN izvještaja
  - Generirati MRN izvještaj koji uključuje novu operaciju
  - Potvrditi da izvještaj sada prikazuje povezanu operaciju točenja
  - Provjeriti da su polja poput `aircraft_registration` i `airlineName` pravilno popunjena

### 4. Dorada frontend aplikacije
- **4.1** Doraditi `FuelIntakeReport.tsx` za korištenje `fuelingOperations` niza
  - Dodati/doraditi tipove za `fuelingOperations`
  - Doraditi funkcije prikaza i generiranja PDF-a

### 5. Dokumentacija i čišćenje
- **5.1** Dokumentirati izmjene i njihov utjecaj
- **5.2** Očistiti eventualne debug izjave u kodu
- **5.3** Dodati komentare koji objašnjavaju novi tok rada

## Redoslijed implementacije
1. Prvo implementirati točku 1 (refaktoriranje `createFuelingOperation`)
2. Zatim implementirati točku 2 (ažuriranje `mrnBreakdown`)
3. Testirati backend funkcionalnost (točka 3)
4. Implementirati promjene na frontendnu (točka 4)
5. Završiti dokumentacijom i čišćenjem (točka 5)
