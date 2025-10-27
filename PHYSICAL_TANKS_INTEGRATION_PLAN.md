# Physical Tanks - Fuel Intake Integration Plan

## 🎯 Cilj
Integrirati Physical Tanks modul sa postojecim Fuel Intake wizard-om da bi korisnici mogli odabrati da li zele distribuirati gorivo u Fixed Storage Tanks ili Physical Tanks.

## 📋 Pregled Implementacije

### 1. **Frontend Modifikacije**

#### a) `NewFuelIntakeFormWizard.tsx`
- Dodaj opciju za odabir tipa distribucije (Fixed Storage Tanks vs Physical Tanks)
- Dodaj state za tracking koji tip tankova se koristi
- Modifikacija Step 2 (TANK_DISTRIBUTION) da prikazuje odgovarajuće tankove
- Import `physicalTankService` za dohvat fizičkih tankova

#### b) Novi state variables
```typescript
const [tankDistributionType, setTankDistributionType] = useState<TankDistributionType | null>(null);
const [physicalTanks, setPhysicalTanks] = useState<PhysicalTank[]>([]);
const [physicalTanksLoading, setPhysicalTanksLoading] = useState(false);
```

#### c) Modified UI u Step 2
- Dodaj toggle/radio buttons za odabir tipa tankova
- Dinamički prikaži odgovarajuće tankove na osnovu odabira
- Validacija i error handling za oba tipa tankova

### 2. **Backend Modifikacije**

#### a) `fuelIntakeRecord.controller.ts`
- Dodaj logiku za kreiranje `PhysicalTankMrn` recorda
- Ažuriraj `PhysicalTanks.current_quantity_liters` i `current_quantity_kg`
- Dodaj `physical_tank_distribution` JSON field u `FuelIntakeRecords`
- Implementiraj FIFO logiku za MRN tracking

#### b) Nove API endpoints (opcionalno)
- `POST /api/physical-tanks/:id/add-fuel` - direktno dodavanje goriva u tank
- `GET /api/physical-tanks/available-capacity/:fuel_type` - dohvati dostupan kapacitet

### 3. **Database Schema**
- Već postoji `physical_tank_distribution` field u `FuelIntakeRecords`
- Modifikacije nisu potrebne

## 🔧 Predložena Implementacija

### Korak 1: Dodaj opciju za odabir tipa tankova

U Step 2 wizard-a, dodaj radio button za odabir:
```tsx
<div className="mb-6">
  <Label>Tip Tankova</Label>
  <div className="flex gap-4 mt-2">
    <label>
      <input type="radio" value="FIXED" />
      Fiksni Tankovi
    </label>
    <label>
      <input type="radio" value="PHYSICAL" />
      Fizički Tankovi
    </label>
  </div>
</div>
```

### Korak 2: Modificiraj logiku dohvata tankova

```typescript
useEffect(() => {
  if (tankDistributionType === 'FIXED') {
    // Fetch fixed tanks (existing logic)
  } else if (tankDistributionType === 'PHYSICAL') {
    // Fetch physical tanks
    fetchPhysicalTanks();
  }
}, [tankDistributionType]);
```

### Korak 3: Prilagodi payload za backend

Kada se submit-uje forma, ako je odabran Physical Tanks:
```typescript
const payload = {
  // ... existing fields ...
  tank_distribution_type: 'PHYSICAL',
  physical_tank_distributions: [...], // Instead of tank_distributions
}
```

### Korak 4: Backend handling

U `createFuelIntakeRecord` kontroleru:
```typescript
if (req.body.tank_distribution_type === 'PHYSICAL') {
  // Process Physical Tanks distribution
  // Create PhysicalTankMrn records
  // Update PhysicalTanks quantities
} else {
  // Existing FixedStorageTanks logic
}
```

## ⚠️ Potencijalni Izazovi

1. **Backwards Compatibility**: Postojeće intake-ove treba zadržati funkcionalne
2. **Validation Logic**: Treba provjeriti da li tank ima dovoljno kapaciteta
3. **MRN Tracking**: FIFO logika za physical tanks može biti kompleksna
4. **Data Consistency**: Osigurati da se svi podaci ažuriraju u transakciji

## 🎯 Sljedeći Koraci

1. ✅ Dodaj toggle opciju u Step 2
2. ✅ Import `physicalTankService`
3. ✅ Fetch physical tanks kada je odabran taj tip
4. ✅ Prikaz physical tanks dropdown-a
5. ✅ Validacija i error handling
6. ✅ Backend logic za spremanje PhysicalTankMrn
7. ✅ Testiranje end-to-end flow-a

## 📝 Napomene

- Opcija za odabir physical tanks može biti **opciona**
- Ako korisnik ne odabere ništa, default je Fixed Storage Tanks
- MRN tracking za physical tanks je kompleksniji jer treba pratiti FIFO
- U budućnosti možemo dodati batch import za retrofitting postojećih intake-ova


