# Plan za implementaciju sigurnosnih preporuka

Ovaj dokument razlaže kritične sigurnosne preporuke iz `preporuke.md` u konkretne, tehničke zadatke. Zadaci su poredani po prioritetu kako bi se osiguralo da se najvažniji problemi riješe prvi.

## 1. Centralizacija validacije ulaza sa Zod

**Cilj:** Zamijeniti `express-validator` sa `zod`-om kako bi se osigurala snažna, shema-bazirana validacija na svim rutama.

- [x] **Zadatak 1.1: Postavljanje osnovne strukture**
  - [x] U `backend/` direktoriju, kreirati novi folder: `src/schemas`.
  - [x] Kreirati novi middleware `src/middleware/validateRequest.ts` koji prima Zod shemu, validira `req.body`, `req.params`, i `req.query`, te vraća grešku 400 ako validacija ne uspije.

- [x] **Zadatak 1.2: Migracija prve rute (Login)**
  - [ ] U `src/schemas/`, kreirati fajl `auth.schema.ts`.
  - [ ] U njemu, definirati Zod shemu za login koja očekuje `username` (string) i `password` (string).
  - [ ] U `src/routes/auth.ts`, importovati novu shemu i `validateRequest` middleware.
  - [ ] Zamijeniti postojeći `express-validator` middleware na `/login` ruti sa novim Zod validatorom.

- [x] **Zadatak 1.3: Postepena migracija ostalih ruta**
  - [ ] Kreirati Zod sheme za `users`, `vehicles`, `fuel`, i druge kritične rute.
  - [ ] Sistematski zamijeniti `express-validator` na svim rutama.

## 2. Zaštita Upload Direktorija

**Cilj:** Premjestiti sve upload-ovane fajlove izvan javno dostupnog `public` direktorija i servirati ih isključivo kroz autorizirani endpoint.

- [x] **Zadatak 2.1: Kreiranje sigurnog direktorija za upload**
  - [ ] U korijenu projekta, kreirati novi direktorij `private_uploads`.
  - [ ] Unutar njega, kreirati poddirektorije po tipu fajla (`vehicle_images`, `fuel_documents`, itd.).

- [x] **Zadatak 2.2: Ažuriranje Multer konfiguracija**
  - [ ] Pronaći sve `multer` instance (npr. u `src/middleware/fuelingDocumentUpload.ts`, `src/routes/vehicle.ts`).
  - [ ] Izmijeniti `destination` opciju u svakoj `multer` konfiguraciji tako da upućuje na odgovarajući poddirektorij unutar `private_uploads` umjesto `public/uploads`.

- [ ] **Zadatak 2.3: Kreiranje autoriziranog endpointa za serviranje fajlova**
  - [ ] Kreirati novi fajl `src/routes/documents.ts`.
  - [ ] U njemu, definirati rutu poput `GET /:folder/:fileName`.
  - [ ] U kontroleru za ovu rutu:
    - [ ] Provjeriti da li je korisnik autentificiran (koristeći postojeći `auth` middleware).
    - [ ] Implementirati logiku za provjeru da li korisnik (na osnovu svoje uloge i ID-a) ima pravo pristupa traženom fajlu.
    - [ ] Ako je autoriziran, sigurno servirati fajl koristeći `res.sendFile()` sa punom putanjom do fajla u `private_uploads`.
    - [x] Zaštititi od _path traversal_ napada (npr. provjerom da li `fileName` sadrži `..`).

- [x] **Zadatak 2.4: Ažuriranje frontenda**
  - [x] **Identifikacija komponenti:** Pregledati frontend kod i identifikovati sve komponente koje prikazuju linkove ka upload-ovanim fajlovima (slike vozila, dokumenti servisa, dokumenti o gorivu, itd.).
  - [x] **Kreiranje servisne funkcije:** Napraviti centraliziranu funkciju (npr. `getDocumentUrl(folder, fileName)`) koja generiše ispravan URL ka novom `/api/documents` endpointu.
  - [x] **Ažuriranje komponenti:** U svim identifikovanim komponentama, zamijeniti direktne `href` linkove sa pozivima na novu servisnu funkciju.
  - [x] **Testiranje:** Nakon izmjena, temeljno testirati sve dijelove aplikacije koji rade sa fajlovima kako bi se osiguralo da se slike i dokumenti ispravno prikazuju i preuzimaju.

## 3. Implementacija sigurnih HttpOnly kolačića

**Cilj:** Premjestiti JWT iz `localStorage` u `HttpOnly` kolačiće kako bi se spriječio XSS napad.

- [ ] **Zadatak 3.1: Ažuriranje Login kontrolera**
  - [ ] U `src/controllers/auth.controller.ts`, unutar `login` funkcije, umjesto vraćanja tokena u JSON odgovoru, postaviti ga u kolačić:
    ```javascript
    res.cookie('token', token, {
      httpOnly: true, // Sprečava pristup putem JavaScripta
      secure: process.env.NODE_ENV === 'production', // Koristiti samo na HTTPS-u u produkciji
      sameSite: 'strict', // Pomaže u zaštiti od CSRF napada
      maxAge: 24 * 60 * 60 * 1000 // 1 dan
    });
    ```
  - [ ] Ukloniti token iz JSON odgovora koji se šalje klijentu.

- [ ] **Zadatak 3.2: Ažuriranje `auth` middleware-a**
  - [ ] U `src/middleware/auth.ts`, izmijeniti logiku tako da čita token iz `req.cookies.token` umjesto iz `Authorization` zaglavlja.
  - [ ] Potrebno je instalirati `cookie-parser`: `npm install cookie-parser @types/cookie-parser` i dodati `app.use(cookieParser());` u `app.ts`.

- [ ] **Zadatak 3.3: Ažuriranje frontenda**
  - [ ] Ukloniti svu logiku na frontendu koja sprema, čita ili šalje JWT iz/u `localStorage`.
  - [ ] API klijent (npr. Axios) će automatski slati kolačić sa svakim zahtjevom.

- [ ] **Zadatak 3.4: Implementacija Logout-a**
  - [ ] Kreirati `logout` funkciju u `auth.controller.ts` koja briše kolačić:
    ```javascript
    res.clearCookie('token').send({ message: 'Logged out successfully' });
    ```

## 4. Implementacija Helmet-a i CSP-a

**Cilj:** Dodati osnovne sigurnosne headere i striktnu Content-Security-Policy.

- [ ] **Zadatak 4.1: Instalacija i osnovna konfiguracija**
  - [ ] U `backend/` direktoriju, pokrenuti: `npm install helmet`.
  - [ ] U `src/app.ts`, dodati `app.use(helmet());` odmah nakon inicijalizacije `app` varijable.

- [ ] **Zadatak 4.2: Konfiguracija Content-Security-Policy (CSP)**
  - [ ] U `src/app.ts`, konfigurirati CSP da dozvoljava samo skripte sa vlastite domene:
    ```javascript
    app.use(
      helmet.contentSecurityPolicy({
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Dodati ostale direktive po potrebi (npr. za stilove, slike, fontove)
        },
      })
    );
    ```

## 5. Revizija CORS postavki

**Cilj:** Ograničiti CORS na eksplicitno dozvoljene domene.

- [ ] **Zadatak 5.1: Korištenje Environment varijabli**
  - [ ] U `.env` fajlu, definirati varijablu `FRONTEND_URL` (npr. `http://localhost:3000` za razvoj, `https://your-app.com` za produkciju).
  - [ ] U `src/app.ts`, ažurirati CORS konfiguraciju:
    ```javascript
    app.use(cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
      // ... ostale opcije
    }));
    ```

## 6. Rate Limiting

- [x] **Završeno:** Rate limiting je već implementiran i primijenjen na odgovarajuće rute.
