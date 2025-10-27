# Physical Tanks - Fueling Operation Integration Plan

## Overview
Implement automatsko oduzimanje goriva iz fizičkih tankova kada se napravi fueling operation.

## Current State Analysis

### Existing System
- **FuelingOperation** se kreira kroz `createFuelingOperation` u `fuelingOperation.controller.ts`
- Koristi se `processMrnDeduction` za oduzimanje goriva iz **Fixed/Mobile tanks** prema FIFO logici
- Trenutno radi sa:
  - `TankFuelByCustoms` (Fixed tanks)
  - `MobileTankCustoms` (Mobile tanks)

### Physical Tanks System
- Postoje 3 tabela:
  - `PhysicalTanks` - Fizički tankovi
  - `PhysicalTankMrn` - MRN recordi po physical tankovima
  - `PhysicalCisternFuel` - Cisterne

## Implementation Plan

### 1. **Extend `processMrnDeduction` Function**
**File**: `backend/src/services/mrnTransaction.service.ts`

**Changes needed**:
- Dodati novi parametar `sourceType: 'fixed' | 'mobile' | 'physical'`
- Dodati logiku za physical tanks kada je `sourceType === 'physical'`
- Koristiti `tx.physicalTankMrn` umjesto `tx.tankFuelByCustoms` ili `tx.mobileTankCustoms`

### 2. **Add Physical Tank Source Field to FuelingOperation**
**Files**: 
- `backend/prisma/schema.prisma`
- Migration file

**Changes**:
```prisma
model FuelingOperation {
  // ... existing fields ...
  physical_tank_id Int?  // NEW: Reference to physical tank
  physicalTank    PhysicalTanks? @relation(fields: [physical_tank_id], references: [id])
}
```

### 3. **Update FuelingOperation Controller**
**File**: `backend/src/controllers/fuelingOperation.controller.ts`

**Changes**:
- Dodati `physical_tank_id` u `fuelingOperationSchema` (optional)
- Ako je `physical_tank_id` prisutan, koristiti `processMrnDeduction` sa `sourceType: 'physical'`
- Kreirati novi `MrnTransactionLeg` za physical tank izlaz

### 4. **Update Frontend**
**File**: `frontend/src/components/fuel/FuelingOperations.tsx`

**Changes**:
- Dodati dropdown za odabir tipa tanka (Fixed/Mobile/Physical)
- Prikazati physical tanks u tank selector-u ako je odabran physical tip
- Slati `physical_tank_id` umjesto `tankId` ako je odabran physical tank

## Technical Details

### FIFO Logic for Physical Tanks
```typescript
// Pseudo-code
const physicalMrnRecords = await tx.physicalTankMrn.findMany({
  where: {
    physical_tank_id: sourceId,
    remaining_quantity_kg: { gt: 0 }
  },
  orderBy: { date_added: 'asc' } // FIFO
});

// Oduzmi redom dok se ne ispuni potrebna količina
for (const record of physicalMrnRecords) {
  if (remainingKgToDeduct <= 0) break;
  
  const kgToDeduct = Math.min(record.remaining_quantity_kg, remainingKgToDeduct);
  
  // Update PhysicalTankMrn
  await tx.physicalTankMrn.update({
    where: { id: record.id },
    data: {
      remaining_quantity_kg: record.remaining_quantity_kg - kgToDeduct,
      remaining_quantity_liters: record.remaining_quantity_liters - (kgToDeduct / density)
    }
  });
  
  // Update PhysicalTanks current quantities
  await tx.physicalTanks.update({
    where: { id: sourceId },
    data: {
      current_quantity_liters: { decrement: kgToDeduct / density },
      current_quantity_kg: { decrement: kgToDeduct }
    }
  });
  
  // Create MrnTransactionLeg
  await createMrnTransaction(tx, {
    physicalTankMrnId: record.id,
    transactionType: 'AIRCRAFT_FUELING',
    quantity_kg_transferred: -kgToDeduct, // negative for outflow
    related_mrn_transaction_id: fuelingOperationId
  });
}
```

## Database Migration

### Schema Changes
```prisma
model FuelingOperation {
  id                    Int                @id @default(autoincrement())
  // ... existing fields ...
  physical_tank_id      Int?               // NEW
  physicalTank          PhysicalTanks?     @relation(fields: [physical_tank_id], references: [id]) // NEW
  
  @@index([physical_tank_id]) // NEW
}

model MrnTransactionLeg {
  // ... existing fields ...
  physical_tank_mrn_id  Int?               // NEW
  physicalTankMrn       PhysicalTankMrn?   @relation(fields: [physical_tank_mrn_id], references: [id]) // NEW
}
```

## Testing Plan

1. **Unit Tests**:
   - Test FIFO logic for physical tanks
   - Test MRN transaction creation
   - Test insufficient fuel scenarios

2. **Integration Tests**:
   - Create fueling operation with physical tank source
   - Verify PhysicalTankMrn updates
   - Verify PhysicalTanks current quantities update
   - Verify MrnTransactionLeg records created

3. **E2E Tests**:
   - Create intake in physical tank
   - Create fueling operation from physical tank
   - Verify all quantities updated correctly

## Rollout Strategy

1. **Phase 1**: Implement backend logic
2. **Phase 2**: Test with development data
3. **Phase 3**: Update frontend UI
4. **Phase 4**: User acceptance testing
5. **Phase 5**: Production deployment

## Estimated Effort

- Backend changes: 4-6 hours
- Database migration: 1 hour
- Frontend changes: 3-4 hours
- Testing: 3-4 hours
- **Total**: ~12-15 hours

## Risks & Mitigations

1. **Risk**: Breaking existing fueling operations
   - **Mitigation**: Make physical_tank_id optional, keep existing logic intact

2. **Risk**: Performance impact on large MRN tables
   - **Mitigation**: Add indexes on frequently queried fields

3. **Risk**: Data inconsistency during transition
   - **Mitigation**: Use transactions for all updates

## Next Steps

1. ✅ Review this plan
2. ⏳ Implement schema changes
3. ⏳ Extend mrnTransaction service
4. ⏳ Update fueling operation controller
5. ⏳ Update frontend UI
6. ⏳ Test thoroughly
7. ⏳ Deploy to production

