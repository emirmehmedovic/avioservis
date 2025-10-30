# Design System Guide - Fizički Tankovi & Cisterne

Kompletno uputstvo za repliciranje vizuelnog dizajna "Fizički Tankovi & Cisterne" taba.

---

## 📋 Sadržaj

1. [Pregled Design Sistema](#pregled-design-sistema)
2. [Paleta Boja](#paleta-boja)
3. [Tipografija](#tipografija)
4. [Spacing & Layout](#spacing--layout)
5. [Komponente](#komponente)
6. [Animacije & Transitions](#animacije--transitions)
7. [Responsive Design](#responsive-design)

---

## 🎨 Pregled Design Sistema

Design sistem koristi **minimalistički, profesionalni pristup** sa sivim tonovima kao osnovom i akcentnim bojama za različite akcije i statuse.

### Filozofija Dizajna
- **Čist i profesionalan** - Bijele kartice sa sivim tekstom
- **Hijerarhija informacija** - Jasno definisane veličine fonta i težine
- **Konzistentnost** - Isti pattern za sve kartice i komponente
- **Hover states** - Vizuelni feedback za interakcije
- **Status indikatori** - Boje koje prenose značenje (zelena = uspjeh, crvena = upozorenje, itd.)

---

## 🎨 Paleta Boja

### Primarne Boje (Gray Scale)

```css
/* Tekst */
--text-primary: #111827      /* text-gray-900 - Naslovi, brojevi */
--text-secondary: #4B5563    /* text-gray-600 - Opisi, labels */
--text-tertiary: #6B7280     /* text-gray-500 - Pomoćni tekst */
--text-muted: #9CA3AF        /* text-gray-400 - Disabled state */

/* Background */
--bg-white: #FFFFFF          /* bg-white - Kartice, main background */
--bg-gray-50: #F9FAFB        /* bg-gray-50 - Data boxes */
--bg-gray-100: #F3F4F6       /* bg-gray-100 - Icon containers, tab background */
--bg-gray-900: #111827       /* bg-gray-900 - Alert boxes (settling period) */

/* Borders */
--border-gray-200: #E5E7EB   /* border-gray-200 - Default border */
--border-gray-300: #D1D5DB   /* border-gray-300 - Stronger borders */
--border-gray-700: #374151   /* border-gray-700 - Alert box borders */
```

### Akcione Boje (Actions)

```css
/* Plave boje - Tankovi, primary actions */
--blue-50: #EFF6FF           /* bg-blue-50 - Hover state */
--blue-100: #DBEAFE          /* bg-blue-100 - Icon background */
--blue-600: #2563EB          /* bg-blue-600 - Primary button */
--blue-700: #1D4ED8          /* bg-blue-700 - Button hover */

/* Zelene boje - Cisterne, success states */
--green-50: #F0FDF4
--green-100: #DCFCE7         /* bg-green-100 - Success badge */
--green-300: #86EFAC         /* border-green-300 */
--green-600: #16A34A         /* bg-green-600 - Success button */
--green-700: #15803D         /* bg-green-700 - Button hover */

/* Narandžaste boje - Retrofit, warnings */
--orange-600: #EA580C        /* bg-orange-600 - Retrofit button */
--orange-700: #C2410C        /* bg-orange-700 - Button hover */

/* Crvene boje - Delete, critical */
--red-50: #FEF2F2            /* bg-red-50 - Delete hover */
--red-100: #FEE2E2           /* bg-red-100 - Critical badge */
--red-300: #FCA5A5           /* border-red-300 */
--red-600: #DC2626           /* text-red-600 - Delete action */

/* Amber boje - Settling period warning */
--amber-100: #FEF3C7         /* bg-amber-100 - Warning badge */
--amber-300: #FCD34D         /* border-amber-300 */
--amber-500: #F59E0B         /* bg-amber-500 - Warning icon */
--amber-700: #B45309         /* text-amber-700 - Warning text */

/* Ljubičaste boje - Transfers */
--purple-600: #9333EA        /* bg-purple-600 - Transfer button */
--purple-700: #7E22CE        /* bg-purple-700 - Button hover */
```

---

## ✍️ Tipografija

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Font Sizes & Weights

```css
/* Headings */
--text-3xl: 1.875rem        /* text-3xl - Page title (30px) */
--text-2xl: 1.5rem          /* text-2xl - Large numbers (24px) */
--text-xl: 1.25rem          /* text-xl - Card titles (20px) */
--text-lg: 1.125rem         /* text-lg - Stats values (18px) */

/* Body */
--text-base: 1rem           /* text-base - Normal text (16px) */
--text-sm: 0.875rem         /* text-sm - Labels, buttons (14px) */
--text-xs: 0.75rem          /* text-xs - Small labels, meta (12px) */

/* Font Weights */
--font-normal: 400          /* font-normal */
--font-medium: 500          /* font-medium */
--font-semibold: 600        /* font-semibold */
--font-bold: 700            /* font-bold */
```

### Primjena

```tsx
// Page Title
<h1 className="text-3xl font-bold text-gray-900">
  Fizički Tankovi & Cisterne
</h1>

// Card Title
<h2 className="text-xl font-bold text-gray-900">
  TANK 1
</h2>

// Large Number (Stats)
<p className="text-3xl font-bold text-gray-900">
  150,000
</p>

// Label
<p className="text-sm font-medium text-gray-600">
  Ukupno Litara
</p>

// Small Meta Text
<p className="text-xs text-gray-500">
  od 240,000 L (62.5%)
</p>
```

---

## 📐 Spacing & Layout

### Spacing Scale (Tailwind)

```css
--spacing-1: 0.25rem   /* 4px */
--spacing-2: 0.5rem    /* 8px */
--spacing-3: 0.75rem   /* 12px */
--spacing-4: 1rem      /* 16px */
--spacing-5: 1.25rem   /* 20px */
--spacing-6: 1.5rem    /* 24px */
--spacing-8: 2rem      /* 32px */
--spacing-12: 3rem     /* 48px */
```

### Layout Patterns

#### Container Spacing
```tsx
<div className="space-y-6">  {/* 24px gap between major sections */}
  {/* Content */}
</div>
```

#### Grid Layouts
```tsx
// Summary Cards - 4 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// Tank Cards - 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Tank cards */}
</div>

// Stats Grid inside card - 2 columns
<div className="grid grid-cols-2 gap-3">
  {/* Stats boxes */}
</div>
```

#### Card Padding
```tsx
// Card Content
<CardContent className="p-6">  {/* 24px padding */}
  {/* Content */}
</CardContent>

// Compact boxes
<div className="p-3">  {/* 12px padding */}
  {/* Content */}
</div>
```

---

## 🧩 Komponente

### 1. Summary Cards (Statistike)

#### Struktura
```tsx
<Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      {/* Left: Text */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">
          Label
        </p>
        <p className="text-3xl font-bold text-gray-900">
          Value
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Meta info
        </p>
      </div>
      
      {/* Right: Icon */}
      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="h-6 w-6 text-gray-600" />
      </div>
    </div>
  </CardContent>
</Card>
```

#### Boje
- **Background**: `bg-white`
- **Border**: `border-gray-200`
- **Hover**: `hover:shadow-md`
- **Label**: `text-gray-600`
- **Value**: `text-gray-900`
- **Meta**: `text-gray-500`
- **Icon container**: `bg-gray-100`
- **Icon**: `text-gray-600`

---

### 2. Tab Navigation

#### Struktura
```tsx
<div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
  <button
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      active 
        ? 'bg-white text-blue-600 shadow-sm' 
        : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    Tab Name ({count})
  </button>
</div>
```

#### Boje
- **Container**: `bg-gray-100` + `p-1` + `rounded-lg`
- **Active tab**: 
  - Background: `bg-white`
  - Text: `text-blue-600` (tankovi), `text-green-600` (cisterne), `text-purple-600` (transfers)
  - Shadow: `shadow-sm`
- **Inactive tab**:
  - Text: `text-gray-600`
  - Hover: `hover:text-gray-900`

---

### 3. Tank Cards (Glavne kartice)

#### Struktura
```tsx
<Card className="relative group overflow-hidden bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
  {/* Status Bar */}
  <div className="absolute top-0 left-0 right-0 h-2 bg-gray-600" />
  
  {/* Header */}
  <CardHeader className="pb-4 pt-7 bg-white">
    <div className="flex justify-between items-start mb-3">
      {/* Left: Title & Identifier */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-gray-900 mb-1 truncate">
          Tank Name
        </h2>
        <p className="text-sm text-gray-600 font-medium">
          Tank Identifier
        </p>
      </div>
      
      {/* Right: Badges */}
      <div className="flex flex-col gap-2 items-end">
        <Badge>Status</Badge>
        <Badge>Readiness</Badge>
      </div>
    </div>
    
    {/* Location */}
    <p className="text-xs text-gray-500 italic mb-3">
      Location Description
    </p>
    
    {/* Fuel Type & Actions */}
    <div className="flex justify-between items-center">
      <Badge variant="outline">Fuel Type</Badge>
      <div className="flex gap-1">
        {/* Action buttons */}
      </div>
    </div>
  </CardHeader>
  
  {/* Content */}
  <CardContent className="space-y-4 pt-5">
    {/* Stats Grid */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 font-medium mb-1">Label</p>
        <p className="text-lg font-bold text-gray-900">Value</p>
      </div>
    </div>
    
    {/* Capacity Bar */}
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full bg-gray-600" style={{width: '75%'}} />
    </div>
    
    {/* Readiness Status Box */}
    {/* ... */}
  </CardContent>
</Card>
```

#### Boje
- **Card**: `bg-white` + `border-gray-200`
- **Hover**: `hover:shadow-xl`
- **Status bar (top)**: 
  - Ready: `bg-gray-600`
  - Settling: `bg-gray-400`
  - No data: `bg-gray-300`
- **Stats boxes**: `bg-gray-50` + `border-gray-200`
- **Capacity bar**: 
  - Background: `bg-gray-200`
  - Fill: `bg-gray-600`

---

### 4. Badges (Status indikatori)

#### Vrste Badge-eva

##### Active/Inactive Badge
```tsx
<Badge variant={active ? "default" : "secondary"}>
  {active ? "Aktivan" : "Neaktivan"}
</Badge>
```

##### Readiness Badge (Spreman/Slijeganje)
```tsx
<Badge className={`shrink-0 text-xs ${
  isReady 
    ? 'bg-green-100 text-green-700 border border-green-300' 
    : 'bg-amber-100 text-amber-700 border border-amber-300'
}`}>
  {isReady ? 'Spreman' : 'Slijeganje'}
</Badge>
```

##### Out of Service Badge
```tsx
<Badge className="shrink-0 text-xs bg-red-100 text-red-700 border border-red-300">
  Van upotrebe
</Badge>
```

#### Boje po statusu
| Status | Background | Text | Border |
|--------|-----------|------|--------|
| **Success (Spreman)** | `bg-green-100` | `text-green-700` | `border-green-300` |
| **Warning (Slijeganje)** | `bg-amber-100` | `text-amber-700` | `border-amber-300` |
| **Error (Van upotrebe)** | `bg-red-100` | `text-red-700` | `border-red-300` |
| **Default (Aktivan)** | Shadcn default | | |
| **Secondary (Neaktivan)** | Shadcn secondary | | |

---

### 5. Buttons (Akcije)

#### Primary Buttons
```tsx
// Tankovi - Blue
<Button className="bg-blue-600 hover:bg-blue-700">
  <Plus className="h-4 w-4 mr-2" />
  Dodaj Tank
</Button>

// Cisterne - Green
<Button className="bg-green-600 hover:bg-green-700">
  <Plus className="h-4 w-4 mr-2" />
  Dodaj Cisternu
</Button>

// Retrofit - Orange
<Button className="bg-orange-600 hover:bg-orange-700">
  <Database className="h-4 w-4 mr-2" />
  Retrofit
</Button>

// Transfers - Purple
<Button className="bg-purple-600 hover:bg-purple-700">
  <Plus className="h-4 w-4 mr-2" />
  Novi Transfer
</Button>
```

#### Outline Buttons (Icon Actions)
```tsx
// Default (View/Edit)
<Button 
  variant="outline"
  size="sm"
  className="h-7 px-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
>
  <Edit className="h-3.5 w-3.5" />
</Button>

// Blue Accent (History)
<Button 
  variant="outline"
  size="sm"
  className="h-7 px-3 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
>
  <FileText className="h-3.5 w-3.5 mr-1" />
  <span className="text-xs">Historija</span>
</Button>

// Delete (Red)
<Button 
  variant="outline"
  size="sm"
  className="h-7 px-2 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
>
  <Trash2 className="h-3.5 w-3.5" />
</Button>
```

#### Button Sizing
- **Icon size in button**: `h-4 w-4` (16px)
- **Small button icon**: `h-3.5 w-3.5` (14px)
- **Icon spacing**: `mr-2` (8px between icon and text)
- **Button height**: `h-7` za small buttons (28px)

---

### 6. Readiness Status Box (Proces slijeganja)

#### Settling Period (Warning) - Dark Background
```tsx
<div className="p-3 rounded-lg border-2 bg-gray-900 border-gray-700">
  <div className="flex items-start gap-3">
    {/* Icon */}
    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-500">
      <ClockIcon className="w-4 h-4 text-white" />
    </div>
    
    {/* Content */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold mb-1 text-white">
        UPOZORENJE: Proces slijeganja u toku
      </p>
      
      <div className="space-y-1 mt-2">
        {/* Info rows */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-300">
            Zadnje točenje
          </p>
          <p className="text-xs font-semibold text-white">
            30.10.2025 14:30
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-300">
            Proteklo
          </p>
          <p className="text-xs font-semibold text-white">
            3.5h / 6h
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-300">
            Preostalo
          </p>
          <p className="text-xs font-semibold text-white">
            2.5h
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### Ready State - Light Background
```tsx
<div className="p-3 rounded-lg border-2 bg-gray-50 border-gray-300">
  <div className="flex items-start gap-3">
    {/* Icon */}
    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
      <CheckIcon className="w-4 h-4 text-white" />
    </div>
    
    {/* Content */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold mb-1 text-gray-900">
        Tank spreman za korištenje
      </p>
      
      <div className="space-y-1 mt-2">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <p className="text-xs font-medium text-gray-600">
            Zadnje točenje
          </p>
          <p className="text-xs font-semibold text-gray-900">
            29.10.2025 08:00
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-600">
            Trenutno stanje
          </p>
          <p className="text-xs font-semibold text-gray-900">
            45,000 L
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### No Data State
```tsx
<div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
      <InfoIcon className="w-4 h-4 text-gray-500" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-800">
        Nema podataka o točenju
      </p>
      <p className="text-xs text-gray-600">
        Historija točenja nije dostupna
      </p>
    </div>
  </div>
</div>
```

---

### 7. Progress/Capacity Bar

```tsx
<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
  <div 
    className="h-full rounded-full transition-all duration-500 bg-gray-600"
    style={{ width: `${percentage}%` }}
  />
</div>
```

#### Boje
- **Background**: `bg-gray-200`
- **Fill**: `bg-gray-600`
- **Height**: `h-2` (8px)
- **Transition**: `transition-all duration-500`

---

## 🎬 Animacije & Transitions

### Hover Effects

```css
/* Cards */
.card {
  transition: all 0.3s;
}
.card:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Buttons */
.button {
  transition: colors 0.15s;
}

/* Tab buttons */
.tab-button {
  transition: colors 0.2s;
}

/* Progress bar */
.progress-fill {
  transition: all 0.5s;
}
```

### Tailwind Classes
```tsx
// Card hover
className="hover:shadow-xl transition-all duration-300"

// Summary card hover
className="hover:shadow-md transition-shadow"

// Button
className="transition-colors"

// Tab button
className="transition-colors"

// Progress bar fill
className="transition-all duration-500"
```

### Group Hover (Parent-Child)
```tsx
<Card className="group">
  {/* Child element changes on parent hover */}
  <div className="group-hover:text-blue-600">
    Content
  </div>
</Card>
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind)

```css
/* Mobile first */
default:  < 640px   /* Mobile */
sm:       640px     /* Small tablets */
md:       768px     /* Tablets */
lg:       1024px    /* Desktop */
xl:       1280px    /* Large desktop */
2xl:      1536px    /* Extra large */
```

### Grid Responsive Patterns

#### Summary Cards (4 columns)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 
    Mobile: 1 column
    Tablet: 2 columns
    Desktop: 4 columns
  */}
</div>
```

#### Tank Cards (3 columns)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 
    Mobile: 1 column
    Tablet: 2 columns
    Desktop: 3 columns
  */}
</div>
```

#### Stats Grid inside card (2 columns)
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Always 2 columns */}
</div>
```

---

## 🔄 State Management & Conditional Styling

### Status-Based Styling

```tsx
// Dynamic classes based on state
const statusBarClass = `absolute top-0 left-0 right-0 h-2 ${
  !lastIntakeDate ? 'bg-gray-300' : 
  isReady ? 'bg-gray-600' : 'bg-gray-400'
}`;

// Badge color
const badgeClass = `shrink-0 text-xs ${
  isReady 
    ? 'bg-green-100 text-green-700 border border-green-300' 
    : 'bg-amber-100 text-amber-700 border border-amber-300'
}`;

// Warning box
const warningBoxClass = `p-3 rounded-lg border-2 ${
  isSettling 
    ? 'bg-gray-900 border-gray-700' 
    : 'bg-gray-50 border-gray-300'
}`;
```

### Tab-Based Colors
```tsx
const tabColor = 
  tab === 'tanks' ? 'text-blue-600' :
  tab === 'cisterns' ? 'text-green-600' :
  'text-purple-600';
```

---

## 📦 Komponente - Quick Reference

### Icon Sizes
- **Small**: `h-3.5 w-3.5` (14px) - Button icons
- **Medium**: `h-4 w-4` (16px) - Standard button icons
- **Large**: `h-6 w-6` (24px) - Summary card icons
- **Extra Large**: `h-8 w-8` (32px) - Status box icons, cistern header

### Border Radius
- **Small**: `rounded` (4px)
- **Medium**: `rounded-md` (6px)
- **Large**: `rounded-lg` (8px)
- **Extra Large**: `rounded-xl` (12px)
- **Circle**: `rounded-full`

### Shadow Levels
- **None**: No shadow
- **Small**: `shadow-sm` - Active tab
- **Medium**: `shadow-md` - Hover on summary cards
- **Large**: `shadow-lg` - Cumulative cistern cards
- **Extra Large**: `shadow-xl` - Tank card hover

---

## 🎯 Best Practices

### 1. Konzistentnost
- Koristite iste razmake (`gap-3`, `gap-4`, `gap-6`) kroz cijelu aplikaciju
- Držite se gray scale boja za glavni UI
- Akcentne boje samo za akcije i statuse

### 2. Hijerarhija
- Naslovi: `text-xl` ili veće + `font-bold`
- Glavni brojevi: `text-3xl` + `font-bold`
- Labele: `text-sm` + `font-medium`
- Meta info: `text-xs` + `text-gray-500`

### 3. Interakcija
- Sve klikabilne elemente imaju hover state
- Transition duration: `300ms` za kartice, `150ms-200ms` za dugmad
- Disabled state: `opacity-50` + `cursor-not-allowed`

### 4. Accessibility
- Dovoljno kontrasta: 
  - Text-gray-900 na white background ✅
  - Text-gray-600 za labels ✅
- Jasni focus stati
- Icon buttons sa `title` atributom

### 5. Performance
- Koristite `transition-shadow` umjesto `transition-all` gdje je moguće
- Izbjegavajte animiranje layout properties (`width`, `height`)
- Preferirati `transform` i `opacity` za animacije

---

## 📝 Primjer Kompletne Kartice

```tsx
<Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      {/* Left side - Text content */}
      <div>
        {/* Label */}
        <p className="text-sm font-medium text-gray-600 mb-1">
          Ukupno Litara
        </p>
        
        {/* Main value */}
        <p className="text-3xl font-bold text-gray-900">
          150,000
        </p>
        
        {/* Meta information */}
        <p className="text-xs text-gray-500 mt-1">
          od 240,000 L (62.5%)
        </p>
      </div>
      
      {/* Right side - Icon */}
      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <BarChart className="h-6 w-6 text-gray-600" />
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🔗 Resources

### Tailwind CSS Classes Reference
- [Colors](https://tailwindcss.com/docs/customizing-colors)
- [Spacing](https://tailwindcss.com/docs/customizing-spacing)
- [Typography](https://tailwindcss.com/docs/font-size)
- [Borders](https://tailwindcss.com/docs/border-radius)
- [Shadows](https://tailwindcss.com/docs/box-shadow)

### Icons
- **Library**: Lucide React
- **Common icons**: `Plus`, `Edit`, `Trash2`, `Database`, `RefreshCw`, `FileText`
- **Import**: `import { IconName } from 'lucide-react'`

### UI Components
- **Library**: Shadcn/ui
- **Components**: `Card`, `Button`, `Badge`, `Input`, `Label`, `Select`

---

## 🎨 Colour Palette Cheat Sheet

```
GRAY SCALE (Primary)
━━━━━━━━━━━━━━━━━━━━
50  : #F9FAFB  (Data boxes)
100 : #F3F4F6  (Icon containers)
200 : #E5E7EB  (Borders)
300 : #D1D5DB  (Strong borders)
400 : #9CA3AF  (Muted text)
500 : #6B7280  (Tertiary text)
600 : #4B5563  (Secondary text)
700 : #374151  (Alert borders)
800 : #1F2937  
900 : #111827  (Primary text, alert bg)

BLUE (Tankovi)
━━━━━━━━━━━━━━
50  : #EFF6FF
100 : #DBEAFE
600 : #2563EB
700 : #1D4ED8

GREEN (Cisterne, Success)
━━━━━━━━━━━━━━━━━━━━━━━
100 : #DCFCE7
300 : #86EFAC
600 : #16A34A
700 : #15803D

AMBER (Warning, Settling)
━━━━━━━━━━━━━━━━━━━━━━━━
100 : #FEF3C7
300 : #FCD34D
500 : #F59E0B
700 : #B45309

RED (Error, Delete)
━━━━━━━━━━━━━━━━━━━
50  : #FEF2F2
100 : #FEE2E2
300 : #FCA5A5
600 : #DC2626

ORANGE (Retrofit)
━━━━━━━━━━━━━━━━━
600 : #EA580C
700 : #C2410C

PURPLE (Transfers)
━━━━━━━━━━━━━━━━━━
600 : #9333EA
700 : #7E22CE
```

---

## 📌 Summary

Ovaj design sistem kombinuje:
- ✅ **Minimalizam** - Čiste linije i bijele kartice
- ✅ **Profesionalnost** - Konzistentan gray scale
- ✅ **Jasnoća** - Hijerarhija informacija kroz veličinu i težinu fonta
- ✅ **Feedback** - Hover states i transitions
- ✅ **Značenje kroz boju** - Crvena za upozorenja, zelena za uspjeh
- ✅ **Responsive** - Mobile-first pristup

Korištenje ovog sistema garantuje konzistentan, čitljiv i profesionalan UI kroz cijelu aplikaciju.

---

**Version**: 1.0  
**Last Updated**: 30.10.2025  
**Component**: PhysicalTanksDisplay.tsx

