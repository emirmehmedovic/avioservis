# Seed Skripte za Plan Kalibracije

Ovaj direktorij sadrži skripte za dodavanje test podataka u bazu podataka.

## Seed Kalibracije Planova

### Opis
Skripta `seed-calibration-plans.ts` dodaje 5 test planova kalibracije sa različitim statusima:

1. **Glavni gorionik A1** - Mješoviti status (važeći i ističu uskoro)
2. **Rezervni gorionik B2** - Mješoviti status (istekli i ističu uskoro)
3. **Mobilni gorionik C3** - Djelomično postavljeno (neki instrumenti nisu kalibrirani)
4. **Testni gorionik D4** - Svi instrumenti istekli
5. **Specijalni gorionik E5** - Svi instrumenti važeći

### Pokretanje

```bash
# Iz backend direktorija
npm run seed:calibration
```

ili

```bash
# Direktno sa ts-node
npx ts-node scripts/seed-calibration-plans.ts
```

### Što skripta radi

1. **Briše postojeće test podatke** - Uklanja sve planove sa identifikacijskim brojevima koji počinju sa:
   - `GG-A1-2024`
   - `RG-B2-2024`
   - `MG-C3-2024`
   - `TG-D4-2024`
   - `SG-E5-2024`

2. **Kreira nove test planove** sa svim poljima:
   - Osnovni podaci (naziv, ID, vlasnik, mjesto, napomene)
   - Osnovni instrumenti (12 instrumenta)
   - Sigurnosni instrumenti (3 instrumenta)
   - Radni dokumenti (2 dokumenta)
   - Električni instrumenti (2 instrumenta)

3. **Postavlja različite statuse**:
   - **Važeći**: > 30 dana do isteka
   - **Ističe uskoro**: ≤ 30 dana do isteka
   - **Istekao**: < 0 dana (već istekao)
   - **Nije postavljeno**: null vrijednosti

### Test podaci sadrže

- **Sve nove kalibracije polja** implementirane u aplikaciji
- **Realistične datume** kreirane na osnovu današnjeg datuma
- **Različite statuse** za testiranje UI komponenti
- **Napomene** za svaki plan
- **Identifikacijske brojeve** za lakše prepoznavanje test podataka

### Sigurnost

- Skripta briše samo test podatke (po identifikacijskom broju)
- Neće uticati na produkcijske podatke
- Može se sigurno pokretati više puta

### Output

Skripta će ispisati:
- ✅ Poruke za svaki kreiran plan
- 📊 Ukupan broj kreiranih planova
- 📈 Ukupan broj planova u bazi
- ❌ Greške ako dođe do problema

