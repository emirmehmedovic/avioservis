# Avioservis Design Guidelines

## 🎨 Uvod

Ovaj dokument definiše kompletne uputacije za vizuelni dizajn aplikacije Avioservis. Ciljamo na minimalistički, Apple-like stil sa neutralnom paletom boja, čistim interfejsom i ekscelentnom upotrebljivošću.

---

## 📋 Sadržaj

1. [Principles](#principles)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Components](#components)
5. [Layout & Spacing](#layout--spacing)
6. [Interactive Elements](#interactive-elements)
7. [States & Feedback](#states--feedback)
8. [Examples](#examples)

---

## Principles

### 1. **Minimalism**
- Ukloniti sve nepotrebne detalje
- Koristiti negativan prostor efikasno
- Fokus na suštinu i funkcionalnost
- Bez glasmorphisma ili previše dekorativnih efekata

### 2. **Clean & Light**
- Bijela (`#FFFFFF`) kao dominantna pozadina za glavne sekcije
- Light gray (`#F3F4F6`, `#F9FAFB`) za sekundarne sekcije
- Jasne, vidljive granične linije između elemenata

### 3. **Neutral Color Palette**
- Izbjegavati jarke, zasićene boje (osim ikonitastičnih elemenata)
- Koristiti slate, stone, zinc, neutral familijes iz Tailwind CSS-a
- Boje trebaju biti ugodne za oko i lako čitljive

### 4. **Typography-First**
- Čitljivost je prioritet
- Konzistentna veličina fonta
- Jasna hijerarhija kroz weight (regular, semibold, bold)

### 5. **Consistency**
- Jednolik stil kroz sve tabove i stranice
- Istovjetni borderi, padding, border-radius
- Repetitivna struktura za prepoznatljivost

---

## Color Palette

### Primary Colors

| Boja | Hex | Tailwind | Upotreba |
|------|-----|----------|----------|
| White | `#FFFFFF` | `bg-white` | Glavne pozadine kartica i sekcija |
| Light Gray | `#F9FAFB` | `bg-gray-50` | Sekundarne pozadine, filter sekcije |
| Medium Gray | `#F3F4F6` | `bg-gray-100` | Hover stanja na svetlim elementima |
| Border Gray | `#E5E7EB` | `border-gray-200` | Linije između elemenata |
| Dark Gray | `#6B7280` | `text-gray-500` | Sekundarni tekst |
| Text Gray | `#374151` | `text-gray-700` | Primарni tekst |
| Text Black | `#111827` | `text-gray-900` | Najtamnije tekst (naslovi, dugmadi) |

### Neutral Families (za varijacije)

```
Slate:   text-slate-500, text-slate-600, text-slate-700
Stone:   text-stone-500, text-stone-600, text-stone-700
Zinc:    text-zinc-500, text-zinc-600, text-zinc-700
Neutral: text-neutral-500, text-neutral-600, text-neutral-700
```

### Accent Colors (za Tab Ikone)

| Tab | Ikona Boja | Hover Boja | Tailwind |
|-----|-----------|-----------|----------|
| Fiksni Tankovi | Teal | `#4FC3C7` | `text-teal-500` |
| Avio Cisterne | Red | `#e53e3e` | `text-red-500` |
| Ulaz Goriva | Yellow | `#FBBF24` | `text-amber-400` |
| Operacije Točenja | Purple | `#8B5CF6` | `text-purple-600` |
| Drenirano Gorivo | Blue | `#3B82F6` | `text-blue-500` |
| Eksport | Green | `#10B981` | `text-green-600` |

### Dark Gradient (za Header)

```
from-[#4d4c4c] to-[#1a1a1a]
```
- Koristi se za header sekcije sa tamnijom, sofisticiranijom atmosferom
- Tekst uvijek bijeli
- Ikonitastične boje ostaju jasne

---

## Typography

### Font Family
- **Primary**: System fonts (ili custom ako je dostupan)
- **Fallback**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Sizes & Weights

| Element | Size | Weight | Tailwind | Primjer |
|---------|------|--------|----------|---------|
| Page Title | 28-32px | Bold (700) | `text-2xl md:text-3xl font-bold` | Naslovi stranica |
| Section Title | 20-24px | Semibold (600) | `text-xl md:text-2xl font-semibold` | Naslovi tabova |
| Card Title | 16-18px | Semibold (600) | `text-lg font-semibold` | Naslovi kartica |
| Label/Field | 14px | Medium (500) | `text-sm font-medium` | Labele, filter nazivi |
| Body Text | 14px | Regular (400) | `text-sm` | Opis, tekst u tabelama |
| Small Text | 12px | Regular (400) | `text-xs` | Dodatne informacije |

### Line Height
- **Body**: `line-height: 1.5` (24px za 14px font)
- **Headings**: `line-height: 1.2` (24px za 20px font)

---

## Components

### 1. Cards & Containers

```html
<!-- Standard Card Container -->
<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <!-- Header -->
  <div className="bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] p-6 sm:p-8">
    <h2 className="text-white flex items-center text-2xl md:text-3xl font-bold">
      <IconComponent className="h-8 w-8 mr-3 text-[#TAB_COLOR]" />
      Title
    </h2>
  </div>

  <!-- Content -->
  <div className="p-6">
    <!-- Sadržaj ide ovdje -->
  </div>
</div>
```

**Stilovi:**
- `bg-white` - Čista bijela pozadina
- `rounded-lg` - Lagani zaobljeni uglovi (8px)
- `border border-gray-200` - Sitna, elegantna granica
- Padding: `p-6` za desktop, `p-4` za mobilne

### 2. Buttons

```html
<!-- Primary Button (dengan hover state) -->
<Button
  variant="outline"
  className="border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-[COLOR]-50 hover:text-gray-900 whitespace-nowrap transition-all rounded-lg"
>
  Button Text
</Button>
```

**Pravila:**
- **Default State**:
  - Border: `border-gray-300`
  - Text: `text-gray-900` (uvijek tamno/crno)
  - Background: `bg-white`

- **Hover State**:
  - Border: `hover:border-gray-400` (malo tamnije)
  - Background: `hover:bg-[ACCENT]-50` (vrlo lagana tinta)
  - Text: `hover:text-gray-900` (ostaje tamno/crno)
  - Transition: `transition-all` (smooth 200ms)

- **Disabled State**:
  - `opacity-50` i `cursor-not-allowed`
  - Bez hover efekata

**Hover Background Boje po Kontekstu:**
- PDF: `hover:bg-stone-100`
- Excel: `hover:bg-zinc-100`
- INO Faktura: `hover:bg-green-50`
- Domaća Faktura: `hover:bg-amber-50`
- XML: `hover:bg-blue-50`
- Reset/Cancel: `hover:bg-gray-200`

### 3. Input Fields

```html
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 hover:border-gray-400 transition-all"
/>
```

**Stilovi:**
- Border: `border-gray-300`
- Focus Ring: `focus:ring-2 focus:ring-slate-500`
- Hover: `hover:border-gray-400`
- Padding: `px-3 py-2`
- Border Radius: `rounded-lg` (8px)

### 4. Select Dropdowns

```html
<select
  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500 hover:border-gray-400 transition-all"
>
  <option>Opcija 1</option>
</select>
```

**Identično kao Input Fields**

### 5. Tables

```html
<div className="border border-gray-200 rounded-lg overflow-hidden">
  <table className="w-full">
    <!-- Header -->
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
          Column
        </th>
      </tr>
    </thead>

    <!-- Body -->
    <tbody className="divide-y divide-gray-200">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-700">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Stilovi:**
- Header Background: `bg-gray-50`
- Header Text: `text-gray-700` + `font-semibold`
- Body Text: `text-gray-700`
- Row Hover: `hover:bg-gray-50`
- Borders: `border-gray-200`
- Padding: `px-4 py-3` (za th i td)

### 6. Filter Sections

```html
<div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Filter Items -->
  </div>
</div>
```

**Stilovi:**
- Background: `bg-gray-50` (lagana siva)
- Border: `border-gray-200`
- Padding: `p-6`
- Grid: Responsive (1 col mobile, 2-4 cols desktop)
- Gap: `gap-4`

### 7. Labels

```html
<label className="block text-sm font-medium text-gray-700 mb-2">
  Label Text
</label>
```

**Stilovi:**
- Text Size: `text-sm`
- Weight: `font-medium` (500)
- Color: `text-gray-700`
- Spacing: `mb-2` (između labele i fielda)

---

## Layout & Spacing

### Spacing Scale (Tailwind)

```
2px   → gap-0.5
4px   → gap-1    (py-1, px-1)
8px   → gap-2    (py-2, px-2)
12px  → gap-3    (py-3, px-3)
16px  → gap-4    (py-4, px-4)
24px  → gap-6    (py-6, px-6)
32px  → gap-8    (py-8, px-8)
```

### Container Padding

- **Desktop**: `p-6` ili `p-8`
- **Mobile**: `p-4` ili `p-6`
- **Responsive**: `p-4 sm:p-6 md:p-8`

### Margin Between Sections

- **Vertical**: `mb-4` za male sekcije, `mb-6` za veće
- **Horizontal**: Rijetko se koristi (koristiti gap u gridovima)

### Border Radius

- **Buttons & Inputs**: `rounded-lg` (8px)
- **Cards**: `rounded-lg` (8px)
- **Large Containers**: `rounded-lg` (8px)
- **Nikad**: `rounded-full` (osim za avatare)
- **Izbjegavati**: `rounded-xl` (previše krivudavo)

---

## Interactive Elements

### Hover Effects

**Generalni Principi:**
- Sve interaktivne elemente trebaju imati `transition-all` (200ms)
- Subtilni efekti: `hover:shadow-md` ili `hover:bg-gray-50`
- Tekst trebao biti vidljiv (nikad bijeli tekst na svetloj pozadini)

**Button Hover:**
```css
transition-all
hover:border-gray-400
hover:bg-[ACCENT]-50
hover:text-gray-900
```

**Input Hover:**
```css
transition-all
hover:border-gray-400
focus:ring-2
focus:ring-slate-500
```

**Table Row Hover:**
```css
hover:bg-gray-50
transition-colors
```

### Focus States

- **Inputs/Selects**: `focus:ring-2 focus:ring-slate-500`
- **Buttons**: Nema potrebe za posebnim focus state-om
- **Keyboard Navigation**: Trebale bi biti vidljive

### Active States

- Preporuka: Highlight trenutnog taba sa Tab-specifičnom bojom
- Primjer: `color: #4FC3C7` za Fiksni Tankovi tab

---

## States & Feedback

### Loading State

```html
<div className="flex flex-col items-center justify-center py-12">
  <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-slate-600 animate-spin mb-4"></div>
  <p className="text-gray-700 font-medium">Učitavanje...</p>
</div>
```

### Error State

```html
<div className="flex flex-col items-center justify-center py-12">
  <svg className="h-12 w-12 text-red-600 mb-4" />
  <p className="text-gray-700 font-medium">Greška: {error}</p>
</div>
```

### Empty State

```html
<div className="flex flex-col items-center justify-center py-12">
  <svg className="h-12 w-12 text-gray-400 mb-4" />
  <p className="text-gray-700 font-medium">Nema podataka</p>
</div>
```

### Success Feedback

- Koristiti toast notifikacije (react-hot-toast)
- Boja: Zelena (`text-green-700`)
- Poruka trebala biti jasna i konkretna

---

## Examples

### Example 1: Report Tab Layout

```html
<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <!-- Header -->
  <div className="bg-gradient-to-r from-[#4d4c4c] to-[#1a1a1a] p-6 sm:p-8">
    <h2 className="text-white flex items-center text-2xl md:text-3xl font-bold">
      <IconComponent className="h-8 w-8 mr-3 text-[#TAB_COLOR]" />
      Izvještaj Naziv
    </h2>
  </div>

  <!-- Content -->
  <div className="p-6">
    <!-- Filtri -->
    <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Filter items -->
      </div>
    </div>

    <!-- Tabela -->
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table><!-- ... --></table>
    </div>
  </div>
</div>
```

### Example 2: Filter Form

```html
<div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <!-- Input Field -->
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Naziv Filtera
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 hover:border-gray-400 transition-all"
      />
    </div>

    <!-- Button -->
    <div className="flex items-end">
      <Button
        className="border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-all rounded-lg"
      >
        Resetuj Filtere
      </Button>
    </div>
  </div>
</div>
```

### Example 3: Button Set

```html
<div className="flex flex-wrap gap-2">
  <Button className="border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-stone-100 hover:text-gray-900 whitespace-nowrap transition-all">
    Izvezi u PDF
  </Button>

  <Button className="border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-zinc-100 hover:text-gray-900 whitespace-nowrap transition-all">
    Excel Izvještaj
  </Button>

  <Button className="border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-green-50 hover:text-gray-900 whitespace-nowrap transition-all">
    Zbirna INO Faktura
  </Button>
</div>
```

---

## 🎯 Design Checklist

Prije nego što finalziuješ dizajn, provjeri:

- [ ] Sve kartice imaju `bg-white` i `border-gray-200`
- [ ] Svi headeri koriste dark gradient `from-[#4d4c4c] to-[#1a1a1a]`
- [ ] Svi tekstualni elementi su jasno čitljivi (`text-gray-700` ili tamnije)
- [ ] Svi dugmadi imaju `text-gray-900` (nikada bijeli tekst)
- [ ] Hover stanja su subtilna (light tints: `-50` varijante)
- [ ] Filter sekcije koriste `bg-gray-50` pozadinu
- [ ] Tablice imaju `border-gray-200` i `divide-y divide-gray-200`
- [ ] Loading/Error state-ovi su čisti i minimalistički
- [ ] Sve ikonitastične boje poklapaju se sa tab bojama
- [ ] Responsive design radi na mobilnim uređajima
- [ ] Sve transition vrijednosti su `transition-all` (200ms je default)

---

## 📱 Responsive Design

### Breakpoints (Tailwind CSS)

```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

### Mobile-First Approach

```html
<!-- Primjer: Grid koji je 1 kolona na mobilnom, 2 na tablet-u, 4 na desktop-u -->
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Items -->
</div>
```

### Mobile Padding

```html
<!-- Desktop: p-6, Mobile: p-4 -->
<div className="p-4 sm:p-6 md:p-8">
  <!-- Sadržaj -->
</div>
```

---

## 🚫 What NOT to Do

- ❌ Koristiti jarke, zasićene boje (osim ikonitastičnih)
- ❌ Dodavati glassmorphism efekte
- ❌ Koristiti dragi drop shadows (`shadow-2xl`, `shadow-lg`)
- ❌ Miješati fonta (ostati sa system fonts-ima)
- ❌ Bijeli tekst na svjetlim pozadinama
- ❌ Previše zaobljenih uglova (`rounded-full`, `rounded-3xl`)
- ❌ Previše različitih border-radius vrijednosti
- ❌ Dark mode varijante u production (`dark:` prefix)
- ❌ Inline stilovi umjesto Tailwind klasa
- ❌ Hardcodovane boje umjesto Tailwind varijabli

---

## 📚 References

- **Tailwind CSS**: https://tailwindcss.com
- **Design System**: Apple Human Interface Guidelines
- **Color Theory**: Material Design Color System (ali koristimo neutral palet)

---

## Version History

| Verzija | Datum | Izmjene |
|---------|-------|---------|
| 1.0 | 2024-10-30 | Kreirani inicijalni design guidelines |

---

## Contact & Questions

Za pitanja oko dizajna ili nejasnoće u ovim uputstvima, kontaktiraj tim razvoja.

---

**Last Updated**: 2024-10-30
**Status**: Active
**Maintained By**: Development Team
