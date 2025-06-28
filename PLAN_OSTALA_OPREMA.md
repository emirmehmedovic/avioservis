# Plan Implementacije - Ostala Oprema

## Pregled
Implementacija nove sekcije "Ostala oprema" kao zasebnog modula sa kompletnim CRUD funkcionalnostima, PDF izvještajima i modern glassmorphism dizajnom.

## Baza Podataka

### Novi Model: OstalaOprema
```prisma
model OstalaOprema {
  id                    Int      @id @default(autoincrement())
  naziv                 String   // Naziv opreme
  mesto_koristenja      String?  // Mjesto korištenja
  vlasnik              String?  // Vlasnik
  standard_opreme      String?  // Standard opreme
  snaga                String?  // Snaga
  protok_kapacitet     String?  // Protok/kapacitet
  sigurnosne_sklopke   String?  // Sigurnosne sklopke
  prinudno_zaustavljanje String? // Prinudno zaustavljanje
  napomena             String?  // Napomena
  dokument_url         String?  // URL uploadovanog dokumenta
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@map("OstalaOprema")
}
```

### Migracija
```sql
-- CreateTable
CREATE TABLE "OstalaOprema" (
    "id" SERIAL NOT NULL,
    "naziv" TEXT NOT NULL,
    "mesto_koristenja" TEXT,
    "vlasnik" TEXT,
    "standard_opreme" TEXT,
    "snaga" TEXT,
    "protok_kapacitet" TEXT,
    "sigurnosne_sklopke" TEXT,
    "prinudno_zaustavljanje" TEXT,
    "napomena" TEXT,
    "dokument_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OstalaOprema_pkey" PRIMARY KEY ("id")
);
```

## Backend Implementacija

### 1. Controller (`backend/src/controllers/ostalaOprema.controller.ts`)

**Funkcionalnosti:**
- `getAllOstalaOprema()` - Lista sve opreme
- `getOstalaOpremaById()` - Detalji pojedinačne opreme
- `createOstalaOprema()` - Kreiranje nove opreme
- `updateOstalaOprema()` - Ažuriranje opreme
- `deleteOstalaOprema()` - Brisanje opreme
- `generateReport()` - Individualni PDF izvještaj
- `generateFullReport()` - Ukupni PDF izvještaj

**PDF Features:**
- Identical layout kao Plan Kalibracije i Rezervoari
- NotoSans font za bosnijske karaktere
- Professional tabele sa grid temom
- HIFA-PETROL branding
- Smart pagination
- Color-coded status indicators

### 2. Routes (`backend/src/routes/ostalaOprema.routes.ts`)

```typescript
// GET /api/ostala-oprema - Lista sve opreme
// GET /api/ostala-oprema/:id - Detalji opreme
// POST /api/ostala-oprema - Kreiranje nove opreme
// PUT /api/ostala-oprema/:id - Ažuriranje opreme
// DELETE /api/ostala-oprema/:id - Brisanje opreme
// POST /api/ostala-oprema/:id/report - Individualni PDF
// POST /api/ostala-oprema/full-report - Ukupni PDF
```

### 3. Validation Schema
- Naziv je obavezan (minimum 3 karaktera)
- Ostala polja opciona sa validacijom dužine
- File upload validacija (PDF, DOC, DOCX, max 10MB)

### 4. Upload Handling
- Folder: `backend/public/uploads/ostala_oprema_dokumenti/`
- Multer middleware za file upload
- Unique filename generation
- File type i size validation

## Frontend Implementacija

### 1. Type Definitions (`frontend/src/types/ostalaOprema.ts`)

```typescript
export interface OstalaOprema {
  id: number;
  naziv: string;
  mesto_koristenja?: string | null;
  vlasnik?: string | null;
  standard_opreme?: string | null;
  snaga?: string | null;
  protok_kapacitet?: string | null;
  sigurnosne_sklopke?: string | null;
  prinudno_zaustavljanje?: string | null;
  napomena?: string | null;
  dokument_url?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateOstalaOpremaPayload = Omit<OstalaOprema, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOstalaOpremaPayload = Partial<CreateOstalaOpremaPayload>;
```

### 2. Service (`frontend/src/services/ostalaOpremaService.ts`)

**Funkcionalnosti:**
- `getAllOstalaOprema()`
- `getOstalaOpremaById()`
- `createOstalaOprema()`
- `updateOstalaOprema()`
- `deleteOstalaOprema()`
- `generateReport()`
- `generateFullReport()`
- `uploadDocument()`

### 3. Main Page (`frontend/src/app/dashboard/ostala-oprema/page.tsx`)

**Features:**
- **Modern Header** sa search funkcionalnostyu
- **Summary Cards** - ukupno opreme, po vlasnicima, sa dokumentima
- **Filter System** - po vlasnicima, standardu opreme
- **Grid Layout** sa OstalaOpremaCard komponentama
- **Motion Animations** za smooth UX
- **Add New Button** sa plus ikonom
- **Ukupni Izvještaj Button** sa FileText ikonom

### 4. Card Component (`frontend/src/components/ostala-oprema/OstalaOpremaCard.tsx`)

**Design:**
- **Glassmorphism Effect** sa gradient background i blur
- **Status Indicators** - ima dokument 📄, nema dokument ⚪
- **Expandable View** sa detaljima
- **Action Buttons** - Edit, Delete, Generate Report
- **Hover Effects** sa scale i shadow transitions
- **Responsive Layout**

**Card Layout:**
```
┌─────────────────────────────────────┐
│ 🔧 [NAZIV OPREME]            📄/⚪   │
│ 📍 Mesto: [MESTO_KORISTENJA]        │
│ 👤 Vlasnik: [VLASNIK]              │
│ ⚡ Snaga: [SNAGA]                   │
│ 💨 Protok: [PROTOK_KAPACITET]       │
│                                     │
│ [▼ Prikaži detalje]                 │
│                                     │
│ [Edit] [Delete] [📄 Izvještaj]      │
└─────────────────────────────────────┘
```

### 5. Form Component (`frontend/src/components/ostala-oprema/OstalaOpremaForm.tsx`)

**Sections:**
1. **Osnovni podaci**
   - Naziv (required)
   - Mesto korišćenja
   - Vlasnik

2. **Tehnički podaci**
   - Standard opreme
   - Snaga
   - Protok/kapacitet

3. **Sigurnost**
   - Sigurnosne sklopke
   - Prinudno zaustavljanje

4. **Dodatno**
   - Napomena (textarea)
   - Upload dokumenta

**Validation:**
- Real-time validation sa error messages
- File upload progress indicator
- Submit disabled until valid

### 6. UI Features

**Glassmorphism Theme:**
- Background: `bg-gradient-to-br from-gray-800/90 to-gray-900/90`
- Backdrop blur: `backdrop-blur-md`
- Borders: `border border-white/10`
- Hover effects: `hover:border-white/20`

**Summary Cards Colors:**
- Total oprema: `text-cyan-300/80` sa `bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a]`
- Sa dokumentima: `text-green-300/80`
- Bez dokumenata: `text-amber-300/80`

## Navigacija

### Sidebar Update (`frontend/src/components/layout/Sidebar.tsx`)
```tsx
{
  name: 'Ostala Oprema',
  href: '/dashboard/ostala-oprema',
  icon: Wrench, // nebo Tool icon
  current: pathname === '/dashboard/ostala-oprema'
}
```

## PDF Izvještaji

### Individualni PDF
**Layout:** (identičan Plan Kalibracije i Rezervoari)
- Header sa HIFA-PETROL logo
- Naziv opreme highlighted
- Basic data tabela (2 kolone: Opis/Vrijednost)
- Tehnički podaci tabela
- Sigurnosne sklopke sekcija
- Napomena sekcija (ako postoji)
- Footer sa page numbering

### Ukupni PDF
- Svi individualni izvještaji spojeni
- Separator linija između opreme
- Jedinstvena paginacija
- Isti font i styling

## File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── ostalaOprema.controller.ts
│   └── routes/
│       └── ostalaOprema.routes.ts
├── public/uploads/
│   └── ostala_oprema_dokumenti/
└── prisma/
    └── migrations/
        └── [timestamp]_add_ostala_oprema_table/

frontend/
├── src/
│   ├── app/dashboard/
│   │   └── ostala-oprema/
│   │       └── page.tsx
│   ├── components/
│   │   └── ostala-oprema/
│   │       ├── OstalaOpremaCard.tsx
│   │       └── OstalaOpremaForm.tsx
│   ├── services/
│   │   └── ostalaOpremaService.ts
│   └── types/
│       └── ostalaOprema.ts
```

## Implementation Steps

### Korak 1: Database Setup
1. Kreiranje Prisma migracije
2. Ažuriranje schema.prisma
3. Pokretanje migracije

### Korak 2: Backend Implementation
1. Controller sa CRUD operacijama
2. Routes setup
3. PDF generation funkcije
4. File upload middleware

### Korak 3: Frontend Types & Services
1. TypeScript tipovi
2. API service funkcije
3. Error handling

### Korak 4: UI Components
1. Main page sa filters i search
2. Card component sa glassmorphism
3. Form component sa validation
4. Modal handling

### Korak 5: PDF Integration
1. Individual report generation
2. Full report functionality
3. Font configuration
4. Styling consistency

### Korak 6: Navigation & Testing
1. Sidebar integration
2. Routing setup
3. End-to-end testing
4. Error handling

## Estimated Timeline
- **Korak 1-2:** 2-3 sata (Backend)
- **Korak 3-4:** 3-4 sata (Frontend)
- **Korak 5:** 2 sata (PDF)
- **Korak 6:** 1 sat (Integration)

**Ukupno:** ~8-10 sati za kompletnu implementaciju

## Success Criteria
- ✅ CRUD operacije rade ispravno
- ✅ PDF generation (individual + full) funkcioniše
- ✅ File upload radi
- ✅ Modern glassmorphism UI
- ✅ Responsive design
- ✅ Consistent sa ostalim sekcijama
- ✅ Error handling implementiran 