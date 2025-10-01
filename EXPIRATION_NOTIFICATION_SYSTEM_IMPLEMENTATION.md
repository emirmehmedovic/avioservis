# 🔔 Sistem Obavještenja o Datumu Isteka - Implementacija

## 📋 Pregled

Sistem obavještenja o datumu isteka automatski prati sve datume isteka vozila i opreme, te šalje upozorenja korisnicima kada se približavaju ili prelaze datume isteka.

## 🏗️ Arhitektura

### Backend Komponente

#### 1. **Database Schema**
- **ExpirationNotification** tabela
- **NotificationType** enum (WARNING_30_DAYS, WARNING_15_DAYS, CRITICAL_7_DAYS, EXPIRED)

#### 2. **API Endpoints**
- `GET /api/notifications/expirations` - Dohvatanje obavještenja
- `GET /api/notifications/expirations/stats` - Statistike obavještenja
- `GET /api/notifications/expirations/vehicle/:id` - Obavještenja za vozilo
- `PUT /api/notifications/expirations/:id/read` - Označavanje kao pročitano
- `PUT /api/notifications/expirations/read-all` - Označavanje svih kao pročitano
- `PUT /api/notifications/expirations/:id/dismiss` - Otkazivanje obavještenja

#### 3. **Cron Job**
- Pokreće se svakog dana u 08:00
- Proverava sva aktivna vozila
- Kreira/aktualizuje obavještenja
- Čisti stara obavještenja (starija od 90 dana)

### Frontend Komponente

#### 1. **NotificationBell**
- Bell ikona u navbar-u
- Prikazuje broj nepročitanih obavještenja
- Dropdown sa poslednjim obavještenjima
- Brze akcije (označavanje kao pročitano)

#### 2. **NotificationPanel**
- Kompletna stranica za upravljanje obavještenjima
- Filtri po tipu, statusu, vozilu
- Statistike obavještenja
- Bulk operacije

## 🚀 Implementacija

### 1. **Database Migration**
```sql
-- Kreiranje enum-a
CREATE TYPE "NotificationType" AS ENUM ('WARNING_30_DAYS', 'WARNING_15_DAYS', 'CRITICAL_7_DAYS', 'EXPIRED');

-- Kreiranje tabele
CREATE TABLE "ExpirationNotification" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldDisplayName" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "daysUntilExpiration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpirationNotification_pkey" PRIMARY KEY ("id")
);
```

### 2. **Backend API**

#### Controller (`expirationNotification.controller.ts`)
- `getExpirationNotifications()` - Dohvatanje obavještenja sa filterima
- `getVehicleExpirationNotifications()` - Obavještenja za specifično vozilo
- `markNotificationAsRead()` - Označavanje kao pročitano
- `markAllNotificationsAsRead()` - Označavanje svih kao pročitano
- `dismissNotification()` - Otkazivanje obavještenja
- `getNotificationStats()` - Statistike obavještenja
- `createExpirationNotification()` - Kreiranje obavještenja
- `checkVehicleExpirationDates()` - Provjera datuma za vozilo

#### Routes (`expirationNotification.routes.ts`)
- Svi endpointi zaštićeni sa `authenticateToken` middleware
- RESTful API dizajn

#### Cron Job (`expirationNotification.cron.ts`)
- `checkExpirationDatesJob()` - Glavna funkcija za provjeru
- `checkVehicleExpirationDatesManually()` - Ručna provjera za vozilo
- `getExpirationSummary()` - Sažetak za dashboard

### 3. **Frontend Implementation**

#### Types (`notification.ts`)
```typescript
export enum NotificationType {
  WARNING_30_DAYS = 'WARNING_30_DAYS',
  WARNING_15_DAYS = 'WARNING_15_DAYS',
  CRITICAL_7_DAYS = 'CRITICAL_7_DAYS',
  EXPIRED = 'EXPIRED',
}

export interface ExpirationNotification {
  id: number;
  vehicleId: number;
  fieldName: string;
  fieldDisplayName: string;
  expirationDate: string;
  notificationType: NotificationType;
  daysUntilExpiration: number;
  isActive: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  vehicle: {
    id: number;
    vehicle_name: string;
    license_plate: string;
    status: string;
  };
}
```

#### Service (`notificationService.ts`)
- `getExpirationNotifications()` - Dohvatanje sa filterima
- `getVehicleNotifications()` - Obavještenja za vozilo
- `getNotificationStats()` - Statistike
- `markAsRead()` - Označavanje kao pročitano
- `markAllAsRead()` - Označavanje svih kao pročitano
- `dismissNotification()` - Otkazivanje

#### Components
- **NotificationBell** - Bell ikona sa dropdown-om
- **NotificationPanel** - Kompletna stranica za upravljanje

## 📊 Praćena Polja

Sistem prati sledeća polja za istek:

### Osnovni Pregledi
- `next_annual_inspection_date` - Godišnji pregled
- `periodicni_pregled_vazi_do` - Periodični pregled
- `tromjesecni_pregled_vazi_do` - Tromjesečni pregled

### Registracija i Licenca
- `registrovano_do` - Registracija
- `licenca_vazi_do` - Licenca
- `adr_vazi_do` - ADR certifikat

### Filteri
- `filter_expiry_date` - Filter
- `filter_next_annual_inspection_date` - Filter godišnji pregled

### Crijeva
- `next_hose_hd63_replacement_date` - Crijevo HD63
- `next_hose_hd38_replacement_date` - Crijevo HD38
- `next_hose_tw75_replacement_date` - Crijevo TW75
- `next_hose_leak_test_date` - Test curenja crijeva

### Kalibracije
- `next_volumeter_calibration_date` - Kalibracija volumetra
- `next_manometer_calibration_date` - Kalibracija manometra
- `cisterna_naredna_kalibracija` - Kalibracija cisterne
- `tahograf_naredna_kalibracija` - Kalibracija tahografa
- `manometer_calibration_valid_until` - Manometar kalibracija
- `volumeter_kalibracija_vazi_do` - Volumetar kalibracija
- `conductivity_meter_calibration_valid_until` - Mjerač provodljivosti
- `hydrometer_calibration_valid_until` - Hidrometar kalibracija
- `main_flow_meter_calibration_valid_until` - Glavni protok mjerač
- `resistance_meter_calibration_valid_until` - Mjerač otpora
- `thermometer_calibration_valid_until` - Termometar kalibracija
- `torque_wrench_calibration_valid_until` - Moment ključ kalibracija

### Testovi
- `next_hecpv_ilcpv_test_date` - Test HECPV/ILCPV
- `next_6_month_check_date` - Šestomjesečni pregled
- `tanker_next_fire_safety_test_date` - Test protivpožarne zaštite
- `tanker_next_pressure_test_date` - Test pritiska cisterne

### Ostalo
- `water_chemical_test_valid_until` - Hemijski test vode
- `datum_isteka_cwd` - CWD datum

## 🎯 Tipovi Obavještenja

### 1. **WARNING_30_DAYS** (Žuto)
- 30 dana pre isteka
- Upozorenje za planiranje

### 2. **WARNING_15_DAYS** (Narandžasto)
- 15 dana pre isteka
- Hitnije upozorenje

### 3. **CRITICAL_7_DAYS** (Crveno)
- 7 dana pre isteka
- Kritično upozorenje

### 4. **EXPIRED** (Crveno)
- Datum je prošao
- Hitno potrebna akcija

## 🔧 Konfiguracija

### Environment Variables
```env
NODE_ENV=production  # Za produkciju
```

### Cron Schedule
- **Produkcija**: `0 8 * * *` (svakog dana u 08:00)
- **Development**: `0 * * * *` (svakog sata za testiranje)

### Timezone
- **Europe/Sarajevo** - Bosanska vremenska zona

## 📱 Korisničko Sučelje

### NotificationBell
- **Lokacija**: Navbar (gornji desni ugao)
- **Funkcionalnost**:
  - Prikazuje broj nepročitanih obavještenja
  - Dropdown sa poslednjim 10 obavještenja
  - Brze akcije (označavanje kao pročitano)
  - Link ka kompletnoj stranici obavještenja

### NotificationPanel
- **Lokacija**: `/notifications`
- **Funkcionalnost**:
  - Kompletna lista obavještenja
  - Filtri po tipu, statusu, vozilu
  - Statistike obavještenja
  - Bulk operacije
  - Paginacija

## 🚀 Deployment

### 1. **Backend Deployment**
```bash
# Na produkciji
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

### 2. **Frontend Deployment**
```bash
# Build frontend
npm run build
npm start
```

### 3. **Verifikacija**
- Proverite da li su migracije primenjene
- Proverite da li cron job radi
- Testirajte API endpoint-e
- Proverite frontend komponente

## 🔍 Monitoring

### Logovi
- Cron job logovi u konzoli
- API greške u logovima
- Frontend greške u browser konzoli

### Metrije
- Broj aktivnih obavještenja
- Broj nepročitanih obavještenja
- Tipovi obavještenja po kategorijama

## 🛠️ Troubleshooting

### Česti Problemi

#### 1. **Cron Job se ne pokreće**
- Proverite da li je `initExpirationNotificationCron()` pozvan u `app.ts`
- Proverite logove za greške
- Proverite timezone konfiguraciju

#### 2. **Obavještenja se ne kreiraju**
- Proverite da li vozila imaju datume isteka
- Proverite da li su vozila aktivna
- Proverite logove cron job-a

#### 3. **Frontend se ne učitava**
- Proverite da li su API endpoint-i dostupni
- Proverite autentifikaciju
- Proverite CORS konfiguraciju

#### 4. **Database greške**
- Proverite da li je migracija primenjena
- Proverite Prisma Client generisanje
- Proverite konekciju sa bazom

## 📈 Buduća Poboljšanja

### 1. **Email Notifications**
- Slanje email obavještenja
- Konfigurabilni template-i
- Bulk email slanje

### 2. **Push Notifications**
- Browser push notifikacije
- Mobile push notifikacije
- Real-time obavještenja

### 3. **Advanced Filtering**
- Filtri po datumu
- Filtri po vozilu
- Sačuvani filteri

### 4. **Reporting**
- Izvještaji o obavještenjima
- Trend analiza
- Export u PDF/Excel

### 5. **Automation**
- Automatsko kreiranje servisnih naloga
- Integracija sa kalendarom
- Workflow automation

## ✅ Testiranje

### 1. **Backend Testovi**
```bash
# Test API endpoint-a
curl -X GET "http://localhost:3000/api/notifications/expirations" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test cron job-a
# Ručno pokretanje u development modu
```

### 2. **Frontend Testovi**
- Test NotificationBell komponente
- Test NotificationPanel stranice
- Test filtera i akcija
- Test responsivnosti

### 3. **Integration Testovi**
- Test kompletne funkcionalnosti
- Test sa stvarnim podacima
- Test performansi

## 📚 Dokumentacija

### API Dokumentacija
- Swagger/OpenAPI specifikacija
- Postman kolekcija
- Primjeri zahtjeva/odgovora

### Korisnička Dokumentacija
- User guide za obavještenja
- FAQ sekcija
- Video tutorijali

---

## 🎉 Zaključak

Sistem obavještenja o datumu isteka je potpuno implementiran i spreman za produkciju. Omogućava:

- ✅ Automatsko praćenje datuma isteka
- ✅ Inteligentna kategorizacija obavještenja
- ✅ Korisničko sučelje za upravljanje
- ✅ API za integraciju
- ✅ Cron job za automatsku proveru
- ✅ Bezbedna migracija za produkciju

Sistem je dizajniran da bude skalabilan, pouzdan i lako održavan.







