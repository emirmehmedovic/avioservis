preporuke:

# Sigurnosne i tehničke preporuke

_Ostatak dokumenta je napisan 2025-06-04. Preporuke su poredane po hitnosti/važnosti kako biste ih mogli rješavati hronološki._

## 1. Kritični prioritet (riješiti odmah)

1. **Centralna validacija i sanitizacija ulaza**  
   Trenutno se validacija parametara radi selektivno po kontrolerima (npr. `validators/`), a dio ruta prolazi bez provjere. Uvesti globalni middleware (npr. `celebrate`/`joi` ili `zod`) koji obuhvaća _sve_ rute i sprečava: SQL injekcije (iako se koristi Prisma), NoSQL injekcije i XSS kroz string polja.

2. **Zaštita upload direktorija**  
   Datoteke se trenutno spremaju direktno u `public/uploads`, što izlaže _sve_ fajlove anonimnim korisnicima i otvara mogućnost _path-traversal_ napada.  
   • Premjestiti upload folder izvan `public`.  
   • Servirati fajlove kroz autorizirani kontroler koji provjerava JWT/rola korisnika.  
   • Validirati MIME tip, ekstenziju i veličinu; odbaciti sve osim PDF/JPG/PNG < ~~10 MB.

3. **Sigurni kolačići za autentifikaciju**  
   Ako se JWT čuva u `localStorage` (nisam vidio cjelokodnu implementaciju, ali to je česta praksa), prebaciti ga u _HttpOnly Secure SameSite=strict_ kolačić da bi se smanjio XSS rizik.

4. **Rate-limiting i blokada IP-a**  
   Dodati globalni rate-limiter (npr. `express-rate-limit`) + _slow-down_ strategiju na `/auth/login` i sve _write_ rute kako bi se spriječio brute-force.  
   Napomena: migracija _login attempt tracking_ već postoji u bazi – povezati je s ovim mehanizmom.

5. **Helmet + CSP**  
   U `backend/src/app.ts` dodati `helmet()` i striktni Content-Security-Policy koji ograničava `script-src` na vlastiti origin i dopušta PDF prikaz.

6. **Revidirati CORS postavke**  
   Eksplicitno navesti dozvoljene origin-e (npr. prod i staging domena) umjesto `*`, te uključiti `credentials: true` samo gdje je nužno.

7. **Povlačenje tajnih ključeva iz env-a**  
   Provjeriti `backend/src/config` i `.env*` fajlove; svi privatni ključevi, URL-ovi i lozinke moraju ići u _environment variables_, a nikako u repo.

---

## 2. Visok prioritet (u narednih 1-2 sedmice)

8. **OpenAPI/Swagger dokumentacija + codegen**  
   Česti _snake_case ↔ camelCase_ bugovi i nedosljedni nazivi polja uzrokovali su mnogo fix commit-a (vidi memorije). Generišite shemu i automatski klijent za frontend kako bi tipovi uvijek bili usklađeni.

9. **Jedinstveno upravljanje transakcijama goriva**  
   Trenutno više mjesta ručno prevodi `transaction_type` u bočne efekte (badge boja, note stringovi…). Ekstraktovati mapiranje u zajednički util/factory i koristiti ga u frontendu & backendu radi smanjenja ljudskih grešaka.

10. **Integracioni i e2e testovi**  
    Osim unit-testova (koji nedostaju), potrebno je napisati _happy-path_ i _edge-case_ scenarije za kritične rute (`/fuel/intake-records`, transferi, drain, auth).

11. **Automatizirani sigurnosni sken**  
    U CI pipeline ubaciti `npm audit --production`, `pnpm audit`, ili Snyk/Dependabot za praćenje CVE-a u zavisnostima (Express 4, Prisma, Tailwind, pdf biblioteke…).

12. **Pregled dozvola S3/Vercel/Render servisa**  
    Ako se koristi `public` folder na CDN-u, ograničiti bucket policy samo na _read-only_ i servisne account-e; upload kroz backend treba koristiti _pre-signed URL-ove_.

---

## 3. Srednji prioritet (u narednih mjesec dana)

13. **Standardizacija naziva polja**  
    Konsolidovati `snake_case` (DB) i `camelCase` (TS) mapiranja kroz Prisma `@map` i Zod schemu; izbjegavati manuelne rename-ove po komponentama.

14. **Refaktoriranje masivnih React komponenti**  
    Komponente `FuelIntakeRecordDetailsModal`, `FixedTanksReport` i slično imaju >400 linija; podijeliti na manje _presentational_ i _container_ dijelove radi održavanja i testova.

15. **Lazy-loading PDF biblioteka**  
    `jspdf` i `jspdf-autotable` ~300 KB – dinamički ih importovati (`next/dynamic`, React.lazy) da se smanji _bundle size_ dashboarda.

16. **Poboljšati logiranje**  
    • Koristiti `pino`/`winston` umjesto `console.log`.  
    • Maskirati osjetljive podatke (JWT, lozinke).  
    • Postaviti _log rotation_.

17. **Baza – indexi & FK restrictions**  
    Provjeriti da li su na poljima `tankId`, `aircraftId`, `dateTime` kreirani indexi; dodati `onDelete: RESTRICT/SET NULL` gdje ima smisla.

---

## 4. Niži prioritet (dugoročno)

18. **Monitoring i alerting**  
    Postaviti Prometheus/Grafana ili APM (Datadog/NewRelic) za praćenje performansi API-ja i grešaka.

19. **Cijeli-teksta pretraga**  
    Razmotriti Elasticsearch ili Postgres `tsvector` za globalnu pretragu tabela (pogotovo operacije točenja).

20. **Automatsko arhiviranje starih dokumenata**  
    Pravilo koje nakon npr. 3 godine premješta PDF-ove i slike u cold storage.

21. **SAML/SSO integracija**  
    Za buduću ekspanziju – integrisati Azure AD/Okta umjesto internog auth-a.

---

## Napomena

Većina preporuka spada u dobre DevSecOps prakse. Iako je aplikacija interna, javna dostupnost na internetu podrazumijeva **0-trust** pristup. Rješavanje prvih 7-8 tačaka značajno će smanjiti napadnu površinu.
