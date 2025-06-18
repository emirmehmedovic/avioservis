# Finalni Prijedlog Promjena Sustava za Praćenje Goriva (Proširena Verzija)

Ovaj dokument definira trenutno stanje, predlaže novo, robusnije rješenje i pruža detaljan plan implementacije za unapređenje sustava praćenja goriva i MRN (Carinske Deklaracije) integriteta.

---

## 1. Trenutno Stanje i Izazovi (Prošireno)

Sustav je inicijalno dizajniran da koristi kilograme (KG) kao primarnu mjeru za carinske svrhe, ali operativne transakcije (transferi, točenja) često se temelje na litrima (L). Ova dvojnost, u kombinaciji s fizikalnim svojstvima goriva, stvara nekoliko izazova:

*   **Varijacije u Gustoći:** Gustoća goriva mijenja se s temperaturom. To znači da gustoća pri ulasku (`density_at_intake`) može biti različita od operativne gustoće u trenutku točenja.

*   **Generiranje "Viška" Litara:** Sustav trenutno pokušava riješiti problem viška litara (litara bez odgovarajućih KG) kompleksnim mehanizmom automatske zamjene (`processExcessFuelExchange`), koji je netransparentan i sklon greškama.

*   **Kruto Pravilo:** Sustav baca grešku ako se pojavi manjak litara, čak i ako su kilogrami ispravno podmireni.

### 1.1. Ključni Problem: Kompleksnost i Krhkost u Izvještavanju

Analiza ključne funkcionalnosti, **generiranja MRN PDF izvještaja** (`FuelIntakeReport.tsx`), savršeno ilustrira temeljne arhitektonske probleme:

1.  **Odgovornost Prebačena na Frontend:** Gotovo sva ključna logika za izračunavanje potrošnje po MRN-u, provjeru stanja i pripremu podataka za izvještaj događa se na **frontendu**. Ovo je antipattern; frontend bi trebao samo prikazivati podatke, a ne vršiti kompleksne poslovne kalkulacije.

2.  **Ovisnost o Nestrukturiranom JSON-u:** Cijeli izvještaj ovisi o ispravnosti JSON stringa u polju `mrnBreakdown` u `FuelingOperation` modelu. Ako je taj string neispravan, nedostaje ili je drugačijeg formata, cijeli izvještaj postaje netočan. Ovo je izuzetno krhak pristup.

3.  **Frontend "Popravlja" Backend:** Najjasniji signal problema je dio koda u `generateMrnReportPdf` koji **eksplicitno ignorira podatke o balansu dobivene s backenda i ponovno izračunava sve totale**. To je jasan "code smell" koji ukazuje da se podacima s backenda ne može vjerovati i da je potrebna "sanitizacija" na klijentskoj strani. Time se odgovornost za integritet podataka prebacuje na klijenta, što je neodrživo.

Ukratko, trenutna arhitektura je reaktivna i pokušava "popraviti" neslaganja umjesto da ih u startu spriječi, što dovodi do kompleksnosti, nepouzdanosti i teškog održavanja.

---

## 2. Predloženo Robusno Rješenje: Apsolutni Integritet KG

Predlaže se prelazak na sustav koji daje apsolutni prioritet integritetu kilograma i transparentno prati varijacije u litrima.

**Osnovni Principi:**

1.  **Kilogrami su Zakon:** Sve transakcije koje utječu na MRN bilancu moraju biti primarno vođene kilogramima.
2.  **Operativna Gustoća je Ključna:** Svaka transakcija (transfer, točenje) mora zabilježiti stvarnu, operativnu gustoću u tom trenutku.
3.  **Transparentno Praćenje Varijanci:** Umjesto automatske zamjene, sustav će za svaki MRN bilježiti razliku između "očekivanih" i "stvarnih" litara. Ta razlika (`liter_variance`) se akumulira tijekom životnog vijeka MRN-a.
4.  **Korisnička Kontrola i Uvid:** Korisnici putem novog API endpointa i sučelja imaju jasan uvid u sve varijance.

### 2.1. Kako Novo Rješenje Unapređuje Izvještavanje

*   **Backend kao Jedini Izvor Istine:** S novom tablicom `MrnTransactionLeg`, backend postaje jedini i autoritativni izvor istine. On će moći pružiti čistu, pred-filtriranu listu svih transakcija (ulaz i izlaz) za bilo koji MRN.
*   **Drastično Pojednostavljen Frontend:** Funkcija `generateMrnReportPdf` će biti trivijalna. Njena jedina uloga bit će da **prikaže** podatke koje dobije s backenda, bez parsiranja, preračunavanja ili validacije.
*   **Pouzdanost i Brzina:** Izračun salda bit će jednostavna `SUM` operacija na bazi podataka, što je brzo, efikasno i, najvažnije, 100% pouzdano.

---

## 3. Detaljan Plan Implementacije (Bitesize Koraci)

### Faza 1: Priprema i Model Podataka (ZAVRŠENO)

*   **[x] Zadatak 1.1: Ažuriranje `schema.prisma` - Nove Tablice**
    *   Definirana nova tablica `MrnTransactionLeg`.
    *   Definirana nova tablica `MrnClosedVariance`.

*   **[x] Zadatak 1.2: Ažuriranje `schema.prisma` - Postojeće Tablice**
    *   U `TankFuelByCustoms` i `MobileTankCustoms` dodano polje `accumulatedLiterVariance`.

*   **[x] Zadatak 1.3: Prisma Migracija**
    *   Kreirana i izvršena Prisma migracija.

### Faza 2: Backend Logika - Temeljne Promjene (ZAVRŠENO)

*   **[x] Zadatak 2.1: Kreiranje `MrnTransactionService`**
    *   Kreiran novi servis `src/services/mrnTransaction.service.ts`.
    *   Implementirana logika za kreiranje transakcija i ažuriranje varijance.

*   **[x] Zadatak 2.2: Refaktoriranje i Premještanje `removeFuelFromMrnRecordsByKg`**
    *   Logika premještena iz `utils/mrnUtils.ts` u `MrnTransactionService`.
    *   Uklonjena zastarjela logika za `excessLitersToReserve`.
    *   `mrnUtils.ts` je obrisan.

*   **[x] Zadatak 2.3: Uklanjanje `excessFuelExchangeService.ts`**
    *   Datoteka `utils/excessFuelExchangeService.ts` je obrisana i sve reference su uklonjene.

### Faza 3: Backend Logika - Ažuriranje Kontrolera (ZAVRŠENO)

*   **[x] Zadatak 3.1: Ažuriranje `controllers/fuelIntakeRecord.controller.ts`**
    *   Refaktoriran kontroler, uklonjena ovisnost o `mrnUtils`.

*   **[x] Zadatak 3.2: Ažuriranje `controllers/fuelTransferToTanker.controller.ts`**
    *   Ažuriran `create` endpoint, integriran `MrnTransactionService`.

*   **[x] Zadatak 3.3: Ažuriranje `controllers/fuelingOperation.controller.ts`**
    *   Ažuriran `create` endpoint, uklonjena `mrnBreakdown` logika, integriran `MrnTransactionService`.

*   **[x] Zadatak 3.4: Implementacija Logike za "Zatvaranje" MRN-a**
    *   Implementirano u `MrnTransactionService`.

### Faza 4: Backend Logika - Novi Endpoint za Izvještaje (ZAVRŠENO)

*   **[x] Zadatak 4.1: Kreiranje `GET /api/mrn-report/:customsDeclarationNumber`**
    *   Kreirati novi endpoint u `fuelIntakeRecord.routes.ts` i `fuelIntakeRecord.controller.ts`.
    *   Endpoint dohvaća:
        *   Osnovne podatke o MRN-u (`FuelIntakeRecord`).
        *   Sve transakcije iz `MrnTransactionLeg` za taj MRN, sortirane po datumu.
        *   Izračunava konačni saldo (ulaz - izlaz) na temelju sume `kgTransacted`.
    *   Vraća jedan strukturirani JSON objekt spreman za prikaz na frontendu.

### Faza 5: Frontend - Refaktoriranje Izvještaja i Formi

*   **[x] Zadatak 5.1: Ažuriranje `FuelIntakeReport.tsx` - Dohvaćanje Podataka**
    *   Promijeniti `fetch` logiku da poziva novi, jedinstveni endpoint `GET /api/mrn-report/:customsDeclarationNumber`.

*   **[x] Zadatak 5.2: Refaktoriranje `generateMrnReportPdf`**
    *   Potpuno izbaciti svu logiku za parsiranje `mrnBreakdown` i ponovno izračunavanje totala.
    *   Funkcija sada direktno koristi podatke dobivene s novog endpointa.
    *   Glavna tablica u PDF-u sada prikazuje listu transakcija iz `response.transactionLegs`.
    *   Sažetak na kraju PDF-a prikazuje `response.balance` koji je autoritativno izračunat na backendu.

*   **[x] Zadatak 5.3: Ažuriranje UI Formi**
    *   Ažurirati forme za transfer goriva i točenje goriva da zahtijevaju unos **Kilograma** i **Operativne Gustoće**.

### Faza 6: Testiranje i Puštanje u Rad

*   **Zadatak 6.1: Pisanje Testova**
    *   Napisati unit i integracijske testove za `MrnTransactionService`.

*   **Zadatak 6.2: End-to-End Testiranje**
    *   Provesti temeljito testiranje svih ključnih korisničkih scenarija.

*   **Zadatak 6.3: Migracija Postojećih Podataka (Opcionalno)**
    *   Napisati skriptu koja može kreirati inicijalne `MrnTransactionLeg` zapise za postojeće, aktivne MRN-ove.

*   **Zadatak 6.4: Puštanje u Rad**
    *   Planirati i izvršiti puštanje nove verzije u produkciju.

---

## 1. Trenutno Stanje i Izazovi

Sustav je inicijalno dizajniran da koristi kilograme (KG) kao primarnu mjeru za carinske svrhe, ali operativne transakcije (transferi, točenja) često se temelje na litrima (L). Ova dvojnost, u kombinaciji s fizikalnim svojstvima goriva, stvara nekoliko izazova:

*   **Varijacije u Gustoći:** Gustoća goriva mijenja se s temperaturom i drugim faktorima. To znači da gustoća goriva pri ulasku u sustav (`density_at_intake`) može biti različita od operativne gustoće u trenutku transfera ili točenja.

*   **Generiranje "Viška" ili "Manjka" Litara:** Kada se transakcija izvrši na temelju kilograma, sustav koristi povijesnu `density_at_intake` za izračunavanje potrošenih litara sa svakog MRN-a. Ako je operativna gustoća drugačija, stvarni broj istočenih litara neće odgovarati ovom izračunu. To dovodi do pojave "viška" litara (litara bez odgovarajućih KG) ili "manjka" (kada se potroši više litara nego što je sustav očekivao za dane KG).

*   **Trenutno Rješenje - Automatska Zamjena (`processExcessFuelExchange`):** Sustav trenutno pokušava riješiti problem viška litara kompleksnim mehanizmom automatske zamjene. Višak litara iz mobilne cisterne se virtualno prebacuje u fiksni tank, a ista količina litara, ali s validnim MRN-om i KG, uzima se iz fiksnog tanka i dodaje u mobilnu cisternu.

*   **Nedostaci Trenutnog Rješenja:**
    1.  **Složenost:** Logika je kompleksna i teška za praćenje i održavanje.
    2.  **Nedostatak Transparentnosti:** "Peglanje" razlika sakriva stvarne operativne varijacije, što otežava praćenje stvarnog stanja i godišnje obračune.
    3.  **Potencijal za Neuspjeh:** Ako u fiksnom tanku nema odgovarajućeg goriva za zamjenu, proces ne uspijeva, a višak ostaje neriješen.
    4.  **Kruto Pravilo:** Sustav trenutno baca grešku ako se pojavi manjak litara, čak i ako su kilogrami ispravno podmireni, što nije idealno za operativnu fleksibilnost.

## 2. Predloženo Robusno Rješenje: Apsolutni Integritet KG

Predlaže se prelazak na sustav koji daje apsolutni prioritet integritetu kilograma i transparentno prati varijacije u litrima, umjesto da ih pokušava automatski ispraviti.

**Osnovni Principi:**

1.  **Kilogrami su Zakon:** Sve transakcije koje utječu na MRN bilancu moraju biti primarno vođene kilogramima.
2.  **Operativna Gustoća je Ključna:** Svaka transakcija (transfer, točenje) mora zabilježiti stvarnu, operativnu gustoću u tom trenutku. Na temelju nje i unesenih kilograma računaju se stvarni potrošeni litri.
3.  **Transparentno Praćenje Varijanci:** Umjesto automatske zamjene, sustav će za svaki MRN bilježiti razliku između "očekivanih" litara (na temelju `density_at_intake`) i "stvarnih" litara (na temelju operativne gustoće transakcije). Ta razlika (`liter_variance`) se akumulira tijekom životnog vijeka MRN-a.
4.  **Korisnička Kontrola i Uvid:** Kada MRN dosegne 0 KG, njegova ukupna neto varijanca litara se bilježi kao konačna. Korisnici putem novog API endpointa i sučelja imaju jasan uvid u sve varijance, što služi kao podloga za godišnji obračun.

**Prednosti Novog Rješenja:**

*   **Pouzdanost:** Garantira se apsolutna točnost praćenja kilograma po MRN-u.
*   **Transparentnost:** Pruža jasan i točan uvid u operativne viškove i manjkove litara.
*   **Jednostavnost:** Uklanja se kompleksna i krhka logika automatske zamjene.
*   **Fleksibilnost:** Sustav ispravno bilježi stvarne operativne uvjete bez bacanja nepotrebnih grešaka.

---

## 3. Plan Implementacije (Bitesize Koraci)

### Faza 1: Priprema i Model Podataka

*   **Zadatak 1.1: Ažuriranje `schema.prisma` - Nove Tablice**
    *   Definirati novu tablicu `MrnTransactionLeg` za bilježenje svake pojedinačne transakcije koja utječe na MRN.
        *   Polja: `id`, `mrn_customs_record_id`, `transaction_type`, `related_transaction_id`, `kg_transacted`, `liters_transacted_actual`, `operational_density_used`, `liter_variance_for_this_leg`, `timestamp`.
    *   Definirati novu tablicu `MrnClosedVariance` za bilježenje konačne varijance kada MRN dosegne 0 KG.
        *   Polja: `id`, `customs_declaration_number`, `date_mrn_closed`, `total_kg_processed`, `net_liter_variance`.

*   **Zadatak 1.2: Ažuriranje `schema.prisma` - Postojeće Tablice**
    *   U `TankFuelByCustoms` i `MobileTankCustoms` dodati polje `accumulated_liter_variance` (Decimal, default 0).

*   **Zadatak 1.3: Prisma Migracija**
    *   Kreirati i izvršiti Prisma migraciju za primjenu promjena na bazi podataka.

### Faza 2: Backend Logika - Osnovne Funkcije

*   **Zadatak 2.1: Modifikacija `utils/mrnUtils.ts` -> `removeFuelFromMrnRecordsByKg`**
    *   Funkcija mora primati `operational_density` kao obavezan parametar.
    *   Ukloniti svu logiku vezanu za `excessLitersToReserve` i `TankReserveFuel`.
    *   Funkcija treba vraćati detaljan objekt koji sadrži podatke potrebne za kreiranje `MrnTransactionLeg` zapisa za svaki pogođeni MRN.

*   **Zadatak 2.2: Kreiranje Pomoćne Funkcije `createMrnTransactionLeg`**
    *   U `utils/mrnUtils.ts` (ili novom servisu) kreirati funkciju koja prima podatke o transakciji i kreira zapis u `MrnTransactionLeg` tablici.

### Faza 3: Backend Logika - Kontroleri ✓

*   **✓ Zadatak 3.1: Ažuriranje `controllers/fuelIntakeRecord.controller.ts`**
    *   Kod inicijalnog unosa goriva implementirana je funkcija koja stvara `MrnTransactionLeg` zapis s transakcijom tipa `INTAKE_IN`.
    *   Izmijenjen je način praćenja MRN-a - sada se evidentira svaka transakcija kroz `MrnTransactionLeg` model.

*   **✓ Zadatak 3.2: Ažuriranje `controllers/fuelTransferToTanker.controller.ts`**
    *   Zamijenjena zastarjela funkcija `removeFuelFromMrnRecordsByKg` s novom `processMrnDeduction`.
    *   Implementirano praćenje varijanci u litrima kroz `MrnTransactionLeg` zapise za oba smjera transakcije.
    *   Dodan parametar `related_mrn_transaction_id` koji povezuje transfere u istoj transakciji.
    *   Riješeni TypeScript problemi s Decimal tipom podataka.

*   **✓ Zadatak 3.3: Ažuriranje `controllers/fuelingOperation.controller.ts` i `fuelConsistency.controller.ts`**
    *   Uklonjene stroge provjere na manjak litara kada su kilogrami ispravni.
    *   Riješeni TypeScript problemi s Decimal tipom i Math.abs funkcijom.

### Faza 4: Backend Logika - Zatvaranje MRN-a i Čišćenje ✓

*   **✓ Zadatak 4.1: Implementacija Logike za "Zatvaranje" MRN-a**
    *   U `mrnTransaction.service.ts` implementirana funkcija `closeMrnIfDepleted` koja se poziva nakon svake transakcije.
    *   Logika prati stanje `remaining_quantity_kg` i ako je nula, označava MRN zapis kao zatvoren.
    *   Uvedena pravilna evidencija konačne akumulirane varijance litara.

*   **✓ Zadatak 4.2: Uklanjanje Starog Koda**
    *   Izbrisana je datoteka `utils/mrnUtils.ts` i sva njena funkcionalnost prebačena u `mrnTransaction.service.ts`.
    *   Uklonjena zastarjela logika za automatsku zamjenu viška goriva (`excessFuelExchangeService.ts`).
    *   Maknut cron job koji je periodički pozivao `processExcessFuelExchange`.

*   **✓ Zadatak 4.3: Implementacija Ručne Obrade Viška Litara**
    *   Kreiran novi kontroler `fuelExcess.controller.ts` s dvije glavne funkcije:
        * `processExcessFuel` - API endpoint za ručnu evidenciju viška litara (POST /api/fuel/excess)
        * `getExcessFuelHistory` - API endpoint za pregled povijesti obrade viška (GET /api/fuel/excess/history)
    *   Implementirano slijeđenje promjena kroz `Activity` model za reviziju.
    *   Koristi se `FuelTank` model za ažuriranje stanja litara i kilograma u tankerima.

*   **✓ Zadatak 4.4: Implementacija MRN Izvještaja**
    *   Implementiran GET endpoint `/api/fuel/intake-records/mrn-report/:mrn` za pregled transakcija po MRN-u.
    *   Izvještaj koristi nove `MrnTransactionLeg` zapise za točan kronološki prikaz svih transakcija.
    *   Omogućeno praćenje povezanih transakcija kroz `relatedTransactionId` polje.

### Faza 5: API i Frontend ⏳

*   **✓ Zadatak 5.1: Kreiranje Novog API Endpointa**
    *   Implementiran `/api/fuel/intake-records/mrn-report/:mrn` za detaljno praćenje MRN transakcija.
    *   Endpoint prikazuje sve transakcije vezane uz određeni MRN, uključujući varijance u litrima.
    *   Omogućeno kronološko praćenje toka goriva kroz sustav.

*   **✓ Zadatak 5.2: Ažuriranje Frontend Formi**
    *   Potrebno je prilagoditi forme za transfere i točenja goriva da podržavaju unos kilograma i operativne gustoće.

*   **✓ Zadatak 5.3: Kreiranje Frontend Izvještaja**
    *   Potrebno implementirati novu stranicu/komponentu koja poziva `mrn-report` API i prikazuje podatke u tabličnom obliku.

*   **✓ Zadatak 5.4: Implementacija UI Upozorenja**
    *   Potrebno na dashboardu prikazati upozorenje kada postoji višak litara bez MRN-a.
    *   Implementirati formu za ručnu obradu viška litara koja koristi novu API funkcionalnost.

### Faza 6: Testiranje i Puštanje u Rad

*   **Zadatak 6.1: Pisanje Testova**
    *   Napisati unit i integracijske testove za novu logiku, posebno za izračun varijanci i zatvaranje MRN-ova.

*   **Zadatak 6.2: End-to-End Testiranje**
    *   Provesti temeljito testiranje svih ključnih korisničkih scenarija od unosa do točenja.

*   **Zadatak 6.3: Migracija Postojećih Podataka**
    *   Napisati skriptu koja će za postojeće, aktivne MRN-ove inicijalizirati `accumulated_liter_variance` na 0 i kreirati inicijalne `MrnTransactionLeg` zapise ako je potrebno.

*   **Zadatak 6.4: Puštanje u Rad**
    *   Planirati i izvršiti puštanje nove verzije u produkciju.
