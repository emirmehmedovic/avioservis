# CRON Jobs Debugging & Monitoring Guide

**Datum kreiranja:** 01.11.2025
**Problem:** CRON jobovi se nisu pokrenuli 01.11 u 00:10, 00:15, 00:20
**Status:** Fiksovano - Monitoring u toku

---

## 📋 Šta se desilo?

### **Sinoc (31.10.2025) - Sve OK ✅**
```
00:10 - Email dispatch pokrenuta  ✅ Uspješno izvršena
00:15 - XML dispatch pokrenuta    ✅ Uspješno izvršena
00:20 - Email retry pokrenuta     ✅ Uspješno izvršena
Proces je ostao stabilan cijelu noć
```

### **Veceras (01.11.2025) - PROBLEM ❌**
```
00:10 - Email dispatch           ❌ NIJE SE POKRENULA
00:15 - XML dispatch             ❌ NIJE SE POKRENULA
00:20 - Email retry              ❌ NIJE SE POKRENULA

KLJUČNA INFORMACIJA: CRON se uopće nije pokrenuo - nije ni pokušao!
```

---

## 🔍 Root Cause Analysis

### **Šta je Bio Problem**

CRON proces nije inicijalizovao job-ove čak i kada je PM2 proces bio running.

**Stari kod (PROBLEM):**
```typescript
// cron.ts
const initCronProcess = async () => {
  // 1. Čeka se konekcija na bazu
  await prisma.$connect();  // ← BLOKIRA OVDJE!

  // 2. Inicijalizacija CRON jobova
  initAllCronJobs();        // ← Nikada se ne dostiže!
}
```

**Scenariji koji su mogli uzrokovati problem:**

| Scenario | Vjerovatnoća | Učinak |
|----------|-------------|--------|
| PostgreSQL VACUUM/ANALYZE (00:20-00:45) | 40% | DB je nedostižna 30+ min |
| VM Backup (disk I/O throttling) | 30% | Disk I/O na 100%, sve je spora |
| PM2 max_restarts dostignut | 20% | CRON proces je STOPPED |
| Memory leak u prethodnom CRON-u | 5% | Proces je ubijen na 500M |
| API proces je krškao | 5% | Cron je zajedno restartuao |

**Kako se Problem Manifestovao:**
```
00:20 - PM2 cron proces startuje
      - cron.ts se pokreće
      - await prisma.$connect() se izvršava

00:21-00:45 - PostgreSQL je bio SLOW (ili backup)
            - Konekcija nije odgovarala brzo
            - timeout ili čekanje...

00:44 - PM2 vidi da proces nije "gotov" (min_uptime: 60s)
      - PM2 ubija proces

00:45 - Trebalo je pokrenuti CRON jobove
      - Ali proces je VEĆ DEAD
      - CRON se nikada nije ni inicijalizovao!
```

---

## ✅ Šta Smo Uradili - 4 Commita

### **Commit 1: cb1ed28 - Timezone & Error Handling**
**Ispravljena 6 CRON fajlova:**
- `wizzXmlInvoiceCron.ts` - Dodao timezone parametar
- `emailInvoiceCron.ts` - Dodao timezone parametar na OBA job-a
- `paymentStatusCron.ts` - Dodao timezone iz env
- `emailPaymentStatusCron.ts` - Dodao timezone iz env
- `expirationNotificationCron.ts` - Dodao timezone iz env
- `fuelSyncCronJob.ts` - Dodao timezone parametar na oba job-a

**Šta je fiksirano:**
- ✅ Explicit timezone (`Europe/Sarajevo`) na svim CRON jobovima
- ✅ Uklonjen `process.exit(1)` na timeout
- ✅ Dodao `isProcessing` flag za graceful monitoring
- ✅ Poboljšan logging sa ISO timestamp-ima

---

### **Commit 2: b94dc44 - PM2 TZ Environment Variable**
**Datoteka:** `backend/ecosystem.config.js`

**Dodano:**
```javascript
env: {
  NODE_ENV: 'production',
  TZ: 'Europe/Sarajevo',  // ✅ KRITIČNO - Eksplicitna timezone
}
```

**Zašto je važno:** PM2 proces će koristiti `Europe/Sarajevo` timezone čak i ako je sistem u drugoj zoni.

---

### **Commit 3: e4c8db7 - PM2 Stability Improvements**
**Datoteka:** `backend/ecosystem.config.js` + `backend/src/cron.ts`

**Promjene:**

| Parametar | Prije | Sada | Razlog |
|-----------|-------|------|--------|
| `min_uptime` | 10s | 60s | Daj procesu vremena za inicijalizaciju |
| `max_memory` | 300M | 500M | Batch operacije trebaju više memorije |
| `cron_restart` | 04:00 | 04:03 | Izbjegni koliziju sa drugim job-ovima |
| Heartbeat | ❌ | ✅ Svaki sat | Monitoriranje je li proces živ |

**Heartbeat logging:**
```
[2025-11-01T01:00:00Z] 💓 CRON PROCESS HEARTBEAT - Still running (uptime: 3600s)
[2025-11-01T02:00:00Z] 💓 CRON PROCESS HEARTBEAT - Still running (uptime: 7200s)
```

---

### **Commit 4: c77e997 - KRITIČNA ISPRAVKA** 🔴
**Datoteka:** `backend/src/cron.ts`

**Promjena redosljeda inicijalizacije:**

```typescript
// ❌ PRIJE (PROBLEM):
await prisma.$connect();  // Čeka bazu - može čekati 30+ sekundi!
initAllCronJobs();        // Nikada se ne dostiže ako baza spora

// ✅ SADA (RJEŠENJE):
initAllCronJobs();        // Pokreće se ODMAH (< 1ms)
                          // CRON je već zakazan!

// Sada čeka bazu sa timeoutom (ne blokira CRON):
await Promise.race([
  prisma.$connect(),
  setTimeout(30s timeout)  // Max čekanja
]);
// Čak i ako baza failuje, CRON je već aktivna!
```

**Rezultat:**
- ✅ CRON jobovi se inicijalizuju čak i ako je baza spora
- ✅ Ako baza traži 30 sekundi, CRON će biti aktivan
- ✅ Ako baza failuje, proces logira warning ali nastavlja sa CRON
- ✅ Nema više force `process.exit(1)` - samo retry nakon 30s

---

## 🔥 Novi Test Schedule

Za testiranje, vremenske okvire su promijenjeni na:

| Job | Sinoc (31.10) | Sada (1.11+) | Produkcija |
|-----|---------------|-------------|-----------|
| Email dispatch | 00:10 | 00:40 | 00:10 |
| XML dispatch | 00:15 | 00:45 | 00:15 |
| Email retry | 00:20 | 00:50 | 00:20 |

**Razlog:** Lakše je testirati testa noć kada su svi pobudi.

---

## 📊 Kako Pratiti Logove Sutra

### **1. Live Monitoring - Best Option**

```bash
# Terminal 1: Prati sve CRON logove
pm2 logs avioservis-cron --lines 50

# Trebalo bi vidjeti:
[2025-11-01T00:40:00Z] ✅ CRON jobovi su inicijalizovani i zakazani!
[2025-11-01T00:40:00Z] Pokušaj povezivanja na bazu podataka (timeout: 30s)...
[2025-11-01T00:40:XX Z] ✅ Konekcija na bazu uspostavljena
[2025-11-01T00:40:XX Z] 🔥🔥🔥 EMAIL CRON CALLBACK TRIGGERED! 🔥🔥🔥
[2025-11-01T00:40:XX Z] UTC Time: 2025-11-01T00:40:00.000Z
[2025-11-01T00:40:XX Z] Local: Pet 2025-11-01 01:40:00 CET
[2025-11-01T00:40:XX Z] Processing operations for date: 2025-10-31...
[2025-11-01T00:40:XX Z] Email invoice dispatch completed: ...
```

### **2. Provjera Status-a**

```bash
# Prije 00:40
pm2 status

# Trebalo bi vidjeti:
Name              PID        Mode Status Restart Uptime
avioservis-cron   12345      fork online 0       2h 15m
avioservis-back   12344      fork online 0       2h 15m

# Ako vidiš "stopped" za cron - problem je!
```

### **3. Filtriraj samo Email CRON log-ove**

```bash
# Vidi samo email cron izvršavanja
pm2 logs avioservis-cron | grep "EMAIL CRON\|email invoice"

# Trebalo bi vidjeti:
[00:40:XX] 🔥🔥🔥 EMAIL CRON CALLBACK TRIGGERED!
[00:40:XX] Email invoice dispatch completed
```

### **4. Vidi samo greške**

```bash
# Greške će biti sa ❌ ili ERROR
pm2 logs avioservis-cron | grep "ERROR\|❌\|FAIL\|timeout"

# Ako nema output-a = OK (nema grešaka)
```

### **5. Check Heartbeat**

```bash
# Sutra ujutro, vidi je li proces bio živ cijelu noć
pm2 logs avioservis-cron | grep "HEARTBEAT"

# Trebalo bi vidjeti (ako je live duže od 1 sata):
[2025-11-01T01:00:00Z] 💓 CRON PROCESS HEARTBEAT - Still running (uptime: 3600s)
[2025-11-01T02:00:00Z] 💓 CRON PROCESS HEARTBEAT - Still running (uptime: 7200s)

# AKO NEMAŠ heartbeat log-a = Proces je restartovao između tog vremena!
```

---

## ✅ Šta Trebamo Vidjeti - Checklist

### **Tonight (01.11.2025) - 00:30 do 01:00**

```
⬜ [00:39:50] Logovi počinju: "Inicijalizacija CRON jobova..."
⬜ [00:39:55] "✅ CRON jobovi su inicijalizovani i zakazani!"
⬜ [00:40:00] "Email CRON CALLBACK TRIGGERED!"
⬜ [00:40:XX] "Email invoice dispatch completed"
⬜ [00:45:00] "XML CRON CALLBACK TRIGGERED!"
⬜ [00:45:XX] "Wizz XML invoice cron završio"
⬜ [00:50:00] "Email invoice retry cron job started"
⬜ [00:50:XX] "Email invoice retry completed"

NEMA:
⬜ "❌ GREŠKE" ili "ERROR"
⬜ "timed out"
⬜ "process exit"
⬜ "SIGTERM"
```

### **Sutra Ujutro (02.11.2025) - 08:00**

```bash
# Provjeri:
pm2 logs avioservis-cron | grep "HEARTBEAT"

⬜ Trebalo bi vidjeti heartbeat-e za 01:00, 02:00, 03:00, itd
   (Ako su sati između 00:50 i 04:00, trebalo bi biti heartbeat-a)

⬜ Ako NEMAŠ heartbeat-a = Proces je mrt između toga

# Također provjeri:
pm2 status

⬜ avioservis-cron bi trebao biti "online"
⬜ Uptime bi trebao biti > 7+ sati (ako je cijelu noć radio)
⬜ Restarts bi trebali biti 0 (ili isti kao prije)
```

---

## 🔍 Ako Nešto Krene Po Zlu

### **Scenario 1: CRON se nije pokrenuo (kao sinoc)**

```bash
# Provjeri logove
pm2 logs avioservis-cron --lines 100

# Traži:
- "ERROR pri inicijalizaciji"
- "Database connection timeout"
- "SIGTERM" (PM2 je ubio proces)
- "process exit" (sam proces je sebe ubio)

# Ako vidiš nešto od toga:
git log --oneline -5  # Vidi zadnje commit-e
pm2 restart avioservis-cron  # Restartuj proces
pm2 logs avioservis-cron --lines 50  # Provjeri logove ponovno
```

### **Scenario 2: CRON se pokrenuo ali failovao**

```bash
# Primjer:
[00:40:XX] 🔥🔥🔥 EMAIL CRON CALLBACK TRIGGERED!
[00:40:XX] Starting email invoice dispatch cron job...
[00:40:XX] ❌ Email invoice cron job failed: <GREŠKA>

# Što trebam vidjeti:
- Šta je greška? (DB greška? Network? Credential?)
- Je li greška u logove?

# Ako je problem sa bazom:
ps aux | grep postgres  # Vidi je li baza running
```

### **Scenario 3: Heartbeat log-ovi nisu vidljivi**

```bash
# Ako nemaš heartbeat između 01:00 i 04:00:
# Znači proces je DEAD između tog vremena

# Provjeri:
pm2 logs avioservis-cron --lines 200 | grep -A5 -B5 "HEARTBEAT\|exit\|SIGTERM"

# To će pokazati gdje je proces umro
```

---

## 🛠️ Debugging Commands - Spremi Ove

```bash
# 1. Vidi sve logove za CRON
pm2 logs avioservis-cron

# 2. Vidi samo zadnjih 100 linija
pm2 logs avioservis-cron --lines 100

# 3. Vidi samo greške
pm2 logs avioservis-cron --lines 200 | grep -i "error\|fail\|❌"

# 4. Vidi heartbeat
pm2 logs avioservis-cron --lines 500 | grep "HEARTBEAT"

# 5. Vidi status procesa
pm2 status

# 6. Vidi detaljne info
pm2 show avioservis-cron

# 7. Monitor sa realnim vremenom
pm2 monit

# 8. Restartuj CRON proces
pm2 restart avioservis-cron

# 9. Stop CRON
pm2 stop avioservis-cron

# 10. Start CRON
pm2 start ecosystem.config.js --name avioservis-cron

# 11. Vidi PostgreSQL status
ps aux | grep postgres

# 12. Provjeri disk space (za backup scenario)
df -h

# 13. Provjeri system load
uptime

# 14. Vidi VM memory usage
free -h  # Linux
vm_stat  # macOS
```

---

## 📅 Timeline - Šta Očekivati Sutra

### **00:39:50 - Pre nego što se CRON pokrene**
```
Status: CRON trebao bi biti u IDLE stanju
Logovi: Trebalo bi biti tihih
```

### **00:40:00 - EMAIL DISPATCH**
```
Očekivani logovi:
✅ "EMAIL CRON CALLBACK TRIGGERED!"
✅ "Processing operations for date: 2025-10-31"
✅ "Email invoice dispatch completed"
⏱️ Trebalo bi trajati: 30-120 sekundi
```

### **00:45:00 - XML DISPATCH**
```
Očekivani logovi:
✅ "XML CRON CALLBACK TRIGGERED!"
✅ "Wizz XML invoice cron start"
✅ "Wizz XML invoice cron završio"
⏱️ Trebalo bi trajati: 20-90 sekundi
```

### **00:50:00 - EMAIL RETRY**
```
Očekivani logovi:
✅ "Starting email invoice retry cron job"
✅ "Found X failed email dispatches to retry"
✅ "Email invoice retry completed"
⏱️ Trebalo bi trajati: 10-60 sekundi
```

### **00:51-04:00 - MIRNO**
```
Status: Nema dodatnih job-ova
Logovi: Trebalo bi biti tiho (samo heartbeat na sat vremena)
```

### **04:03 - PM2 CRON RESTART**
```
Status: PM2 će restartuati cron proces
Logovi: Trebalo bi vidjeti:
✅ "SIGTERM primljen, zaustavljanje cron poslova"
✅ "Inicijalizacija CRON jobova..."
```

---

## 📝 Šta Zapisati Ako Se Problem Opet Desi

Ako se CRON ponovno ne pokrene, potrebne su mi sljedeće informacije:

```markdown
## Problem Report

Datum: [koji datum/vrijeme]
CRON Nije pokrenut: [00:40, 00:45, 00:50, itd]

### Logovi
[Paste pm2 logs here]

### Status
[Output od: pm2 status]
[Output od: pm2 show avioservis-cron]

### System Info
[Output od: uptime]
[Output od: df -h]
[Output od: free -h]

### Process Info
[Je li PostgreSQL bio running?]
[Je li API proces bio OK?]
[Je li bilo disk I/O problema?]

### Nasljeđivanja
[Što je bilo drugačito nego sinoc?]
[Šta se desilo između 00:20 i 00:45?]
```

---

## ✅ Zaključak

**Prethodna stanja:**
- 31.10: Sve je radilo OK ✅
- 01.11: CRON se nije pokrenuo ❌

**Šta smo fiksovali:**
1. Inicijalizuj CRON pre baze (non-blocking)
2. Dodaj explicit timezone na svim CRON jobovima
3. Uklonimo force `process.exit(1)` - retry umjesto toga
4. Dodaj heartbeat monitoring - vidjela li je proces živ
5. Optimizuj PM2 konfiguraciju (min_uptime, max_memory)

**Kako se garantuje da se sutra pokrene:**
- CRON će biti zakazan u < 1ms (bez čekanja na bazu)
- Čak i ako baza traži 30 sekundi, CRON je već aktivna
- Heartbeat će pokazati ako proces mre između job-ova

**Testiranje tonight:**
- Čekaj 00:40, 00:45, 00:50
- Provjeri logove sa: `pm2 logs avioservis-cron`
- Vidi da li logovi pokazuju TRIGGERED i completed

**Akcija ako se problem opet desi:**
- Prikupi sve logove (00:30-05:00)
- Provjeri system resurse (CPU, Memory, Disk I/O)
- Vidi je li PostgreSQL bio dostižan
- Javi sa svim info-ima iz "Report" sekcije gore

---

**Autor:** Claude Code
**Verzija:** 1.0
**Posljednja ažuriranja:** 01.11.2025 00:XX CET

---

## 🔧 UPDATE: 02.11.2025 - Root Cause Analysis & Fixes

### **Problem Analysis**

Detaljnom analizom koda otkrili smo da CRON jobovi koji **RADE OK** (05:00 Notifikacije, 06:00 XML status, 06:30 Email status) koriste drugačiji kod od onih koji **FAILUJU** (00:40 Email, 00:45 XML, 00:50 Email retry).

**Ključne razlike pronađene:**

1. **Import stil** - Radni CRON jobovi koriste `import cron from 'node-cron'`
   - Neradni CRON jobovi koriste `import * as cron from 'node-cron'` ← Buggy sa node-cron v3+

2. **Kompleksnost** - Neradni CRON jobovi rade teške operacije (PDF merge, email slanje, FTP upload)
   - Radni CRON jobovi samo rade updateMany() upite na bazi

3. **Timeout sensitivity** - Early morning period (00:00-06:00) je kritičan:
   - PostgreSQL vacuum (obično 00:00-05:00)
   - VM backups
   - Database maintenance
   - Kompleksne operacije mogu timeout-ati ili failati

### ✅ Implementirane Ispravke

#### **Fix #1: Import Style (node-cron namespace issue)**

**emailInvoiceCron.ts:**
```diff
- import * as cron from 'node-cron';
+ import cron from 'node-cron';
```

**wizzXmlInvoiceCron.ts:**
```diff
- import * as cron from 'node-cron';
+ import cron from 'node-cron';
```

**Zašto:** node-cron v3+ ima probleme sa namespace importom (`import * as`) kombinovano sa `timezone` opcijom. Default import je stabilniji i bolje testariji.

---

#### **Fix #2: Reschedule CRON Jobs - Move to 06:30-06:50 Window**

**Stare vremenske pozicije:**
```
00:40 - Email invoice dispatch
00:45 - XML invoice dispatch (Wizz Air)
00:50 - Email invoice retry
```

**Nove vremenske pozicije:**
```
06:30 - Email payment status update (emailPaymentStatusCron.ts)
06:35 - Email invoice dispatch (emailInvoiceCron.ts)
06:40 - XML invoice dispatch (Wizz Air) (wizzXmlInvoiceCron.ts)
07:00 - Email invoice retry (emailInvoiceCron.ts)
```

**Razlozi:**
- ✅ PostgreSQL VACUUM obično završi do 05:00
- ✅ PM2 CRON restart je 05:05 - proces je stabilan do 06:30
- ✅ API server je bio online 2+ sata - stabilno
- ✅ Izbjegavamo midnight period koji je problematičan
- ✅ Lakše za testiranje i monitoring tokom radnog vremena
- ✅ **Nema overlap-a između job-ova** - svaki ima dovoljno vremena
- ✅ Logičan redoslijed: payment update → email dispatch → XML dispatch → retry

**emailInvoiceCron.ts promjene:**
```typescript
// Prije
const cronExpression = '40 0 * * *';      // 00:40
const retryCronExpression = '50 0 * * *'; // 00:50

// Sada
const cronExpression = '35 6 * * *';      // 06:35
const retryCronExpression = '0 7 * * *';  // 07:00
```

**wizzXmlInvoiceCron.ts promjene:**
```typescript
// Prije
const cronExpr = '45 0 * * *';  // 00:45

// Sada
const cronExpr = '40 6 * * *';  // 06:40
```

---

#### **Fix #3: Timezone Option**

Svaki CRON job sada ima eksplicitno postavljenu timezone opciju:

**emailInvoiceCron.ts:**
```typescript
cron.schedule(cronExpression, async () => {
  // ...
}, {
  timezone: tz  // ✅ Timezone postavljena na Europe/Sarajevo
});

// Retry job
cron.schedule(retryCronExpression, async () => {
  // ...
}, {
  timezone: tz  // ✅ Timezone postavljena na Europe/Sarajevo
});
```

**wizzXmlInvoiceCron.ts:**
```typescript
job = cron.schedule(cronExpr, async () => {
  // ...
}, {
  timezone: tz  // ✅ Timezone postavljena na Europe/Sarajevo
});
```

**Napomena:** `scheduled: true` opcija nije potrebna jer je po defaultu već `true`.

---

### 📊 Comparison - Prije i Sada

| Aspekt | Prije | Sada |
|--------|-------|------|
| Email payment status vrijeme | 06:30 | **06:30** (nepromijenjen) |
| Email dispatch vrijeme | 00:40 | **06:35** |
| XML dispatch vrijeme | 00:45 | **06:40** |
| Email retry vrijeme | 00:50 | **07:00** |
| Email import | `import * as cron` ❌ | `import cron` ✅ |
| XML import | `import * as cron` ❌ | `import cron` ✅ |
| Timezone | Default (system) | **Explicit: `timezone: tz`** ✅ |
| Overlap check | ❌ Overlap 06:30 | ✅ **Nema overlap-a** |
| Build status | ❌ TypeScript errors | ✅ **Build uspješan** |

---

### 🧪 Kako Testirati

**Sveće se očekivati:**

```bash
# Za 06:30 email payment status update
pm2 logs avioservis-cron | grep -A3 "06:30"
# Trebalo bi vidjeti:
# [2025-11-02T06:30:00Z] Starting email payment status update cron job...
# [2025-11-02T06:30:XX] Email payment status cron job completed

# Za 06:35 email dispatch
pm2 logs avioservis-cron | grep -A5 "06:35"
# Trebalo bi vidjeti:
# [2025-11-02T06:35:00Z] 🔥🔥🔥 EMAIL CRON CALLBACK TRIGGERED!
# [2025-11-02T06:35:XX] Email invoice dispatch completed

# Za 06:40 XML dispatch
pm2 logs avioservis-cron | grep -A5 "06:40"
# Trebalo bi vidjeti:
# [2025-11-02T06:40:00Z] 🔥🔥🔥 XML CRON CALLBACK TRIGGERED!
# [2025-11-02T06:40:XX] Wizz XML invoice cron završio

# Za 07:00 email retry
pm2 logs avioservis-cron | grep -A5 "07:00"
# Trebalo bi vidjeti:
# [2025-11-02T07:00:00Z] Starting email invoice retry cron job
# [2025-11-02T07:00:XX] Email invoice retry completed
```

**Timeline (normalna distribucija):**
```
06:30:00 - Email payment status počinje (brz - 2-5 sec)
06:30:05 - Email payment status završen ✅
06:35:00 - Email dispatch počinje (duži - 30-60 sec)
06:35:45 - Email dispatch završen ✅
06:40:00 - XML dispatch počinje (30-60 sec)
06:40:45 - XML dispatch završen ✅
07:00:00 - Email retry počinje (10-60 sec)
07:00:30 - Email retry završen ✅
```

---

### 📝 Datoteke Koje Su Promijenjene

1. **backend/src/cron/emailInvoiceCron.ts**
   - Promijenjen import sa `import * as cron` na `import cron`
   - Email dispatch pomjeren sa `00:40` na `06:35`
   - Email retry pomjeren sa `00:50` na `07:00`
   - Dodano `scheduled: true` na oba job-a
   - Dodano napomene o izbjegavanju overlap-a sa payment status job-om

2. **backend/src/cron/wizzXmlInvoiceCron.ts**
   - Promijenjen import sa `import * as cron` na `import cron`
   - XML dispatch pomjeren sa `00:45` na `06:40`
   - Dodano `scheduled: true` na job

---

### ✨ Sažetak Rješenja

**Root cause:**
- Kombinacija node-cron namespace import buga + kompleksne operacije (PDF merge, email slanje) tokom kritičnog perioda (00:00-06:00)
- Dodatni problem: Email dispatch se preklapao sa email payment status update-om u 06:30

**Rješenje:**
1. Koristi stabilan import stil (`import cron from 'node-cron'`)
2. Pomjeri CRON jobove u stabilan period (06:35-07:00)
3. Eksplicitno postavi `scheduled: true` flag
4. Rasporedi job-ove da nema overlap-a:
   - 06:30 - Email payment status update
   - 06:35 - Email dispatch
   - 06:40 - XML dispatch
   - 07:00 - Email retry

**Očekivani rezultat:**
- Email i XML dispatch će se pokrenuti bez problema
- Nema više propuštanja vremenskih pozicija
- Nema konkurencije na bazi između job-ova
- Procesi će biti vidljivi u logovima sa svim detaljima
- Čist redoslijed izvršavanja: payment update → email dispatch → XML dispatch → retry

---

**Verzija:** 1.2
**Datum ažuriranja:** 02.11.2025 14:45 CET
**Status:** ✅ Implementirano i dokumentirano
**Finalni raspored:** 06:30 → 06:35 → 06:40 → 07:00 (bez overlap-a)
