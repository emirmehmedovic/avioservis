-- Fix Tank 3 negative kg quantity issue
-- Based on the logs, Tank 3 (ID: 7) has negative kg (-52685.37) but MRN records show positive quantities

-- First, let's see the current state
SELECT 
    fst.id,
    fst.tank_name,
    fst.current_quantity_liters,
    fst.current_quantity_kg,
    COALESCE(SUM(tfbc.remaining_quantity_liters), 0) as mrn_sum_liters,
    COALESCE(SUM(tfbc.remaining_quantity_kg), 0) as mrn_sum_kg
FROM fixed_storage_tanks fst
LEFT JOIN tank_fuel_by_customs tfbc ON fst.id = tfbc.fixed_tank_id 
    AND tfbc.remaining_quantity_liters > 0 
    AND (tfbc.remaining_quantity_kg IS NULL OR tfbc.remaining_quantity_kg > 0)
WHERE fst.id = 7
GROUP BY fst.id, fst.tank_name, fst.current_quantity_liters, fst.current_quantity_kg;

-- Fix the tank quantities to match MRN records
-- This updates Tank 3 to have the correct quantities based on MRN records
UPDATE fixed_storage_tanks 
SET 
    current_quantity_liters = (
        SELECT COALESCE(SUM(tfbc.remaining_quantity_liters), 0)
        FROM tank_fuel_by_customs tfbc 
        WHERE tfbc.fixed_tank_id = 7 
        AND tfbc.remaining_quantity_liters > 0
    ),
    current_quantity_kg = (
        SELECT COALESCE(SUM(tfbc.remaining_quantity_kg), 0)
        FROM tank_fuel_by_customs tfbc 
        WHERE tfbc.fixed_tank_id = 7 
        AND (tfbc.remaining_quantity_kg IS NULL OR tfbc.remaining_quantity_kg > 0)
        AND tfbc.remaining_quantity_kg IS NOT NULL
    )
WHERE id = 7;

-- Verify the fix
SELECT 
    fst.id,
    fst.tank_name,
    fst.current_quantity_liters,
    fst.current_quantity_kg,
    COALESCE(SUM(tfbc.remaining_quantity_liters), 0) as mrn_sum_liters,
    COALESCE(SUM(tfbc.remaining_quantity_kg), 0) as mrn_sum_kg,
    ABS(fst.current_quantity_liters - COALESCE(SUM(tfbc.remaining_quantity_liters), 0)) as liter_difference,
    ABS(fst.current_quantity_kg - COALESCE(SUM(tfbc.remaining_quantity_kg), 0)) as kg_difference
FROM fixed_storage_tanks fst
LEFT JOIN tank_fuel_by_customs tfbc ON fst.id = tfbc.fixed_tank_id 
    AND tfbc.remaining_quantity_liters > 0 
    AND (tfbc.remaining_quantity_kg IS NULL OR tfbc.remaining_quantity_kg > 0)
WHERE fst.id = 7
GROUP BY fst.id, fst.tank_name, fst.current_quantity_liters, fst.current_quantity_kg;

-- Also check for any other tanks with negative kg quantities
SELECT id, tank_name, current_quantity_kg, current_quantity_liters
FROM fixed_storage_tanks 
WHERE current_quantity_kg < 0 
ORDER BY current_quantity_kg; 