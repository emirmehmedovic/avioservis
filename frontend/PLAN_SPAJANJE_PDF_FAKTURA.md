# Plan: Spajanje fakture i prikačenog PDF-a u jedan PDF

## Cilj
Kada korisnik klikne na "Generiši fakturu" (obična ili domaća), automatski se:
- generiše faktura (kao i do sada)
- preuzme prikačeni PDF (ako postoji)
- oba dokumenta spoje u jedan PDF i ponude korisniku za download

**Odnosi se samo na:**
- `helpers.ts` (pojedinačna faktura)
- `domesticInvoice.ts` (pojedinačna domaća faktura)
- UI dugmad u `OperationDetailsModal.tsx`

---

## 1. Priprema
- [ ] Dodati biblioteku [`pdf-lib`](https://pdf-lib.js.org/) u frontend projekt (`npm install pdf-lib`)
- [ ] Provjeriti da li je prikačeni dokument zaista PDF (ignorirati slike, Word itd.)

## 2. Promjene u helpers.ts i domesticInvoice.ts
- [ ] Umjesto trenutnog `doc.save()`, eksportovati fakturu kao `Uint8Array` ili `Blob` (npr. `doc.output('arraybuffer')`)
- [ ] Dodati novu funkciju (npr. `generateAndMergeInvoiceWithAttachment`) koja:
    1. Generiše fakturu kao PDF (kao gore)
    2. Preuzima prikačeni PDF kao `Blob` (fetch sa servera, već postoji API)
    3. Koristi `pdf-lib` da spoji oba PDF-a:
        - Učita oba PDF-a kao `PDFDocument`
        - Doda sve stranice iz prikačenog PDF-a na kraj fakture
        - Eksportuje novi PDF i ponudi korisniku za download
    4. Ako nema prikačenog PDF-a, ponaša se kao do sada
- [ ] Dodati loader/spinner dok traje proces

## 3. Promjene u OperationDetailsModal.tsx
- [ ] Zamijeniti postojeće onClick handlere za dugmad za generisanje fakture:
    - Pozivati novu funkciju za spajanje i download
    - Prikazati loader dok traje proces
    - Prikazati grešku ako download prikačenog PDF-a ne uspije ili nije PDF

## 4. UX i fallback
- [ ] Ako nema prikačenog PDF-a, samo generisati fakturu kao do sada
- [ ] Ako prikačeni dokument nije PDF, prikazati poruku i generisati samo fakturu
- [ ] Loader i jasne poruke korisniku

---

## Napomena
- **Ostale funkcionalnosti (konsolidovane fakture, XML, itd.) ostaju nepromijenjene!**
- Ova promjena ne utiče na backend.

---

## BONUS: Primjeri
- [pdf-lib spajanje PDF-ova (browser)](https://pdf-lib.js.org/docs/api/classes/pdfdocument#copypages)
- [StackOverflow primjer](https://stackoverflow.com/questions/60072305/merge-two-pdf-files-using-pdf-lib)

---

**Nakon odobrenja plana, slijedi implementacija!** 