# Zadaci za unapređenje upravljanja gorivom

Ovaj dokument sadrži listu zadataka za rješavanje problema s decimalnim vrijednostima goriva i upravljanjem MRN zapisima u Avioservis sustavu.

## 1. Ispravno parsiranje decimalnih vrijednosti

### Backend zadaci
- [x] Dodati `parseDecimalValue` funkciju u `fuelTransferToTanker.controller.ts`
- [x] Dodati `parseDecimalValue` funkciju u `fuelTankRefillController.ts`
- [ ] Standardizirati parsiranje decimalnih vrijednosti kroz cijeli backend
  - [ ] Refaktorirati sve pozive `Number()` za količine goriva
  - [ ] Osigurati konzistentno zaokruživanje na 3 decimale

### Frontend zadaci
- [x] Dodati `parseDecimalValue` funkciju u `TankRefillForm.tsx`
- [ ] Standardizirati parsiranje decimalnih vrijednosti kroz cijeli frontend
  - [ ] Refaktorirati direktne usporedbe bez parsiranja
  - [ ] Dodati validacije za format unosa decimalnih vrijednosti

## 2. Rješenje za preostale litre bez kilograma u MRN zapisima

### Backend zadaci
- [x] Kreirati model za evidenciju rezervnog goriva u tankovima
```typescript
model TankReserveFuel {
  id               Int      @id @default(autoincrement())
  tank_id          Int
  tank_type        String  // 'fixed' ili 'mobile'
  source_mrn       String
  source_mrn_id    Int
  quantity_liters  Float
  is_excess        Boolean  // true: višak, false: manjak
  created_at       DateTime @default(now())
  is_dispensed     Boolean  @default(false)
  dispensed_at     DateTime?
  dispensed_by     String?
  notes            String?
  reference_operation_id Int?
}
```

- [x] Dodati detekciju u `removeFuelFromMrnRecordsByKg` funkciju u `mrnUtils.ts`:
  - [x] Prepoznati kad MRN zapis dođe do 0 kg s preostalim litrama
  - [x] Ažurirati MRN zapis stavljanjem litara na 0
  - [x] Kreirati zapis rezervnog goriva

- [x] Kreirati API endpointe za upravljanje rezervnim gorivom:
  - [x] `GET /api/reserve-fuel/tank/:tankId/:tankType?` - dohvati stanje rezervnog goriva za tank
  - [x] `POST /api/reserve-fuel/dispense/:tankId/:tankType?` - istoči rezervno gorivo
  - [x] `GET /api/reserve-fuel/summary` - dohvati sažetak rezervnog goriva za sve tankove

### Frontend zadaci
- [ ] Kreirati komponentu za prikaz rezervnog goriva `TankReserveFuelDisplay`
- [ ] Integrirati komponentu u postojeći UI tankova
- [ ] Dodati funkcionalnost za odobravanje istočenja rezervnog goriva

## 3. Izvještavanje i evidencija goriva

- [ ] Ažurirati MRN izvještaje da prikazuju informacije o rezervnom gorivu
- [ ] Dodati sažetak rezervnog goriva u postojeće izvještaje o stanju tanka
- [ ] Implementirati mjesečne izvještaje s evidencijom viškova i manjkova

## 4. Validacija i poboljšanje korisničkog iskustva

- [ ] Poboljšati poruke o pogreškama s detaljnijim informacijama
- [ ] Dodati upozorenja kod značajnih razlika u gustoći goriva
- [ ] Implementirati grafički prikaz stanja rezervnog goriva

## 5. Testiranje i osiguranje kvalitete

- [ ] Testirati sve kritične tokove s ekstremnim vrijednostima:
  - [ ] Točenje zadnje litre iz MRN zapisa
  - [ ] Višestruka istovremena točenja iz istog MRN zapisa
  - [ ] Transferi s različitim gustoćama
  - [ ] Postupanje s preostalim litrama iz MRN zapisa

- [ ] Provjeriti audit trail za sve operacije s gorivom

## 6. Dokumentacija i edukacija

- [ ] Ažurirati dokumentaciju za korisnike
  - [ ] Objasniti sustav rezervnog goriva
  - [ ] Dokumentirati postupak odobravanja istočenja rezervnog goriva

- [ ] Pripremiti jednostavne upute za korisnike o pravilnom unosu količina i gustoće

## Integracija i postavljanje u produkciju

- [ ] Testirati sve promjene u razvojnom okruženju
- [ ] Planirati migraciju podataka za postojeće nekonzistentne MRN zapise 
- [ ] Koordinirati postavljanje u produkciju s minimalnim prekidom rada
