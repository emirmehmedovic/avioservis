-- =====================================================
-- DEBUG MRN DATE_ADDED PROBLEM - SQL KOMANDE (ISPRAVLJENE)
-- =====================================================

-- 0. PROVJERITE STRUKTURU FuelTank TABLICE
\d "FuelTank"

-- 1. POGLEDAJTE SVE MOBILNE CISTERNE (ispravljeno)
SELECT 
    id,
    name,
    identifier,
    current_liters,
    current_kg
FROM "FuelTank" 
WHERE name LIKE '%VOZILO%' AND is_deleted = false
ORDER BY id;

-- 2. PROVJERITE MRN-OVE U MOBILNOJ CISTERNI (zamijenite [TANK_ID] s ID-om cisterne)
SELECT 
    customs_declaration_number,
    date_added,
    remaining_quantity_kg,
    mobile_tank_id
FROM "MobileTankCustoms" 
WHERE mobile_tank_id = [TANK_ID]
ORDER BY date_added ASC;

-- 3. PROVJERITE SPECIFIČNE MRN-OVE (70 i 71)
SELECT 
    customs_declaration_number,
    date_added,
    remaining_quantity_kg,
    mobile_tank_id
FROM "MobileTankCustoms" 
WHERE customs_declaration_number IN ('25BA010304000070J3', '25BA010304000071J2')
ORDER BY date_added ASC;

-- 4. PROVJERITE MRN-OVE U FIKSNOM TANKU ZA POREĐENJE
SELECT 
    customs_declaration_number,
    date_added,
    remaining_quantity_kg,
    fixed_tank_id
FROM "TankFuelByCustoms" 
WHERE customs_declaration_number IN ('25BA010304000070J3', '25BA010304000071J2')
ORDER BY date_added ASC;

-- 5. PROVJERITE SVE MRN-OVE S TANK INFORMACIJAMA
SELECT 
    mtc.customs_declaration_number,
    mtc.date_added,
    mtc.remaining_quantity_kg,
    ft.name as tank_name,
    ft.id as tank_id
FROM "MobileTankCustoms" mtc
JOIN "FuelTank" ft ON mtc.mobile_tank_id = ft.id
WHERE mtc.customs_declaration_number IN ('25BA010304000070J3', '25BA010304000071J2')
ORDER BY mtc.date_added ASC;

-- 6. PROVJERITE SVE MRN-OVE U MOBILNOJ CISTERNI S DETALJIMA
SELECT 
    mtc.customs_declaration_number,
    mtc.date_added,
    mtc.remaining_quantity_kg,
    mtc.quantity_kg,
    mtc.density_at_intake,
    ft.name as tank_name,
    ft.id as tank_id
FROM "MobileTankCustoms" mtc
JOIN "FuelTank" ft ON mtc.mobile_tank_id = ft.id
WHERE ft.name LIKE '%VOZILO%' AND ft.is_deleted = false
ORDER BY mtc.date_added ASC;

-- =====================================================
-- UPUTE:
-- =====================================================
-- 1. Spojite se na bazu: psql -U avio -d avioservis_db
-- 2. Prvo izvršite komandu 0 da vidite strukturu tablice
-- 3. Kopirajte i izvršite komande jednu po jednu
-- 4. Zabilježite rezultate i pošaljite mi
-- 5. Posebno obratite pažnju na date_added vrijednosti
-- 6. Usporedite date_added iz fiksnog i mobilnog tanka
-- ===================================================== 