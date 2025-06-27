# PLAN KALIBRACIJE - Implementacija nove sekcije

## 📋 PREGLED PROJEKTA
Nova sekcija "Plan kalibracije" je potpuno nezavisan modul koji NEĆE mijenjati postojeće modele ili funkcionalnosti. Sekcija će biti dodana u sidebar ispod "Rezervoari" sekcije.

## ⚠️ VAŽNE NAPOMENE
- **POTPUNO ODVOJEN MODEL** - nema veze sa postojećim modelima
- **JEDINSTVENA IMENA POLJA** - koristiti bosanski jezik za razliku od postojećih engleskih naziva
- **POSEBNA PAŽNJA** - datumi važenja već postoje u Vehicle modelu, koristiti drugačije nazive
- **NE MIJENJAMO** postojeće modele ili funkcionalnosti

## 🗂️ ANALIZA POSTOJEĆIH MODELA
### Postojeći datumi kalibracije u Vehicle modelu:
- `last_volumeter_calibration_date` / `next_volumeter_calibration_date`
- `last_manometer_calibration_date` / `next_manometer_calibration_date` 
- `datum_kalibracije_hidrometra`
- `datum_kalibracije_moment_kljuca`
- `datum_kalibracije_termometra`
- `conductivity_meter_calibration_date` / `conductivity_meter_calibration_valid_until`
- `hydrometer_calibration_date` / `hydrometer_calibration_valid_until`
- `thermometer_calibration_date` / `thermometer_calibration_valid_until`
- `torque_wrench_calibration_date` / `torque_wrench_calibration_valid_until`

### Postojeći model Rezervoar:
- Već implementiran sa poljima na bosanskom jeziku
- Koristi `dokument_url` za dokumentaciju

## 📊 DEFINISANJE NOVOG MODELA

### PlanKalibracije Model Polja:
```prisma
model PlanKalibracije {
  id                                    Int      @id @default(autoincrement())
  naziv_opreme                          String
  vlasnik_opreme                        String
  mjesto_koristenja_opreme              String
  identifikacijski_broj                 String   @unique
  
  // Volumetar - posebni nazivi da se ne preklapaju
  volumetar_kalibracija_od              DateTime?
  volumetar_kalibracija_do              DateTime?
  
  // Glavni volumetar  
  glavni_volumetar_kalibracija_od       DateTime?
  glavni_volumetar_kalibracija_do       DateTime?
  
  // Mjerači pritiska (manometri)
  manometri_kalibracija_od              DateTime?
  manometri_kalibracija_do              DateTime?
  
  // Crijevo za punjenje
  crijevo_punjenje_kalibracija_od       DateTime?
  crijevo_punjenje_kalibracija_do       DateTime?
  
  // Glavni manometar
  glavni_manometar_kalibracija_od       DateTime?
  glavni_manometar_kalibracija_do       DateTime?
  
  // Termometar
  termometar_kalibracija_od             DateTime?
  termometar_kalibracija_do             DateTime?
  
  // Hidrometar
  hidrometar_kalibracija_od             DateTime?
  hidrometar_kalibracija_do             DateTime?
  
  // Električni denziometar
  elektricni_denziometar_kalibracija_od DateTime?
  elektricni_denziometar_kalibracija_do DateTime?
  
  // Mjerač provodljivosti
  mjerac_provodljivosti_kalibracija_od  DateTime?
  mjerac_provodljivosti_kalibracija_do  DateTime?
  
  // Mjerač otpora provoda
  mjerac_otpora_provoda_kalibracija_od  DateTime?
  mjerac_otpora_provoda_kalibracija_do  DateTime?
  
  // Moment ključ
  moment_kljuc_kalibracija_od           DateTime?
  moment_kljuc_kalibracija_do           DateTime?
  
  // Shal detector
  shal_detector_kalibracija_od          DateTime?
  shal_detector_kalibracija_do          DateTime?
  
  // Dodatne informacije
  napomene                              String?
  dokumenti_url                         String?
  kreiran                               DateTime @default(now())
  azuriran                              DateTime @updatedAt
  
  @@map("plan_kalibracije")
}
```

## 🚀 IMPLEMENTACIJSKI PLAN

### FAZA 1: BACKEND IMPLEMENTACIJA ✅ ZAVRŠENO

#### 1.1 Prisma Schema Update ✅
- ✅ Dodati PlanKalibracije model u `backend/prisma/schema.prisma`
- ✅ Kreirati migration: `npx prisma migrate dev --name add_plan_kalibracije_table`
- ✅ Testirati migraciju na development bazi

#### 1.2 Controller Implementation ✅
- ✅ Kreirati `backend/src/controllers/planKalibracije.controller.ts`
- ✅ Implementirati CRUD operacije:
  - ✅ `getAllPlanKalibracije()` - lista svih planova
  - ✅ `getPlanKalibracijeById()` - detalj plana po ID
  - ✅ `createPlanKalibracije()` - kreiranje novog plana
  - ✅ `updatePlanKalibracije()` - ažuriranje plana
  - ✅ `deletePlanKalibracije()` - brisanje plana
  - ✅ `uploadKalibracijaDocument()` - upload dokumenata
  - ✅ `generatePlanKalibracijePDF()` - generisanje PDF izvještaja

#### 1.3 Routes Implementation ✅
- ✅ Kreirati `backend/src/routes/planKalibracije.routes.ts`
- ✅ Definisati rute:
  ```typescript
  GET    /api/plan-kalibracije          // Lista svih planova
  GET    /api/plan-kalibracije/:id      // Detalj plana
  POST   /api/plan-kalibracije          // Kreiranje novog plana
  PUT    /api/plan-kalibracije/:id      // Ažuriranje plana
  DELETE /api/plan-kalibracije/:id      // Brisanje plana
  POST   /api/plan-kalibracije/:id/upload // Upload dokumenata
  GET    /api/plan-kalibracije/:id/pdf    // PDF izvještaj
  ```

#### 1.4 Integracija sa glavnom aplikacijom ✅
- ✅ Registrovati rute u `backend/src/app.ts`
- [ ] Kreirati upload folder: `backend/public/uploads/plan_kalibracije_dokumenti/`
- [ ] Konfigurirati multer za file upload

### FAZA 2: FRONTEND IMPLEMENTACIJA - ✅ ZAVRŠENO

#### 2.1 Types Definition ✅
- ✅ Kreirati `frontend/src/types/planKalibracije.ts`
- ✅ Definisati interfejse:
  ```typescript
  interface PlanKalibracije {
    id: number;
    naziv_opreme: string;
    vlasnik_opreme: string;
    mjesto_koristenja_opreme: string;
    identifikacijski_broj: string;
    // ... svi datumi kalibracije
    napomene?: string;
    dokumenti_url?: string;
    kreiran: string;
    azuriran: string;
  }
  
  interface CreatePlanKalibracijeRequest {
    // bez id, kreiran, azuriran
  }
  
  interface UpdatePlanKalibracijeRequest {
    // partial update
  }
  ```

#### 2.2 Service Layer ✅
- ✅ Kreirati `frontend/src/services/planKalibracijeService.ts`
- ✅ Implementirati API pozive:
  - ✅ `getAllPlanKalibracije()` 
  - ✅ `getPlanKalibracijeById()`
  - ✅ `createPlanKalibracije()`
  - ✅ `updatePlanKalibracije()`
  - ✅ `deletePlanKalibracije()`
  - ✅ `uploadDocument()`
  - ✅ `generatePDF()`

#### 2.3 Main Page Component ✅
- ✅ Kreirati `frontend/src/app/dashboard/plan-kalibracije/page.tsx`
- ✅ Implementirati funkcionalnosti:
  - ✅ Lista planova kalibracije sa paginacijom
  - ✅ Search i filter opcije
  - ✅ Dugmad za dodavanje, editovanje, brisanje
  - ✅ Summary kartice (ukupan broj, istekli, uskoro istekli)

#### 2.4 Form Components - ✅ ZAVRŠENO
- ✅ Kreirati `frontend/src/components/plan-kalibracije/PlanKalibracijeForm.tsx`
- ✅ Implementirati:
  - ✅ Kompletan form sa svim poljima
  - ✅ Validaciju datuma (od mora biti prije do)
  - ✅ File upload funkcionalnost
  - ✅ Form validaciju sa zod

#### 2.5 Display Components - ✅ ZAVRŠENO
- ✅ Kreirati `frontend/src/components/plan-kalibracije/PlanKalibracijeCard.tsx`
- [ ] Kreirati `frontend/src/components/plan-kalibracije/PlanKalibracijeDetails.tsx`
- ✅ Implementirati:
  - ✅ Card prikaz sa osnovnim informacijama
  - ✅ Detaljni prikaz sa svim poljima
  - ✅ Status indikatori (aktivni, istekli, uskoro istekli)

#### 2.6 Navigation Update ✅
- ✅ Ažurirati `frontend/src/components/layout/Sidebar.tsx`
- ✅ Dodati "Plan kalibracije" link ispod "Rezervoari"

### FAZA 3: PDF GENERATION

#### 3.1 Backend PDF Service
- [ ] Implementirati PDF generisanje u controlleru
- [ ] Kreirati template sa:
  - Header sa logo i informacijama
  - Tabela sa svim kalibracijskim datumima
  - Status za svaki instrument (aktivan/istekao)
  - Footer sa datumom generisanja

#### 3.2 Frontend PDF Integration
- [ ] Dugme za generisanje PDF-a
- [ ] Download funkcionalnost
- [ ] Loading state tijekom generisanja

### FAZA 4: TESTIRANJE I OPTIMIZACIJA

#### 4.1 Backend Testing
- [ ] Testirati sve CRUD operacije
- [ ] Testirati file upload
- [ ] Testirati PDF generisanje
- [ ] Testirati validaciju datuma

#### 4.2 Frontend Testing
- [ ] Testirati sve komponente
- [ ] Testirati form validaciju
- [ ] Testirati search i filter
- [ ] Testirati responsive design

#### 4.3 Integration Testing
- [ ] End-to-end testiranje workflow-a
- [ ] Testirati upload i download dokumenata
- [ ] Performance testiranje

## 📁 STRUKTURA FAJLOVA

### Backend struktura:
```
backend/
├── prisma/
│   ├── migrations/
│   │   └── [timestamp]_add_plan_kalibracije_table/
│   └── schema.prisma (ažuriran)
├── src/
│   ├── controllers/
│   │   └── planKalibracije.controller.ts (novi)
│   ├── routes/
│   │   └── planKalibracije.routes.ts (novi)
│   └── app.ts (ažuriran)
└── public/uploads/
    └── plan_kalibracije_dokumenti/ (novi folder)
```

### Frontend struktura:
```
frontend/src/
├── app/dashboard/
│   └── plan-kalibracije/
│       └── page.tsx (novi)
├── components/
│   └── plan-kalibracije/
│       ├── PlanKalibracijeCard.tsx (novi)
│       ├── PlanKalibracijeDetails.tsx (novi)
│       └── PlanKalibracijeForm.tsx (novi)
├── services/
│   └── planKalibracijeService.ts (novi)
├── types/
│   └── planKalibracije.ts (novi)
└── components/layout/
    └── Sidebar.tsx (ažuriran)
```

## 🎯 SPECIFIČNE FUNKCIONALNOSTI

### Dashboard Features:
- 📊 **Summary Cards**: Ukupno planova, aktivnih, isteklih, uskoro istekli
- 🔍 **Advanced Search**: Po nazivu opreme, vlasniku, ID broju
- 🗂️ **Filtering**: Po statusu, tipu opreme, datumu isteka
- 📄 **Export**: PDF izvještaj za jedan ili više planova
- 📱 **Responsive**: Optimizovano za sve uređaje

### Form Features:
- ✅ **Smart Validation**: Datumi "od" moraju biti prije "do"
- 📅 **Date Pickers**: Intuitivni odabir datuma
- 📎 **Multi-file Upload**: Upload više dokumenata odjednom
- 💾 **Auto-save**: Periodično čuvanje draft-a
- 🔄 **Real-time Preview**: Preview podataka prije čuvanja

### Status Indicators:
- 🟢 **Aktivan**: Svi datumi u budućnosti
- 🟡 **Uskoro ističe**: Bilo koji datum ističe u narednih 30 dana
- 🔴 **Istekao**: Bilo koji datum je prošao
- ⚪ **Nepotpun**: Nedostaju podaci za datum

## 🚨 SIGURNOSNI ASPEKTI

### Backend Security:
- ✅ Input validacija za sve polja
- ✅ File type validacija za upload
- ✅ SQL injection zaštita preko Prisma
- ✅ Rate limiting za upload endpoint

### Frontend Security:
- ✅ XSS zaštita preko React-a
- ✅ File type validacija prije upload-a
- ✅ Input sanitization
- ✅ CSRF token validacija

## 📈 PERFORMANCE OPTIMIZACIJE

### Database:
- Indexiranje na često pretraženim poljima
- Optimizacija query-ja sa Prisma
- Pagination za velike liste

### Frontend:
- Lazy loading komponenti
- Memoization React komponenti  
- Optimistic updates za bolje UX
- Image optimization za upload-ovane dokumente

## 🗓️ TIMELINE PROCJENA
- **Faza 1 (Backend)**: 2-3 dana
- **Faza 2 (Frontend)**: 3-4 dana  
- **Faza 3 (PDF)**: 1 dan
- **Faza 4 (Testing)**: 1-2 dana
- **UKUPNO**: 7-10 radnih dana

## ✅ ACCEPTANCE CRITERIA
- [ ] Korisnik može dodati novi plan kalibracije
- [ ] Korisnik može vidjeti listu svih planova sa statusom
- [ ] Korisnik može editovati postojeći plan
- [ ] Korisnik može obrisati plan (sa potvrdom)
- [ ] Korisnik može upload-ovati dokumente
- [ ] Korisnik može generisati PDF izvještaj
- [ ] Sistem pokazuje upozorenja za uskoro istekle kalibracijske datume
- [ ] Sidebar sadrži link "Plan kalibracije" ispod "Rezervoari"
- [ ] Sva funkcionalnost radi bez uticaja na postojeće module 