# Email Invoice System - Setup Guide

## Pregled

Implementiran je sistem za automatsko slanje faktura putem email-a koji je paralelno sa postojećim XML/SFTP sistemom za Wizz Air. Ovaj sistem omogućava slanje PDF faktura svim aviokompanijama koje imaju email kontakt podatke.

## Funkcionalnosti

### ✅ Backend implementacija
- **EmailService** - Servis za slanje email-ova koristeći nodemailer
- **EmailInvoiceDispatch** model - Praćenje poslanih email faktura
- **EmailInvoiceDispatch.service** - Logika za pronalaženje i slanje email faktura
- **API rute** - `/api/invoices/email/*` za upravljanje email fakturama
- **Cron job** - Automatsko slanje u 23:50 (10 min prije XML cron-a)

### ✅ Frontend implementacija
- **Email Invoices stranica** - `/dashboard/email-invoices`
- **Admin panel** - `/dashboard/email-invoices/admin` za napredne kontrole
- **Email Preview** - "👁️ Pregled" dugme za pregled template-a prije slanja
- **Admin kontrole** - Ručno slanje faktura (pojedinačno ili za cijeli dan)
- **Praćenje statusa** - Pregled poslanih, neuspješnih i pending email faktura
- **Navigacija** - Dodano u sidebar za ADMIN i KONTROLA role

### ✅ Database schema
- **EmailInvoiceDispatch** model sa statusima: PENDING, SENT, FAILED
- **EmailDispatchStatus** enum
- Relacije sa FuelingOperation i Airline modelima

## Environment varijable

Dodati u `.env` fajl backend aplikacije:

```env
# Email Configuration for Invoice Dispatch
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=fakture@hifa-petrol.com

# Timezone (existing)
TZ=Europe/Sarajevo
```

### Email provider konfiguracija

#### Gmail
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # Ne obični password, već App Password!
```

#### Microsoft 365/Outlook
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@company.com
EMAIL_PASS=your-password
```

#### Poslovni SMTP
```env
EMAIL_HOST=mail.hifa-petrol.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=fakture@hifa-petrol.com
EMAIL_PASS=your-password
```
EMAIL_HOST=mail.hifapetrol.ba
EMAIL_PORT=25
EMAIL_SECURE=false
EMAIL_USER=airport.tuzla@hifapetrol.ba
EMAIL_PASS=Test1234
EMAIL_FROM="HIFA-Petrol Invoices" <airport.tuzla@hifapetrol.ba>

## Napomene o email klijentima

### Gmail Header Problem
Gmail blokira base64 slike iz sigurnosnih razloga. Sistem koristi profesionalni gradijent header koji radi u svim email klijentima.

### Poslani Email-ovi (Sent Folder)
Većina poslovnih SMTP servera automatski čuva poslane email-ove u "Sent" folder. Ako se ne čuvaju automatski, trebaju IMAP postavke:

```bash
# Dodajte ove postavke u .env ako trebate IMAP pristup
IMAP_HOST=mail.hifapetrol.ba
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=airport.tuzla@hifapetrol.ba
IMAP_PASS=Test1234
```
## Kako funkcionira

### 1. Automatsko slanje (Cron job)
- Pokreće se svaki dan u **23:50**
- Pronalazi sve operacije za trenutni dan
- Filtrira samo aviokompanija koje imaju email u `contact_details` polju
- Generiše PDF fakturu i šalje email sa prilogom
- Kreira/ažurira `EmailInvoiceDispatch` zapise

### 2. Pronalaženje email adresa
Email adrese se izvlače iz `airline.contact_details` polja koristeći regex:
```
/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
```

**Podržava više email adresa:**
- Možete dodati više email adresa u `contact_details` polje
- Email adrese mogu biti odvojene bilo čim (zarez, razmak, tekst)
- Sistem automatski pronalazi sve validne email adrese
- Email se šalje na sve pronađene adrese odjednom

**Primjeri contact_details:**
```
invoices@airline.com, billing@airline.com
finance@airline.com; accounts@airline.com  
Tel: +123456789, Email: finance@airline.com, billing@airline.com
Contact: John Doe, invoices@airline.com, backup@airline.com
```

### 3. Email struktura
- **Subject**: `Fuel Invoice #{DELIVERY_NUMBER} - {AIRLINE_NAME} - {DATE}`
- **Body**: Profesionalni HTML template na engleskom jeziku sa company branding-om
- **Attachment**: PDF faktura generisana pomoću postojećeg PDF service-a

#### Email Template značajke:
- **Responsive design** - prilagođava se svim uređajima
- **Professional branding** - HIFA-PETROL gradijent header
- **Structured layout** - jasno organizovane sekcije
- **Service details table** - sve informacije o operaciji
- **Payment terms highlight** - istaknuti rokovi plaćanja
- **Contact information** - kompletni kontakt podaci
- **Multi-language support** - trenutno engleski, lako dodati druge

### 4. Status praćenje
- **PENDING**: Email čeka na slanje
- **SENT**: Email uspješno poslan
- **FAILED**: Greška prilikom slanja (čuva se error poruka)

## API Endpoints

### GET /api/invoices/email
Lista email dispatch zapisa
- Query params: `status`, `airlineId`, `startDate`, `endDate`, `page`, `limit`

### GET /api/invoices/email/stats  
Statistike email faktura

### POST /api/invoices/email/dispatch/operation/:operationId
Ručno slanje email fakture za operaciju
- Body: `{ force: boolean }`

### POST /api/invoices/email/dispatch/day/:date
Ručno slanje svih email faktura za dan

### POST /api/invoices/email/dispatch/range
Slanje email faktura za period
- Body: `{ startDate: string, endDate: string }`

### POST /api/invoices/email/prepare/day/:date
Priprema email dispatch zapisa za dan (bez slanja)

### GET /api/invoices/email/preview/:operationId
Preview email template-a za operaciju
- Response: `{ preview: { to, subject, body, hasValidEmail, airline, operationDate, deliveryNumber } }`

## Testiranje sistema

### 1. Dodavanje email kontakta aviokompaniji
```sql
UPDATE "Airline" 
SET contact_details = 'email@example.com, tel: +387...' 
WHERE name = 'Test Airline';
```

### 2. Test slanja email fakture
```bash
# Via API
curl -X POST "http://localhost:4000/api/invoices/email/dispatch/operation/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### 3. Provjera email konfiguracije
Email servis ima `verifyConnection()` metodu za testiranje SMTP konfiguracije.

## Održavanje i monitoring

### 1. Logovi
Cron job logira detaljne informacije o:
- Broju obrađenih operacija
- Uspješno poslanih email faktura
- Neuspješnim slanjima sa error porukama

### 2. Failed email handling
Neuspješni email-ovi se mogu:
- Pregled grešaka u `/dashboard/email-invoices`
- Ručno ponovno slanje sa "Prinudno pošalji" opcijom
- Filtri za pronalaženje FAILED statusa

### 3. Backup i arhiva
PDF fakture se čuvaju lokalno u:
```
backend/private_uploads/email_invoices/YYYY-MM-DD/filename.pdf
```

## Sigurnost

- Samo ADMIN i KONTROLA role imaju pristup email faktura stranici
- Email kredencijali se čuvaju u environment varijablama
- PDF fakture se čuvaju van public direktorija
- Rate limiting primenjeno na API endpoints

## Deployment notes

1. **Instaliraj dependencies**:
   ```bash
   cd backend && npm install nodemailer @types/nodemailer
   ```

2. **Ažuriraj bazu podataka**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Postaviti environment varijable** u production

4. **Restart aplikacije** da se aktivira cron job

## Troubleshooting

### "Email configuration is missing"
- Provjeri da li su sve EMAIL_* environment varijable postavljene
- Test konekcija: `EmailService.verifyConnection()`

### "Airline does not have valid email contact"
- Ažuriraj `contact_details` polje u Airline tabeli
- Dodaj validnu email adresu u kontakt detalje

### Email se ne šalje
- Provjeri SMTP postavke
- Za Gmail: koristi App Password umjesto običnog passworda
- Provjeri firewall/security postavke

### Cron job se ne pokreće
- Provjeri logove aplikacije
- Restart backend aplikacije
- Provjeri `TZ` environment varijablu
