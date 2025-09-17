# 🌱 Seed Instrukcije za Plan Kalibracije

## Brze instrukcije

### 1. Pokretanje seed skripte

```bash
# Iz backend direktorija
cd backend

# Linux/Mac
./scripts/seed-calibration.sh

# Windows
scripts\seed-calibration.bat

# Ili direktno sa npm
npm run seed:calibration
```

### 2. Što će se dodati

**5 test planova kalibracije** sa različitim statusima:

| Plan | Status | Opis |
|------|--------|------|
| **GG-A1-2024** | Mješoviti | Važeći + ističu uskoro |
| **RG-B2-2024** | Mješoviti | Istekli + ističu uskoro |
| **MG-C3-2024** | Djelomično | Neki instrumenti nisu postavljeni |
| **TG-D4-2024** | Istekli | Svi instrumenti istekli |
| **SG-E5-2024** | Važeći | Svi instrumenti važeći |

### 3. Testiranje funkcionalnosti

Nakon seedovanja možete testirati:

- ✅ **Modal sa detaljima** - klik na bilo koju karticu
- ✅ **Status badge-ove** - različite boje za različite statuse
- ✅ **Tabele po kategorijama** - organizovane kalibracije
- ✅ **Brojače statusa** - u modal header-u
- ✅ **Datumi isteka** - prikaz koliko dana ostaje

### 4. Sigurnost

- 🔒 Briše samo test podatke (po ID broju)
- 🔒 Neće uticati na postojeće podatke
- 🔒 Može se pokretati više puta

### 5. Uklanjanje test podataka

```sql
-- Ako trebate obrisati test podatke ručno
DELETE FROM plan_kalibracije 
WHERE identifikacijski_broj LIKE 'GG-A1-2024%'
   OR identifikacijski_broj LIKE 'RG-B2-2024%'
   OR identifikacijski_broj LIKE 'MG-C3-2024%'
   OR identifikacijski_broj LIKE 'TG-D4-2024%'
   OR identifikacijski_broj LIKE 'SG-E5-2024%';
```

## 🎯 Test scenariji

### Scenario 1: Modal sa detaljima
1. Kliknite na bilo koju karticu
2. Modal se otvara sa detaljnim informacijama
3. Provjerite status badge-ove
4. Provjerite tabele po kategorijama

### Scenario 2: Različiti statusi
1. **GG-A1-2024** - ima i važeće i ističuće
2. **TG-D4-2024** - svi instrumenti istekli (crveni)
3. **SG-E5-2024** - svi instrumenti važeći (zeleni)

### Scenario 3: Djelomično postavljeno
1. **MG-C3-2024** - neki instrumenti nisu postavljeni
2. Provjerite "Nije postavljeno" status

## 🚨 Troubleshooting

### Greška: "ts-node nije instaliran"
```bash
npm install -g ts-node
```

### Greška: "DATABASE_URL nije postavljen"
Provjerite `.env` fajl u backend direktoriju.

### Greška: "Permission denied"
```bash
chmod +x scripts/seed-calibration.sh
```

