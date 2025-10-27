# Physical Tanks - Field Names Reference

## ✅ Kontrolni Dokument - Imena Polja

### PhysicalTanks Model
```prisma
model PhysicalTanks {
  id                      Int                      @id @default(autoincrement())
  tank_name               String                   @unique
  tank_identifier         String                   @unique
  capacity_liters         Float
  current_quantity_liters Float                    @default(0)
  current_quantity_kg     Float                    @default(0)
  fuel_type               String
  location_description    String?
  display_order           Int
  is_active               Boolean                  @default(true)
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
}
```

**Ključne field reference:**
- Primary key: `id`
- Foreign key (iz PhysicalTankMrn): `physical_tank_id`

### PhysicalTankMrn Model
```prisma
model PhysicalTankMrn {
  id                         Int            @id @default(autoincrement())
  physical_tank_id           Int            // FK -> PhysicalTanks.id
  customs_declaration_number String
  quantity_liters            Decimal        @db.Decimal(12, 3)
  quantity_kg                Decimal        @db.Decimal(12, 3)
  remaining_quantity_liters  Decimal        @db.Decimal(12, 3)
  remaining_quantity_kg      Decimal        @db.Decimal(12, 3)
  density_at_intake          Decimal        @db.Decimal(8, 4)
  date_added                 DateTime
  fuel_intake_record_id      Int?
  is_retrofitted             Boolean        @default(false)
  createdAt                  DateTime       @default(now())
  updatedAt                  DateTime       @updatedAt
}
```

**Ključne field reference:**
- Primary key: `id`
- Foreign key: `physical_tank_id` → PhysicalTanks.id

### FuelingOperation Model (CURRENT)
```prisma
model FuelingOperation {
  id                    Int                @id @default(autoincrement())
  dateTime              DateTime
  aircraftId            Int?
  aircraft_registration String?
  airlineId             Int
  destination           String
  quantity_liters       Decimal
  tankId                Int                // FK -> FuelTank.id
  flight_number         String?
  operator_name         String
  notes                 String?
  quantity_kg           Decimal
  specific_density      Decimal            @default(0.8) @db.Decimal(10, 6)
  // ... other fields
}
```

**Ključne field reference:**
- Primary key: `id`
- Current tank reference: `tankId` → FuelTank.id

### MrnTransactionLeg Model (CURRENT)
```prisma
model MrnTransactionLeg {
  id                      Int                @id @default(autoincrement())
  tankFuelByCustomsId     Int?               // FK -> TankFuelByCustoms.id (fixed tanks)
  mobileTankCustomsId     Int?               // FK -> MobileTankCustoms.id (mobile tanks)
  transactionType         MrnTransactionType
  relatedTransactionId    String?
  kgTransacted            Decimal            @db.Decimal(12, 3)
  litersTransactedActual  Decimal            @db.Decimal(12, 3)
  operationalDensityUsed  Decimal            @db.Decimal(8, 4)
  literVarianceForThisLeg Decimal            @db.Decimal(12, 3)
  timestamp               DateTime           @default(now())
}
```

**Ključne field reference:**
- Primary key: `id`
- Foreign keys: `tankFuelByCustomsId`, `mobileTankCustomsId`

---

## 🔴 REQUIRED CHANGES FOR INTEGRATION

### 1. FuelingOperation Schema Changes
```prisma
model FuelingOperation {
  // ... existing fields ...
  tankId                Int                // Existing: FK -> FuelTank.id (mobile/fixed tanks)
  physical_tank_id      Int?               // NEW: FK -> PhysicalTanks.id (optional)
  physicalTank          PhysicalTanks?     @relation(fields: [physical_tank_id], references: [id]) // NEW
  
  @@index([physical_tank_id]) // NEW
}
```

**Naming convention check:**
- ✅ `physical_tank_id` (snake_case) - **MATCHES** PhysicalTankMrn.physical_tank_id
- ✅ Relation name: `physicalTank` (camelCase) - **MATCHES** standard Prisma convention

### 2. MrnTransactionLeg Schema Changes
```prisma
model MrnTransactionLeg {
  // ... existing fields ...
  tankFuelByCustomsId     Int?               // Existing: FK -> TankFuelByCustoms.id
  mobileTankCustomsId     Int?               // Existing: FK -> MobileTankCustoms.id
  physical_tank_mrn_id    Int?               // NEW: FK -> PhysicalTankMrn.id
  physicalTankMrn         PhysicalTankMrn?   @relation(fields: [physical_tank_mrn_id], references: [id]) // NEW
  
  @@index([physical_tank_mrn_id]) // NEW
}
```

**Naming convention check:**
- ⚠️ **CRITICAL DECISION NEEDED**: 
  - Option A: `physical_tank_mrn_id` (matches pattern with `tank_fuel_by_customs_id`)
  - Option B: `physicalTankMrnId` (camelCase, matches some other FK naming)
  
**RECOMMENDATION**: Use `physical_tank_mrn_id` to be consistent with:
- `tankFuelByCustomsId` (actually uses camelCase, so there's inconsistency)
- `mobileTankCustomsId` (uses camelCase)

**Wait, let me check the actual pattern:**
Looking at existing schema:
- `tankFuelByCustomsId` - camelCase ❌ (inconsistent)
- `mobileTankCustomsId` - camelCase ❌ (inconsistent)
- `physical_tank_id` - snake_case ✅

**NEW RECOMMENDATION**: 
Since we're adding `physical_tank_id` in snake_case, we should also use snake_case for consistency:
- Use `physical_tank_mrn_id` (snake_case)

### 3. Service Layer Changes

In `processMrnDeduction` function:

```typescript
export const processMrnDeduction = async (
  tx: PrismaTransactionClient,
  sourceId: number,
  quantityToRemoveKg: number,
  operationalDensity: number,
  sourceType: 'fixed' | 'mobile' | 'physical', // NEW parameter
  transactionType: MrnTransactionType,
  related_mrn_transaction_id: string
)
```

**Field names to use:**
- For Physical tanks:
  - Model: `tx.physicalTankMrn` ✅
  - Where clause: `{ physical_tank_id: sourceId, remaining_quantity_kg: { gt: 0 } }` ✅
  - FK in MrnTransactionLeg: `physical_tank_mrn_id` (or `physicalTankMrnId`?)

---

## ⚠️ POTENTIAL CONFUSION POINTS

1. **Column naming inconsistency**:
   - Existing schema uses `tankFuelByCustomsId` (camelCase)
   - But we're adding `physical_tank_id` (snake_case)
   - **Solution**: Use snake_case for new fields to match database convention

2. **Relation naming**:
   - Existing: `tankFuelByCustoms`, `mobileTankCustoms` (camelCase)
   - New: `physicalTank` (camelCase) - ✅ CONSISTENT

3. **Update operations**:
   - `tx.physicalTankMrn.update()` - ✅
   - `tx.physicalTanks.update()` - ✅ (note: plural "Tanks" not "Tank")

---

## 📝 FINAL RECOMMENDATIONS

1. **Use snake_case for new FK columns**: 
   - `physical_tank_id`
   - `physical_tank_mrn_id`

2. **Use camelCase for Prisma relation names**:
   - `physicalTank`
   - `physicalTankMrn`

3. **Keep existing inconsistencies** (don't change `tankFuelByCustomsId` to `tank_fuel_by_customs_id`)

4. **Add proper indexes**:
   - `@@index([physical_tank_id])` on FuelingOperation
   - `@@index([physical_tank_mrn_id])` on MrnTransactionLeg

