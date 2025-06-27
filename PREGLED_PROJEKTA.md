# AvioServis - Pregled Projekta

## 📖 Opis Projekta

**AvioServis** je kompleksan sistem za upravljanje avio servisom i gorivom na aerodromima. Sistem omogućava detaljno praćenje i upravljanje svim aspektima rada avio servisa, od upravljanja vozilima i lokacijama do složenog sistema praćenja goriva sa MRN (carinske deklaracije) integritetom.

## 🏗️ Arhitektura Sistema

### Backend
- **Tehnologija**: Node.js, Express.js, TypeScript
- **Baza podataka**: PostgreSQL sa Prisma ORM
- **Autentifikacija**: JWT tokeni
- **Rate limiting**: Različiti limiteri za API ruteove
- **Cron poslovi**: Automatska sinhronizacija i održavanje

### Frontend
- **Tehnologija**: Next.js 14, React, TypeScript
- **UI Biblioteka**: Tailwind CSS, shadcn/ui komponente
- **State Management**: Context API, Zustand store

## 🔧 Ključne Funkcionalnosti

### 1. Upravljanje Vozilima i Kompanijama
- **Kontroleri**: `vehicle.ts`, `company.controller.ts`, `location.controller.ts`
- Registracija i praćenje vozila (cisterne, tankeri)
- Upravljanje kompanijama i lokacijama
- Servisni zapisi i tehnička dokumentacija
- Praćenje važnih datuma (registracija, pregledi, kalibracije)

### 2. Sistem Upravljanja Gorivom 🛢️
Najsloženiji deo sistema sa preciznim praćenjem litara i kilograma:

#### Fiksni Tankovi
- **Kontroler**: `fixedStorageTank.controller.ts`
- Upravljanje stacionarnim tankovima
- Praćenje kapaciteta i trenutnog stanja
- Dokumentacija i identifikacijski dokumenti

#### Mobilni Tankeri
- **Kontroler**: `fuelTankController.ts`
- Upravljanje mobilnim cisternama
- Sinhronizacija stanja sa MRN zapisima

#### Prijem Goriva
- **Kontroler**: `fuelIntakeRecord.controller.ts`
- Evidentiranje novog goriva sa MRN brojem
- Kalkulacija kilograma na osnovu litara i gustoće
- Transfer u fiksne tankove

#### Transferi Goriva
- **Kontroler**: `fuelTransferToTanker.controller.ts`
- FIFO logika za transfer iz fiksnih u mobilne tankove
- Praćenje MRN brojeva kroz ceo tok
- Automatsko rukovanje različitim gustoćama

#### Operacije Točenja
- **Kontroler**: `fuelingOperation.controller.ts`
- Točenje goriva u avione
- MRN breakdown praćenje
- Finansijski izračuni sa valutama (BAM, EUR, USD)

### 3. MRN Integritete i Praćenje 📊
- **Servis**: `mrnTransaction.service.ts`, `mrnUtils.ts`
- Precizno praćenje carinskih deklaracija
- FIFO logika za potrošnju goriva
- Automatsko rešavanje viška/manjka goriva
- Balans izvještaji za sve MRN brojeve

### 4. Finansijski Sistem 💰
- **Kontroler**: `financialReports.controller.ts`
- Pravila cena goriva po avio kompanijama
- Multi-valutni sistem (BAM, EUR, USD)
- Automatski obračuni sa rabaтima
- Finansijski izvještaji

### 5. Bezbednost i Auditing 🔒
- **Kontroleri**: `auth.controller.ts`, `activity.controller.ts`
- Uloge korisnika (Admin, Operator, Kontrola, itd.)
- Praćenje svih aktivnosti u sistemu
- Rate limiting za različite operacije
- Login attempt tracking

### 6. Tehnička Dokumentacija i Testovi
- **Kontroleri**: `valveTest.controller.ts`, `technicalDocument.controller.ts`
- ILPCV i HECPV testovi ventila
- Upload i upravljanje dokumentima
- Servisni zapisi i kalendari održavanja

## 📂 Struktura Baze Podataka

### Ključni Modeli
```typescript
// Glavni entiteti
- User (korisnici sa ulogama)
- Company (kompanije)
- Location (lokacije)
- Vehicle (vozila/tankeri)
- Airline (avio kompanije)

// Gorivo - Fiksni sistem
- FixedStorageTanks (fiksni tankovi)
- FuelIntakeRecords (prijem goriva)
- TankFuelByCustoms (MRN zapisi za fiksne tankove)

// Gorivo - Mobilni sistem  
- FuelTank (mobilni tankovi)
- MobileTankCustoms (MRN zapisi za mobilne tankove)
- FuelTransferToTanker (transferi)

// Operacije
- FuelingOperation (operacije točenja)
- FuelDrainRecord (dreniranje goriva)
- TankReserveFuel (rezervno gorivo)

// Finansije
- FuelPriceRule (pravila cena)
- Activity (audit log)
```

## 🚀 Deployment i Infrastruktura

### Produkciona Konfiguracija
- **VPS**: Ubuntu 22.04
- **Process Manager**: PM2
- **Web Server**: Nginx (reverse proxy)
- **Database**: PostgreSQL
- **SSL**: Moguća Certbot integracija

### Environment Variables
```env
# Backend
DATABASE_URL, JWT_SECRET, FRONTEND_URL, NODE_ENV

# Frontend  
NEXT_PUBLIC_API_URL
```

## 🔍 Specifičnosti i Inovacije

### 1. Dvojno Praćenje Mernih Jedinica
Sistem istovremeno prati **litre** i **kilograme** goriva, što je kritično za:
- Carinske obaveze (MRN u kilogramima)
- Operativne potrebe (точење u litrima)
- Rukovanje različitim gustoćama goriva

### 2. FIFO Logika sa MRN Integritetom
Automatska FIFO (First In, First Out) potrošnja goriva koja:
- Poštuje carinske propise
- Održava integritet MRN brojeva
- Rešava nekonzistentnosti u gustoći

### 3. Automatsko Rukovanje Viškom/Manjkom
- **Excess Fuel Exchange Service**: Automatska zamena "praznih" litara
- **Reserve Fuel Management**: Rukovanje rezervnim gorivom
- **Density Variations**: Adaptacija na promene gustoće

### 4. Kompleksan Audit Trail
Svaka operacija se loguje sa:
- Korisničkom aktivnošću
- MRN transaction history
- Fuel operation logs
- System logs

## 📋 Trenutno Stanje i Roadmap

### Implementirane Funkcionalnosti ✅
- Kompletno upravljanje vozilima i kompanijama
- Punu funkcionalnost upravljanja gorivom
- MRN integritete i FIFO logiku
- Finansijski sistem sa multi-valutom
- Bezbednosni sistem sa audit trail-om

### U Razvoju 🔄
- Standardizacija parsiranja decimalnih vrednosti
- Poboljšanja u rezervnom gorivu
- Finansijski izvještaji
- UI/UX poboljšanja

### Buduće Mogućnosti 🔮
- Mobile aplikacija
- Real-time dashboard
- Automatizovani izvještaji
- Integracija sa spoljnim sistemima

## 👥 Ciljana Publika

- **Avio servisi** na aerodromima
- **Kompanije za snabdевanje gorivom**
- **Carinske službe** (MRN compliance)
- **Menadžment** (finansijski izvještaji)

---

**AvioServis** predstavlja kompleksnu, enterprise-level aplikaciju koja omogućava potpuno upravljanje avio servisom sa fokusom na preciznost, bezbednost i regulatornu usklađenost. 