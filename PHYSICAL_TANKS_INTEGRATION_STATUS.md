# Physical Tanks Integration - Status

## ✅ Dodano do sada

### 1. Frontend Modifications
- ✅ Dodato Step 3 (PHYSICAL_TANK_DISTRIBUTION) u STEPS konstante
- ✅ Dodat state za physical tanks (`physicalTanks`, `physicalTanksLoading`, `physicalTanksError`)
- ✅ Dodat useEffect za dohvat physical tanks
- ✅ Dodate helper funkcije (`getPhysicalTankDisplayInfo`)
- ✅ Dodat switch case za PHYSICAL_TANK_DISTRIBUTION
- ✅ Kreiran kompletan UI za Step 3 sa:
  - Loading state
  - Error state
  - Fuel type validation
  - Dropdown za odabir physical tanks
  - Input za količinu
  - Dodavanje/brisanje distribucija
  - Info banner da je korak opcioni
- ✅ Import `physicalTankService` i `PhysicalTank` tipa
- ✅ Dodat `Plus` icon import

### 2. Data Structures
- ✅ Dodato `physical_tank_distributions` u `IntakeFormData` interface
- ✅ Kreiran `filteredPhysicalTanks` useMemo hook

## 🔄 Potrebno implementirati

### 1. Navigacija između step-ova
- [ ] Modifikovati `handleNext` da preskače Step 3 ako korisnik ne želi koristiti physical tanks
- [ ] Dodati "Preskoči" button na Step 3
- [ ] Ažurirati step brojeve u navigaciji (ako postoji stepper UI)

### 2. Validacija
- [ ] Dodati validaciju za physical tank distributions (ako su unesene)
- [ ] Provjeriti kapacitet physical tanks
- [ ] Provjeriti fuel type matching

### 3. Backend Integration
- [ ] Modifikovati `handleSubmit` da šalje `physical_tank_distributions` u payload
- [ ] Backend kontroler mora handle-ati physical tank distributions
- [ ] Kreirati `PhysicalTankMrn` zapise
- [ ] Ažurirati `PhysicalTanks.current_quantity_liters` i `current_quantity_kg`

### 4. Testiranje
- [ ] Testirati flow sa physical tanks
- [ ] Testirati flow bez physical tanks (skip)
- [ ] Testirati validacije
- [ ] Testirati backend endpoint

## 🎯 Sljedeći korak

Implementirati logiku za preskakanje opcionalnog koraka u navigaciji.

