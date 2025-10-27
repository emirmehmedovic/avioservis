-- ============================================================================
-- SEED DATA: Physical Tanks Module - Inicijalizacija Fizičkih Tankova
-- ============================================================================
-- 
-- Ova skripta kreira inicijalne fizičke tankove i cisterne za praćenje
-- realnog stanja goriva.
--
-- NAPOMENA: Ovu skriptu pokrenuti samo jednom nakon migracije!
--
-- Upotreba:
--   psql $DATABASE_URL -f backend/prisma/seeds/seed_physical_tanks.sql
--
-- ============================================================================

-- Provjeri da li već postoje fizički tankovi
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "PhysicalTanks" LIMIT 1) THEN
        RAISE NOTICE 'Physical tanks već postoje u bazi. Preskačem seed.';
    ELSE
        -- Kreiraj 3 fizička tanka za JET A-1 gorivo
        INSERT INTO "PhysicalTanks" (
            tank_name, 
            tank_identifier, 
            capacity_liters, 
            fuel_type, 
            location_description, 
            display_order, 
            is_active,
            "createdAt",
            "updatedAt"
        ) VALUES 
            (
                'Fizički Tank 1', 
                'FT-001', 
                80000, 
                'JET_A1', 
                'Glavni skladišni prostor - Tank 1', 
                1, 
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ),
            (
                'Fizički Tank 2', 
                'FT-002', 
                80000, 
                'JET_A1', 
                'Glavni skladišni prostor - Tank 2', 
                2, 
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ),
            (
                'Fizički Tank 3', 
                'FT-003', 
                80000, 
                'JET_A1', 
                'Glavni skladišni prostor - Tank 3', 
                3, 
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );

        RAISE NOTICE 'Uspješno kreirano 3 fizička tanka.';

        -- Kreiraj 2 cisterne
        INSERT INTO "PhysicalCisternFuel" (
            cistern_identifier, 
            capacity_liters, 
            fuel_type, 
            is_active,
            "createdAt",
            "updatedAt"
        ) VALUES 
            (
                'Cisterna 1', 
                30000, 
                'JET_A1', 
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ),
            (
                'Cisterna 2', 
                30000, 
                'JET_A1', 
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );

        RAISE NOTICE 'Uspješno kreirano 2 cisterne.';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'SEED COMPLETED SUCCESSFULLY!';
        RAISE NOTICE 'Kreirano:';
        RAISE NOTICE '  - 3 Fizička Tanka (80,000 L svaki)';
        RAISE NOTICE '  - 2 Cisterne (30,000 L svaka)';
        RAISE NOTICE '========================================';
    END IF;
END $$;



