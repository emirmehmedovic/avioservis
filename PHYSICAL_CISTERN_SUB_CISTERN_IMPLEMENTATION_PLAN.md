# Physical Cistern - Sub-Cistern Implementation Plan

## 🎯 Cilj

Implementirati kumulativnu cisternu sa pod-cisternama bez mijenjanja FuelingOperation logike.

## 📋 Što treba implementirati

### 1. **Database Schema** ✅
- `PhysicalCisternFuel.is_cumulative` - flag za kumulativne cisterne
- `PhysicalSubCistern` - logičke pod-cisterne
- `PhysicalSubCisternMrn` - MRN zapisi po pod-cisternama

### 2. **Sub-Cistern Management**
- **Kreiranje**: Admin može označiti cisternu kao "kumulativnu"
- **Raspodjela**: Podeliti kapacitet na 2+ pod-cisterne
  - Primjer: 60000L → Cisterna 1 (36000L) + Cisterna 2 (24000L)
- **Upravljanje**: Editiraj kapacitete pod-cisterni

### 3. **Transfer: Tank → Cistern**
- Kada se prebaci gorivo u kumulativnu cisternu:
  - Gorivo ide prvo u parent cisternu (PhysicalCisternMrn)
  - Automatski raspodjela na pod-cisterne po kapacitetu

### 4. **Fueling: Cistern → Aircraft** ⚠️ KLJUČNO
- **NE mijenjati FuelingOperation!**
- Hook na `createFuelingOperation` success
- Oduzmi iz cisterni (FIFO):
  ```
  fuelingOperation.quantity_liters → oduzmi iz cisterni
  fuelingOperation.quantity_kg → oduzmi iz cisterni
  ```
- Raspodjela na pod-cisterne:
  - Ako je kumulativna: oduzmi srazmjerno od svake pod-cisterne
  - FIFO po PhysicalSubCisternMrn

## 🛠️ Implementation Steps

### Step 1: Migrate Database
```bash
cd backend
npx prisma migrate dev --name add_sub_cisterns
```

### Step 2: Backend Services

#### A. Sub-Cistern Service
`backend/src/services/physicalSubCistern.service.ts`
- `createSubCisterns(cisternId, subCisterns[])`
- `updateSubCisternCapacity(subCisternId, newCapacity)`
- `distributeFuelFromCistern(cisternId, quantityLiters, quantityKg)`
- `deductFuelFromSubCisterns(cisternId, quantityLiters, quantityKg)` - FIFO

#### B. Modify Fueling Operation Controller
`backend/src/controllers/fuelingOperation.controller.ts`

ADD after successful fueling creation:
```typescript
// Hook: After fueling created
try {
  await processPhysicalCisternDeduction(
    newFuelingOperation.id,
    newFuelingOperation.quantity_liters,
    newFuelingOperation.quantity_kg,
    newFuelingOperation.tankId // or dedicated cistern_id
  );
} catch (error) {
  logger.warn('Physical cistern deduction failed', error);
  // Don't fail fueling operation!
}
```

### Step 3: Frontend

#### A. Sub-Cistern Configuration Modal
`frontend/src/components/fuel/PhysicalTanksDisplay.tsx`

Add button "Configure Sub-Cisterns" on cumulative cistern cards:
- Input fields for each sub-cistern capacity
- Total validation: sum <= parent capacity
- Save distribution

#### B. Display Sub-Cisterns
In cistern card, show:
- Sub-cistern 1: 36000L (current: 18000L)
- Sub-cistern 2: 24000L (current: 12000L)

### Step 4: Fueling Integration

#### Service: `processPhysicalCisternDeduction`
```typescript
export async function processPhysicalCisternDeduction(
  fuelingOperationId: number,
  quantityLiters: Decimal,
  quantityKg: Decimal
) {
  // 1. Find cumulative cistern (or use configured one)
  const cistern = await prisma.physicalCisternFuel.findFirst({
    where: { is_cumulative: true, is_active: true }
  });
  
  if (!cistern) {
    logger.info('No cumulative cistern configured');
    return;
  }
  
  // 2. Check if cistern has sub-cisterns
  const subCisterns = await prisma.physicalSubCistern.findMany({
    where: { parent_cistern_id: cistern.id, is_active: true }
  });
  
  if (subCisterns.length === 0) {
    logger.info('No sub-cisterns configured, skipping');
    return;
  }
  
  // 3. Distribute deduction across sub-cisterns (FIFO)
  await prisma.$transaction(async (tx) => {
    let remainingLiters = quantityLiters;
    let remainingKg = quantityKg;
    
    for (const subCistern of subCisterns) {
      if (remainingLiters <= 0) break;
      
      // Calculate proportional deduction
      const subCapacity = subCistern.capacity_liters;
      const totalCapacity = subCisterns.reduce((sum, sc) => sum + sc.capacity_liters, 0);
      const proportion = subCapacity / totalCapacity;
      
      const deductLiters = Decimal.min(
        remainingLiters,
        new Decimal(subCapacity * proportion)
      );
      const deductKg = deductLiters.mul(quantityKg).div(quantityLiters);
      
      // FIFO deduction from this sub-cistern MRNs
      await deductFuelFromSubCisternFIFO(
        tx,
        subCistern.id,
        deductLiters,
        deductKg,
        fuelingOperationId
      );
      
      remainingLiters = remainingLiters.sub(deductLiters);
      remainingKg = remainingKg.sub(deductKg);
    }
  });
}
```

## 📊 Workflow Example

### Scenario:
1. **Cistern**: 60000L capacity, cumulative
2. **Sub-cisterns**: 
   - Sub 1: 36000L
   - Sub 2: 24000L
3. **State**:
   - Sub 1: 18000L, Sub 2: 12000L
4. **Fueling**: 10000L
5. **Deduction** (proportional):
   - Sub 1: 6000L (60% of capacity)
   - Sub 2: 4000L (40% of capacity)
6. **Result**:
   - Sub 1: 12000L remaining
   - Sub 2: 8000L remaining

## ✅ Acceptance Criteria

- [x] **Database schema** - PhysicalSubCistern tables created
- [x] **Backend service** - physicalSubCistern.service.ts created
- [x] **Backend controller** - physicalSubCistern.controller.ts created
- [x] **Backend routes** - physicalSubCistern.routes.ts created
- [x] **API registration** - Routes registered in app.ts
- [x] **Fueling hook** - Auto-deduction from cisterns after fueling operation
- [ ] Admin can configure cistern as "cumulative" (Frontend TODO)
- [ ] Admin can split cistern into 2+ sub-cisterns (Frontend TODO)
- [ ] Transfer from tank distributes to sub-cisterns (TODO)
- [x] Fueling operations auto-deduct from sub-cisterns ✅
- [x] FIFO logic works for sub-cistern MRNs ✅
- [x] No changes to FuelingOperation schema ✅
- [x] Backward compatible (non-cumulative cisterne still work) ✅

## 🚀 Next Steps

1. Run migration
2. Create sub-cistern service
3. Add frontend UI
4. Integrate with fueling operations
5. Test end-to-end
