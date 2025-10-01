# Komparacija Perioda - Nova Funkcionalnost

## Pregled

Dodana je nova funkcionalnost za komparaciju dva proizvoljna perioda u analitici sistema. Ova funkcionalnost omogućava korisnicima da poredi bilo koja dva vremenska perioda (npr. Avgust vs Septembar, Q1 vs Q2, itd.) sa detaljnim sedmičnim prikazom i vizuelnim chartovima.

## Funkcionalnosti

### 1. Fleksibilni Odabir Perioda
- **Brzi odabir**: Preddefinirani periodi (ovaj vs prošli mjesec, Avgust vs Septembar, Q3 vs Q4, itd.)
- **Custom odabir**: Potpuno prilagodljivi datumski opsezi
- **Custom nazivi**: Mogućnost davanja custom naziva periodima (npr. "Ljetna sezona", "Zimski period")

### 2. Filtriranje
- **Aviokompanija**: Filtriranje po specifičnoj aviokompaniji
- **Destinacija**: Filtriranje po specifičnoj destinaciji
- **Kombinacija**: Mogućnost kombinovanja oba filtera

### 3. Vizuelni Prikaz
- **Interaktivni Chart**: Komparacija sedmica za sedmicom sa dvije linije
- **Metrije**: Prebacivanje između litara, prihoda i operacija
- **Tooltips**: Detaljne informacije na hover
- **Custom labeli**: Dinamički labeli za periode u chartu

### 4. Detaljni Rezultati
- **Summary Cards**: Ukupni podaci za oba perioda sa growth indikatorima
- **Sedmična Tabela**: Detaljni breakdown po sedmicama
- **Growth Analiza**: Procentualne promjene između perioda

## Tehnička Implementacija

### Frontend Komponente
1. **PeriodComparisonAnalysis.tsx** - Glavna komponenta za prikaz rezultata
2. **DualPeriodSelector.tsx** - Komponenta za odabir dva perioda
3. **Novi tab u page.tsx** - "Komparacija perioda" tab

### Backend API
- **Endpoint**: `POST /api/analytics/comparison/period-comparison`
- **Controller**: `getPeriodComparison()` funkcija
- **Parametri**:
  ```typescript
  {
    period1: { startDate, endDate, name },
    period2: { startDate, endDate, name },
    airlineId?: number,
    destinationId?: string
  }
  ```

### Ažurirane Komponente
- **ComparisonChart.tsx** - Dodana podrška za custom labele perioda
- **analyticsApiService.ts** - Nova `getPeriodComparison()` funkcija

## Kako Koristiti

1. **Otvorite Analytics stranicu** - `/dashboard/analitika-komparacija`
2. **Odaberite "Komparacija perioda" tab**
3. **Odaberite periode**:
   - Koristite brze opcije ili
   - Postavite custom datume i nazive
4. **Dodajte filtere** (opcionalno):
   - Odaberite aviokompaniju
   - Odaberite destinaciju
5. **Kliknite "Kompariraj"**
6. **Analizirajte rezultate**:
   - Pregledajte summary kartice
   - Istražite chart sa različitim metrijama
   - Proučite detaljnu sedmičnu tabelu

## Primjeri Korišćenja

### Sezonska Analiza
```
Period 1: "Ljetna sezona" (01.06.2024 - 31.08.2024)
Period 2: "Zimska sezona" (01.12.2024 - 28.02.2025)
```

### Mjesečna Komparacija
```
Period 1: "Avgust" (01.08.2024 - 31.08.2024)  
Period 2: "Septembar" (01.09.2024 - 30.09.2024)
```

### Kvartalna Analiza
```
Period 1: "Q1" (01.01.2024 - 31.03.2024)
Period 2: "Q2" (01.04.2024 - 30.06.2024)
```

### Year-over-Year
```
Period 1: "2023" (01.01.2023 - 31.12.2023)
Period 2: "2024" (01.01.2024 - 31.12.2024)
```

## Napomene

- Svi podaci su prikazani u sedmičnim intervalima
- Prihodi su automatski konvertovani u BAM
- Growth indikatori koriste zelenu/crvenu boju za pozitivne/negativne promjene
- Chart podržava zoom i pan funkcionalnosti
- Svi API pozivi su cached za bolje performanse

## Buduće Mogućnosti

- Export u PDF/Excel format
- Dodavanje više metrija (prosječna cijena po litru, efikasnost, itd.)
- Komparacija više od dva perioda istovremeno
- Automatske anomaly detekcije između perioda
- Email izvještaji za redovne komparacije
