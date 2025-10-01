-- Database optimizacije za analitiku i komparaciju
-- NAPOMENA: Osnovni indeksi već postoje u Prisma schema-i
-- Ovaj fajl dodaje samo NOVE indekse potrebne za analitiku

-- 1. NOVI kombinovani indeksi za analitiku (ne postoje u schema-i)
-- Kombinovani indeks za datum, destinaciju i aviokompaniju (NOVI)
CREATE INDEX IF NOT EXISTS idx_fueling_ops_analytics 
ON "FuelingOperation"("dateTime", destination, "airlineId", "quantity_liters", "total_amount") 
WHERE "is_deleted" = false;

-- Indeks za kalendarske sedmice (NOVI)
CREATE INDEX IF NOT EXISTS idx_fueling_ops_weekly 
ON "FuelingOperation"(EXTRACT(week FROM "dateTime"), EXTRACT(year FROM "dateTime")) 
WHERE "is_deleted" = false;

-- Indeks za mjesečne analize (NOVI)
CREATE INDEX IF NOT EXISTS idx_fueling_ops_monthly 
ON "FuelingOperation"(EXTRACT(month FROM "dateTime"), EXTRACT(year FROM "dateTime")) 
WHERE "is_deleted" = false;

-- Kombinovani indeks za destinacije i datum (NOVI)
CREATE INDEX IF NOT EXISTS idx_fueling_ops_destination_date 
ON "FuelingOperation"(destination, "dateTime") 
WHERE "is_deleted" = false;

-- Kombinovani indeks za aviokompanje i datum (NOVI)
CREATE INDEX IF NOT EXISTS idx_fueling_ops_airline_date 
ON "FuelingOperation"("airlineId", "dateTime") 
WHERE "is_deleted" = false;

-- 2. Kreiranje materialized view za brže agregacije
-- Materijalized view za sedmične agregacije
CREATE MATERIALIZED VIEW IF NOT EXISTS weekly_fuel_analytics AS
SELECT 
  EXTRACT(year FROM "dateTime") as year,
  EXTRACT(week FROM "dateTime") as week,
  DATE_TRUNC('week', "dateTime") as week_start,
  destination,
  "airlineId" as airline_id,
  COUNT(*) as operation_count,
  SUM("quantity_liters") as total_liters,
  SUM("quantity_kg") as total_kg,
  SUM("total_amount") as total_revenue,
  AVG("quantity_liters") as avg_liters_per_operation,
  AVG("quantity_kg") as avg_kg_per_operation,
  AVG("total_amount") as avg_revenue_per_operation,
  MIN("dateTime") as first_operation,
  MAX("dateTime") as last_operation
FROM "FuelingOperation" 
WHERE "is_deleted" = false 
  AND "quantity_liters" IS NOT NULL 
  AND "quantity_kg" IS NOT NULL
GROUP BY year, week, week_start, destination, airline_id;

-- Indeks na materialized view
CREATE INDEX IF NOT EXISTS idx_weekly_analytics_year_week 
ON weekly_fuel_analytics(year, week);

CREATE INDEX IF NOT EXISTS idx_weekly_analytics_destination 
ON weekly_fuel_analytics(destination);

CREATE INDEX IF NOT EXISTS idx_weekly_analytics_airline 
ON weekly_fuel_analytics(airline_id);

-- Materijalized view za mjesečne agregacije
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_fuel_analytics AS
SELECT 
  EXTRACT(year FROM "dateTime") as year,
  EXTRACT(month FROM "dateTime") as month,
  DATE_TRUNC('month', "dateTime") as month_start,
  destination,
  "airlineId" as airline_id,
  COUNT(*) as operation_count,
  SUM("quantity_liters") as total_liters,
  SUM("quantity_kg") as total_kg,
  SUM("total_amount") as total_revenue,
  AVG("quantity_liters") as avg_liters_per_operation,
  AVG("quantity_kg") as avg_kg_per_operation,
  AVG("total_amount") as avg_revenue_per_operation,
  MIN("dateTime") as first_operation,
  MAX("dateTime") as last_operation
FROM "FuelingOperation" 
WHERE "is_deleted" = false 
  AND "quantity_liters" IS NOT NULL 
  AND "quantity_kg" IS NOT NULL
GROUP BY year, month, month_start, destination, airline_id;

-- Indeks na mjesečni materialized view
CREATE INDEX IF NOT EXISTS idx_monthly_analytics_year_month 
ON monthly_fuel_analytics(year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_analytics_destination 
ON monthly_fuel_analytics(destination);

CREATE INDEX IF NOT EXISTS idx_monthly_analytics_airline 
ON monthly_fuel_analytics(airline_id);

-- Materijalized view za destinacije (za brže destination trending)
CREATE MATERIALIZED VIEW IF NOT EXISTS destination_analytics_summary AS
SELECT 
  destination,
  DATE_TRUNC('month', "dateTime") as month,
  COUNT(*) as operation_count,
  SUM("quantity_liters") as total_liters,
  SUM("quantity_kg") as total_kg,
  SUM("total_amount") as total_revenue,
  COUNT(DISTINCT "airlineId") as unique_airlines,
  AVG("quantity_liters") as avg_liters_per_operation
FROM "FuelingOperation" 
WHERE "is_deleted" = false 
  AND destination IS NOT NULL
  AND "quantity_liters" IS NOT NULL 
  AND "quantity_kg" IS NOT NULL
GROUP BY destination, month;

-- Indeks na destination summary
CREATE INDEX IF NOT EXISTS idx_destination_analytics_dest_month 
ON destination_analytics_summary(destination, month);

-- Materijalized view za aviokompanje (za brže airline trending)
CREATE MATERIALIZED VIEW IF NOT EXISTS airline_analytics_summary AS
SELECT 
  "airlineId" as airline_id,
  DATE_TRUNC('month', "dateTime") as month,
  COUNT(*) as operation_count,
  SUM("quantity_liters") as total_liters,
  SUM("quantity_kg") as total_kg,
  SUM("total_amount") as total_revenue,
  COUNT(DISTINCT destination) as unique_destinations,
  AVG("quantity_liters") as avg_liters_per_operation
FROM "FuelingOperation" 
WHERE "is_deleted" = false 
  AND "airlineId" IS NOT NULL
  AND "quantity_liters" IS NOT NULL 
  AND "quantity_kg" IS NOT NULL
GROUP BY airline_id, month;

-- Indeks na airline summary
CREATE INDEX IF NOT EXISTS idx_airline_analytics_airline_month 
ON airline_analytics_summary(airline_id, month);

-- 3. Kreiranje funkcije za refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_fuel_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_fuel_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY destination_analytics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY airline_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- 4. Kreiranje tabele za caching analitike (opciono)
CREATE TABLE IF NOT EXISTS analytics_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  cache_type VARCHAR(50) NOT NULL -- 'weekly', 'monthly', 'destination', 'airline', 'anomaly'
);

-- Indeks na cache tabelu
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key 
ON analytics_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires 
ON analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_type 
ON analytics_cache(cache_type);

-- 5. Funkcija za čišćenje starih cache zapisa
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 6. NAPOMENA: Sljedeći indeksi VEĆ POSTOJE u Prisma schema-i:
-- - dateTime (@@index([dateTime]))
-- - airlineId (@@index([airlineId]))  
-- - is_deleted (@@index([is_deleted]))
-- - createdAt (@@index([createdAt]))
-- - tankId, operator_name, tip_saobracaja, flight_number, delivery_note_number, payment_method
-- 
-- NEMA POTREBE za dodatne osnovne indekse!

-- 7. Statistike za PostgreSQL query planner
-- Ovo pomaže PostgreSQL-u da bolje planira queries
ANALYZE "FuelingOperation";

-- Komentari za dokumentaciju
COMMENT ON MATERIALIZED VIEW weekly_fuel_analytics IS 'Sedmične agregacije za brže analitike';
COMMENT ON MATERIALIZED VIEW monthly_fuel_analytics IS 'Mjesečne agregacije za brže analitike';
COMMENT ON MATERIALIZED VIEW destination_analytics_summary IS 'Sumarni podaci po destinacijama';
COMMENT ON MATERIALIZED VIEW airline_analytics_summary IS 'Sumarni podaci po aviokompanijama';
COMMENT ON TABLE analytics_cache IS 'Cache tabela za analitiku i komparacije';
COMMENT ON FUNCTION refresh_analytics_views() IS 'Funkcija za osvježavanje materialized view-ova';
COMMENT ON FUNCTION cleanup_expired_cache() IS 'Funkcija za čišćenje isteklih cache zapisa';

-- Informacije o optimizaciji
SELECT 'Database optimizations for analytics completed successfully!' as status;
