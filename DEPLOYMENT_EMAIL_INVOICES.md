# Email Invoice System Deployment Instructions

## Pregled promjena

Implementiran je potpuno novi sistem za slanje faktura putem email-a sa sledećim karakteristikama:
- Automatsko slanje email faktura sa PDF-om i delivery voucher-ima
- Payment status tracking (PENDING, PAID, OVERDUE, EXPIRED)
- Admin panel za upravljanje email fakturama
- XML sistem sada šalje samo XML fajlove (PDF se šalje mailom)

## Potrebne promjene na VM-u

### 1. Database Migration

**KRITIČNO**: Treba pokrenuti Prisma migracije jer su dodane nove tabele:

```bash
# Na VM-u, u backend direktoriju:
cd /path/to/your/backend
npm run prisma:migrate:deploy
```

**Nove tabele koje će biti kreirane:**
- `EmailInvoiceDispatch` - za praćenje poslanih email faktura
- Dodani novi enumi: `EmailDispatchStatus`, `PaymentStatus`
- Dodane relacije sa postojećim tabelama

### 2. Environment Variables

Dodaj sledeće environment varijable u `.env` fajl:

```bash
# Email Configuration (SMTP)
EMAIL_HOST=mail.hifapetrol.ba
EMAIL_PORT=25
EMAIL_SECURE=false
EMAIL_USER=airport.tuzla@hifapetrol.ba
EMAIL_PASS=Test1234

# Email From Display Name
EMAIL_FROM="HIFA-Petrol Invoices" <airport.tuzla@hifapetrol.ba>

# IMAP Configuration (za čuvanje poslanih mailova - OPCIONO)
IMAP_HOST=mail.hifapetrol.ba
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=airport.tuzla@hifapetrol.ba
IMAP_PASS=Test1234
```

**Napomena**: IMAP konfiguracija je opcionalna. Ako nisu podešene IMAP varijable, sistem će raditi normalno ali neće čuvati poslane mailove u "Sent" folder.

### 3. Deployment koraci

```bash
# 1. Pull latest changes
cd /path/to/your/project
git pull origin main

# 2. Install dependencies (ako ima novih)
cd backend
npm install
cd ../frontend  
npm install

# 3. Build projekat
cd ../backend
npm run build
cd ../frontend
npm run build

# 4. Pokreni Prisma migracije (KRITIČNO!)
cd ../backend
npm run prisma:migrate:deploy

# 5. Restart servise
sudo systemctl restart avioservis-backend
sudo systemctl restart avioservis-frontend
# ili kako god restartaš servise na tvom VM-u
```

### 4. Dodatni dependencies

Sistem koristi nova npm packages-a koje treba instalirati:

**Backend:**
- `pdf-lib` - za spajanje PDF-ova
- `nodemailer` - za slanje email-ova
- `node-imap` - za IMAP funkcionalnost
- `node-cron` - za scheduled jobs

**Frontend:**
- Koriste se postojeći packages

Ovi packages-i su već dodani u `package.json` tako da će `npm install` ih automatski instalirati.

### 5. Cron Jobs

Sistem automatski kreira sledeće cron jobs-ove:

1. **Email invoice dispatch**: 23:50 svaki dan (šalje fakture za današnji dan)
2. **Payment status checker**: 06:30 svaki dan (update-uje payment status-e)

Cron jobs-ovi se automatski pokreću kada se aplikacija startuje.

### 6. Testiranje

Nakon deployment-a testiraj:

1. **Email slanje**:
   ```bash
   # Test email slanja na frontend-u
   # Dashboard > Email fakture > Manual dispatch
   ```

2. **Database migracije**:
   ```bash
   # Provjeri da li su tabele kreirane
   psql -d your_database -c "\dt" | grep -i email
   ```

3. **Environment varijable**:
   ```bash
   # Provjeri da li su učitane
   echo $EMAIL_HOST
   echo $EMAIL_USER
   ```

### 7. Troubleshooting

**Problem**: Tabela `EmailInvoiceDispatch` ne postoji
**Rešenje**: Pokreni `npm run prisma:migrate:deploy`

**Problem**: Email se ne šalje
**Rešenje**: Provjeri SMTP konfiguraciju u `.env` fajlu

**Problem**: "Module not found" greške
**Rešenje**: Pokreni `npm install` u backend direktoriju

**Problem**: Frontend build greške
**Rešenje**: Pokreni `npm install` u frontend direktoriju

### 8. Monitoring

Monitor log fajlove za:
- Email dispatch errors
- SMTP connection issues  
- Database migration status
- Cron job execution

### 9. Email konfiguracija sa IT administratorom

Ako imaš problema sa email slanjem, možda je potrebno da IT administrator:
- Otvori port 25 za SMTP
- Konfigurira IMAP port 993 (ako koristiš IMAP)
- Omogući SMTP auth za `airport.tuzla@hifapetrol.ba`

### 10. Backup preporuke

Pre deployment-a napravi backup:
- Database backup
- Current codebase backup
- Environment configuration backup

## Kontakt za podršku

Ako imaš probleme tokom deployment-a, provjeri:
1. Database connection
2. SMTP credentials
3. Log fajlove za specifične greške
4. Network konfiguraciju (firewall, ports)

---

**Datum**: 01.09.2025  
**Verzija**: 1.0  
**Autor**: Email Invoice Implementation
