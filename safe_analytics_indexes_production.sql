-- SIGURNA SKRIPTA ZA DODAVANJE ANALYTICS INDEKSA U PRODUKCIJU
-- Pokreni ovo SAMO nakon što provjeriš postojeće indekse sa check_existing_indexes.sql

-- VAŽNO: Pokreni ovo van peak sati jer kreiranje indeksa može biti sporo!
-- PREPORUČENO: Backup baze prije pokretanja

BEGIN;

-- 1. Provjeri da li indeksi već postoje prije kreiranja
DO $$
BEGIN
    -- Indeks za destination (ako ne postoji)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'FuelingOperation' 
        AND indexname = 'FuelingOperation_destination_idx'
    ) THEN
        RAISE NOTICE 'Kreiram indeks za destination...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fueling_destination 
        ON "FuelingOperation"(destination) 
        WHERE "is_deleted" = false;
    ELSE
        RAISE NOTICE 'Indeks za destination već postoji, preskačem...';
    END IF;

    -- Kombinovani indeks za dateTime + destination
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'FuelingOperation' 
        AND indexname LIKE '%datetime%destination%'
    ) THEN
        RAISE NOTICE 'Kreiram kombinovani indeks dateTime + destination...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fueling_datetime_destination 
        ON "FuelingOperation"("dateTime", destination) 
        WHERE "is_deleted" = false;
    ELSE
        RAISE NOTICE 'Kombinovani indeks dateTime + destination već postoji, preskačem...';
    END IF;

    -- Kombinovani indeks za dateTime + airlineId
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'FuelingOperation' 
        AND indexname LIKE '%datetime%airline%'
    ) THEN
        RAISE NOTICE 'Kreiram kombinovani indeks dateTime + airlineId...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fueling_datetime_airline 
        ON "FuelingOperation"("dateTime", "airlineId") 
        WHERE "is_deleted" = false;
    ELSE
        RAISE NOTICE 'Kombinovani indeks dateTime + airlineId već postoji, preskačem...';
    END IF;

    -- Kombinovani indeks za destination + airlineId
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'FuelingOperation' 
        AND indexname LIKE '%destination%airline%'
    ) THEN
        RAISE NOTICE 'Kreiram kombinovani indeks destination + airlineId...';
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fueling_destination_airline 
        ON "FuelingOperation"(destination, "airlineId") 
        WHERE "is_deleted" = false;
    ELSE
        RAISE NOTICE 'Kombinovani indeks destination + airlineId već postoji, preskačem...';
    END IF;

    -- Indeks za kalendarske sedmice (NOVI - sigurno ne postoji)
    RAISE NOTICE 'Kreiram indeks za kalendarske sedmice...';
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fueling_weekly_analytics 
    ON "FuelingOperation"(
        EXTRACT(year FROM "dateTime"), 
        EXTRACT(week FROM "dateTime")
    ) 
    WHERE "is_deleted" = false;

    -- Indeks za mjesečne analize (NOVI - sigurno ne postoji)
    RAISE NOTICE 'Kreiram indeks za mjesečne analize...';
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fueling_monthly_analytics 
    ON "FuelingOperation"(
        EXTRACT(year FROM "dateTime"), 
        EXTRACT(month FROM "dateTime")
    ) 
    WHERE "is_deleted" = false;

    RAISE NOTICE 'Svi indeksi su uspješno kreirani ili već postoje!';
END
$$;

-- 2. Ažuriraj statistike za query planner
ANALYZE "FuelingOperation";

-- 3. Provjeri da li su indeksi uspješno kreirani
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FuelingOperation'
AND indexname LIKE 'idx_fueling_%'
ORDER BY indexname;

COMMIT;

-- NAPOMENE:
-- 1. CONCURRENTLY znači da se indeks kreira bez blokiranja tabele
-- 2. Kreiranje može potrajati 5-30 minuta ovisno o veličini tabele
-- 3. Prati progress sa: SELECT * FROM pg_stat_progress_create_index;
-- 4. Ako se nešto pokvari, indeksi se mogu obrisati sa: DROP INDEX IF EXISTS ime_indeksa;
