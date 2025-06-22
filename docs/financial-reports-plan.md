# Plan Implementacije Finansijskih Izvještaja

## Uvod

Ova dokumentacija opisuje plan implementacije novih finansijskih izvještaja u aplikaciji za upravljanje gorivom. Implementirat ćemo modul "Finansijski izvještaji" u sidebar navigaciji koji će omogućiti generisanje različitih finansijskih izvještaja vezanih za profitabilnost poslovanja.

## Vrste Izvještaja

Implementirat ćemo sljedeće tipove izvještaja:

1. **Profitabilnost po MRN**
   - Prikazuje profitabilnost za svaki MRN pojedinačno
   - Sumirana nabavna cijena, prodajna cijena i ostvareni profit
   - Period izvještaja (od-do datuma)

2. **Profitabilnost po Destinaciji**
   - Grupira podatke o prodaji i profitu po destinacijama
   - Prikazuje broj letova, ukupnu količinu istočenog goriva, ukupni profit
   - Period izvještaja (od-do datuma)

3. **Profitabilnost po Aviokompaniji**
   - Grupira podatke o prodaji i profitu po aviokompanijama
   - Prikazuje broj letova, ukupnu količinu istočenog goriva, ukupni profit
   - Period izvještaja (od-do datuma)

4. **Ukupni Finansijski Izvještaj**
   - Sumira finansijske podatke za cijeli period
   - Uključuje ukupnu nabavku, prodaju, profit, prosječnu maržu
   - Prikazuje trendove i usporedbe s prethodnim periodima
   - Period izvještaja (od-do datuma)

## Arhitektura i Dizajn

### Backend

1. **Nove Endpoint Rute**
   - `/api/reports/financial/mrn` - Izvještaj profitabilnosti po MRN
   - `/api/reports/financial/destination` - Izvještaj profitabilnosti po destinaciji
   - `/api/reports/financial/airline` - Izvještaj profitabilnosti po aviokompaniji
   - `/api/reports/financial/summary` - Ukupni finansijski izvještaj

2. **Novi Kontroler**
   - `financialReports.controller.ts` - Sadrži logiku za generisanje svih finansijskih izvještaja

3. **Servisni Sloj**
   - `financialReportsService.ts` - Implementira logiku za izračun profitabilnosti

4. **Utility Funkcije**
   - `mrnBreakdownParser.ts` - Parsa JSON podatke iz `mrnBreakdown` polja
   - `profitCalculator.ts` - Sadrži funkcije za izračun profita

### Frontend

1. **Sidebar Navigacija**
   - Dodavanje nove sekcije "Finansijski izvještaji" u sidebar

2. **Komponente Izvještaja**
   - `FinancialReportsPage.tsx` - Glavna stranica za izbor tipa izvještaja
   - `MrnProfitabilityReport.tsx` - Komponenta za izvještaj po MRN
   - `DestinationProfitabilityReport.tsx` - Komponenta za izvještaj po destinaciji
   - `AirlineProfitabilityReport.tsx` - Komponenta za izvještaj po aviokompaniji
   - `SummaryFinancialReport.tsx` - Komponenta za ukupni izvještaj

3. **Zajedničke Komponente**
   - `DateRangePicker.tsx` - Za odabir perioda izvještaja
   - `ReportFilters.tsx` - Za filtriranje podataka po različitim kriterijima
   - `ProfitChart.tsx` - Za vizualizaciju podataka o profitabilnosti
   - `ExportButtons.tsx` - Za izvoz izvještaja u PDF, Excel

## Koraci Implementacije

### Faza 1: Backend Implementacija

1. **Kreiranje potrebnih utility funkcija**
   - Implementirati `mrnBreakdownParser.ts` za dekodiranje JSON strukture
   - Implementirati pomoćne funkcije za izračun profita u `profitCalculator.ts`

2. **Implementacija servisnog sloja**
   - Kreirati `financialReportsService.ts` sa funkcijama za sve tipove izvještaja
   - Implementirati logiku za dohvat podataka o nabavnim cijenama iz `FuelIntakeRecords`
   - Implementirati logiku za dohvat podataka o prodaji iz `FuelingOperation`
   - Implementirati logiku za povezivanje MRN podataka iz `mrnBreakdown` sa stvarnim MRN zapisima

3. **Implementacija kontrolera**
   - Kreirati `financialReports.controller.ts` sa endpoint rutama
   - Implementirati validaciju i obradu parametara za izvještaje
   - Povezati sa servisnim slojem

### Faza 2: Frontend Implementacija

1. **Ažuriranje sidebar navigacije**
   - Dodati novu sekciju "Finansijski izvještaji" u `sidebar.tsx`
   - Implementirati podopcije za različite tipove izvještaja

2. **Implementacija zajedničkih komponenti**
   - Kreirati komponente za odabir perioda i filtriranje
   - Implementirati komponente za vizualizaciju podataka (grafikoni, tabele)
   - Kreirati komponente za izvoz podataka

3. **Implementacija stranica izvještaja**
   - Implementirati sve stranice za različite tipove izvještaja
   - Povezati ih sa API endpointima

### Faza 3: Testiranje i Optimizacija

1. **Testiranje performansi**
   - Provjeriti brzinu generisanja izvještaja za veće skupove podataka
   - Optimizirati upite za poboljšanje performansi

2. **Testiranje korisničkog iskustva**
   - Testiranje intuitivnosti korisničkog interfejsa
   - Optimizacija filtera i kontrola za bolje korisničko iskustvo

3. **Finalna podešavanja**
   - Dodavanje keširanja za poboljšanje performansi
   - Optimizacija izvoza podataka u različite formate

## Zadaci za Implementaciju

### Backend zadaci

- [ ] Kreirati utility funkcije za parsiranje MRN breakdown podataka
- [ ] Implementirati logiku za izračun profitabilnosti na temelju nabavnih i prodajnih cijena
- [ ] Kreirati servisne funkcije za svaki tip izvještaja
- [ ] Implementirati endpoint rute u kontroleru
- [ ] Dodati validaciju ulaznih parametara
- [ ] Testirati API endpointe za sve tipove izvještaja

### Frontend zadaci

- [ ] Ažurirati `sidebar.tsx` sa novom sekcijom "Finansijski izvještaji"
- [ ] Kreirati glavnu stranicu za izbor tipa izvještaja
- [ ] Implementirati komponente za odabir datuma i filtriranje
- [ ] Kreirati komponente za prikaz podataka (tabele i grafikoni)
- [ ] Implementirati stranice za sve tipove izvještaja
- [ ] Dodati funkcionalnost izvoza podataka u PDF i Excel
- [ ] Implementirati responzivni dizajn za sve komponente

## Tehnička Implementacija

### Model Podataka za API Odgovore

```typescript
// Zajednički interfejsi
interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

interface ProfitItem {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;  // Procenat marže
  quantity_liters: number;
  quantity_kg: number;
}

// MRN Profitabilnost
interface MrnProfitabilityItem extends ProfitItem {
  mrn: string;
  intakeDate: string;
  initialQuantity: number;
  remainingQuantity: number;
  usedQuantity: number;
}

interface MrnProfitabilityResponse {
  items: MrnProfitabilityItem[];
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageMargin: number;
    totalQuantityLiters: number;
    totalQuantityKg: number;
  }
}

// Profitabilnost po destinaciji
interface DestinationProfitabilityItem extends ProfitItem {
  destination: string;
  flightCount: number;
}

// Profitabilnost po aviokompaniji
interface AirlineProfitabilityItem extends ProfitItem {
  airlineId: number;
  airlineName: string;
  flightCount: number;
}

// Ukupni finansijski izvještaj
interface SummaryFinancialReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  totalQuantityLiters: number;
  totalQuantityKg: number;
  monthlyBreakdown: {
    month: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    quantityLiters: number;
    quantityKg: number;
  }[];
  topDestinations: DestinationProfitabilityItem[];
  topAirlines: AirlineProfitabilityItem[];
}
```

### Struktura MRN Breakdown JSON-a

Pretpostavljeni format `mrnBreakdown` polja je JSON string koji sadrži informacije o tome koliko goriva je iskorišteno iz svakog MRN-a:

```json
{
  "breakdown": [
    {
      "mrn": "MRN12345",
      "liters": 500,
      "kg": 400,
      "tankId": 1
    },
    {
      "mrn": "MRN67890",
      "liters": 300,
      "kg": 240,
      "tankId": 2
    }
  ]
}
```

Za izračun profitabilnosti po MRN, potrebno je:
1. Parsirati `mrnBreakdown` iz `FuelingOperation`
2. Za svaki MRN u breakdown-u, dohvatiti nabavnu cijenu iz `FuelIntakeRecords`
3. Izračunati profit na temelju prodajne cijene iz `FuelingOperation` i nabavne cijene iz `FuelIntakeRecords`

## Zaključak

Implementacija finansijskih izvještaja omogućit će precizno praćenje profitabilnosti poslovanja po različitim dimenzijama. Ključni izazov je povezivanje podataka o prodaji s nabavnim cijenama kroz MRN breakdown, što će zahtjevati pažljivo parsiranje i strukturiranje podataka.

Implementacija će se odvijati u fazama, počevši od backend logike za izračun profitabilnosti, a zatim frontend komponenti za vizualizaciju i interakciju.
