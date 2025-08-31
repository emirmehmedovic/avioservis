## Automatizacija: generisanje i slanje XML faktura (Wizz Air)

### Cilj
- Automatski svaki dan u 23:55 lokalno generisati IATA XML fakture za odabrane avio-kompanije i poslati ih na SFTP.
- Manualno slanje po potrebi ako automatika ne uspije.
- Evidencija i frontend prikaz poslanih/pokušanih faktura.

### Opseg (MVP i robustnost)
- Kompanije: samo `WIZZ AIR HUNGARY LTD` i `WIZZ AIR MALTA LTD`.
- Period: tekući dan (00:00–23:00 lokalno) – fleksibilno preko parametra.
- Po operaciji: 1 XML = 1 fueling operacija (ne konsolidujemo u MVP-u). Konsolidacija ostaje moguća kasnije.
- Idempotentno: ne šaljemo duplo za istu operaciju (unique constraint). Manualno „force“ dopušta retry.

---

### Arhitektura rješenja

#### Backend
1) Model evidencije slanja (Prisma)
   - Nova tabela `XmlInvoiceDispatch`:
     - `id` (PK)
     - `fuelingOperationId` (FK -> `FuelingOperation.id`, unique)
     - `airlineId` (FK -> `Airline.id`)
     - `status` (enum: `PENDING | SENT | FAILED`)
     - `attempts` (int, default 0)
     - `lastError` (text, nullable)
     - `xmlFileName` (string)
     - `xmlSha256` (string, za audit; bez čuvanja kompletnog XML-a u bazi)
     - `remotePath` (string, npr. `FTP_BASE_DIR/2025-06-10/INV_123_2025-06-10.xml`)
     - `dispatchedAt` (datetime, nullable)
     - `createdAt`, `updatedAt`
   - Indeksi: `createdAt`, `status`, `airlineId`.
   - Unique: `fuelingOperationId` (sprječava duplo slanje).

2) XML generator (Node/TS, backend)
   - Novi fajl `backend/src/services/xmlInvoiceBuilder.ts` koji replicira sadašnji frontend generator iz `frontend/src/components/fuel/utils/xmlInvoice.ts` (single-invoice varijanta) – isti mapping za Wizz entitete i isti IATA layout.
   - Ulaz: `FuelingOperation` (+ include `airline`, `tank`). Izlaz: `string` (XML).
   - Imenovanje fajla: `INV-${delivery_note_number || operation.id}-${YYYY}.xml`. Opcionalno prefiks sa lokacijom npr. `TZL_...`.

3) FTP klijent servis
   - Novi fajl `backend/src/services/ftpClient.ts` s adapterom:
     - Podržati `FTP_PROTOCOL=ftp` (default, library: `basic-ftp`).
     - Opcionalno `FTP_PROTOCOL=sftp` (library: `ssh2-sftp-client`) – pripraviti, ali MVP može početi sa FTP-om.
   - Konfiguracija iz `.env` (vidi sekciju Env): host, port, user, password, secure, base dir, timeout.
   - Funkcije: `ensureDir(remoteDir)`, `upload(buffer, remotePath)`, `exists(remotePath)`.

4) Servis za slanje faktura
   - Novi fajl `backend/src/services/xmlInvoiceDispatch.service.ts`:
     - `findEligibleOperations(date: Date)` – dohvaća fueling operacije za dan i airline name IN [WIZZ HUNGARY, WIZZ MALTA], `is_deleted = false`.
     - `buildXmlAndFilename(op)` – poziva builder i kreira ime fajla.
     - `dispatchOne(op, {force?: boolean})` – idempotentno:
       - ako postoji `XmlInvoiceDispatch` za `op.id` i `status=SENT` i nije `force`, preskoči.
       - generiši XML, izračunaj sha256, snimi lokalnu kopiju u `backend/private_uploads/xml_invoices/YYYY-MM-DD/filename.xml` (za audit, bez javne izloženosti).
       - upload na FTP u `FTP_BASE_DIR/YYYY-MM-DD/filename.xml` (kreiraj dir ako ne postoji).
       - upiši/azuriraj `XmlInvoiceDispatch` (status, attempts++, dispatchedAt, error).
     - `dispatchDay(date: Date)` – map `findEligibleOperations` -> `dispatchOne` u seriji sa kontrolom grešaka.

5) Cron posao (node-cron)
   - Novi fajl `backend/src/cron/wizzXmlInvoiceCron.ts`:
     - raspored: `55 23 * * *` (23:55 lokalno). Koristiti `process.env.TZ` (`Europe/Sarajevo`).
     - poziva `dispatchDay(todayLocal)`.
     - logira sa `logger` i piše u `SystemLog` na greške.
   - U `backend/src/cron/index.ts` dodati inicijalizaciju ovog posla.

6) API rute i kontroler
   - Base: `/api/invoices/xml` (za ADMIN, KONTROLA; koristi postojeći auth middleware).
   - Endpointi:
     - `GET /dispatches?startDate&endDate&airlineId&status` – lista iz `XmlInvoiceDispatch` + osnovni join na `FuelingOperation` (datum, avion, flight, amount).
     - `POST /dispatch/day` body/query: `date=YYYY-MM-DD` – manualni run za dan (vrati sažetak: poslano/greške/skipovi).
     - `POST /dispatch/operation/:id?force=true` – manualni dispatch za jednu operaciju.
   - Svi endpointi audit log: `Activity` sa korisnikom.

7) Dnevnik i robusnost
   - Svaki pokušaj upisa u `XmlInvoiceDispatch.attempts`, `lastError`.
   - Idempotentnost preko unique `fuelingOperationId` i provjere `status`.
   - Sanitizacija imena fajla (bez razmaka/specijalnih znakova).
   - Retry strategija za cron: dnevno pokušava ponovo sve `FAILED` iz prethodnih 3 dana (jednostavan „catch-up“).

#### Frontend
1) Sidebar i stranica
   - Dodati item u sidebar: „XML fakture“ (npr. pod Fuel).
   - Nova stranica/route: npr. `frontend/src/app/xml-invoices/page.tsx` ili komponenta unutar `fuel` sekcije.
   - Tabela sa kolonama: `Datum/Time`, `Operacija ID`, `Avio kompanija`, `Flight`, `Reg`, `Količina (kg)`, `Iznos`, `Status`, `Pokušaja`, `Zadnja greška`, `Naziv fajla`, akcije.
   - Filtri: `datum od/do`, `status`, `avio` (predefinisano na Wizz).

2) Akcije
   - Dugme „Pošalji ponovo“ (per-row) -> `POST /dispatch/operation/:id?force=true`.
   - Dugme „Pošalji sve neuspjele“ – batch poziv na listu `FAILED`.

3) UX
   - Badge boje za status (SENT/FAILED/PENDING).
   - Tooltip sa greškom.
   - Pagination/virtualization za veće liste.

---

### Cron, vrijeme i vremenska zona
- Postaviti `TZ=Europe/Sarajevo` u `.env` i exportovati pri startu node procesa.
- „Današnji dan“ računa se prema lokalnom vremenu. U upitu prema bazi koristi se lokalni raspon transformisan u UTC ako je DB u UTC.

### .env varijable (MVP)
```
# SFTP Configuration for XML Invoice Dispatch
SFTP_HOST=192.226.203.73
SFTP_PORT=7722
SFTP_USERNAME=x-FSs-HIFA
SFTP_PASSWORD=EG3#K|:Zn@?R
SFTP_PROTOCOL=sftp
SFTP_BASE_DIR=/              # root folder na serveru
SFTP_TIMEOUT_MS=30000

TZ=Europe/Sarajevo

# Opcionalno: eksplicitno filtriranje po ID-jevima avio kompanija
# Ako je postavljeno, ID-jevi imaju prioritet nad nazivima
XML_INVOICE_AIRLINE_IDS=1,2
```

### Pravila filtriranja operacija
- `FuelingOperation.is_deleted = false`.
- `Airline.name IN ('WIZZ AIR HUNGARY LTD', 'WIZZ AIR MALTA LTD')`.
- `FuelingOperation.dateTime` u opsegu dana lokalno 00:00–23:59:59.

### Imenovanje i struktura fajlova
- Naziv: `INV-${delivery_note_number || operation.id}-${YYYY}.xml`.
- Remote path: `${FTP_BASE_DIR}/${YYYY-MM-DD}/${fileName}` (kreirati folder po danu).
- Lokalna arhiva: `backend/private_uploads/xml_invoices/${YYYY-MM-DD}/${fileName}`.

### Sigurnost i dozvole
- Endpointi za dispatch: role `ADMIN`, `KONTROLA`.
- Kredencijali isključivo iz `.env` (nikad u repo).
- Lokalni XML se čuva u `private_uploads` (nije served preko `public/`).

### Dodatne napomene i rubni slučajevi
- Ako `delivery_note_number` nedostaje, koristi `operation.id`.
- Ako `airline.address` nema grad/poštu, koristi fallback iz trenutnog front mappinga.
- Ako FTP ne radi: status `FAILED`, `lastError` popunjen; vidljivo na frontend-u.
- Idempotentno ponašanje: ako zapis `XmlInvoiceDispatch` već `SENT` i nije `force`, preskočiti.

---

### Implementacijski koraci (redoslijed)
~~1) DB: kreirati `XmlInvoiceDispatch` model i migraciju.~~ ✅ Završeno (model dodat u `backend/prisma/schema.prisma` i migracija primijenjena).
~~2) Backend servisi: `xmlInvoiceBuilder.ts`, `ftpClient.ts`, `xmlInvoiceDispatch.service.ts`.~~ ✅ Završeno (builder identičan frontend formatu; bez promjena layouta/podataka).
~~3) Cron: `wizzXmlInvoiceCron.ts` i inicijalizacija u `cron/index.ts` (23:00).~~ ✅ Završeno.
~~4) API: rute i kontroler `/api/invoices/xml` sa 3 endpointa (list, dispatch day, dispatch one).~~ ✅ Završeno.
~~5) Frontend: sidebar link, stranica listinga, akcije za manualni dispatch.~~ ✅ Završeno (dodan sidebar link, stranica sa tabelom, akcije za manualni dispatch, test SFTP dugme).
~~6) .env: dodati FTP varijable i `TZ`.~~ ✅ Završeno (dodani SFTP kredencijali u .env, cron omogućen za 23:55).
7) Logika retry-a u cronu (catch-up `FAILED` posljednja 3 dana).

### Kriteriji prihvata (Acceptance)
- U 23:55 lokalno se automatski generišu XML-ovi za WIZZ operacije tog dana i uspješno se uploaduju na SFTP; zapisi u `XmlInvoiceDispatch` imaju status `SENT`.
- Frontend prikazuje listu sa tačnim statusima; manualni „Pošalji ponovo“ radi i ažurira status.
- Nema duplog slanja za istu operaciju bez `force`.
- U `.env` se nalaze svi potrebni FTP parametri; bez njih endpointi vraćaju jasnu grešku.

### Mogućnosti za kasnije
- Konsolidovane dnevne/periodične fakture (već imamo builder skicu u frontendu – može se prenijeti).
- E-mail notifikacije za `FAILED` nakon crona.
- Export/download arhive XML-ova iz backend-a.


