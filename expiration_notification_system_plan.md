adi# Plan sistema obavještenja za datume isteka

## 📋 Pregled datuma isteka u Vehicle modelu

### 🔍 Identifikovani datumi isteka:

#### **Osnovni datumi:**
- `next_annual_inspection_date` - Sljedeći godišnji pregled
- `filter_expiry_date` - Datum isteka filtera
- `adr_vazi_do` - ADR važi do
- `periodicni_pregled_vazi_do` - Periodični pregled važi do
- `registrovano_do` - Registrovano do
- `licenca_vazi_do` - Licenca važi do

#### **Kalibracije i testovi:**
- `next_hose_hd63_replacement_date` - Sljedeća zamjena crijeva HD63
- `next_hose_hd38_replacement_date` - Sljedeća zamjena crijeva HD38
- `next_hose_tw75_replacement_date` - Sljedeća zamjena crijeva TW75
- `next_hose_leak_test_date` - Sljedeći test curenja crijeva
- `next_volumeter_calibration_date` - Sljedeća kalibracija volumetra
- `next_manometer_calibration_date` - Sljedeća kalibracija manometra
- `next_hecpv_ilcpv_test_date` - Sljedeći test HECPV/ILCPV
- `next_6_month_check_date` - Sljedeći šestomjesečni pregled
- `cisterna_naredna_kalibracija` - Sljedeća kalibracija cisterne
- `tahograf_naredna_kalibracija` - Sljedeća kalibracija tahografa
- `tanker_next_fire_safety_test_date` - Sljedeći test protivpožarne zaštite
- `tromjesecni_pregled_vazi_do` - Tromjesečni pregled važi do

#### **Dodatni datumi:**
- `manometer_calibration_valid_until` - Manometar kalibracija važi do
- `volumeter_kalibracija_vazi_do` - Volumetar kalibracija važi do
- `conductivity_meter_calibration_valid_until` - Mjerač provodljivosti važi do
- `hydrometer_calibration_valid_until` - Hidrometar kalibracija važi do
- `main_flow_meter_calibration_valid_until` - Glavni protok mjerač važi do
- `resistance_meter_calibration_valid_until` - Mjerač otpora važi do
- `thermometer_calibration_valid_until` - Termometar kalibracija važi do
- `torque_wrench_calibration_valid_until` - Moment ključ kalibracija važi do
- `water_chemical_test_valid_until` - Hemijski test vode važi do

## 🎯 Plan implementacije

### 1. **Backend komponente**

#### **A. Nova tabela za obavještenja:**
```sql
model ExpirationNotification {
  id                    Int      @id @default(autoincrement())
  vehicleId             Int
  fieldName             String   // Naziv polja (npr. "next_annual_inspection_date")
  fieldDisplayName      String   // Prikazni naziv (npr. "Godišnji pregled")
  expirationDate        DateTime
  notificationType      NotificationType
  daysUntilExpiration   Int      // Broj dana do isteka
  isActive              Boolean  @default(true)
  isRead                Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  vehicle               Vehicle  @relation(fields: [vehicleId], references: [id])
}

enum NotificationType {
  WARNING_30_DAYS    // Upozorenje 30 dana prije
  WARNING_15_DAYS    // Upozorenje 15 dana prije
  CRITICAL_7_DAYS    // Kritično 7 dana prije
  EXPIRED            // Isteklo
}
```

#### **B. API endpointi:**
- `GET /api/notifications/expirations` - Dohvati sva obavještenja
- `GET /api/notifications/expirations/vehicle/:id` - Obavještenja za specifično vozilo
- `PUT /api/notifications/:id/read` - Označi kao pročitano
- `PUT /api/notifications/:id/dismiss` - Otkaži obavještenje

#### **C. Cron job:**
- Dnevno provjerava sve datume isteka
- Kreira nova obavještenja
- Ažurira postojeća obavještenja
- Briše zastarjela obavještenja

### 2. **Frontend komponente**

#### **A. Notification Bell komponenta:**
- Ikona zvona sa brojem nepročitanih obavještenja
- Dropdown sa listom obavještenja
- Color-coded po tipu (žuto, narančasto, crveno)

#### **B. Notification Panel:**
- Stranica sa svim obavještenjima
- Filtriranje po vozilu, tipu, statusu
- Bulk akcije (označi sve kao pročitano)

#### **C. Dashboard Widget:**
- Widget na glavnoj stranici sa najvažnijim obavještenjima
- Quick actions za najhitnija obavještenja

#### **D. Vehicle Details Integration:**
- Sekcija u detaljima vozila sa obavještenjima
- Direktni linkovi na relevantne datume

### 3. **Tipovi obavještenja**

#### **🟡 WARNING_30_DAYS (30 dana prije):**
- Žuta boja
- "Upozorenje: [Naziv] ističe za 30 dana"
- Prikazuje se u notification bell

#### **🟠 WARNING_15_DAYS (15 dana prije):**
- Narančasta boja
- "Upozorenje: [Naziv] ističe za 15 dana"
- Prikazuje se u notification bell i dashboard

#### **🔴 CRITICAL_7_DAYS (7 dana prije):**
- Crvena boja
- "KRITIČNO: [Naziv] ističe za 7 dana"
- Prikazuje se svugdje sa visokim prioritetom

#### **⚫ EXPIRED (Isteklo):**
- Crna boja
- "ISTEKLO: [Naziv] je isteklo"
- Najviši prioritet, prikazuje se svugdje

### 4. **Korisničko iskustvo**

#### **A. Notification Bell:**
```
🔔 3  // Broj nepročitanih obavještenja
```

#### **B. Dropdown sadržaj:**
```
🔴 KRITIČNO: Godišnji pregled ističe za 3 dana
🟠 Upozorenje: ADR važi do ističe za 12 dana
🟡 Upozorenje: Kalibracija volumetra ističe za 25 dana
```

#### **C. Dashboard Widget:**
```
📋 Obavještenja o isteku
┌─────────────────────────────────────┐
│ 🔴 2 kritična obavještenja          │
│ 🟠 5 upozorenja                     │
│ 🟡 12 obavještenja                  │
│                                     │
│ [Prikaži sve] [Označi sve kao pročitano] │
└─────────────────────────────────────┘
```

### 5. **Implementacijski koraci**

#### **Korak 1: Backend setup**
1. Kreiraj ExpirationNotification model
2. Kreiraj API endpointi
3. Kreiraj cron job
4. Testiraj funkcionalnost

#### **Korak 2: Frontend komponente**
1. Kreiraj NotificationBell komponentu
2. Kreiraj NotificationPanel stranicu
3. Integriši u glavni layout
4. Dodaj u vehicle details

#### **Korak 3: Dashboard integracija**
1. Kreiraj dashboard widget
2. Dodaj quick actions
3. Integriši sa postojećim dashboard-om

#### **Korak 4: Testiranje i optimizacija**
1. Testiraj sve scenarije
2. Optimiziraj performanse
3. Dodaj error handling
4. Kreiraj dokumentaciju

### 6. **Tehnički detalji**

#### **A. Cron job logika:**
```typescript
// Dnevno u 08:00
async function checkExpirationDates() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: 'ACTIVE' }
  });
  
  for (const vehicle of vehicles) {
    await checkVehicleExpirations(vehicle);
  }
}
```

#### **B. Notification creation:**
```typescript
async function createNotification(vehicleId: number, fieldName: string, expirationDate: Date) {
  const daysUntil = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  let notificationType: NotificationType;
  if (daysUntil <= 0) notificationType = 'EXPIRED';
  else if (daysUntil <= 7) notificationType = 'CRITICAL_7_DAYS';
  else if (daysUntil <= 15) notificationType = 'WARNING_15_DAYS';
  else if (daysUntil <= 30) notificationType = 'WARNING_30_DAYS';
  else return; // Nema obavještenja
  
  await prisma.expirationNotification.create({
    data: {
      vehicleId,
      fieldName,
      fieldDisplayName: getFieldDisplayName(fieldName),
      expirationDate,
      notificationType,
      daysUntilExpiration: daysUntil
    }
  });
}
```

#### **C. Frontend state management:**
```typescript
// Zustand store za obavještenja
interface NotificationStore {
  notifications: ExpirationNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
```

### 7. **Prioriteti implementacije**

#### **Faza 1 (Visok prioritet):**
- ExpirationNotification model
- Osnovni API endpointi
- Cron job
- NotificationBell komponenta

#### **Faza 2 (Srednji prioritet):**
- NotificationPanel stranica
- Dashboard widget
- Vehicle details integracija

#### **Faza 3 (Nizak prioritet):**
- Bulk akcije
- Napredno filtriranje
- Email notifikacije
- Mobile push notifikacije

### 8. **Mape polja za prikazne nazive**

```typescript
const FIELD_DISPLAY_NAMES = {
  'next_annual_inspection_date': 'Godišnji pregled',
  'filter_expiry_date': 'Filter',
  'adr_vazi_do': 'ADR certifikat',
  'periodicni_pregled_vazi_do': 'Periodični pregled',
  'registrovano_do': 'Registracija',
  'licenca_vazi_do': 'Licenca',
  'next_hose_hd63_replacement_date': 'Crijevo HD63',
  'next_hose_hd38_replacement_date': 'Crijevo HD38',
  'next_hose_tw75_replacement_date': 'Crijevo TW75',
  'next_hose_leak_test_date': 'Test curenja crijeva',
  'next_volumeter_calibration_date': 'Kalibracija volumetra',
  'next_manometer_calibration_date': 'Kalibracija manometra',
  'next_hecpv_ilcpv_test_date': 'Test HECPV/ILCPV',
  'next_6_month_check_date': 'Šestomjesečni pregled',
  'cisterna_naredna_kalibracija': 'Kalibracija cisterne',
  'tahograf_naredna_kalibracija': 'Kalibracija tahografa',
  'tanker_next_fire_safety_test_date': 'Test protivpožarne zaštite',
  'tromjesecni_pregled_vazi_do': 'Tromjesečni pregled',
  // ... ostala polja
};
```

## 🎯 Rezultat

Ovaj sistem će omogućiti:
- **Proaktivno upravljanje** datuma isteka
- **Vizuelne obavještenja** sa color-coding
- **Prioritizaciju** obavještenja po hitnosti
- **Centralizovano upravljanje** svih obavještenja
- **Integraciju** sa postojećim sistemom
- **Skalabilnost** za buduće proširenja







