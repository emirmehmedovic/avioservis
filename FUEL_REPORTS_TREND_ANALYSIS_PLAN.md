# 📈 Plan: Trend Analiza i Komparativni Izvještaji

## 🎯 Cilj
Zamijeniti obsolete tabove ("Analiza Potrošnje" i "Stanje Zaliha") sa naprednim trend analizama i komparativnim izvještajima.

---

## 🔧 BACKEND ZADACI

### 1. **Novi API Endpointi**

#### 1.1 Trend Analiza Endpoint
```typescript
GET /api/fuel/reports/trends
```
**Parametri:**
- `startDate`, `endDate` - period analize
- `granularity` - "daily", "weekly", "monthly"
- `compareWith` - "previous_period", "previous_year"

**Response:**
```typescript
interface TrendAnalysisResponse {
  currentPeriod: PeriodData[];
  comparisonPeriod: PeriodData[];
  growthRate: number;
  summary: TrendSummary;
}
```

#### 1.2 Sezonski Obrasci Endpoint
```typescript
GET /api/fuel/reports/seasonal-patterns
```
**Funkcionalnosti:**
- Poredba ove vs prošle godine (isti mjeseci)
- Identifikacija peak/low sezone
- Predviđanje budućih trendova

#### 1.3 Destinacije Trend Endpoint
```typescript
GET /api/fuel/reports/destination-trends
```
**Funkcionalnosti:**
- Rastući/opadajući destinacije
- Market share promjene
- New vs lost destinacije

### 2. **Backend Servisi**

#### 2.1 Kreiranje `trendAnalysisService.ts`
```bash
backend/src/services/trendAnalysisService.ts
```
**Funkcije:**
- `calculateGrowthRate(current, previous)`
- `generateSeasonalComparison(yearCurrent, yearPrevious)`
- `identifyTrendingDestinations(period)`
- `calculateMovingAverages(data, window)`

#### 2.2 Kreiranje `comparativeAnalysisService.ts`
```bash
backend/src/services/comparativeAnalysisService.ts
```
**Funkcije:**
- `comparePeriodsYearOverYear(startDate, endDate)`
- `calculateMonthOverMonthGrowth()`
- `generatePerformanceMetrics(period)`

#### 2.3 Kreiranje `forecastingService.ts`
```bash
backend/src/services/forecastingService.ts
```
**Funkcije:**
- `linearTrendForecast(historicalData, periods)`
- `seasonalAdjustedForecast(data)`
- `capacityPlanningRecommendations()`

### 3. **Database Schema Optimizacije**

#### 3.1 Dodati indekse za brže queries
```sql
-- Optimizacija za trend queries
CREATE INDEX idx_fueling_operations_date_airline 
ON fueling_operations(date_time, airline_id);

CREATE INDEX idx_fueling_operations_destination_date 
ON fueling_operations(destination, date_time);
```

#### 3.2 Kreiranje materialized view za brže izvještaje
```sql
-- Materijalizovani view za mjesečne agregacije
CREATE MATERIALIZED VIEW monthly_fuel_consumption AS
SELECT 
  DATE_TRUNC('month', date_time) as month,
  airline_id,
  destination,
  SUM(quantity_liters) as total_liters,
  COUNT(*) as operation_count
FROM fueling_operations 
GROUP BY month, airline_id, destination;
```

---

## 🎨 FRONTEND ZADACI

### 1. **Kreiranje Komponenti**

#### 1.1 TrendAnalysisTab.tsx
```bash
frontend/src/components/fuel/analytics/TrendAnalysisTab.tsx
```
**Sekcije:**
- Sedmični/mjesečni trendovi chart
- Year-over-year poredba
- Growth rate indicators
- Moving averages

#### 1.2 ComparativeAnalysisTab.tsx
```bash
frontend/src/components/fuel/analytics/ComparativeAnalysisTab.tsx
```
**Sekcije:**
- Side-by-side period comparisons
- Mjesec-na-mjesec growth rate
- Seasonal patterns heatmap
- Destination trend table

#### 1.3 TrendChart.tsx (reusable)
```bash
frontend/src/components/fuel/charts/TrendChart.tsx
```
**Features:**
- Multi-line charts (current vs previous)
- Zoom i pan funkcionalnost
- Forecasting visualisation
- Growth rate annotations

#### 1.4 SeasonalHeatmap.tsx
```bash
frontend/src/components/fuel/charts/SeasonalHeatmap.tsx
```
**Features:**
- Calendar heatmap view
- Intensity based na potrošnju
- Year-over-year overlay
- Interactive tooltips

#### 1.5 DestinationTrendTable.tsx
```bash
frontend/src/components/fuel/tables/DestinationTrendTable.tsx
```
**Features:**
- Sortable destination lista
- Growth indicators (↗️↘️)
- Market share changes
- Filtering po growth rate

### 2. **Servisni Slojevi**

#### 2.1 trendAnalysisService.ts (frontend)
```bash
frontend/src/services/trendAnalysisService.ts
```
**API pozivi za:**
- Trend podatke
- Komparativne analize
- Forecasting rezultate

#### 2.2 Dodati u postojeći FuelReports.tsx
```typescript
// Dodati nove tabove
const tabs = [
  { id: 'overview', name: 'Opšti Pregled' },
  { id: 'trendAnalysis', name: 'Trend Analiza' },     // NOVO
  { id: 'comparative', name: 'Komparativna Analiza' }, // NOVO
  { id: 'details', name: 'Detaljni Prikazi' }
];
```

### 3. **UI/UX Poboljšanja**

#### 3.1 Kreiranje Date Range Selector-a
```bash
frontend/src/components/fuel/ui/AdvancedDateRangePicker.tsx
```
**Features:**
- Preset ranges (Last 30 days, Quarter, Year)
- Custom range picker
- Comparison period selector
- Quick filters

#### 3.2 Growth Rate Indicators
```bash
frontend/src/components/fuel/ui/GrowthIndicator.tsx
```
**Features:**
- Color-coded indicators
- Percentage changes
- Trend arrows
- Tooltip explanations

---

## 📋 IMPLEMENTACIJA PLAN

### **Phase 1: Backend Foundation** (2-3 dana)
1. ✅ Kreirati osnovne servise (`trendAnalysisService.ts`)
2. ✅ Implementirati trend calculation algoritme
3. ✅ Kreirati API endpointe
4. ✅ Dodati database optimizacije

### **Phase 2: Core Frontend Components** (2-3 dana)
1. ✅ Kreirati `TrendAnalysisTab.tsx`
2. ✅ Implementirati osnovne chart komponente
3. ✅ Integrirati sa backend API-jima
4. ✅ Osnovni styling i layout

### **Phase 3: Advanced Features** (2-3 dana)
1. ✅ Kreirati `ComparativeAnalysisTab.tsx`
2. ✅ Implementirati SeasonalHeatmap
3. ✅ Dodati forecasting functionality
4. ✅ Advanced filtering i sorting

### **Phase 4: Polish & Testing** (1-2 dana)
1. ✅ UI/UX poboljšanja
2. ✅ Performance optimizacije
3. ✅ Error handling
4. ✅ Testing i bugfixing

---

## 🧮 KALKULACIJE I ALGORITMI

### Growth Rate Formula
```typescript
const growthRate = ((current - previous) / previous) * 100;
```

### Moving Average (SMA)
```typescript
const movingAverage = data.slice(-window).reduce((sum, val) => sum + val, 0) / window;
```

### Year-over-Year Comparison
```typescript
const yoyGrowth = ((thisYear - lastYear) / lastYear) * 100;
```

### Seasonal Index
```typescript
const seasonalIndex = (periodAverage / overallAverage) * 100;
```

---

## 📊 VISUALIZACIJE

### 1. **Trend Charts**
- Line charts sa multiple series
- Area charts za cumulative data
- Bar charts za period comparisons

### 2. **Heatmaps**
- Seasonal consumption patterns
- Hour-of-day analysis
- Day-of-week patterns

### 3. **KPI Widgets**
- Growth rate cards
- Trending up/down indicators
- Forecast accuracy metrics

---

## 🎯 SUCCESS METRICS

1. **Korisnost:**
   - Operators mogu identificirati trendove
   - Management može planirati kapacitete
   - Lakše donošenje data-driven odluka

2. **Performance:**
   - Trend queries < 2 sekunde
   - Charts render < 1 sekunda
   - Real-time data updates

3. **Accuracy:**
   - Forecast accuracy > 85%
   - Trend detection sensitivity optimised
   - Historical comparisons verified

---

## 📁 FILE STRUCTURE

```
backend/src/
├── services/
│   ├── trendAnalysisService.ts
│   ├── comparativeAnalysisService.ts
│   └── forecastingService.ts
├── controllers/
│   └── fuelTrendsController.ts
└── routes/
    └── fuelTrends.routes.ts

frontend/src/components/fuel/
├── analytics/
│   ├── TrendAnalysisTab.tsx
│   └── ComparativeAnalysisTab.tsx
├── charts/
│   ├── TrendChart.tsx
│   └── SeasonalHeatmap.tsx
├── tables/
│   └── DestinationTrendTable.tsx
└── ui/
    ├── AdvancedDateRangePicker.tsx
    └── GrowthIndicator.tsx
```

---

**Početak implementacije:** Kad damo zeleno svjetlo 🚀 