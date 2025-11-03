# Connection Pool Consolidation & Optimization Guide

**Datum kreiranja:** 03.11.2025
**Status:** ✅ Phase 1 Fixovano - Čekaju Phase 2 & 3
**Prioritet:** KRITIČAN - Sprječava bazu od exhaustion-a

---

## 📊 SITUACIJA - Analiza Connection Pool-a

### Trenutno Stanje (PRE FIXA)

```
Backend ima 3 RAZLIČITA singleton-a za Prisma:

1. /lib/prisma.ts (KORISTI CRON)
   ├─ NODE_ENV !== 'production': global.prisma se SPREMA ✅
   └─ NODE_ENV === 'production': global.prisma se NE sprema ❌

2. /utils/prisma.ts (LEGACY)
   └─ Koriste 3 legacy fajla

3. /db.ts (LEGACY)
   └─ Koristi 1 fajl

PLUS: 62+ fajla kreiraju VLASTITE PrismaClient instance!
├─ 37 controllers
├─ 12 services
├─ 9 utilities
└─ 2 routes

REZULTAT: 630+ mogućih istovremenih konekcija!
DATABASE LIMIT: PostgreSQL ~100 connections
OUTCOME: ❌ CONNECTION POOL EXHAUSTION
```

### Što Se Dešava

```
Scenario: PM2 restart CRON-a (04:00 daily)

04:00:00 - PM2 kill stari proces
          └─ Konekcije se ne zatvaraju pravilno
          └─ 10 "zombie" konekcije ostaju na bazi

04:00:05 - PM2 startuje novi proces
          └─ lib/prisma.ts se učita
          └─ global.prisma je undefined (jer je production)
          └─ Pravi se NOVA PrismaClient instanca
          └─ Zamjenjuje staru, ali stara ostaje otvorena
          └─ Još 10 konekcija

04:00:10 - API proces startuje slučajno
          └─ controllers/emailInvoice.ts: const prisma = new PrismaClient()
          └─ +10 konekcija
          └─ services/emailInvoiceDispatch.ts: import { prisma } from lib/prisma
          └─ Koristi iz global-a, ALI global je undefined
          └─ +10 konekcija

... SVAKI SAT:
   - CRON jobovi se pokreću
   - Svaki pristupa bazi
   - Ako je konekcija "zombie" → timeout
   - CRON failuje TIHO ❌
```

---

## ✅ PHASE 1 - IMMEDIATE FIX (DONE)

### Fajl: `backend/src/lib/prisma.ts`

**Problem:**
```typescript
// ❌ PRIJE
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;  // ← Samo u development!
}

// Na produkciji global.prisma ostaje undefined
// Svaki import = nova instanca
```

**Rješenje:**
```typescript
// ✅ SADA
if (!global.prisma) {
  global.prisma = prisma;  // ← NA SVE OKRUŽENJA!
}

// Prvi import kreira, ostali koriste global
```

**Efekt:**
- ✅ CRON jobovi će imati dostupnu konekciju
- ✅ Zombie konekcije se više neće nakupljati
- ✅ `disconnectPrisma()` će zatvoriiti samo jednu instancu

**Gdje primjeniti:** `/Users/emir_mw/avioservis/backend/src/lib/prisma.ts`

---

## 📋 PHASE 2 - CONSOLIDATION (MEDIUM PRIORITY)

### Cilj: Eliminisati `/utils/prisma.ts` i `/db.ts`

Umjesto da imaš 3 singleton-a, trebalo bi samo 1.

#### Step 1: Pronađi sve fajlove koji koriste legacy singleton-e

```bash
# Koji fajlovi koriste utils/prisma
grep -r "from.*utils/prisma" backend/src --include="*.ts"

# Koji fajlovi koriste db.ts
grep -r "from.*db.ts" backend/src --include="*.ts"
grep -r "from.*\./db" backend/src --include="*.ts"
```

#### Step 2: Za svaki pronađeni fajl, zamijeni:

```typescript
// ❌ PRIJE
import { prisma } from '../utils/prisma';
// ili
import { prisma } from '../db';

// ✅ SADA
import { prisma } from '../lib/prisma';
```

#### Step 3: Obriši legacy fajlove

```bash
rm backend/src/utils/prisma.ts
rm backend/src/db.ts
```

#### Step 4: Test

```bash
npm run build
```

**Efekt nakon Phase 2:**
- Svi CRON jobovi koriste `lib/prisma`
- Svi dispatch servisi koriste `lib/prisma`
- ~1 singleton umjesto 3

---

## 🔥 PHASE 3 - FULL CONSOLIDATION (HIGH PRIORITY)

### Cilj: Eliminisati 62+ lokalne PrismaClient instance u controllers/services

Svaki od ovih fajlova kreira vlastitu instancu:

**Controllers (37 fajlova):**
```
activity.controller.ts
airline.controller.ts
bankAccount.controller.ts
... (31 više)
```

**Services (12 fajlova):**
```
auth.service.ts
company.service.ts
user.service.ts
... (9 više)
```

**Utilities (9 fajlova):**
```
fuelConsistencyUtils.ts
transactionUtils.ts
... (7 više)
```

### Plan za Phase 3

#### Approach A: Massive Refactor (Best, ali 4-6 sati)

```typescript
// ❌ PRIJE - svaki fajl kreira svoju instancu
// activity.controller.ts
const prisma = new PrismaClient();

export async function getActivities(req, res) {
  const activities = await prisma.activity.findMany();
}

// ✅ SADA
import { prisma } from '../lib/prisma';

export async function getActivities(req, res) {
  const activities = await prisma.activity.findMany();
}
```

**Koraci:**
1. Za svaki od 62 fajla:
   - Ukloniti `const prisma = new PrismaClient()`
   - Dodati `import { prisma } from '../lib/prisma'` (sa ispravnom putanjom)
2. Build & test
3. Commit

**Benefit:** Samo 1 konekcija umjesto 630+

#### Approach B: Gradual Migration (Safer, 2-3 dana)

```typescript
// Kreiraj wrapper koji detektuje dual instancije

// lib/prisma-detector.ts
export function getPrisma() {
  if (/* detected dual instance */) {
    console.warn('⚠️ Dual Prisma instance detected in', caller);
    return global.prisma; // Koristi singleton
  }
  return global.prisma;
}
```

**Koraci:**
1. Kreiraj wrapper
2. Uradi refactor u etapama (po 10 fajlova svaki dan)
3. Loguj koji su refaktoirani, koji ostaju
4. Kada su svi migriorani - obriši wrapper

**Benefit:** Sigurnija migracija sa mogućnošću rollback-a

---

## 📊 CONNECTION POOL REDUCTION

### Prije Phase 3

```
Scenario: Simultaneous requests
├─ 1 CRON process × 10 connections = 10
├─ 1 API process
│  ├─ 37 controllers × 10 connections = 370
│  ├─ 12 services × 10 connections = 120
│  ├─ 9 utilities × 10 connections = 90
│  ├─ 2 routes × 10 connections = 20
│  └─ 1 lib/prisma singleton = 10
└─ Total: ~620 connections (DATABASE LIMIT IS 100!)
```

### Posle Phase 3

```
Scenario: Simultaneous requests
├─ 1 CRON process: 10 connections
├─ 1 API process: 10 connections (SVI koriste isti singleton)
└─ Total: ~20 connections (SAFE!)
```

---

## 🎯 IMPLEMENTATION TIMELINE

### Odmah (✅ DONE)
- [x] Fix `lib/prisma.ts` - global.prisma na svim okruženjima
- [x] Build & test
- [x] Commit

### Ova sedmica (PRIORITY)
- [ ] Phase 2 - Eliminate `/utils/prisma.ts` i `/db.ts`
  - Procijenjeno: 1-2 sata
  - Risk: NISKA (samo import zamjene)

### Sljedeće sedmice (IMPORTANT)
- [ ] Phase 3 - Refactor 62 fajla
  - Approach A: 4-6 sati za sve odjednom
  - Approach B: 2-3 dana (gradual)

---

## 🧪 TESTING STRATEGY

### Test 1: Connection Count Monitoring

```bash
# Na produkciji, provjeri broj aktivnih konekcija
psql -h your-db-host -U your-user -d your-db -c "SELECT count(*) FROM pg_stat_activity;"

# Trebalo bi biti oko 20-30 (bez obzira koliko korisnika)
# Ako je 300+ → problem!
```

### Test 2: CRON Execution

```bash
# Nakon Phase 1 fixa, provjerite da li se CRON pokreće
pm2 logs avioservis-cron | grep -A2 "06:35\|06:40\|07:00"

# Trebalo bi vidjeti logove o izvršavanju
```

### Test 3: API Manual Dispatch

```bash
# Testira da li manual dispatch radi
curl -X POST http://localhost:3000/api/manual-dispatch \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-11-03"}'

# Trebalo bi vratiti success
```

### Test 4: Connection Leak Detection

```bash
# Kreiraj script koji monitorira konekcije tokom 24 sata
# Trebalo bi biti stabilno ~20-30
# Ako raste → memory leak
```

---

## ⚠️ RISKS & MITIGATION

| Risk | Severity | Mitigation |
|------|----------|-----------|
| CRON još uvijek failuje | HIGH | Phase 1 fix je OBAVEZNA, test odmah nakon |
| API manual dispatch prestane raditi | MEDIUM | Backup - baza će imati ~20 konekcija, trebalo bi biti dovoljno |
| Database disconnection issues | MEDIUM | Testirati `disconnectPrisma()` graceful shutdown |
| Legacy code koji koristi old singleton-e | LOW | Migrirati u fazama, logirati kada se koriste |
| Node.js memory leak sa 630+ instancama | HIGH | Phase 3 će smanjiti na 20, memorija će biti OK |

---

## 📝 COMMIT MESSAGES

### Phase 1 (Already done)
```
fix: Fix Prisma singleton initialization on production

Problem: global.prisma was only saved in development, causing new
PrismaClient instance on every import in production. This created
connection leaks and connection pool exhaustion.

Solution: Changed condition from 'process.env.NODE_ENV !== "production"'
to '!global.prisma' to cache singleton on all environments.

This fixes CRON job database access which was timing out due to
unavailable connections.
```

### Phase 2
```
refactor: Consolidate Prisma singleton instances

Removed legacy /utils/prisma.ts and /db.ts singleton implementations.
All files now use the standard /lib/prisma.ts singleton.

This reduces connection pool from 3 independent singletons to 1,
improving database connection stability.
```

### Phase 3
```
refactor: Migrate all services to use Prisma singleton

Replaced 62 instances of 'const prisma = new PrismaClient()' with
'import { prisma } from "../lib/prisma"'.

Affected files:
- 37 controllers
- 12 services
- 9 utilities
- 2 routes

Result: Connection pool reduced from 630+ to 20 concurrent connections.
Database is no longer at risk of connection exhaustion.
```

---

## 🔗 RELATED DOCUMENTS

- `CRON_DEBUGGING_GUIDE.md` - CRON job troubleshooting
- `ecosystem.config.js` - PM2 configuration (connection restart settings)
- Database logs - Monitor connection usage with `pg_stat_activity`

---

## ✅ VERIFICATION CHECKLIST

After Phase 1 (Immediate Fix):
- [ ] Build succeeds without errors: `npm run build`
- [ ] CRON process starts: `pm2 restart avioservis-cron --update-env`
- [ ] CRON jobs execute at scheduled times (check logs)
- [ ] Manual dispatch still works from frontend
- [ ] Database connections are healthy (check pg_stat_activity)
- [ ] No new errors in production logs

After Phase 2 (Consolidation):
- [ ] Legacy files deleted
- [ ] Build succeeds
- [ ] All tests pass
- [ ] Connection count stable

After Phase 3 (Full Refactor):
- [ ] All 62 files migrated
- [ ] Build succeeds
- [ ] Connection count: ~20
- [ ] CRON + API both work
- [ ] No memory leaks

---

**Status:** Phase 1 ✅ DONE
**Next:** Čekaj logove sa produkcije da potvrdiš da Phase 1 fix radi
**Then:** Implement Phase 2 & 3

