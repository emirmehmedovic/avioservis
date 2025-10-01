-- Provjeri postojeće indekse na FuelingOperation tabeli
-- Pokreni ovo u produkciji PRIJE dodavanja novih indeksa

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FuelingOperation'
ORDER BY indexname;

-- Provjeri veličinu tabele (važno za procjenu vremena kreiranja indeksa)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE tablename = 'FuelingOperation';

-- Provjeri broj redova (za procjenu vremena)
SELECT COUNT(*) as total_rows FROM "FuelingOperation";

-- Provjeri aktivne konekcije (važno prije kreiranja indeksa)
SELECT 
    datname,
    numbackends,
    xact_commit,
    xact_rollback
FROM pg_stat_database 
WHERE datname = current_database();
