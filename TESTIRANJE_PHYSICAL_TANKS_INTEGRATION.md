# Testiranje Physical Tanks Integracije

## ✅ Korak 1: Provjeri da su tankovi ažurirani

1. Idi na **Physical Tanks** stranicu
2. Provjeri da svi tankovi prikazuju **"Jet A-1"** kao tip goriva
3. Trebali bi svi tankovi biti vidljivi u dropdown-u kada kreiraš novi Fuel Intake

## ✅ Korak 2: Kreiraj novi Fuel Intake

1. Idi na **Fuel Intakes** → **New Fuel Intake**

### Step 1: Delivery Details
- **Supplier:** Izaberi proizvođača
- **Quantity (Liters):** `50000`
- **Quantity (KG):** `40000` (ili automatski, ovisno o gustoći)
- **Fuel Type:** `Jet A-1`
- **Intake Date:** Danas
- **Customs Declaration Number:** `TEST-MRN-001`

### Step 2: Tank Distribution (Fixed Tanks)
- Distribuiraj nekoliko litara u fiksne tankove (ili preskoči ako želiš)

### Step 3: Physical Tank Distribution ✅
- **Sada bi svi tvoji physical tankovi (TANK 1, 2, 3) trebali biti vidljivi!**
- Izaberi **TANK 1** → Dodaj `20000` L
- Dodaj još jedan tank → Izaberi **TANK 2** → Dodaj `30000` L
- Provjeri da **"Ukupno primljeno"** = `50000` L
- Provjeri da **"Raspodijeljeno"** = `50000` L
- Provjeri da **"Preostalo"** = `0` L

**Napomena:** Ako vidiš upozorenje "Prekoračenje kapaciteta" - to je OK! To znači da validation radi.

### Step 4: Document Upload
- Preskoči ili upload-uj dokument (opcionalno)

### Step 5: Review & Submit
- Provjeri sve podatke
- Klikni **"Submit"** ili **"Sačuvaj"**

## ✅ Korak 3: Provjeri da je stanje ažurirano

1. Vrati se na **Physical Tanks** stranicu
2. Provjeri da TANK 1 ima **20,000 L**
3. Provjeri da TANK 2 ima **30,000 L**

## 🎯 Očekivani rezultat

- ✅ Nema greške "Physical tank is for JET_A1, but intake is for Jet A-1"
- ✅ Tankovi se ažuriraju sa količinom goriva
- ✅ MRN zapisi se kreiraju za praćenje
- ✅ Kapacitet upozorenja rade (ako pokušavaš dodati više nego što ima mjesta)

## 🐛 Ako nešto ne radi

1. **Proveri browser console** za greške
2. **Proveri backend logs** za detaljne greške
3. Proveri da su svi tankovi stvarno ažurirani na "Jet A-1"

---

🎉 **Ako sve ovo radi, Physical Tanks integracija je završena!**

