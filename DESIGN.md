---
version: 2.1-colorhunt-solar
name: Solar Revenue Tracker
description: Warm sunset/solar executive design system using Color Hunt palette (#FFFAD3, #FFDBB0, #FFCCB8, #FFB1B1) with Lucide icons.
colors:
  # Color Hunt Official Palette (#fffad3, #ffdbb0, #ffccb8, #ffb1b1)
  ch-sunshine-cream: "#fffad3"
  ch-peach-apricot: "#ffdbb0"
  ch-coral-terracotta: "#ffccb8"
  ch-rose-blush: "#ffb1b1"

  # Light Mode (Warm Ivory & Apricot Sunset)
  bg-app: "#fcfaf6"
  bg-surface: "#ffffff"
  bg-surface-elevated: "#ffffff"
  bg-subtle: "#fffad3"
  text-primary: "#26201c"
  text-secondary: "#6e5f55"
  text-muted: "#9e8d82"
  border-color: "#f0e5d8"

  # Primary: Rich Espresso Slate
  primary-50: "#fffad3"
  primary-100: "#ffdbb0"
  primary-500: "#52433d"
  primary-600: "#382b26"
  primary-700: "#221915"

  # Accent: Sophisticated Sunset Terracotta & Peach
  accent: "#d96c4a"
  accent-hover: "#c25838"
  accent-text: "#ffffff"
  accent-subtle: "#ffdbb0"

  # Semantic Status
  success-50: "#f5faef"
  success-500: "#2d6a4f"
  success-600: "#23553f"
  danger-50: "#fff2f2"
  danger-100: "#ffb1b1"
  danger-500: "#c74949"
  danger-600: "#ab3737"
  warning-50: "#fffad3"
  warning-100: "#ffdbb0"
  warning-500: "#b86d00"
typography:
  sans:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  display:
    fontSize: "28px"
    lineHeight: "34px"
    fontWeight: 800
  title:
    fontSize: "21px"
    lineHeight: "27px"
    fontWeight: 700
  headline:
    fontSize: "16px"
    lineHeight: "22px"
    fontWeight: 600
  body:
    fontSize: "14px"
    lineHeight: "20px"
    fontWeight: 400
  caption:
    fontSize: "12px"
    lineHeight: "16px"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

## Web App Design System (Tailwind)

The website (`client/`) uses the system below; tokens live in `client/src/tailwind.css`. The frontmatter palette and the sections after this one describe the Expo mobile app (`mobile/`), which keeps its warm palette.

**Direction:** calm, trustworthy utility finance. Mobile-first, flat surfaces, one strong number per screen, no decorative gradients or emoji icons. Motion is limited to short color transitions and respects reduced-motion.

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#f5f6f8` | `#0b1120` | Page background |
| `surface` | `#ffffff` | `#141c2c` | Cards, bars, sheets |
| `subtle` | `#eef1f5` | `#1e2839` | Table heads, hover, inactive chips |
| `line` | `#dfe4ea` | `#2d394c` | Borders, dividers |
| `ink` / `ink-2` / `ink-3` | `#0f172a` / `#414e60` / `#5b6878` | `#f1f5f9` / `#c3cedb` / `#9aa8ba` | Primary, secondary, muted text |
| `primary` | `#0f172a` | `#f1f5f9` | Main buttons, active nav |
| `accent` | `#a16207` | `#f5bf42` | Solar accent, focus ring, active tab icon |
| `good` / `good-soft` | `#15703a` / `#dff3e6` | `#5fd38d` / `#12301f` | Export, surplus, credit |
| `bad` / `bad-soft` | `#b42318` / `#fde8e6` | `#ff8d84` / `#3b1a1a` | Import, deficit, payable, destructive |
| `hero` / `hero-cta` | `#10203a` / `#f5bf42` | `#1b2a44` / `#f5bf42` | Balance card and its main action |

**Type:** Inter, 16px inputs on phones (prevents iOS focus zoom), tabular numerals for all figures.

**Layout:** unprefixed utilities are the phone layout; `md:` tablet; `lg:` desktop. Phones and tablets use a 5-item tab bar (Home, Records, Add, Reports, Settings) and bottom sheets; desktop uses a sidebar and centered dialogs. Wide tables appear at `lg:` and become card lists below it.

**Touch:** interactive controls are at least 44px. The tab bar steps aside while typing, and page spacing stays constant so buttons never move mid-tap.

**Dashboard hierarchy:** balance hero (the one strong surface), today's reading status, month and meter summary, electricity bills, recent readings as a statement list.

**Components** (`@layer components`): `hero`, `btn`, `card`, `field`, `label`, `input`, `badge`, `stat`, `kv`, `chip`, `segmented`, `data-table`. Template helpers are in `client/assets/js/components/ui.js`.

**PDF/print statements** are fixed A4 documents styled by `client/assets/css/report-document.css`, deliberately separate from Tailwind.

## Overview

Solar Revenue Tracker is an enterprise-grade rooftop solar daily generation, grid consumption, financial revenue, net metering credit carry-forward, and DISCOM billing settlement application.

The design language embodies modern Apple-inspired executive minimalism:
- **Light Mode (Warm Ivory & Terracotta)**: Soft alabaster canvas (`#fcfaf6`), crisp white surfaces (`#ffffff`), warm sunshine cream accents (`#fffad3`), and sophisticated terracotta (`#d96c4a`).
- **Dark Mode (Apple Midnight Obsidian & Solar Emerald)**:
  - Ultra-luxurious midnight obsidian canvas (`#090a0f` / `#12151f`), completely eliminating muddy brown and sepia undertones.
  - Brilliant titanium white typography (`#ffffff`) and cool silver-slate (`#94a3b8`) for effortless readability.
  - Luminous solar emerald (`#10b981` / `#34d399`) for energy generation, positive credit balances, and active interaction states.
  - Crisp luminous coral rose (`#fb7185`) for grid import deficits and payable expenses.
- **Glassmorphism Navigation**: Translucent bottom capsule (`borderRadius: 32`, `bottom: 16`) with hardware backdrop blur (`blur(20px) saturate(160%)`), obsidian translucent overlay (`rgba(15, 18, 26, 0.82)`), specular top rim highlight, and emerald active indicators.
- **Anti-AI Slop**: Strictly avoids generic muddy brown gradients, flesh-peach band-aid pills, harsh neon glows, or cluttered dashboard tiles.

## Themes

| Token | Light Mode (Warm Ivory) | Dark Mode (Midnight Obsidian) | Design Intention |
| :--- | :--- | :--- | :--- |
| `bg-app` | `#fcfaf6` | `#090a0f` | Deep obsidian canvas (zero muddy brown) |
| `bg-surface` | `#ffffff` | `#12151f` | Elevated graphite obsidian cards |
| `bg-surface-elevated` | `#ffffff` | `#1a1f2e` | High-contrast elevated surfaces & active tabs |
| `bg-subtle` | `#fffad3` | `#222838` | Subtle card background |
| `text-primary` | `#26201c` | `#ffffff` | Brilliant crisp titanium white |
| `text-secondary` | `#6e5f55` | `#94a3b8` | Cool silver-slate for high legibility |
| `text-muted` | `#9e8d82` | `#64748b` | Muted cool slate |
| `accent` | `#d96c4a` (Terracotta) | `#10b981` (Solar Emerald) | Vibrant, professional clean energy |
| `primary` | `#382b26` (Espresso Slate) | `#cbd5e1` (Titanium) | Clean typography & interactive state |
| `success` | `#2d6a4f` (Soft Pine) | `#34d399` (Mint Emerald) | Solar surplus & credit generation |
| `danger` | `#c74949` (Muted Terracotta) | `#fb7185` (Luminous Coral Rose) | Grid consumption & payable costs |
| `warning` | `#b86d00` (Amber Gold) | `#fbbf24` (Luminous Solar Gold) | Notice / caution states |
| `border-color` | `#f0e5d8` | `rgba(255, 255, 255, 0.08)` | Specular Apple-style border |

## Components

- **Apple Glassmorphism Floating Navigation**:
  - Positioned absolutely above bottom safe areas (`bottom: 16`, `left: 20`, `right: 20`, `height: 64`, `borderRadius: 32`).
  - Native hardware blur combined with WebKit CSS `backdrop-filter: blur(20px) saturate(160%)`.
  - Translucent tint overlay with soft specular highlight rim (`rgba(255, 255, 255, 0.22)`).
  - Active tab indicators: Circular capsule with subtle emerald background tint (`rgba(16, 185, 129, 0.12)`) and Lucide outline icons.
  - Center Quick-Log button: 50dp raised circular pill in glowing solar emerald (`#10b981`) with white plus icon.
- **Pill Buttons**: `rounded.full` (48-54dp min touch target), with Lucide action icons and clear typography.
- **Dual Meter Cards**: Distinct cards with icon badges for Import (Grid, Lucide `Zap`) and Export (Solar, Lucide `SunMedium`) meters with real-time recalculation feedback.
- **Settlement Statements**: High-contrast carry-forward unit ledger with clear opening balance, previous month adjustments, and closing cumulative credit.

## Icon System (Lucide Icons)

All random Unicode characters, emojis, and ad-hoc glyphs are strictly replaced by **Lucide Icons** (`lucide-react-native`):
- **Stroke Width**: `1.8` - `2.2` for balanced, Apple-inspired outline aesthetics.
- **Icon Sizing Standards**:
  - Micro / Inline button icons: `13px` - `16px`
  - Action button icons: `16px` - `18px`
  - Navigation tab icons: `22px`
  - Action center button: `26px`
  - Large feature / logo icons: `36px` - `40px`
- **Icon Mapping Directory**:
  - Dashboard Tab: `LayoutGrid`
  - Settlement Ledger Tab: `Scale`
  - Daily Entry Center Button: `Plus`
  - History Tab: `History`
  - Settings Tab: `Settings`
  - Solar Generation: `SunMedium`
  - Grid Consumption: `Zap`
  - Light / Dark Mode Toggle: `Sun` / `Moon`
  - Navigation / Links: `ChevronRight`, `ArrowUpRight`, `ArrowDownRight`
  - Actions: `Check`, `RotateCcw`, `Edit3`, `Trash2`, `Search`, `X`
  - Connectivity & Web: `Globe`
  - Empty States: `FileText`, `BarChart3`, `FileSpreadsheet`
