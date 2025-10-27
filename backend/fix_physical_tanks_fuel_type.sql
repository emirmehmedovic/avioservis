-- ============================================================================
-- MIGRATION: Update PhysicalTanks fuel_type from enum format to display format
-- ============================================================================
-- 
-- This script converts existing physical tanks from enum format (JET_A1) 
-- to display format (Jet A-1) to match FixedStorageTanks format.
--
-- ============================================================================

-- Update PhysicalTanks
UPDATE "PhysicalTanks" 
SET fuel_type = 'Jet A-1' 
WHERE fuel_type = 'JET_A1';

UPDATE "PhysicalTanks" 
SET fuel_type = 'Jet A' 
WHERE fuel_type = 'JET_A';

-- Update PhysicalCisternFuel (cisterns)
UPDATE "PhysicalCisternFuel" 
SET fuel_type = 'Jet A-1' 
WHERE fuel_type = 'JET_A1';

UPDATE "PhysicalCisternFuel" 
SET fuel_type = 'Jet A' 
WHERE fuel_type = 'JET_A';

-- Verify the changes
SELECT id, tank_name, fuel_type 
FROM "PhysicalTanks" 
ORDER BY id;

SELECT id, cistern_identifier, fuel_type 
FROM "PhysicalCisternFuel" 
ORDER BY id;

