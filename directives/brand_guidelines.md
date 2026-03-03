# Mosaic Brand Guidelines

This document defines the brand standards for the Mosaic Scheduler application. All UI components must follow these guidelines for visual consistency.

---

## Brand Colors

### Primary Palette

| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **Garlic** | `#F9F8F1` | `bg-garlic` | Light backgrounds, page bg |
| **Aubergine** | `#3A4750` | `bg-aubergine` | Dark backgrounds, navbar |
| **Margaux** | `#477296` | `text-margaux`, `focus:ring-margaux` | Focus states, links, interactive elements |
| **Saffron** | `#B96129` | `bg-saffron` | CTA buttons, important accents |
| **Blueberry** | `#345981` | `bg-blueberry` | Primary buttons, default job tiles |

### Secondary Palette

| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **Vanilla** | `#F7F4E9` | `bg-vanilla` | Panel backgrounds, cards |
| **Charcoal** | `#333333` | `text-charcoal` | Body text, headings |
| **Seafoam** | `#94B0B3` | `bg-seafoam` | Selection highlights |
| **Cinnamon** | `#A65628` | `bg-cinnamon` | Secondary accent |
| **Sorbet** | `#E2C1A4` | `bg-sorbet` | Drop zone highlights, subtle accents |

### Color Configuration

All brand colors are defined in `tailwind.config.js`:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        'garlic': '#F9F8F1',
        'aubergine': '#3A4750',
        'margaux': '#477296',
        'saffron': '#B96129',
        'blueberry': '#345981',
        'vanilla': '#F7F4E9',
        'charcoal': '#333333',
        'seafoam': '#94B0B3',
        'cinnamon': '#A65628',
        'sorbet': '#E2C1A4',
      },
    },
  },
}
```

---

## Typography

### Font Families

| Type | Font | Tailwind Class | Usage |
|------|------|----------------|-------|
| **Headlines** | Bogart Medium | `font-bogart` | H1-H6, modal titles, section headers |
| **Body** | Inter (system fallback) | `font-body` | Body text, form labels, descriptions |

### Font Loading

Fonts are loaded in `src/index.css`:

```css
@font-face {
  font-family: 'Bogart';
  src: url('./assets/fonts/bogart-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Bogart';
  src: url('./assets/fonts/bogart-medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
```

### Font Files Location

```
src/assets/fonts/
├── bogart-medium.ttf
└── bogart-regular.ttf
```

### Base Typography Styles

Applied globally via `src/index.css`:

```css
@layer base {
  h1, h2, h3, h4, h5, h6 {
    @apply font-bogart font-medium;
  }
  body {
    @apply font-body text-charcoal;
  }
}
```

---

## Color Usage Patterns

### Buttons

| Type | Classes |
|------|---------|
| **Primary** | `bg-blueberry hover:bg-blueberry/90 text-white` |
| **CTA/Action** | `bg-saffron hover:bg-saffron/90 text-white` |
| **Secondary** | `border border-gray-300 bg-white hover:bg-gray-50 text-gray-700` |
| **Danger** | `bg-red-600 hover:bg-red-700 text-white` |

### Focus States

All interactive elements use Margaux for focus:
```
focus:ring-margaux focus:border-margaux
```

### Links

```
text-margaux hover:text-blueberry
```

### Backgrounds

| Context | Classes |
|---------|---------|
| **Page** | `bg-garlic` |
| **Navbar** | `bg-aubergine` |
| **Panels** | `bg-vanilla` |
| **Cards/Headers** | `bg-garlic` |
| **Drop zones** | `bg-sorbet/30` |
| **Selected/Hover** | `bg-margaux/10` or `bg-margaux/20` |

### Text

| Context | Classes |
|---------|---------|
| **Body** | `text-charcoal` |
| **Headings** | `text-charcoal font-bogart` |
| **Muted** | `text-gray-500` or `text-gray-600` |
| **On dark bg** | `text-white` |

---

## Job Tile Colors

Job tiles use a brand-aligned color palette defined in `JobForm.tsx`:

```javascript
const colorOptions = [
  '#345981',  // blueberry (default)
  '#477296',  // margaux
  '#B96129',  // saffron
  '#A65628',  // cinnamon
  '#94B0B3',  // seafoam
  '#3A4750',  // aubergine
  '#E2C1A4',  // sorbet
  '#333333',  // charcoal
  // Additional utility colors for variety
  '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];
```

**Default tile color:** `#345981` (Blueberry)

Location: `src/components/jobs/JobTile.tsx:23`

---

## Color Migration Reference

When updating components, use this mapping from old colors to brand colors:

| Old Color | New Color | Old Class | New Class |
|-----------|-----------|-----------|-----------|
| Navy | Aubergine | `bg-[#0a2342]` | `bg-aubergine` |
| Indigo-600 | Blueberry | `bg-indigo-600` | `bg-blueberry` |
| Indigo-700 | Blueberry/90 | `hover:bg-indigo-700` | `hover:bg-blueberry/90` |
| Indigo-500 | Margaux | `focus:ring-indigo-500` | `focus:ring-margaux` |
| Indigo-600 | Margaux | `text-indigo-600` | `text-margaux` |
| Gray-50 | Garlic | `bg-gray-50` | `bg-garlic` |
| Gray-100 | Vanilla | `bg-gray-100` | `bg-vanilla` |
| Gray-800 | Charcoal | `text-gray-800` | `text-charcoal` |
| Blue-50 | Sorbet/30 | `bg-blue-50` | `bg-sorbet/30` |

---

## Verification Checklist

When implementing brand colors, verify:

- [ ] Navbar background is Aubergine (`#3A4750`)
- [ ] Primary buttons are Blueberry with Blueberry/90 hover
- [ ] Focus states use Margaux ring color
- [ ] Page backgrounds are Garlic (`#F9F8F1`)
- [ ] Headlines use Bogart font
- [ ] No remaining `indigo-*` classes in codebase
- [ ] No remaining `#0a2342` hardcoded colors
- [ ] Job tiles default to Blueberry (`#345981`)

### Quick Verification Commands

```bash
# Check for old indigo colors
grep -r "indigo-" src/

# Check for old navy color
grep -r "#0a2342" src/
grep -r "#0A2342" src/

# Verify build works
npm run build
```

---

## Brand Assets

### Logo

Location: `src/assets/MosaicLogo.png`

### Brand Guidelines PDF

Reference document: `docs/BrandGuidelines_Mosaic.pdf`

---

## Related Directives

- [Code Standards](./code_standards.md) - Tailwind usage patterns
- [UI Features](./ui_features.md) - Component styling
- [Troubleshooting](./troubleshooting.md) - Brand/styling issues
