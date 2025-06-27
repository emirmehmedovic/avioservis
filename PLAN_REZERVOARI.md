# Plan Realizacije - Sekcija "Rezervoari"

## 📋 Pregled Zahtjeva

Dodavanje potpuno nove sekcije "Rezervoari" u AvioServis aplikaciju koja će omogućiti upravljanje rezervoarima nezavno od postojećeg sistema upravljanja gorivom.

### Ključne Funkcionalnosti
- ✅ Dodavanje novog page-a u sidebar ispod "Vozila"
- ✅ Forma za kreiranje novog rezervoara
- ✅ Pregled i editovanje postojećih rezervoara
- ✅ Upload dokumentacije za rezervoar
- ✅ Generiranje PDF izvještaja
- ✅ Potpuna nezavisnost od postojećih modela u bazi

## 🗃️ Struktura Podataka

### Polja Rezervoara
```typescript
interface Rezervoar {
  id: number;
  naziv_rezervoara: string;
  mjesto_koristenja: string;
  id_broj: string; // Jedinstveni identifikator
  vlasnik: string;
  oblik_rezervoara: string; // npr. cilindrični, kockast, itd.
  kapacitet: number; // u litrima
  materijal_izgradnje: string;
  zastita_unutrasnjeg_rezervoara: string;
  datum_kalibracije: Date;
  dimenzije_l: number; // dužina u metrima
  dimenzije_w: number; // širina u metrima  
  dimenzije_h: number; // visina u metrima
  napomene?: string;
  dokument_url?: string; // putanja do uploaded fajla
  kreiran: Date;
  azuriran: Date;
}
```

## 🚀 Plan Implementacije

### Faza 1: Backend Implementacija

#### 1.1 Prisma Schema Update
**Fajl**: `backend/prisma/schema.prisma`

```prisma
model Rezervoar {
  id                               Int      @id @default(autoincrement())
  naziv_rezervoara                 String
  mjesto_koristenja                String
  id_broj                          String   @unique
  vlasnik                          String
  oblik_rezervoara                 String
  kapacitet                        Decimal  @db.Decimal(12, 3)
  materijal_izgradnje              String
  zastita_unutrasnjeg_rezervoara   String
  datum_kalibracije                DateTime
  dimenzije_l                      Decimal  @db.Decimal(8, 3)
  dimenzije_w                      Decimal  @db.Decimal(8, 3)
  dimenzije_h                      Decimal  @db.Decimal(8, 3)
  napomene                         String?
  dokument_url                     String?
  kreiran                          DateTime @default(now())
  azuriran                         DateTime @updatedAt

  @@map("rezervoari")
}
```

#### 1.2 Database Migration
**Fajl**: `backend/prisma/migrations/[timestamp]_add_rezervoari_table/migration.sql`

```sql
CREATE TABLE "rezervoari" (
    "id" SERIAL NOT NULL,
    "naziv_rezervoara" TEXT NOT NULL,
    "mjesto_koristenja" TEXT NOT NULL,
    "id_broj" TEXT NOT NULL,
    "vlasnik" TEXT NOT NULL,
    "oblik_rezervoara" TEXT NOT NULL,
    "kapacitet" DECIMAL(12,3) NOT NULL,
    "materijal_izgradnje" TEXT NOT NULL,
    "zastita_unutrasnjeg_rezervoara" TEXT NOT NULL,
    "datum_kalibracije" TIMESTAMP(3) NOT NULL,
    "dimenzije_l" DECIMAL(8,3) NOT NULL,
    "dimenzije_w" DECIMAL(8,3) NOT NULL,
    "dimenzije_h" DECIMAL(8,3) NOT NULL,
    "napomene" TEXT,
    "dokument_url" TEXT,
    "kreiran" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "azuriran" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rezervoari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rezervoari_id_broj_key" ON "rezervoari"("id_broj");
```

#### 1.3 Backend Controller
**Fajl**: `backend/src/controllers/rezervoar.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as z from 'zod';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from './activity.controller';

const prisma = new PrismaClient();

// Validation schema
const rezervoarSchema = z.object({
  naziv_rezervoara: z.string().min(1, 'Naziv rezervoara je obavezan'),
  mjesto_koristenja: z.string().min(1, 'Mjesto korištenja je obavezno'),
  id_broj: z.string().min(1, 'ID broj je obavezan'),
  vlasnik: z.string().min(1, 'Vlasnik je obavezan'),
  oblik_rezervoara: z.string().min(1, 'Oblik rezervoara je obavezan'),
  kapacitet: z.number().positive('Kapacitet mora biti pozitivan broj'),
  materijal_izgradnje: z.string().min(1, 'Materijal izgradnje je obavezan'),
  zastita_unutrasnjeg_rezervoara: z.string().min(1, 'Zaštita je obavezna'),
  datum_kalibracije: z.string().or(z.date()),
  dimenzije_l: z.number().positive('Dužina mora biti pozitivna'),
  dimenzije_w: z.number().positive('Širina mora biti pozitivna'),
  dimenzije_h: z.number().positive('Visina mora biti pozitivna'),
  napomene: z.string().optional(),
});

// CRUD Operations
export const getAllRezervoari = async (req: Request, res: Response): Promise<void> => {
  // Implementation
};

export const getRezervoarById = async (req: Request, res: Response): Promise<void> => {
  // Implementation
};

export const createRezervoar = async (req: AuthRequest, res: Response): Promise<void> => {
  // Implementation with file upload
};

export const updateRezervoar = async (req: AuthRequest, res: Response): Promise<void> => {
  // Implementation
};

export const deleteRezervoar = async (req: AuthRequest, res: Response): Promise<void> => {
  // Implementation
};

export const generateRezervoarPDF = async (req: Request, res: Response): Promise<void> => {
  // PDF generation implementation
};
```

#### 1.4 Routes
**Fajl**: `backend/src/routes/rezervoar.routes.ts`

```typescript
import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth';
import {
  getAllRezervoari,
  getRezervoarById,
  createRezervoar,
  updateRezervoar,
  deleteRezervoar,
  generateRezervoarPDF
} from '../controllers/rezervoar.controller';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/rezervoari_dokumenti/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'rezervoar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', getAllRezervoari);
router.get('/:id', getRezervoarById);
router.post('/', auth, upload.single('dokument'), createRezervoar);
router.put('/:id', auth, upload.single('dokument'), updateRezervoar);
router.delete('/:id', auth, deleteRezervoar);
router.get('/:id/pdf', generateRezervoarPDF);

export default router;
```

#### 1.5 App.ts Update
**Fajl**: `backend/src/app.ts`

```typescript
import rezervoarRoutes from './routes/rezervoar.routes';

// Dodati u postojeće rute
app.use('/api/rezervoari', rezervoarRoutes);
```

### Faza 2: Frontend Implementacija

#### 2.1 Types Definition
**Fajl**: `frontend/src/types/rezervoar.ts`

```typescript
export interface Rezervoar {
  id: number;
  naziv_rezervoara: string;
  mjesto_koristenja: string;
  id_broj: string;
  vlasnik: string;
  oblik_rezervoara: string;
  kapacitet: number;
  materijal_izgradnje: string;
  zastita_unutrasnjeg_rezervoara: string;
  datum_kalibracije: string;
  dimenzije_l: number;
  dimenzije_w: number;
  dimenzije_h: number;
  napomene?: string;
  dokument_url?: string;
  kreiran: string;
  azuriran: string;
}

export interface CreateRezervoarRequest {
  naziv_rezervoara: string;
  mjesto_koristenja: string;
  id_broj: string;
  vlasnik: string;
  oblik_rezervoara: string;
  kapacitet: number;
  materijal_izgradnje: string;
  zastita_unutrasnjeg_rezervoara: string;
  datum_kalibracije: string;
  dimenzije_l: number;
  dimenzije_w: number;
  dimenzije_h: number;
  napomene?: string;
  dokument?: File;
}
```

#### 2.2 API Service
**Fajl**: `frontend/src/services/rezervoarService.ts`

```typescript
import { Rezervoar, CreateRezervoarRequest } from '@/types/rezervoar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const rezervoarService = {
  async getAll(): Promise<Rezervoar[]> {
    // Implementation
  },

  async getById(id: number): Promise<Rezervoar> {
    // Implementation
  },

  async create(data: CreateRezervoarRequest): Promise<Rezervoar> {
    // Implementation with FormData for file upload
  },

  async update(id: number, data: Partial<CreateRezervoarRequest>): Promise<Rezervoar> {
    // Implementation
  },

  async delete(id: number): Promise<void> {
    // Implementation
  },

  async generatePDF(id: number): Promise<Blob> {
    // Implementation
  }
};
```

#### 2.3 Main Page
**Fajl**: `frontend/src/app/dashboard/rezervoari/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Eye, Edit, Trash, Download } from 'lucide-react';
import { RezervoarForm } from '@/components/rezervoari/RezervoarForm';
import { RezervoarCard } from '@/components/rezervoari/RezervoarCard';
import { Rezervoar } from '@/types/rezervoar';
import { rezervoarService } from '@/services/rezervoarService';

export default function RezervoariPage() {
  const [rezervoari, setRezervoari] = useState<Rezervoar[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRezervoar, setSelectedRezervoar] = useState<Rezervoar | null>(null);
  const [loading, setLoading] = useState(true);

  // Implementation
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rezervoari</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novi Rezervoar
        </Button>
      </div>

      {/* Lista rezervoara */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rezervoari.map((rezervoar) => (
          <RezervoarCard
            key={rezervoar.id}
            rezervoar={rezervoar}
            onEdit={setSelectedRezervoar}
            onDelete={handleDelete}
            onGeneratePDF={handleGeneratePDF}
          />
        ))}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <RezervoarForm
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
```

#### 2.4 Form Component
**Fajl**: `frontend/src/components/rezervoari/RezervoarForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateRezervoarRequest } from '@/types/rezervoar';

const formSchema = z.object({
  naziv_rezervoara: z.string().min(1, 'Naziv je obavezan'),
  mjesto_koristenja: z.string().min(1, 'Mjesto korištenja je obavezno'),
  id_broj: z.string().min(1, 'ID broj je obavezan'),
  vlasnik: z.string().min(1, 'Vlasnik je obavezan'),
  oblik_rezervoara: z.string().min(1, 'Oblik je obavezan'),
  kapacitet: z.number().positive('Kapacitet mora biti pozitivan'),
  materijal_izgradnje: z.string().min(1, 'Materijal je obavezan'),
  zastita_unutrasnjeg_rezervoara: z.string().min(1, 'Zaštita je obavezna'),
  datum_kalibracije: z.string().min(1, 'Datum kalibracije je obavezan'),
  dimenzije_l: z.number().positive('Dužina mora biti pozitivna'),
  dimenzije_w: z.number().positive('Širina mora biti pozitivna'),
  dimenzije_h: z.number().positive('Visina mora biti pozitivna'),
  napomene: z.string().optional(),
});

interface RezervoarFormProps {
  onClose: () => void;
  onSubmit: (data: CreateRezervoarRequest) => void;
  initialData?: Partial<CreateRezervoarRequest>;
}

export function RezervoarForm({ onClose, onSubmit, initialData }: RezervoarFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const form = useForm<CreateRezervoarRequest>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {},
  });

  const handleSubmit = (data: CreateRezervoarRequest) => {
    if (selectedFile) {
      data.dokument = selectedFile;
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {initialData ? 'Uredi Rezervoar' : 'Novi Rezervoar'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Osnovni podaci */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="naziv_rezervoara">Naziv Rezervoara *</Label>
                <Input {...form.register('naziv_rezervoara')} />
                {form.formState.errors.naziv_rezervoara && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.naziv_rezervoara.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="mjesto_koristenja">Mjesto Korištenja *</Label>
                <Input {...form.register('mjesto_koristenja')} />
              </div>

              <div>
                <Label htmlFor="id_broj">ID Broj *</Label>
                <Input {...form.register('id_broj')} />
              </div>

              <div>
                <Label htmlFor="vlasnik">Vlasnik *</Label>
                <Input {...form.register('vlasnik')} />
              </div>

              <div>
                <Label htmlFor="oblik_rezervoara">Oblik Rezervoara *</Label>
                <select {...form.register('oblik_rezervoara')} className="w-full p-2 border rounded">
                  <option value="">Odaberite oblik</option>
                  <option value="cilindrični">Cilindrični</option>
                  <option value="kockast">Kockast</option>
                  <option value="sferični">Sferični</option>
                  <option value="eliptični">Eliptični</option>
                </select>
              </div>

              <div>
                <Label htmlFor="kapacitet">Kapacitet (L) *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  {...form.register('kapacitet', { valueAsNumber: true })} 
                />
              </div>

              <div>
                <Label htmlFor="materijal_izgradnje">Materijal Izgradnje *</Label>
                <Input {...form.register('materijal_izgradnje')} />
              </div>

              <div>
                <Label htmlFor="zastita_unutrasnjeg_rezervoara">Zaštita Unutrašnjeg Rezervoara *</Label>
                <Input {...form.register('zastita_unutrasnjeg_rezervoara')} />
              </div>

              <div>
                <Label htmlFor="datum_kalibracije">Datum Kalibracije *</Label>
                <Input 
                  type="date" 
                  {...form.register('datum_kalibracije')} 
                />
              </div>
            </div>

            {/* Dimenzije */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dimenzije_l">Dužina (m) *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  {...form.register('dimenzije_l', { valueAsNumber: true })} 
                />
              </div>

              <div>
                <Label htmlFor="dimenzije_w">Širina (m) *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  {...form.register('dimenzije_w', { valueAsNumber: true })} 
                />
              </div>

              <div>
                <Label htmlFor="dimenzije_h">Visina (m) *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  {...form.register('dimenzije_h', { valueAsNumber: true })} 
                />
              </div>
            </div>

            {/* Upload dokumenta */}
            <div>
              <Label htmlFor="dokument">Dokument</Label>
              <Input 
                type="file" 
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Napomene */}
            <div>
              <Label htmlFor="napomene">Napomene</Label>
              <Textarea {...form.register('napomene')} rows={3} />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Otkaži
              </Button>
              <Button type="submit">
                {initialData ? 'Ažuriraj' : 'Kreiraj'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 2.5 Card Component
**Fajl**: `frontend/src/components/rezervoari/RezervoarCard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash, Download, FileText } from 'lucide-react';
import { Rezervoar } from '@/types/rezervoar';

interface RezervoarCardProps {
  rezervoar: Rezervoar;
  onEdit: (rezervoar: Rezervoar) => void;
  onDelete: (id: number) => void;
  onGeneratePDF: (id: number) => void;
}

export function RezervoarCard({ rezervoar, onEdit, onDelete, onGeneratePDF }: RezervoarCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bs-BA');
  };

  const calculateVolume = () => {
    return rezervoar.dimenzije_l * rezervoar.dimenzije_w * rezervoar.dimenzije_h;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{rezervoar.naziv_rezervoara}</span>
          <span className="text-sm font-normal text-gray-500">
            #{rezervoar.id_broj}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Mjesto:</span>
            <p className="text-gray-600 truncate">{rezervoar.mjesto_koristenja}</p>
          </div>
          
          <div>
            <span className="font-medium">Vlasnik:</span>
            <p className="text-gray-600 truncate">{rezervoar.vlasnik}</p>
          </div>
          
          <div>
            <span className="font-medium">Oblik:</span>
            <p className="text-gray-600">{rezervoar.oblik_rezervoara}</p>
          </div>
          
          <div>
            <span className="font-medium">Kapacitet:</span>
            <p className="text-gray-600">{rezervoar.kapacitet.toLocaleString()} L</p>
          </div>
          
          <div>
            <span className="font-medium">Materijal:</span>
            <p className="text-gray-600 truncate">{rezervoar.materijal_izgradnje}</p>
          </div>
          
          <div>
            <span className="font-medium">Volumen:</span>
            <p className="text-gray-600">{calculateVolume().toFixed(2)} m³</p>
          </div>
          
          <div className="col-span-2">
            <span className="font-medium">Kalibracija:</span>
            <p className="text-gray-600">{formatDate(rezervoar.datum_kalibracije)}</p>
          </div>
        </div>

        {rezervoar.dokument_url && (
          <div className="flex items-center text-sm text-blue-600">
            <FileText className="w-4 h-4 mr-1" />
            <span>Dokument priložen</span>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <div className="space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(rezervoar)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(rezervoar.id)}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            onClick={() => onGeneratePDF(rezervoar.id)}
          >
            <Download className="w-4 h-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2.6 Sidebar Update
**Fajl**: `frontend/src/components/Navbar.tsx` (ili gdje god je sidebar)

```typescript
// Dodati novi link ispod "Vozila"
{
  href: '/dashboard/rezervoari',
  label: 'Rezervoari',
  icon: <Database className="w-5 h-5" />, // ili neki drugi icon
}
```

### Faza 3: PDF Generiranje

#### 3.1 Backend PDF Service
**Fajl**: `backend/src/services/pdfGenerator.ts`

```typescript
import PDFDocument from 'pdfkit';
import { Rezervoar } from '@prisma/client';

export const generateRezervoarPDF = (rezervoar: Rezervoar): Promise<Buffer> => {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // PDF sadržaj
    doc.fontSize(20).text('Izvještaj o Rezervoaru', 100, 100);
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Naziv: ${rezervoar.naziv_rezervoara}`);
    doc.text(`ID Broj: ${rezervoar.id_broj}`);
    doc.text(`Mjesto korištenja: ${rezervoar.mjesto_koristenja}`);
    doc.text(`Vlasnik: ${rezervoar.vlasnik}`);
    doc.text(`Oblik: ${rezervoar.oblik_rezervoara}`);
    doc.text(`Kapacitet: ${rezervoar.kapacitet} L`);
    doc.text(`Materijal izgradnje: ${rezervoar.materijal_izgradnje}`);
    doc.text(`Zaštita: ${rezervoar.zastita_unutrasnjeg_rezervoara}`);
    doc.text(`Datum kalibracije: ${rezervoar.datum_kalibracije.toLocaleDateString()}`);
    
    doc.moveDown();
    doc.text('Dimenzije:');
    doc.text(`  Dužina: ${rezervoar.dimenzije_l} m`);
    doc.text(`  Širina: ${rezervoar.dimenzije_w} m`);
    doc.text(`  Visina: ${rezervoar.dimenzije_h} m`);
    doc.text(`  Volumen: ${(Number(rezervoar.dimenzije_l) * Number(rezervoar.dimenzije_w) * Number(rezervoar.dimenzije_h)).toFixed(2)} m³`);
    
    if (rezervoar.napomene) {
      doc.moveDown();
      doc.text(`Napomene: ${rezervoar.napomene}`);
    }

    doc.end();
  });
};
```

### Faza 4: Testing i Validacija

#### 4.1 Backend Testovi
- Unit testovi za CRUD operacije
- Validacija file upload-a
- PDF generiranje testovi

#### 4.2 Frontend Testovi
- Forma validacija
- Upload funkcionalnost
- PDF download

## 📋 Checklist Implementacije

### Backend
- [ ] Kreirati Prisma model
- [ ] Napraviti database migration
- [ ] Implementirati kontroler sa CRUD operacijama
- [ ] Dodati file upload middleware
- [ ] Kreirati rute
- [ ] Registrovati rute u app.ts
- [ ] Implementirati PDF generiranje
- [ ] Dodati validacije

### Frontend
- [ ] Kreirati tipove
- [ ] Implementirati API service
- [ ] Kreirati glavni page
- [ ] Implementirati formu
- [ ] Kreirati card komponentu
- [ ] Ažurirati sidebar
- [ ] Implementirati PDF download
- [ ] Dodati error handling

### Testing
- [ ] Testirati CRUD operacije
- [ ] Testirati file upload
- [ ] Testirati PDF generiranje
- [ ] Testirati responsive design
- [ ] Performance testovi

### Documentation
- [ ] API dokumentacija
- [ ] Korisničko uputstvo
- [ ] Deployment notes

## 🚀 Timeline

**Ukupno vrijeme**: 3-5 dana

- **Dan 1**: Backend implementacija (modeli, kontroleri, rute)
- **Dan 2**: Frontend osnovne komponente (page, forma, service)
- **Dan 3**: UI polishing, PDF generiranje
- **Dan 4**: Testing i bug fixing
- **Dan 5**: Documentation i deployment

## 📝 Napomene

1. **Nezavisnost**: Ova sekcija je potpuno nezavisna od postojećeg sistema upravljanja gorivom
2. **Validacije**: Posebna pažnja na validaciju ID broja kao unique field
3. **File Upload**: Ograničiti tipove fajlova i veličinu
4. **PDF**: Omogućiti custom template za PDF izvještaje
5. **Permissions**: Razmotriti role-based access control 