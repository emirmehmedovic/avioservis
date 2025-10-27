# Kako Promijeniti Tip Goriva na Fizičkim Tankovima (Kroz Frontend)

## ✅ **Ispravna Opcija: `Jet A-1`**

U dropdown izborniku imate tri opcije. **Ispravna opcija** za vaše tankove je:
- **`JET A-1`** (label) - ovo je **ISPRAVNA** opcija za vaše tankove ✨

Ostale opcije:
- `JET A` (label) - za JET A gorivo
- `AVGAS` (label) - za AVGAS

## 📝 Korak po Korak

1. **Otvori stranicu sa Physical Tanks** (Fizički Tankovi)

2. **Klikni na dugme "Uredi" (Edit)** na tanku koji želite promijeniti
   - Dugme ima ikonu olovke (pencil)

3. **U modal dijalogu, pronađi polje "Tip Goriva"**

4. **Klikni na dropdown i izaberi:**
   ```
   JET A-1  ← OVO JE ISPRAVNA OPCIJA
   ```

5. **Klikni "Ažuriraj" (Update)**

6. **Gotovo!** ✨

## ⚠️ Važno

- **NEMOJ** brisati i ponovo kreirati tankove - to nije potrebno
- **NEMOJ** raditi migracije SQL skriptama
- Samo **izaberi ponovo tip goriva** u edit modal-u i sačuvaj

## 🎯 Za sve vaše tankove

Ako imate 3 tanka (TANK 1, TANK 2, TANK 3):
1. Otvori prvi tank → Edit → Izaberi "JET A-1" → Ažuriraj
2. Otvori drugi tank → Edit → Izaberi "JET A-1" → Ažuriraj  
3. Otvori treći tank → Edit → Izaberi "JET A-1" → Ažuriraj

**To je sve!** 🎉

## 🔍 Kako Provjeriti

Nakon što promijenite, provjerite tako što ćete:
1. Kreirati novi Fuel Intake (prijem goriva)
2. Preći na korak "Physical Tank Distribution"
3. Svi tankovi bi sada trebali biti dostupni bez greške

