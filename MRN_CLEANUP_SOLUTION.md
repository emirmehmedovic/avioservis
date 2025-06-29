# 🧹 MRN CLEANUP SOLUTION - Rješavanje Problema Starih MRN Ostataka

## 📋 **PROBLEM KOJI SMO RIJEŠILI**

### **Originalni Problem:**
```
Situacija: Fiksni tank ima 1L i 1kg po MRN-u
Transfer: Prebacuje se u mobilni tank
Rezultat: Stari MRN se pojavljuje u novim operacijama sa 0.5kg
Problem: Bespotrebni stari MRN-ovi u breakdown-ima
```

### **Uzrok:**
- **Threshold** od 0.1L bio prenizak
- **Cleanup logika** postojala samo u fuel drain operacijama  
- **Transfer operacije** nisu imale cleanup
- **Akumuliranje** malih ostataka kroz više operacija

## 🔧 **RJEŠENJE - UNIFIED MRN CLEANUP SYSTEM**

### **1. NOVI AGRESIVNIJI THRESHOLD-OVI:**

```typescript
export const MRN_CLEANUP_CONFIG = {
  LITERS_THRESHOLD: 2.0,      // Sve ispod 2L se čisti
  KG_THRESHOLD: 1.5,          // Sve ispod 1.5kg se čisti
  
  DUST_LITERS_THRESHOLD: 0.5, // Ultra mali ostatci
  DUST_KG_THRESHOLD: 0.3,     // Ultra mali ostatci
  
  CONSOLIDATION_THRESHOLD: 5.0 // Spajanje u MISC MRN
};
```

### **2. AUTOMATSKA INTEGRACIJA U SVE OPERACIJE:**

| **Operacija** | **Cleanup Pokriven** | **Threshold** |
|---------------|--------------------|---------------|
| ✅ **Fuel Transfer** | Fixed + Mobile tank | 2L / 1.5kg |
| ✅ **Fueling Operations** | Mobile tank | 2L / 1.5kg |
| ✅ **Fuel Drain** | Fixed + Mobile tank | 2L / 1.5kg |
| ✅ **Manual Cleanup** | Admin endpoint | Configurable |

### **3. INTELIGENTNO ČIŠĆENJE:**

#### **A) DUST CLEANUP** (automatsko):
```
< 0.5L ili < 0.3kg → remaining_quantity = 0
```

#### **B) SMALL RECORDS CLEANUP** (automatsko):
```
< 2L ili < 1.5kg → remaining_quantity = 0
```

#### **C) CONSOLIDATION** (fiksni tankovi):
```
Više malih MRN-ova (2-5L) → spoji u MISC-TANK-{ID}-{timestamp}
```

### **4. NOVI API ENDPOINT-OVI:**

```bash
# Manual cleanup pojedinačnog tanka
POST /api/mrn-cleanup/fixed-tank/:tankId
POST /api/mrn-cleanup/mobile-tank/:tankId

# System-wide cleanup svih tankova
POST /api/mrn-cleanup/all-tanks

# Statistike i konfiguracija
GET /api/mrn-cleanup/info
```

## 🚀 **KAKO KORISTITI**

### **1. AUTOMATSKO (Preporučeno):**
Cleanup se automatski pokreće nakon svake:
- Transfer operacije
- Fueling operacije  
- Drain operacije

### **2. MANUAL CLEANUP:**

#### **Pojedinačni Tank:**
```bash
# Fiksni tank ID 3
curl -X POST "https://dataavioservis.com/api/mrn-cleanup/fixed-tank/3" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mobilni tank ID 5
curl -X POST "https://dataavioservis.com/api/mrn-cleanup/mobile-tank/5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Svi Tankovi:**
```bash
curl -X POST "https://dataavioservis.com/api/mrn-cleanup/all-tanks" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Provjera Stanja:**
```bash
curl -X GET "https://dataavioservis.com/api/mrn-cleanup/info" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. DEPLOYMENT INSTRUKCIJE:**

```bash
# Na production serveru:
cd ~/projekat2
git pull origin main
cd backend
npm install
npm run build
pm2 restart all
```

## 📊 **OČEKIVANI REZULTATI**

### **PRIJE:**
```
Transfer breakdown:
- BA4444444444444444: 8,500L
- BA3333333333333333: 1L      ← PROBLEM
- BA2222222222222222: 0.5L    ← PROBLEM
- BA1111111111111111: 0.2L    ← PROBLEM
```

### **POSLIJE:**
```
Transfer breakdown:
- BA4444444444444444: 8,500L
- MISC-TANK-7-1735563234: 1.7L  ← CONSOLIDIRAN
(ili potpuno uklonjen ako < 0.5L)
```

### **UI Benefiti:**
- ✅ **Manje MRN linija** u izvještajima
- ✅ **Cleaner breakdown** prikazi
- ✅ **Performance poboljšanje** 
- ✅ **Lakše čitanje** operacija

## 🔧 **KONFIGURACIJA I PRILAGOĐAVANJE**

### **Promjena Threshold-ova:**
```typescript
// backend/src/services/mrnCleanupService.ts
export const MRN_CLEANUP_CONFIG = {
  LITERS_THRESHOLD: 3.0,  // Povećaj na 3L
  KG_THRESHOLD: 2.0,      // Povećaj na 2kg
  // ...
};
```

### **Isključivanje Cleanup-a:**
```typescript
// Zakomentariši pozive u controllerima:
// await performMrnCleanupIfNeeded(tx, tankId, 'mobile', 'AIRCRAFT_FUELING');
```

### **Samo Manual Cleanup:**
Ostavi samo manual endpoint-ove, ukloni automatske pozive.

## 🛡️ **SIGURNOST I LOGGING**

### **Što se Logira:**
```
🧹 Starting MRN cleanup for fixed tank 7 (operation: TRANSFER_TO_MOBILE)
🗑️  CLEANING DUST: MRN BA3333333333333333 - 0.234L / 0.187kg
🔄 CONSOLIDATING 3 small MRN records into MISC (total: 4.567L)
✅ Created MISC MRN: MISC-TANK-7-1735563234 with 4.567L / 3.654kg
🏁 MRN cleanup completed for tank 7: cleaned 4 records, total: 1.234L / 0.987kg
```

### **Rollback:**
- MRN zapisi se postavljaju na 0, **ne brišu se**
- Podaci ostaju u bazi za audit
- Možeš pronaći originalne vrijednosti u logs

### **Permissions:**
- Samo **ADMIN** i **KONTROLA** role
- Rate limiting na sensitive operacijama
- Sve cleanup operacije se logiraju

## 🎯 **TESTIRANJE**

### **1. Pregled trenutnog stanja:**
```bash
GET /api/mrn-cleanup/info
```

### **2. Test cleanup na jednom tanku:**
```bash
POST /api/mrn-cleanup/fixed-tank/7
```

### **3. Provjeri rezultate:**
```bash
# Provjeri tank customs breakdown
GET /api/fuel/tanks/fixed/7/customs-breakdown
```

### **4. Full system cleanup:**
```bash
POST /api/mrn-cleanup/all-tanks
```

## 📈 **MONITORING**

### **Metrics za praćenje:**
- Broj očišćenih MRN zapisa
- Ukupna količina očišćenih ostataka
- Frequency of MISC MRN kreiranje
- Performance improvement u izvještajima

### **Alarm-ovi:**
- Prevelik broj malih MRN-ova (>50)
- Previše MISC MRN-ova (>10 po tanku)
- Cleanup failures

---

## 🎉 **ZAKLJUČAK**

**Problem riješen!** Stari MRN-ovi se više neće "vući" kroz sistem. Mali ostatci se automatski čiste ili spajaju u MISC zapise, što rezultira čišćim izvještajima i boljom user experience.

**Glavne prednosti:**
- 🧹 **Automatsko čišćenje** nakon svake operacije
- 🔧 **Configurabilni threshold-ovi**
- 📊 **Consolidation** malih ostataka
- 🛡️ **Safe & reversible** operacije  
- 📈 **Better performance** u izvještajima 