# Plan za Prilagođeni Izvještaj Vozila

## 📋 **Pregled**
- **Postojeći izvještaj** → preimenovati u "Kompletni izvještaj" (BS/EN)
- **Novi izvještaj** → "Prilagođeni izvještaj" (BS/EN)
- **Fokus**: Kraći, specifični podaci za operativne potrebe

---

## 🏗️ **Struktura Prilagođenog Izvještaja**

### **1. Osnovni podaci** (isti kao postojeći)
- Registracija
- Status  
- Firma
- Lokacija
- Broj šasije
- Broj posude
- **Napomene**
- **🆕 Kontakt odgovorne osobe** (dodati ispod napomene)

### **2. Informacije o cisterni** (modifikovano)

#### **Prva 4 reda (ostaju ista):**
1. Kapacitet cisterne (L)
2. Kapacitet (kg) 
3. Trenutno stanje (kg)
4. Trenutno stanje (L)

#### **Umjesto 5. reda (posljednja/sljedeća kalibracija cisterne):**
5. **Datum registracije**
6. **Datum isteka registracije**

#### **Dodatni redovi:**
7. Tip vozila
8. Vrsta punjenja
9. Tip punjenja zrakoplova
10. Tip kamiona
11. Opis vozila
12. **Datum šestomjesečnog testa** (kad je rađen)
13. **Datum sljedećeg šestomjesečnog testa**
14. **Posljednji test protivpožarne zaštite**
15. **Sljedeći test protivpožarne zaštite**

#### **Nastavak:**
16. Datum važenja ADR

#### **Ukloniti:**
- ❌ Periodični pregled važi do
- ❌ Datum instalacije filtera
- ❌ Tromjesečni test datum
- ❌ Tromjesečni test datum važenja
- ❌ Datum izdavanja licence

---

### **3. Tehnički detalji refueler** (modifikovano)

#### **Prvih 7 redova (ostaju ista):**
1. Snaga motora (kW)
2. Zapremina motora (ccm)
3. Broj osovina
4. Broj sjedišta
5. Nosivost (kg)
6. Proizvođač šasije
7. Tip šasije

#### **Ukloniti:**
- ❌ Proizvođač nadogradnje
- ❌ Tip nadogradnje

#### **Ostaju:**
- Euro norma
- Protok

#### **Dodatni redovi:**
- **Datum registracije**
- **Datum isteka registracije**
- **CWD datum**
- **Tromjesečni test datum**
- **Tromjesečni test do kad važi**
- **Podržani tipovi goriva**
- **Senzor tehnologija**
- **Godina proizvodnje**
- **🔄 Umjesto "Vrsta goriva" → "Pogon pumpe"**

---

### **4. Podaci o filteru** (ostaje ista)
- Svi postojeći redovi se zadržavaju

---

### **5. Podaci o crijevima** (modifikovano)

#### **Dodati "crijeva" u nazive:**
- **Crijeva HD38** (umjesto "Broj crijeva HD38")
- **Crijeva HD63** (umjesto "Broj crijeva HD63") 
- **Crijeva TW75** (umjesto "Broj crijeva TW75")

#### **Promeniti nazive testova:**
- **"Test pritiska HD38"** → **"Šestomjesečni test HD38"**
- **"Test pritiska HD63"** → **"Šestomjesečni test HD63"**
- **"Test pritiska TW75"** → **"Šestomjesečni test TW75"**

#### **Ostali redovi ostaju isti:**
- Godina proizvodnje za sve tipove
- Nadkrilno/Podkrilno specifikacije

---

### **6. Podaci o kalibracijama** (samo prvih 8 redova)

#### **Zadržati samo:**
1. Posljednja kalibracija volumetra
2. Sljedeća kalibracija volumetra
3. Posljednja kalibracija manometra
4. Sljedeća kalibracija manometra
5. Posljednji test sigurnosti od požara
6. Sljedeći test sigurnosti od požara
7. Posljednja kalibracija tahografa
8. Sljedeća kalibracija tahografa

#### **Ukloniti sve ostalo:**
- ❌ Dodatni datumi kalibracije
- ❌ Kalibracije opreme
- ❌ Hemijski testovi
- ❌ Moment ključ kalibracije
- ❌ Termometar kalibracije
- ❌ Hidrometar kalibracije
- ❌ Mjerač el. provodljivosti
- ❌ Mjerač otpora
- ❌ Glavni mjerač protoka

---

## 🎯 **Implementacija**

### **Korak 1: Preimenovanje postojećeg**
- `generatePdfReport` → `generateCompletePdfReport`
- Dugmad: "Kompletni izvještaj (BS/EN)"

### **Korak 2: Kreiranje novog**
- `generateCustomPdfReport` funkcija
- Dugmad: "Prilagođeni izvještaj (BS/EN)"

### **Korak 3: Modifikacije strukture**
- Implementirati sve izmene prema planu
- Zadržati isti stil i format
- Koristiti iste helper funkcije

---

## 📊 **Rezultat**
- **Kompletni izvještaj**: Sve informacije (trenutni)
- **Prilagođeni izvještaj**: Fokusiran, kraći, operativni podaci
- **4 dugmeta ukupno**: 2 tipa × 2 jezika
- **Bolji UX**: Korisnici mogu birati tip izvještaja prema potrebi




