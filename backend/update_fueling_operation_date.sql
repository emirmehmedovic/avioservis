-- Update Fueling Operation Date for Delivery Note 00000013
-- Change from 29.06.2025 to 25.05.2025

-- First, let's check the current state
SELECT 
    id,
    "dateTime",
    delivery_note_number,
    aircraft_registration,
    flight_number,
    operator_name,
    quantity_liters,
    quantity_kg
FROM "FuelingOperation" 
WHERE delivery_note_number = '00000013';

-- Update the date from 29.06.2025 to 25.05.2025
-- Assuming the time part should remain the same
UPDATE "FuelingOperation" 
SET 
    "dateTime" = CASE 
        WHEN DATE("dateTime") = '2025-06-29' THEN 
            '2025-05-25'::date + ("dateTime"::time)
        ELSE 
            "dateTime"
    END,
    "updatedAt" = NOW()
WHERE delivery_note_number = '00000013'
  AND DATE("dateTime") = '2025-06-29';

-- Verify the change
SELECT 
    id,
    "dateTime",
    delivery_note_number,
    aircraft_registration,
    flight_number,
    operator_name,
    quantity_liters,
    quantity_kg,
    "updatedAt"
FROM "FuelingOperation" 
WHERE delivery_note_number = '00000013';

-- Show the change summary
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 
            'SUCCESS: Updated ' || COUNT(*) || ' fueling operation(s) for delivery note 00000013'
        ELSE 
            'WARNING: No fueling operations found with delivery note 00000013 and date 2025-06-29'
    END as result
FROM "FuelingOperation" 
WHERE delivery_note_number = '00000013' 
  AND DATE("dateTime") = '2025-05-25'; 