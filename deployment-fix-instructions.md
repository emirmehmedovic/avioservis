# 🚨 TANK 3 FIX INSTRUCTIONS - PRODUCTION DEPLOYMENT

## STEP 1: Deploy Code (Na serveru)

```bash
# 1. Pull latest changes
cd /path/to/your/project  # Idi u svoj project folder na serveru
git pull origin main

# 2. Install any new dependencies (ako ima)
cd backend
npm install

# 3. Rebuild TypeScript (ako potrebno)
npm run build
```

## STEP 2: Execute Fix Script

### Option A: Direct TypeScript Execution
```bash
cd backend
npx ts-node scripts/fix-tank-3-immediate.ts
```

### Option B: If ts-node not available, compile first
```bash
cd backend
npx tsc scripts/fix-tank-3-immediate.ts --outDir ./dist/scripts
node dist/scripts/fix-tank-3-immediate.js
```

### Option C: Direct Database SQL Fix
```bash
# Connect to your PostgreSQL database
psql "your_database_connection_string"

# Execute the SQL fix
\i fix_tank_negative_quantities.sql

# Or copy-paste the SQL content:
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
        AND tfbc.remaining_quantity_kg > 0
        AND tfbc.remaining_quantity_kg IS NOT NULL
    )
WHERE id = 7;
```

## STEP 3: Verification

After running the fix, verify:

```sql
-- Check Tank 3 status
SELECT 
    id, tank_name, current_quantity_kg, current_quantity_liters
FROM fixed_storage_tanks 
WHERE id = 7;

-- Check MRN records sum
SELECT 
    SUM(remaining_quantity_kg) as mrn_sum_kg,
    SUM(remaining_quantity_liters) as mrn_sum_liters
FROM tank_fuel_by_customs 
WHERE fixed_tank_id = 7 AND remaining_quantity_kg > 0;
```

Expected results:
- Tank 3 KG should be positive (~7,403.51 kg)
- Tank 3 Liters should be positive (~9,443.758 L)
- Both should match MRN sums

## STEP 4: Test Operations

Try the failed fuel transfer operation again:
```bash
# The operation that was failing should now work:
# POST https://dataavioservis.com/api/fuel/transfers/fixed-to-mobile
```

## STEP 5: Optional - System-wide Check

```bash
# Use new API endpoint to check all tanks
curl -X GET "https://dataavioservis.com/api/density-reconciliation/analysis/report" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## TROUBLESHOOTING

### If script fails:
1. Check database connection
2. Ensure Tank ID 7 exists
3. Check MRN records exist for tank
4. Run SQL method as fallback

### If still getting "data inconsistency":
```bash
# Restart your backend service
pm2 restart api-projekat2

# Or check logs
pm2 logs api-projekat2
```

## SUCCESS INDICATORS

✅ Tank 3 has positive kg value
✅ No more "data inconsistency" errors  
✅ Fuel transfer operations work normally
✅ MRN records sum matches tank quantities 