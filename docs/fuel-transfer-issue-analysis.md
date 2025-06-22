# Analiza Problema s Transferom Goriva između Cisterni

## Pregled Problema

Sistem trenutno ne dozvoljava transfer goriva iz fiksne cisterne (TANK 2, ID: 32) u mobilnu cisternu (VOZILO 2, ID: 46) zbog detektirane nekonzistentnosti podataka. Operacija je blokirana s greškom:

```
Operation TRANSFER_TO_TANKER_KG aborted due to data inconsistency. Please review tank status.
```

## Analiza Logova

### Nekonzistentnost na Fiksnom Tanku (ID: 32)

```
[WARN] Tank TANK 2 (ID: 32) is inconsistent. Difference: 236.40 L, Tank Qty: 21257.00 L, MRN Sum: 21020.60 L, Tolerance: 106.29 L
```

Detalji nekonzistentnosti:
- **Stvarna količina u tanku**: 21257.00 L
- **Suma po MRN zapisima**: 21020.60 L
- **Razlika**: 236.40 L
- **Dozvoljena tolerancija**: 106.29 L

Budući da je razlika (236.40 L) veća od dozvoljene tolerancije (106.29 L), sistem smatra tank nekonzistentnim i blokirа operaciju.

### Povezani MRN Zapisi za Tank 32

```json
"mrnRecords": [
  {
    "id": 49,
    "customsDeclarationNumber": "BA6666666666666666",
    "remainingQuantityLiters": "0",
    "remainingQuantityKg": "0",
    "dateAdded": "2025-06-21T09:34:00.000Z"
  },
  {
    "id": 50,
    "customsDeclarationNumber": "HR1234567899876543",
    "remainingQuantityLiters": "21270.38",
    "remainingQuantityKg": "16893.246",
    "dateAdded": "2025-06-21T10:51:00.000Z"
  },
  {
    "id": 47,
    "customsDeclarationNumber": "BA1111111111111111",
    "remainingQuantityLiters": "0",
    "remainingQuantityKg": "0",
    "dateAdded": "2025-06-20T17:52:00.000Z"
  },
  {
    "id": 48,
    "customsDeclarationNumber": "BA4444444444444444",
    "remainingQuantityLiters": "-249.783",
    "remainingQuantityKg": "0",
    "dateAdded": "2025-06-21T09:31:00.000Z"
  }
]
```

### Nekonzistentnost na Mobilnom Tanku (ID: 46)

```
[getFuelTankById] UPOZORENJE - Neslaganje podataka o cisterni ID=46:
- Litre: 0 (trenutno) vs -1101.41 (iz MRN zapisa) - razlika: 1101.41L
- KG: 0.753947510593673 (trenutno) vs -866.039 (iz MRN zapisa) - razlika: 866.79kg
[getFuelTankById] ORPHANED LITERS DETECTED: 1101.41L u tanku ID=46
```

## Uzroci Problema

Na osnovu analize logova, identificirali smo nekoliko potencijalnih uzroka problema:

### 1. Negativne Vrijednosti u MRN Zapisima

Primijećeno je da MRN zapis ID=48 (`BA4444444444444444`) ima **negativnu** vrijednost za preostalu količinu litara (`-249.783`). Ovo je neočekivano ponašanje i može utjecati na sumiranje količina.

### 2. Nedosljednost između kg i L vrijednosti

Za MRN zapis ID=48, postoji nedosljednost: `-249.783` litara ali `0` kg, što je fizički nemoguće. Ovo ukazuje na mogući bug u logici za ažuriranje ovih vrijednosti.

### 3. Problem s Orphaned Liters u Mobilnoj Cisterni

Sistem je detektirao "orphaned liters" (1101.41L) u mobilnoj cisterni (ID=46), što znači da postoji razlika između stvarne količine (0L) i one koja proizlazi iz povezanih MRN zapisa (-1101.41L).

### 4. Neispravno Rukovanje Negativnim Vrijednostima

Logika za izračun sume po MRN zapisima možda ne rukuje pravilno s negativnim vrijednostima. Ako se koristi jednostavno sumiranje, negativne vrijednosti će smanjiti ukupnu sumu što može dovesti do nekonzistentnosti.

## Potencijalna Rješenja

1. **Privremeno rješenje**: Povećati dozvoljenu toleranciju za nekonzistentnost, ali ovo ne rješava temeljni problem.

2. **Ispravka Podataka**:
   - Identificirati i ispraviti negativne vrijednosti u MRN zapisima.
   - Osigurati da su kg i L vrijednosti konzistentne za svaki MRN zapis.

3. **Revizija Logike za Provjeru Konzistentnosti**:
   - Revidirati kako se izračunava `sumMrnQuantities` u provjeri konzistentnosti.
   - Dodati bolju logiku za rukovanje posebnim slučajevima i edge cases.

4. **Poboljšano Upravljanje s Orphaned Liters**:
   - Implementirati robusniji mehanizam za rukovanje s orphaned liters koji će dozvoliti transfer pod određenim uvjetima.

5. **Uvid u Sve Transfer Operacije**:
   - Pregledati sve transfer operacije koje su se dogodile između fiksnih i mobilnih cisterni.
   - Možda postoji određeni obrazac operacija koje uzrokuju ovu nekonzistentnost.

## Ključne Komponente za Pregled

1. **fuelTransferToTanker.controller.ts**:
   - Sadrži logiku za transfer goriva između cisterni.
   - Implementira provjere konzistentnosti prije operacija.

2. **transactionUtils.ts**:
   - Sadrži logiku za transakcije i provjere konzistentnosti.
   - Funkcija `executeInTransaction` ima implementiranu provjeru koja baca grešku.

3. **Logika za Izračun `sumMrnQuantities`**:
   - Provjeriti kako se sumaraju MRN količine i kako se računa dozvoljena tolerancija.
   - Ova logika se vjerojatno nalazi u nekom od pomoćnih modula.

## Zaključak i Preporuke

Temeljni problem je nekonzistentnost podataka između stvarne količine goriva u cisternama i količina koje proizlaze iz povezanih MRN zapisa. Problem se manifestira kada se pokušava izvršiti transfer goriva, jer sistem prvo provjerava konzistentnost podataka.

### Preporuke:

1. **Kratkoročno**: 
   - Implementirati "sanity check" na negativne vrijednosti u MRN zapisima.
   - Ažurirati logiku za izračun `sumMrnQuantities` da pravilno rukuje s negativnim vrijednostima.

2. **Srednjoročno**: 
   - Razviti robusniji mehanizam za rukovanje s nekonzistentnostima.
   - Implementirati proces za automatsku korekciju orphaned liters.

3. **Dugoročno**: 
   - Redizajnirati model podataka za tracking goriva po MRN zapisima.
   - Implementirati bolje auditing mehanizme za praćenje svih operacija s gorivom.

Implementacija ovih preporuka trebala bi riješiti trenutni problem i spriječiti slične probleme u budućnosti.
