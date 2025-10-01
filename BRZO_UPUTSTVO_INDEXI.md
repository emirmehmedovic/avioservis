# ⚡ Brzo uputstvo - Dodavanje Analytics indexa

## 🚀 TL;DR - Kratki koraci

### 1. Backup baze (OBAVEZNO!)
```bash
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Konektuj se na bazu
```bash
psql -U username -d database_name
# ili
psql $DATABASE_URL
```

### 3. Proveri postojeće indexe
```sql
\i check_existing_indexes.sql
```

### 4. Dodaj nove indexe (jedan po jedan)
```sql
-- Kopiraj i pokreni iz safe_analytics_indexes_production.sql

-- 1. Osnovni datetime index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_datetime 
ON "FuelingOperation" ("dateTime");

-- 2. Airline + datetime
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_airline_datetime 
ON "FuelingOperation" ("airlineId", "dateTime");

-- 3. Destination + datetime  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_destination_datetime 
ON "FuelingOperation" ("destination", "dateTime");

-- 4. Is_deleted filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_is_deleted 
ON "FuelingOperation" ("is_deleted");

-- 5. Composite za analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_analytics_composite 
ON "FuelingOperation" ("dateTime", "airlineId", "destination", "is_deleted");
```

### 5. Kreiraj materialized view
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_summary AS
SELECT 
    DATE("dateTime") as date,
    "airlineId",
    "destination",
    COUNT(*) as operations_count,
    SUM("quantity_liters") as total_liters,
    SUM("quantity_kg") as total_kg,
    SUM(CASE 
        WHEN "total_amount" IS NOT NULL AND "total_amount" > 0 THEN "total_amount"
        ELSE ("price_per_kg" * "quantity_kg")
    END) as total_revenue
FROM "FuelingOperation"
WHERE "is_deleted" = false
GROUP BY DATE("dateTime"), "airlineId", "destination";

-- Index na materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_date 
ON analytics_daily_summary (date);

-- Popuni podatke
REFRESH MATERIALIZED VIEW analytics_daily_summary;
```

### 6. Testiraj
```sql
-- Proveri da li indexi postoje
SELECT indexname FROM pg_indexes WHERE tablename = 'FuelingOperation' ORDER BY indexname;

-- Test query
EXPLAIN ANALYZE
SELECT COUNT(*) FROM "FuelingOperation" 
WHERE "dateTime" >= '2024-01-01' AND "is_deleted" = false;
```

## ⏱️ Očekivano vreme izvršavanja

- **Mali dataset** (<10k redova): 1-2 minuta
- **Srednji dataset** (10k-100k redova): 5-10 minuta  
- **Veliki dataset** (>100k redova): 15-30 minuta

## 🚨 Ako nešto pođe po zlu

```sql
-- Prekini kreiranje indexa
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE query LIKE '%CREATE INDEX%';

-- Obriši nedovršen index
DROP INDEX IF EXISTS idx_fuelingoperation_datetime;

-- Restore backup
-- psql -U username -d database_name < backup_file.sql
```

## ✅ Gotovo!

Nakon što završiš, analytics stranica će raditi **10-50x brže**! 🚀
