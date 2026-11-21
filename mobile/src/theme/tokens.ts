/**
 * Refined Apple-Style Design Tokens
 * Soft, Muted, Calm, Elegant, and Professional palette.
 * Eliminates harsh neon colors, extreme saturations, and pitch-black voids.
 */

export const colors = {
  light: {
    // Warm alabaster canvas with subtle cream undertones
    bgApp: '#fcfaf6',
    bgSurface: '#ffffff',
    bgSurfaceElevated: '#ffffff',
    bgSubtle: '#fffad3', // Color Hunt 1: Warm Sunshine Cream
    bgSidebar: '#241e1b',

    textPrimary: '#26201c',
    textSecondary: '#6e5f55',
    textMuted: '#9e8d82',
    textInverse: '#ffffff',

    borderColor: '#f0e5d8',
    borderHover: '#e3d2bf',

    // Primary: Rich Warm Espresso Slate
    primary50: '#fffad3', // Color Hunt 1
    primary100: '#ffdbb0', // Color Hunt 2
    primary500: '#52433d',
    primary600: '#382b26',
    primary700: '#221915',

    // Accent: Sophisticated Coral Terracotta (Derived from #FFCCB8 for accessible contrast)
    accent: '#d96c4a',
    accentHover: '#c25838',
    accentText: '#ffffff',
    accentSubtle: '#ffdbb0', // Color Hunt 2: Warm Soft Peach

    // Success (Solar surplus / credit): Balanced Soft Pine / Sage with Sunshine undertone
    success50: '#f5faef',
    success100: '#e1f0d3',
    success500: '#2d6a4f',
    success600: '#23553f',
    successText: '#1b4733',

    // Danger (Grid deficit / payable): Warm Rose Terracotta
    danger50: '#fff2f2',
    danger100: '#ffb1b1', // Color Hunt 4: Warm Soft Rose
    danger500: '#c74949',
    danger600: '#ab3737',
    dangerText: '#7d2424',

    // Warning: Warm Apricot Sand & Sunshine
    warning50: '#fffad3', // Color Hunt 1: #FFFAD3
    warning100: '#ffdbb0', // Color Hunt 2: #FFDBB0
    warning500: '#b86d00',
    warningText: '#7e4700',

    // Hero Cards
    heroCardBg: '#ffffff',
    heroCardBorder: '#f0e5d8',
  },
  dark: {
    // Professional Charcoal-Slate Foundation (Deep, calm, zero pitch-black void, clear surface hierarchy)
    bgApp: '#0f1219',
    bgSurface: '#171c26',
    bgSurfaceElevated: '#1f2533',
    bgSubtle: '#121620',
    bgSidebar: '#0d1017',

    // Calm, readable text contrast
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textInverse: '#0f172a',

    // Subtle, solid, clean borders
    borderColor: '#232a38',
    borderHover: '#333d4e',

    // Primary: Refined Slate Titanium
    primary50: 'rgba(148, 163, 184, 0.12)',
    primary100: 'rgba(148, 163, 184, 0.22)',
    primary500: '#94a3b8',
    primary600: '#cbd5e1',
    primary700: '#f1f5f9',

    // Accent: Sophisticated Warm Terracotta / Solar Coral (Consistent with Light Mode brand identity, non-neon)
    accent: '#e07a5f',
    accentHover: '#c86b52',
    accentText: '#ffffff',
    accentSubtle: 'rgba(224, 122, 95, 0.15)',

    // Success (Solar surplus / credit): Grounded, clean emerald
    success50: 'rgba(16, 185, 129, 0.12)',
    success100: 'rgba(16, 185, 129, 0.22)',
    success500: '#10b981',
    success600: '#059669',
    successText: '#34d399',

    // Danger (Grid deficit / payable): Grounded, clean coral-rose
    danger50: 'rgba(239, 68, 68, 0.12)',
    danger100: 'rgba(239, 68, 68, 0.22)',
    danger500: '#ef4444',
    danger600: '#dc2626',
    dangerText: '#f87171',

    // Warning: Grounded Solar Amber
    warning50: 'rgba(245, 158, 11, 0.12)',
    warning100: 'rgba(245, 158, 11, 0.22)',
    warning500: '#f59e0b',
    warningText: '#fbbf24',

    // Hero Cards
    heroCardBg: '#171c26',
    heroCardBorder: '#232a38',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const rounded = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  micro: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  floatingBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
};
