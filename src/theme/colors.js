/**
 * Midnight Navy + Emerald Brand Design System Colors
 */

export const brand = {
  primary: '#0F172A',         // Midnight Navy
  primaryDark: '#020617',     // Deepest Navy / Black
  primarySurface: '#1E293B',  // Slate Surface
  emerald: '#10B981',         // Brand Accent / Emerald
  emeraldDark: '#059669',
  emeraldLight: '#34D399',
};

export const semantic = {
  income: '#22C55E',          // Green
  expense: '#F43F5E',         // Red
  warning: '#F59E0B',         // Amber
  ai: '#6366F1',              // Indigo
};

export const lightTheme = {
  dark: false,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  disabled: '#CBD5E1',
  primary: brand.primary,
  accent: brand.emerald,
  income: semantic.income,
  expense: semantic.expense,
  warning: semantic.warning,
  ai: semantic.ai,
};

export const darkTheme = {
  dark: true,
  background: '#020617',
  surface: '#0F172A',
  surfaceElevated: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  disabled: '#475569',
  primary: brand.emerald,     // High-visibility accent in dark mode
  accent: brand.emerald,
  income: semantic.income,
  expense: semantic.expense,
  warning: semantic.warning,
  ai: semantic.ai,
};

export default {
  brand,
  semantic,
  lightTheme,
  darkTheme,
};
