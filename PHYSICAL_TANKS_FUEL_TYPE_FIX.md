# Physical Tanks Fuel Type Format Fix

## Problem
Physical tanks (`PhysicalTanks` table) were storing fuel types in enum format (`JET_A1`), while fixed tanks (`FixedStorageTanks`) use display format (`Jet A-1`). This inconsistency caused validation errors during fuel intake operations.

**Error example:**
```
Physical tank TANK 1 is for JET_A1, but intake is for Jet A-1.
```

## Solution
Standardized physical tanks to use display format (same as fixed tanks) for consistency.

## Changes Made

### 1. Frontend (`PhysicalTanksDisplay.tsx`)
- Updated `fuelTypes` array to use display format:
  - `'JET_A1'` → `'Jet A-1'`
  - `'JET_A'` → `'Jet A'`
- Updated default values in form states to use display format
- All newly created tanks will use display format

### 2. Backend (`fuelIntakeRecord.controller.ts`)
- Added normalization logic for backward compatibility
- Now handles both old enum format (`JET_A1`) and new display format (`Jet A-1`)
- Automatically converts old format to new format for comparison

### 3. Database Migration Script (`fix_physical_tanks_fuel_type.sql`)
Created SQL script to update existing physical tanks and cisterns:
```sql
-- Update PhysicalTanks
UPDATE "PhysicalTanks" SET fuel_type = 'Jet A-1' WHERE fuel_type = 'JET_A1';
UPDATE "PhysicalTanks" SET fuel_type = 'Jet A' WHERE fuel_type = 'JET_A';

-- Update PhysicalCisternFuel
UPDATE "PhysicalCisternFuel" SET fuel_type = 'Jet A-1' WHERE fuel_type = 'JET_A1';
UPDATE "PhysicalCisternFuel" SET fuel_type = 'Jet A' WHERE fuel_type = 'JET_A';
```

## How to Apply

### Option 1: Run the SQL script
```bash
# Replace with your actual database connection
psql -U username -d database_name -f backend/fix_physical_tanks_fuel_type.sql
```

### Option 2: Update tanks individually via frontend
- Edit each existing tank
- Select the fuel type again (now in display format)
- Save

## Benefits
1. **Consistency**: All tank types now use the same format
2. **No more validation errors**: Fuel type matching now works correctly
3. **Better UX**: Users see consistent fuel type names everywhere
4. **Backward compatible**: Old data with enum format still works

## Testing
After applying the fix:
1. Create a new fuel intake record
2. Distribute to physical tanks
3. Verify no fuel type mismatch errors occur
4. Check that tank quantities update correctly

