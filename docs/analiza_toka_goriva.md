# Analiza Sustava Goriva i MRN Konzistentnosti

## 1. Uvod

Ovaj dokument pruža detaljnu analizu sustava za praćenje protoka goriva unutar aplikacije AvioServis, s posebnim fokusom na osiguravanje integriteta MRN (Carinske Deklaracije) brojeva. Glavni cilj analize je provjeriti da li količina goriva u kilogramima (KG) koja ulazi u sustav odgovara količini koja izlazi, za svaki pojedinačni MRN, kroz sve faze: od prijema goriva, preko internih transfera između fiksnih i mobilnih cisterni, do konačnog točenja u zrakoplove.

Analiza obuhvaća sljedeće ključne komponente i procese:

*   Prijem goriva (`fuelIntakeRecord.controller.ts`)
*   Transferi iz prijema u fiksne tankove (`fixedTankTransfer.controller.ts`)
*   Upravljanje mobilnim cisternama (`fuelTankController.ts`)
*   Transferi iz fiksnih tankova u mobilne cisterne (`fuelTransferToTanker.controller.ts`)
*   Operacije točenja goriva (`fuelingOperation.controller.ts`)
*   Pomoćne funkcije za rad s MRN-ovima (`mrnUtils.ts`)
*   Servis za zamjenu viška goriva (`excessFuelExchangeService.ts`)

## 2. Arhitektura Sustava i Protok Goriva

Sustav je dizajniran da prati gorivo od ulaza do potrošnje, s kilogramima kao primarnom mjernom jedinicom za MRN svrhe, dok se litri također prate ali mogu varirati zbog promjena u gustoći.

**Glavni koraci u protoku goriva:**

1.  **Prijem Goriva (`FuelIntakeRecord`):** Gorivo ulazi u sustav s MRN brojem. Bilježe se uneseni litri i kilogrami (ili se KG računa iz litara i specifične gustoće). Gorivo se zatim raspoređuje u jedan ili više fiksnih tankova (`FixedTankTransfer`). Za svaki fiksni tank u koji se gorivo prebacuje, kreira se ili ažurira zapis u `TankFuelByCustoms` koji veže MRN, količinu (L i KG) i gustoću pri unosu (`density_at_intake`) za taj tank.
    *   Kontroler: `fuelIntakeRecord.controller.ts`
    *   Pomoćna funkcija: `upsertMrnRecord` (u `mrnUtils.ts`)

2.  **Transfer iz Fiksnog Tanka u Mobilnu Cisternu (`FuelTransferToTanker`):** Kada se gorivo prebacuje iz fiksnog tanka u mobilnu cisternu, sustav koristi FIFO logiku na temelju kilograma iz `TankFuelByCustoms` zapisa fiksnog tanka.
    *   Kontroler: `fuelTransferToTanker.controller.ts`
    *   Pomoćna funkcija: `removeFuelFromMrnRecordsByKg` (u `mrnUtils.ts`)
    *   Iz fiksnog tanka se oduzimaju KG i proporcionalni L (na temelju `density_at_intake` originalnog MRN-a).
    *   U mobilnu cisternu (`MobileTankCustoms`) dodaje se novi zapis za svaki MRN iz kojeg je gorivo uzeto, s odgovarajućim KG i L, te `density_at_intake` preuzetom iz originalnog `TankFuelByCustoms` zapisa.
    *   **Potencijalna točka varijacije litara:** Litri oduzeti iz fiksnog tanka (ukupno) mogu se razlikovati od sume litara dodanih u mobilnu cisternu (po MRN-ovima) ako su gustoće različitih MRN-ova koji sudjeluju u transferu različite.

3.  **Operacija Točenja Goriva (`FuelingOperation`):** Gorivo se toči iz mobilne cisterne u zrakoplov.
    *   Kontroler: `fuelingOperation.controller.ts`
    *   Unose se `quantity_liters` i `specific_density` operacije. `quantity_kg` se računa ako nije direktno unesen.
    *   Sustav koristi FIFO logiku na temelju kilograma iz `MobileTankCustoms` zapisa mobilne cisterne.
    *   Za svaki MRN iz kojeg se oduzimaju KG, litri se računaju kao `KG_odučeno_iz_MRN / density_at_intake_tog_MRN_a`.
    *   Suma ovako izračunatih litara (`totalDeductedLiters`) uspoređuje se s traženom `quantity_liters` operacije.
    *   Ako je `totalDeductedLiters < quantity_liters` (manjak litara unatoč podmirenim KG), sustav trenutno baca grešku.
    *   Ako je `totalDeductedLiters > quantity_liters` (višak litara), poziva se `processExcessFuelExchange`.

4.  **Rukovanje Viškom Litara (`processExcessFuelExchange`):** Ako se u mobilnoj cisterni pojavi višak litara (litri bez odgovarajućih KG nakon što su KG nekog MRN-a potrošeni), ovaj servis pokušava zamijeniti te "prazne" litre za litre s validnim MRN-om iz fiksnog tanka (FIFO).
    *   Servis: `excessFuelExchangeService.ts`
    *   Višak litara (i njihova teoretska KG vrijednost na temelju originalne gustoće) se evidentira kao `TankReserveFuel` u fiksnom tanku.
    *   Ista količina litara, ali s KG i MRN-om iz najstarijeg dostupnog zapisa u fiksnom tanku, prebacuje se u mobilnu cisternu.

## 3. Ključni Mehanizmi i Zapažanja

*   **Kilogrami kao osnova:** Sustav dosljedno koristi kilograme kao glavnu mjeru za praćenje MRN bilanci i FIFO logiku. Ovo je ispravan pristup s obzirom na carinske zahtjeve.
*   **`density_at_intake`:** Gustoća zabilježena pri prvom unosu MRN-a u sustav (`TankFuelByCustoms.density_at_intake` i `MobileTankCustoms.density_at_intake`) je ključna. Koristi se za:
    *   Izračunavanje proporcionalnih litara prilikom oduzimanja kilograma.
    *   Izračunavanje kilograma viška goriva koji se šalje u `TankReserveFuel`.
    *   Preciznost ove vrijednosti direktno utječe na točnost praćenja litara i generiranje/obradu viškova.
*   **FIFO Logika:** Primjenjuje se konzistentno pri transferima iz fiksnih u mobilne tankove i pri točenju iz mobilnih tankova, uvijek na temelju datuma dodavanja MRN zapisa i raspoloživih kilograma.
*   **Automatska sinkronizacija stanja tankova:**
    *   `fuelTankController.ts` (za mobilne cisterne) ima mehanizam koji periodično ili na zahtjev sinkronizira ukupne količine u `FuelTank` tablici sa sumom količina iz `MobileTankCustoms` zapisa. Ovo pomaže u ispravljanju manjih diskrepancija, ali česte korekcije mogu ukazivati na dublje probleme.
*   **Generiranje viška/manjka litara:**
    *   **Transfer Fiksni -> Mobilni:** Različite gustoće MRN-ova unutar jednog transfera mogu dovesti do toga da suma litara dodanih u mobilnu cisternu (po MRN-u) nije jednaka ukupnim litrima oduzetim iz fiksnog tanka (koji se mogu računati na temelju prosječne gustoće ili ukupnih KG/L).
    *   **Točenje Mobilni -> Avion:** Ako je `specific_density` operacije točenja različita od prosječne `density_at_intake` MRN-ova koji se troše, doći će do razlike između `quantity_liters` operacije i `totalDeductedLiters` (suma litara izračunatih po MRN-u).
    *   **Potrošnja MRN-a do 0 KG:** Kada se `remaining_quantity_kg` MRN zapisa svede na nulu, preostali `remaining_quantity_liters` (ako ih ima zbog gustoće) postaju višak.

## 4. Identificirane Potencijalne Točke Kvara i Nekonzistentnosti

1.  **Brisanje Transfera u Fiksni Tank (`fixedTankTransfer.controller.ts` - `deleteFixedTankTransfer`):**
    *   **Problem:** Prilikom brisanja transfera, ažuriraju se `current_quantity_liters` i `quantity_liters` u `FixedStorageTanks` i `TankFuelByCustoms`, ali se **ne ažuriraju odgovarajuće količine kilograma**. Ovo može dovesti do ozbiljne nekonzistentnosti mase goriva u fiksnim tankovima i MRN zapisima.
    *   **Preporuka:** Hitno ispraviti logiku brisanja da uključuje proporcionalno vraćanje kilograma na temelju `density_at_intake` povezanog MRN-a ili originalnog transfera.

2.  **Rukovanje manjkom litara pri točenju (`fuelingOperation.controller.ts`):**
    *   **Problem:** Ako se prilikom točenja podmire svi potrebni kilogrami, ali je suma izračunatih litara po MRN-ovima (`totalDeductedLiters`) manja od traženih litara operacije (`quantity_liters`), sustav baca grešku. Ovo je prestrogo jer su kilogrami primarni, a varijacije u litrima su očekivane.
    *   **Preporuka:** Modificirati logiku tako da ako su kilogrami podmireni, operacija se smatra uspješnom. Zabilježiti `quantity_liters` (traženo) i `totalDeductedLiters` (stvarno izračunato na temelju MRN-ova i njihovih gustoća). Razlika se može zabilježiti kao operativna varijacija, ali ne bi trebala blokirati operaciju ako su KG ispravni.

3.  **Pouzdanost i unos `density_at_intake`:**
    *   **Problem:** Ako se `density_at_intake` ne unese točno pri prijemu goriva ili se koristi neprecizna default vrijednost, svi daljnji izračuni litara i kilograma za taj MRN bit će netočni. Ovo se posebno odnosi na `removeFuelFromMrnRecordsByKg` i `processExcessFuelExchange`.
    *   **Preporuka:** Osigurati strogu validaciju i obavezan unos točne gustoće pri svakom prijemu goriva. Razmotriti kalibracijske procedure i redovite provjere mjernih uređaja.

4.  **Neuspjeh `processExcessFuelExchange`:**
    *   **Problem:** Ako servis za zamjenu viška ne pronađe odgovarajući fiksni tank s dovoljno goriva (i L i KG) za zamjenu, višak litara ostaje u mobilnoj cisterni bez pokrića. Ovo može dovesti do akumulacije "praznih" litara.
    *   **Preporuka:** Implementirati sustav notifikacija za administratore kada zamjena viška ne uspije, kako bi mogli manualno intervenirati ili osigurati da fiksni tankovi imaju dovoljno zaliha. Razmotriti periodični izvještaj o neuspjelim zamjenama.

5.  **Zaokruživanje i `Decimal` tipovi:**
    *   **Problem:** Iako se koristi `Decimal` za precizne izračune, na nekim mjestima u kodu (npr. `fuelingOperation.controller.ts` prije poziva `removeFuelFromMrnRecordsByKg`) vrijednosti se konvertiraju u `Number` (`parseFloat`), što može dovesti do gubitka preciznosti. Usporedbe poput `remainingQuantityToRemoveKg <= 0.001` su dobre, ali konzistentna upotreba `Decimal` objekata i njihovih metoda za usporedbu (`.equals()`, `.greaterThan()`, itd.) je poželjnija.
    *   **Preporuka:** Revidirati kod i osigurati da se `Decimal` objekti koriste za sve aritmetičke operacije i usporedbe gdje je god moguće, kako bi se minimizirale greške zaokruživanja.

6.  **Logika brisanja operacije točenja (`fuelingOperation.controller.ts` - `deleteFuelingOperation`):**
    *   **Problem:** Ako je `processExcessFuelExchange` bio pozvan prilikom kreiranja operacije, brisanje pokušava pozvati `reverseExcessFuelExchange`. Potrebno je osigurati da je ova reverzna logika robusna i da ispravno vraća stanja u svim scenarijima, uključujući i ako originalni MRN-ovi (iz fiksnog tanka koji je korišten za zamjenu) više ne postoje ili nemaju dovoljno kapaciteta.
    *   **Preporuka:** Detaljno testirati scenarije brisanja operacija točenja koje su uključivale zamjenu viška. Razmotriti bilježenje svih koraka zamjene kako bi reverzna operacija bila što preciznija.

## 5. Predložena Poboljšanja i Zaštitne Mjere

1.  **Ispraviti kritične greške:** Prioritetno riješiti problem s neažuriranjem kilograma prilikom brisanja `FixedTankTransfer`.
2.  **Poboljšati rukovanje manjkom litara pri točenju:** Dozvoliti operaciju ako su KG podmireni, bilježeći varijaciju litara.
3.  **Unaprijediti korisničko sučelje za unos gustoće:** Jasno naznačiti važnost točnog unosa `density_at_intake` i implementirati stroge validacije.
4.  **Sustav upozorenja:** Implementirati upozorenja za administratore u slučaju neuspjeha automatske zamjene viška goriva.
5.  **Periodični izvještaji o konzistentnosti:** Generirati izvještaje koji pokazuju ukupne KG po MRN-u kroz sustav (ulaz, fiksni tankovi, mobilne cisterne, izlaz) kako bi se lakše uočile eventualne diskrepancije.
6.  **Detaljnije logiranje:** Proširiti logiranje ključnih operacija (transferi, točenja, zamjene viška) s više detalja o količinama (L i KG) i gustoćama koje se koriste u izračunima. Ovo će pomoći u dijagnostici problema.
7.  **Razmotriti "Dead Letter Queue" za neuspjele zamjene:** Ako zamjena viška ne uspije, umjesto da se samo zabilježi greška, staviti zahtjev u red za kasniju obradu ili manualnu intervenciju.
8.  **Edukacija korisnika:** Osigurati da korisnici razumiju važnost točnog unosa podataka, posebno gustoće, i implikacije na MRN praćenje.

## 6. Zaključak

Sustav za praćenje goriva i MRN brojeva ima solidnu osnovu, s fokusom na kilograme kao mjerodavnu jedinicu. Identificirani su ključni mehanizmi za FIFO praćenje i rukovanje varijacijama u litrima uzrokovanim razlikama u gustoći. Međutim, postoji nekoliko kritičnih točaka (posebno brisanje `FixedTankTransfer`) i područja za poboljšanje koja, ako se adresiraju, mogu značajno povećati robusnost, točnost i pouzdanost sustava. Implementacijom predloženih izmjena i zaštitnih mjera, AvioServis može osigurati visok stupanj integriteta MRN podataka i minimizirati operativne probleme uzrokovane nekonzistentnostima u praćenju goriva.
