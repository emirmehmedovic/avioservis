# 🔧 DENSITY RECONCILIATION GUIDE

## Problem Description

Tank 3 (ID: 7) ima negativnu količinu kilograma (-52,685.37 kg) iako MRN zapisi pokazuju pozitivnu količinu (7,403.51 kg). Ovo je rezultat **akumuliranih grešaka u gustoći** kroz različite operacije.

## Uzrok Problema

### Različite Gustoće u Sistemskim Fazama:

| **Faza** | **Gustoća korištena** | **Izvor** |
|----------|----------------------|-----------|
| **1. Fuel Intake** | `density_at_intake` = kg_received/L_received | Delivered quantities |
| **2. Fixed Tank Transfer** | **Weighted average** iz MRN zapisa | `Σ(kg)/Σ(L)` svih MRN |
| **3. Fueling Operations** | **User input** `specific_density` | Trenutna temperatura/operativa |

### Kako nastaju negativni KG:

```
Primjer akumulacije grešaka:
1. Intake: 10,000L @ 0.800 kg/L = 8,000 kg (stored as density_at_intake)
2. Transfer: weighted avg = 0.785 kg/L → 8,000kg ÷ 0.785 = 10,191L
3. Fueling: 10,191L @ 0.805 kg/L → MRN deduction: 8,204 kg
4. Tank update: 8,000kg - 8,204kg = -204 kg (NEGATIVE!)
```

## 🚨 IMMEDIATE FIX za Tank 3

### Option 1: SQL Script (Najbrži)

```sql
-- Wykonaj SQL script koji je kreiran:
cd backend
psql $DATABASE_URL -f fix_tank_negative_quantities.sql
```

### Option 2: TypeScript Script

```bash
# Kompajliraj i pokreni TypeScript script:
cd backend
npx ts-node scripts/fix-tank-3-immediate.ts
```

### Option 3: API Endpoint

```bash
# Pozovi reconciliation endpoint:
curl -X POST "https://dataavioservis.com/api/density-reconciliation/reconcile/tank/7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 📊 DUGOROČNO RJEŠENJE

### 1. Automatska Reconciliation

Nova `densityConsistencyManager.ts` utility omogućava:

- **Periodičnu reconciliation** svih tankova
- **Density variation analysis** prije operacija  
- **Smart consistency checks** koji toleriraju temperaturne varijacije

### 2. Poboljšane Consistency Provjere

System sada:
- ✅ Prihvaća tankove s negativnim kg ako imaju validne MRN zapise
- ✅ Koristi KG kao primarni kriterij (masa je konstantna)
- ✅ Tolerira litre varijacije do 2% (temperatura uticaj)
- ✅ Automatski preporučuje reconciliation

### 3. Nové API Endpoints

```
POST /api/density-reconciliation/reconcile/tank/:tankId    # Reconcile specific tank
POST /api/density-reconciliation/reconcile/all            # Reconcile all tanks  
GET  /api/density-reconciliation/analysis/report          # Density analysis report
POST /api/density-reconciliation/analysis/variation       # Analyze density variation
GET  /api/density-reconciliation/tank/:tankId/density-info # Tank density info
```

## 🔄 PREVENTIVNE MJERE

### 1. Periodic Reconciliation (Preporučeno)

Dodaj u cron job:

```typescript
// backend/src/cron/densityReconciliation.ts
import { performSystemWideDensityReconciliation } from '../utils/densityConsistencyManager';

export const scheduleWeeklyDensityReconciliation = () => {
  cron.schedule('0 2 * * 0', async () => { // Every Sunday at 2 AM
    console.log('Starting weekly density reconciliation...');
    try {
      const results = await performSystemWideDensityReconciliation();
      console.log(`Reconciliation completed for ${results.length} tanks`);
    } catch (error) {
      console.error('Weekly reconciliation failed:', error);
    }
  });
};
```

### 2. Density Variation Alerts

Sistem sada pravi warning kada je density varijacija > 3%:

```typescript
// U fuelTransferToTanker.controller.ts
const analysis = analyzeDensityVariation(weightedDensity, operationalDensity, quantityKg);
if (analysis.recommendedAction === 'ADJUST') {
  logger.warn(`Significant density variation detected: ${analysis.details}`);
}
```

### 3. Frontend Warnings

Dodaj u frontend upozorenja kada je tank density inconsistent:

```typescript
// U tank management komponenti
const densityInfo = await fetchTankDensityInfo(tankId);
if (densityInfo.inconsistencyLevel === 'HIGH') {
  showAlert('Tank needs reconciliation due to density inconsistencies');
}
```

## 📋 VERIFIKACIJA FIX-a

Nakon izvršavanja bilo kojeg fix-a, provjeri:

```sql
-- 1. Provjeri Tank 3 stanje
SELECT 
    id, tank_name, current_quantity_kg, current_quantity_liters
FROM fixed_storage_tanks 
WHERE id = 7;

-- 2. Provjeri MRN sume
SELECT 
    SUM(remaining_quantity_kg) as mrn_sum_kg,
    SUM(remaining_quantity_liters) as mrn_sum_liters
FROM tank_fuel_by_customs 
WHERE fixed_tank_id = 7 AND remaining_quantity_kg > 0;

-- 3. Provjeri sva ostala negativna stanja
SELECT id, tank_name, current_quantity_kg 
FROM fixed_storage_tanks 
WHERE current_quantity_kg < 0;
```

## 🎯 Očekivani Rezultati

Nakon reconciliation:
- ✅ Tank 3 KG: **7,403.51 kg** (pozitivna vrijednost)
- ✅ Tank 3 Liters: **9,443.758 L** (iz MRN zapisa)
- ✅ Fuel transfers će ponovo raditi normalno
- ✅ Consistency checks će pokazati OK status

## 💡 BEST PRACTICES za Budućnost

1. **Monitor density variations** - koristiti novi analysis endpoint
2. **Weekly reconciliation** - automated cron job
3. **Temperature tracking** - zabilježiti temperaturu goriva pri operations
4. **Density validation** - warn users pri značajnim varijacijama
5. **MRN record integrity** - ensure density_at_intake je uvijek set

## 🔧 Troubleshooting

### Problem: "Operation aborted due to data inconsistency"

**Rješenje:** 
```bash
curl -X POST "/api/density-reconciliation/reconcile/tank/{tankId}"
```

### Problem: Large density variations

**Rješenje:**
```bash
curl -X POST "/api/density-reconciliation/analysis/variation" \
  -d '{"tankId": 7, "operationalDensity": 0.805, "quantityKg": 5000}'
```

### Problem: Negative kg but positive MRN records

**Rješenje:** Automatic - system će dozvoliti operations ali will log warning

---

**Status:** 🟢 SYSTEM UPGRADED to handle density variations intelligently! 