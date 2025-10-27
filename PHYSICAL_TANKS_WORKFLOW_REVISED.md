# Physical Tanks Workflow - Revidirani Plan

## 📋 Novi Workflow

```
Fizički Fiksni Tankovi → Cisterne → Fueling Operacije
     (FIFO)              (FIFO)     (AIRCRAFT_FUELING)
```

## ✅ Što VEĆ POSTOJI

### 1. PhysicalTanks Model ✅
- Fizički tankovi (TANK 1, TANK 2, TANK 3)
- `current_quantity_liters`, `current_quantity_kg`
- `PhysicalTankMrn` za MRN tracking

### 2. PhysicalCisternFuel Model ✅
- Cisterne za spremanje goriva
- `current_quantity_liters`, `current_quantity_kg`
- `PhysicalCisternMrn` za MRN tracking

### 3. PhysicalTankTransfer Model ✅
- Transfer iz PhysicalTanks u PhysicalCisternFuel
- `source_physical_tank_id` → `target_cistern_id`
- `mrn_breakdown` za tracking MRN-a

### 4. Backend Controllers ✅
- `physicalTankTransfer.controller.ts` - već postoji!
- Transfer funkcionalnost već implementirana!

---

## 🔴 ŠTO TREBA DODATI

### 1. **Transfer UI u PhysicalTanksDisplay.tsx**

**Lokacija**: Kartica "Cisterne" (cisterns tab)

**Dodati**:
- ✅ Button "Dodaj Transfer" - već postoje transfer modal-i
- ✅ Prebaciti gorivo iz fizičkog tanka u cisternu
- ✅ FIFO logika već implementirana u `createTransfer` funkciji!

**Provjeri**: Da li već postoji UI za transfere? Hajde provjerimo...

Looking at PhysicalTanksDisplay.tsx lines 450-500 (from previous search):
- Transfer modal već postoji! ✅
- `createTransfer` funkcija već postoji! ✅
- FIFO logika već postoji u backend-u! ✅

### 2. **Fueling Operation Integration sa Cisternama**

**Problem**: Fueling operacije trenutno rade sa `FuelTank` (mobile/fixed), a ne sa `PhysicalCisternFuel`

**Rješenje**: 
- Opcionalno dodati `cistern_id` u FuelingOperation
- Ili koristiti postojeći FuelTank sistem i umjesto toga voditi cisternu kao "terminal tank"

---

## 🎯 Revidirani Plan - DVA OPCIJE

### **Opcija 1: Cisterna kao source za Fueling Operations** (KOMPLEKSNIJE)

1. Dodati `cistern_id` u FuelingOperation
2. Modificirati `processMrnDeduction` da podržava `PhysicalCisternFuel`
3. FIFO iz cisterne pri fueling operaciji

**Pros**: Puna integracija sa cisternama
**Cons**: Kompleksno, treba mijenjati FuelingOperation

### **Opcija 2: Cisterna kao Terminal Tank** (JEDNOSTAVNIJE - PREPORUČENO)

1. Cisterna je samo za skladištenje (ne za fueling direktno)
2. Kada je cisterna puna, transferuj sve u postojeći FuelTank (mobile/fixed)
3. Fueling operacije idu iz FuelTank-a

**Pros**: Ne mijenjaš postojeći sistem, jednostavno
**Cons**: Extra transfer korak

---

## 💡 PREPORUČENO RJEŠENJE: Opcija 2.5

**Cisterna + FuelTank hybrid approach**:

1. **Transfer UI**: Dodaj button "Dodaj Transfer" u cistern kartici
2. **Transfer funkcionalnost**: Već postoji! Samo napravi UI ljepši
3. **Fueling**: Ne mijenja se! Još uvijek iz FuelTank-a
4. **Workflow**: 
   ```
   PhysicalTanks → Transfer → Cistern (storage)
   Cistern → Transfer → FuelTank (operational)
   FuelTank → Fueling Operations
   ```

**Implementation**:
- ✅ Transfer UI - dodaj samo button
- ✅ Backend - već postoji `physicalTankTransfer.controller.ts`
- ⏳ FuelTank transfer - može li se dodati funkcija za transfer iz cistern u FuelTank?

---

## 📝 NEXT STEPS

### Immediate (Danas):
1. ✅ Provjeriti postojeći transfer UI
2. ✅ Dodati transfer button u cistern kartici
3. ✅ Testirati transfer fizicki_tank → cistern

### Short-term (Sljedeća sesija):
4. ⏳ Dodati transfer cistern → FuelTank
5. ⏳ Automatizirati transfer cisterne kada je puna

### Long-term (Budućnost):
6. ⏳ Potpuna integracija cisterne sa fueling operations
7. ⏳ Dashboard za praćenje goriva kroz workflow

---

## 🎯 AKCIJA SADA

**Provjeri**: Da li transfer modal već postoji u PhysicalTanksDisplay.tsx?

Ako DA → samo uči ga u cistern kartici
Ako NE → napravi novi transfer UI

**CHECK**: Search for "transfer" in PhysicalTanksDisplay.tsx

