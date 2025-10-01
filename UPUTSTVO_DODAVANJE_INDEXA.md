# 📋 Uputstvo za dodavanje Analytics indexa u produkciju

## 🎯 Pregled

Ovaj dokument objašnjava kako sigurno dodati indexe za Analytics i komparacija funkcionalnost u produkcijsku bazu podataka.

## 📁 Potrebni fajlovi

1. **`check_existing_indexes.sql`** - Proverava postojeće indexe
2. **`safe_analytics_indexes_production.sql`** - Sigurno dodaje nove indexe

## ⚠️ VAŽNE NAPOMENE

- **OBAVEZNO pravi backup baze** pre bilo kakvih izmena
- **Pokreni u off-peak satima** (noću ili vikendima)
- **Testiraj prvo na staging okruženju** ako imaš
- **Indexi se kreiraju CONCURRENTLY** da ne blokiraju tabele

## 🔍 Korak 1: Provera postojećih indexa

### 1.1 Konektuj se na PostgreSQL bazu

```bash
# Lokalna baza
psql -U your_username -d your_database_name

# Ili sa connection string-om
psql "postgresql://username:password@localhost:5432/database_name"

# Heroku/cloud baza
psql $DATABASE_URL
```

### 1.2 Pokreni proveru postojećih indexa

```sql
-- Kopiraj i pokreni sadržaj iz check_existing_indexes.sql
\i /path/to/check_existing_indexes.sql

-- Ili copy-paste sadržaj:
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FuelingOperation'
ORDER BY indexname;

-- Proveri i veličinu tabele
SELECT 
    schemaname,
    tablename,
    n_tup_ins as "Ukupno redova",
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Veličina tabele"
FROM pg_stat_user_tables 
WHERE tablename = 'FuelingOperation';
```

### 1.3 Analiziraj rezultate

**Očekivani postojeći indexi:**
- `FuelingOperation_pkey` (PRIMARY KEY na `id`)
- `FuelingOperation_airlineId_fkey` (FOREIGN KEY)
- Možda neki drugi indexi...

**Zapišite koje indexe već imate!**

## 🚀 Korak 2: Dodavanje novih indexa

### 2.1 Otvori novi terminal/session za monitoring

```bash
# U drugom terminalu, prati aktivnost baze
psql -U your_username -d your_database_name

-- Prati running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state = 'active';
```

### 2.2 Pokreni kreiranje indexa

```sql
-- U glavnom terminalu, pokreni safe script
\i /path/to/safe_analytics_indexes_production.sql

-- Ili copy-paste sadržaj po delovima:

-- 1. Kreiranje osnovnih indexa (jedan po jedan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_datetime 
ON "FuelingOperation" ("dateTime");

-- Čekaj da se završi, zatim sledeći:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuelingoperation_airline_datetime 
ON "FuelingOperation" ("airlineId", "dateTime");

-- I tako dalje...
```

### 2.3 Prati napredak

```sql
-- Proveri da li se index kreira
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FuelingOperation'
AND indexname LIKE 'idx_fuelingoperation%'
ORDER BY indexname;

-- Proveri veličinu indexa
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'FuelingOperation'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

## 📊 Korak 3: Kreiranje materialized view-a

### 3.1 Kreiraj materialized view

```sql
-- Kreiraj materialized view za cached analytics
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
    END) as total_revenue,
    AVG("quantity_liters") as avg_liters_per_operation
FROM "FuelingOperation"
WHERE "is_deleted" = false
GROUP BY DATE("dateTime"), "airlineId", "destination";

-- Kreiraj index na materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_date 
ON analytics_daily_summary (date);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_airline_date 
ON analytics_daily_summary ("airlineId", date);
```

### 3.2 Refresh materialized view

```sql
-- Popuni podatke
REFRESH MATERIALIZED VIEW analytics_daily_summary;

-- Proveri rezultate
SELECT COUNT(*) FROM analytics_daily_summary;
SELECT * FROM analytics_daily_summary LIMIT 5;
```

## ✅ Korak 4: Verifikacija

### 4.1 Proveri sve nove indexe

```sql
-- Lista svih indexa na FuelingOperation tabeli
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'FuelingOperation'
ORDER BY indexname;
```

### 4.2 Testiraj performanse

```sql
-- Test query za analytics
EXPLAIN ANALYZE
SELECT 
    COUNT(*) as operations,
    SUM("quantity_liters") as total_liters,
    SUM("quantity_kg") as total_kg
FROM "FuelingOperation"
WHERE "dateTime" >= '2024-01-01'
AND "dateTime" < '2025-01-01'
AND "is_deleted" = false;

-- Trebalo bi da vidiš "Index Scan" umesto "Seq Scan"
```

### 4.3 Proveri aplikaciju

1. **Pokreni backend** - trebalo bi da radi normalno
2. **Otvori Analytics stranicu** - `http://localhost:3000/dashboard/analitika-komparacija`
3. **Testiraj različite analize** - sedmična, mesečna, custom
4. **Proveri brzinu** - trebalo bi da bude brže

## 🚨 Troubleshooting

### Problem: Index kreiranje traje predugo

```sql
-- Prekini kreiranje indexa
SELECT pg_cancel_backend(pid) 
FROM pg_stat_activity 
WHERE query LIKE '%CREATE INDEX%';

-- Obriši nedovršen index
DROP INDEX IF EXISTS idx_fuelingoperation_datetime;
```

### Problem: Nema dovoljno disk prostora

```sql
-- Proveri disk prostor
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as db_size,
    pg_size_pretty(pg_total_relation_size('FuelingOperation')) as table_size;
```

### Problem: Aplikacija sporo radi

```sql
-- Analiziraj tabelu nakon dodavanja indexa
ANALYZE "FuelingOperation";

-- Refresh materialized view
REFRESH MATERIALIZED VIEW analytics_daily_summary;
```

## 📈 Očekivani rezultati

### Pre indexa:
- Analytics queries: **5-15 sekundi**
- Seq Scan na celoj tabeli
- Visoko CPU korišćenje

### Posle indexa:
- Analytics queries: **100-500ms**
- Index Scan sa brzim pristupom
- Nisko CPU korišćenje

## 🔄 Održavanje

### Dnevno refresh materialized view

```sql
-- Dodaj u cron job ili scheduled task
REFRESH MATERIALIZED VIEW analytics_daily_summary;
```

### Mesečno reindex

```sql
-- Reindex za optimalne performanse
REINDEX INDEX CONCURRENTLY idx_fuelingoperation_datetime;
```

## 📞 Podrška

Ako imaš problema:

1. **Provjeri log fajlove** PostgreSQL-a
2. **Kontaktiraj DBA** ako imaš
3. **Napravi backup** i rollback ako je potrebno

---

**⚠️ NAPOMENA**: Ovo uputstvo je specifično za PostgreSQL bazu. Prilagodi komande ako koristiš drugu bazu podataka.
