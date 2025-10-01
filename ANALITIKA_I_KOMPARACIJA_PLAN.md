# 📊 Plan: Analitika i Komparacija - Napredna Analiza Potrošnje Goriva

## 🎯 Cilj
Kreiranje naprednog modula "Analitika i komparacija" koji omogućava detaljnu komparativnu analizu potrošnje goriva kroz različite vremenske periode, destinacije i aviokompanje sa automatskim izračunom razlika, trendova i upozorenja.

---

## 🔍 FUNKCIONALNOSTI

### 1. **Vremenska Komparacija**
- **Sedmica za sedmicom**: Poredba trenutne sedmice sa prošlom sedmicom
- **Mjesec za mjesecom**: Poredba trenutnog mjeseca sa prošlim mjesecom  
- **Godina za godinom**: Poredba iste sedmice/mjeseca prošle godine
- **Custom periodi**: Fleksibilno biranje bilo koja dva perioda za poredbu

### 2. **Komparacija po Destinacijama**
- Analiza potrošnje po destinaciji kroz vrijeme
- Broj operacija po destinaciji
- Prosječna potrošnja po letu
- Trend rasta/opadanja destinacija
- Top/Bottom destinacije po različitim metrikama

### 3. **Komparacija po Aviokompanijama**
- Potrošnja po aviokompaniji kroz periode
- Broj letova i prosječna potrošnja
- Profitabilnost po aviokompaniji
- Market share analiza
- Loyalty/retention analiza

### 4. **Automatski Izračuni**
- **Procentualne razlike**: Automatski izračun % promjene između perioda
- **Apsolutne razlike**: Razlike u litrama, kg, i prometu (BAM/EUR/USD)
- **Trend indikatori**: Vizuelni prikaz rastućih/opadajućih trendova
- **Prosječne vrijednosti**: Moving averages i seasonal adjustments

### 5. **Upozorenja i Alerti**
- Destinacije sa trendom opadanja (>X% pad)
- Aviokompanje sa smanjenom aktivnošću
- Neočekivane promjene u potrošnji
- Sezonski anomalije

### 6. **Vizualizacija**
- **Line chartovi**: Trendovi kroz vrijeme sa poređenjem perioda
- **Bar chartovi**: Komparacija između destinacija/kompanija
- **Heatmap**: Sezonski obrasci potrošnje
- **Gauge chartovi**: KPI indikatori sa target vrijednostima
- **Scatter plots**: Korelacija između različitih metrika

### 7. **Eksport Funkcionalnosti**
- **PDF izvještaji**: Kompletni izvještaji sa chartovima i tabelama
- **Excel eksport**: Detaljni podaci za dalju analizu
- **Scheduled izvještaji**: Automatsko slanje izvještaja email-om

---

## 🏗️ ARHITEKTURA

### Backend Komponente

#### 1. **Novi API Endpointi**
```typescript
// Glavna analitika
GET /api/analytics/comparative-analysis
POST /api/analytics/custom-comparison

// Specifične analize  
GET /api/analytics/destination-trends
GET /api/analytics/airline-performance
GET /api/analytics/period-comparison

// Upozorenja
GET /api/analytics/alerts
GET /api/analytics/anomalies

// Eksport
POST /api/analytics/export/pdf
POST /api/analytics/export/excel
```

#### 2. **Novi Servisi**
```bash
backend/src/services/
├── comparativeAnalyticsService.ts    # Glavna logika komparacije
├── trendAnalysisService.ts          # Trend kalkulacije  
├── anomalyDetectionService.ts       # Detekcija anomalija
├── exportAnalyticsService.ts        # PDF/Excel eksport
└── alertsService.ts                 # Upravljanje upozorenjima
```

#### 3. **Database Optimizacije**
```sql
-- Novi indeksi za brže queries
CREATE INDEX idx_fueling_ops_analytics ON fueling_operations(date_time, destination, airline_id, quantity_liters, total_amount);
CREATE INDEX idx_fueling_ops_weekly ON fueling_operations(EXTRACT(week FROM date_time), EXTRACT(year FROM date_time));
CREATE INDEX idx_fueling_ops_monthly ON fueling_operations(EXTRACT(month FROM date_time), EXTRACT(year FROM date_time));

-- Materijalized view za brže agregacije
CREATE MATERIALIZED VIEW analytics_summary AS
SELECT 
  DATE_TRUNC('week', date_time) as week,
  DATE_TRUNC('month', date_time) as month,
  destination,
  airline_id,
  COUNT(*) as operation_count,
  SUM(quantity_liters) as total_liters,
  SUM(quantity_kg) as total_kg,
  SUM(total_amount) as total_revenue,
  AVG(quantity_liters) as avg_liters_per_operation
FROM fueling_operations 
WHERE is_deleted = false
GROUP BY week, month, destination, airline_id;
```

### Frontend Komponente

#### 1. **Glavna Stranica**
```bash
frontend/src/app/dashboard/analitika-komparacija/page.tsx
```

#### 2. **Komponente**
```bash
frontend/src/components/analytics/
├── AnalyticsLayout.tsx              # Layout wrapper
├── ComparisonDashboard.tsx          # Glavni dashboard
├── PeriodSelector.tsx               # Selektor vremenskih perioda
├── DestinationAnalytics.tsx         # Analiza po destinacijama
├── AirlineAnalytics.tsx             # Analiza po aviokompanijama
├── TrendCharts.tsx                  # Line/area chartovi
├── ComparisonTable.tsx              # Tabele sa podacima
├── AlertsPanel.tsx                  # Panel sa upozorenjima
├── ExportControls.tsx               # Kontrole za eksport
└── charts/
    ├── ComparativeLineChart.tsx     # Komparativni line chart
    ├── TrendHeatmap.tsx             # Heatmap za sezonske obrasce
    ├── PerformanceGauge.tsx         # Gauge za KPI-jeve
    └── AnomalyScatterPlot.tsx       # Scatter plot za anomalije
```

#### 3. **Sidebar Integracija**
```typescript
// Dodavanje u Sidebar.tsx
{ 
  name: 'Analitika i komparacija', 
  href: '/dashboard/analitika-komparacija', 
  icon: TrendingUp, 
  roles: ['ADMIN', 'KONTROLA', 'FUEL_OPERATOR'] 
}
```

---

## 📋 IMPLEMENTACIJSKI PLAN

### **Faza 1: Backend Foundation** (3-4 dana)
1. ✅ Kreiranje osnovnih servisa za komparativnu analitiku
2. ✅ Implementacija API endpointa za osnovne komparacije
3. ✅ Database optimizacije i indeksi
4. ✅ Osnovni algoritmi za trend analizu

### **Faza 2: Core Analytics** (4-5 dana)  
1. ✅ Implementacija vremenskih komparacija (WoW, MoM, YoY)
2. ✅ Analiza po destinacijama sa trendovima
3. ✅ Analiza po aviokompanijama
4. ✅ Automatski izračuni razlika i postotaka

### **Faza 3: Frontend Dashboard** (4-5 dana)
1. ✅ Kreiranje glavne stranice i layout-a
2. ✅ Implementacija period selector komponente
3. ✅ Osnovni chartovi za komparacije
4. ✅ Tabele sa detaljnim podacima

### **Faza 4: Advanced Features** (3-4 dana)
1. ✅ Anomaly detection i upozorenja
2. ✅ Napredni chartovi (heatmap, scatter plots)
3. ✅ Real-time updates i caching
4. ✅ Performance optimizacije

### **Faza 5: Export & Polish** (2-3 dana)
1. ✅ PDF/Excel eksport funkcionalnost
2. ✅ UI/UX poboljšanja
3. ✅ Error handling i validacija
4. ✅ Testing i bugfixing

---

## 🧮 KLJUČNE METRIKE I KALKULACIJE

### Osnovne Metrike
- **Potrošnja**: Litri, kg, broj operacija
- **Promet**: Ukupan iznos u različitim valutama
- **Prosječne vrijednosti**: Po letu, po destinaciji, po aviokompaniji
- **Efficiency ratios**: Litre/let, kg/let, promet/let

### Komparativne Kalkulacije
```typescript
// Procentualna promjena
const percentageChange = ((current - previous) / previous) * 100;

// Trend indikator
const trendDirection = current > previous ? 'up' : current < previous ? 'down' : 'stable';

// Moving average (7-day, 30-day)
const movingAverage = data.slice(-period).reduce((sum, val) => sum + val, 0) / period;

// Sezonska adjustacija
const seasonalIndex = currentPeriodAvg / yearlyAvg;
```

### Anomaly Detection
```typescript
// Standard deviation metod
const isAnomaly = Math.abs(value - mean) > (2 * standardDeviation);

// Percentage threshold metod  
const isSignificantChange = Math.abs(percentageChange) > threshold;
```

---

## 🎨 UI/UX DIZAJN

### Color Coding
- 🟢 **Zelena**: Pozitivni trendovi, rast
- 🔴 **Crvena**: Negativni trendovi, pad  
- 🟡 **Žuta**: Upozorenja, anomalije
- 🔵 **Plava**: Neutralni podaci, baseline
- ⚫ **Siva**: Nedostaju podaci

### Interaktivnost
- **Hover effects**: Detaljni tooltips na chartovima
- **Drill-down**: Klik na destinaciju/aviokompaniju za detaljnu analizu
- **Filtering**: Real-time filtriranje po različitim kriterijima
- **Responsive design**: Optimizovano za desktop i tablet

---

## 🔧 TEHNIČKI STACK

### Charting Biblioteke
- **Recharts**: Za osnovne line/bar chartove
- **D3.js**: Za napredne custom vizualizacije  
- **React-Heatmap-Grid**: Za sezonske heatmaps
- **Gauge-Chart**: Za KPI gauge-ove

### Export Biblioteke
- **jsPDF + html2canvas**: Za PDF eksport
- **ExcelJS**: Za Excel eksport
- **React-to-Print**: Za print funkcionalnost

### Performance
- **React Query**: Za caching API poziva
- **Virtualization**: Za velike tabele
- **Lazy loading**: Za chartove i komponente
- **Debouncing**: Za search i filter inpute

---

## ✅ FINALIZIRANE SPECIFIKACIJE

### Odgovori na ključna pitanja:
1. **Vremenski periodi**: ✅ Kalendarske sedmice (ISO week standard)
2. **Destinacije**: ✅ Kombinacija destinacija + aviokompanija + komparacije između aviokompanija
3. **Upozorenja**: ✅ Vizuelni indikatori na dashboard-u (bez automatskih notifikacija)
4. **Eksport**: ✅ PDF/Excel opcija za cijeli izvještaj i specifične sekcije
5. **Charting**: ✅ **D3.js + Observable Plot** (najnaprednija opcija za custom vizualizacije)
6. **Data loading**: ✅ Keširani podaci na početku, dinamičko učitavanje nakon selekcije perioda
7. **Thresholds**: ✅ >15% promjena za upozorenja, >30% za kritične alerete
8. **Historical data**: ✅ 2 godine unazad za potpunu analizu

### Dodatne specifikacije:
- **Date Selector**: Smart selector sa preset opcijama + custom range
- **Performance**: Lazy loading sa skeleton screens tokom učitavanja
- **Caching strategija**: Redis cache za često korišćene kombinacije
- **Responsive design**: Optimizovano za desktop primarno, tablet sekundarno

---

## 🎯 FINALNI TEHNIČKI STACK

### Charting & Vizualizacija
```typescript
// Glavne biblioteke
"d3": "^7.8.5"                    // Core D3 za napredne vizualizacije
"@observablehq/plot": "^0.6.11"   // Observable Plot za moderne chartove
"react-d3-library": "^1.1.8"      // React wrapper za D3
"d3-selection": "^3.0.0"          // D3 selection API
"d3-scale": "^4.0.2"              // Scaling functions
"d3-axis": "^3.0.0"               // Axis generation
"d3-shape": "^3.2.0"              // Shape generators
"d3-time": "^3.1.0"               // Time utilities za kalendarske sedmice

// Dodatne vizualizacije
"react-calendar-heatmap": "^1.9.0" // Za sezonske heatmaps
"recharts": "^2.8.0"              // Fallback za jednostavne chartove
"victory": "^36.6.11"             // Za gauge chartove i animacije
```

### Date & Time Management
```typescript
"date-fns": "^2.30.0"             // Kalendarske sedmice (getISOWeek)
"date-fns-tz": "^2.0.0"           // Timezone handling
"react-datepicker": "^4.21.0"     // Advanced date picker
```

### Export & Performance
```typescript
"jspdf": "^2.5.1"                 // PDF generation
"html2canvas": "^1.4.1"           // Chart to image conversion
"exceljs": "^4.4.0"               // Excel export
"@tanstack/react-query": "^4.32.6" // Caching i state management
"react-window": "^1.8.8"          // Virtualization za velike tabele
```

Sada mogu krenuti sa implementacijom! Želite li da počnem sa backend servisima ili frontend komponentama? 🚀
