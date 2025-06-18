-- SQL script to create EXCESS_FUEL_HOLDING tank
-- Run this on any new database environment

-- Check if the tank already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "FixedStorageTanks" 
        WHERE tank_name = 'EXCESS_FUEL_HOLDING'
    ) THEN
        -- Create the Excess Fuel Holding Tank
        INSERT INTO "FixedStorageTanks" (
            tank_name, 
            capacity_liters, 
            current_quantity_liters, 
            current_quantity_kg, 
            fuel_type, 
            location_description, 
            status, 
            "createdAt", 
            "updatedAt",
            notes
        ) VALUES (
            'EXCESS_FUEL_HOLDING', 
            999999999,  -- Unlimited capacity
            0,          -- Start empty
            0,          -- Start empty
            'JET_A1',   -- Standard fuel type
            'Virtual Holding Tank for Orphaned Liters', 
            'ACTIVE', 
            NOW(), 
            NOW(),
            'Automatically managed tank for collecting orphaned liters from depleted MRN records. This tank preserves fuel volume that would otherwise be lost during MRN operations.'
        );
        
        RAISE NOTICE 'EXCESS_FUEL_HOLDING tank created successfully';
    ELSE
        RAISE NOTICE 'EXCESS_FUEL_HOLDING tank already exists, skipping creation';
    END IF;
END
$$;

-- Display the tank info
SELECT 
    id, 
    tank_name, 
    capacity_liters, 
    current_quantity_liters,
    current_quantity_kg,
    location_description,
    status
FROM "FixedStorageTanks" 
WHERE tank_name = 'EXCESS_FUEL_HOLDING';
