import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import {
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { brand, semantic, lightTheme, darkTheme } from './colors';
import spacing from './spacing';
import typography from './typography';

/**
 * Custom Paper MD3 Light Theme (Midnight Navy + Emerald)
 */
export const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,              // #0F172A
    onPrimary: '#FFFFFF',
    primaryContainer: '#E2E8F0',
    onPrimaryContainer: brand.primary,
    secondary: brand.emerald,            // #10B981
    onSecondary: '#FFFFFF',
    secondaryContainer: '#D1FAE5',
    onSecondaryContainer: brand.emeraldDark,
    tertiary: semantic.ai,
    error: semantic.expense,             // #F43F5E
    background: lightTheme.background,   // #F8FAFC
    surface: lightTheme.surface,         // #FFFFFF
    surfaceVariant: lightTheme.surfaceElevated,
    onSurface: lightTheme.text,          // #0F172A
    onSurfaceVariant: lightTheme.textSecondary, // #64748B
    outline: lightTheme.border,          // #E2E8F0
  },
};

/**
 * Custom Paper MD3 Dark Theme (Deep Navy + Emerald)
 */
export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.emerald,              // #10B981 for strong contrast in dark mode
    onPrimary: '#020617',
    primaryContainer: brand.primarySurface, // #1E293B
    onPrimaryContainer: '#D1FAE5',
    secondary: brand.emeraldLight,       // #34D399
    onSecondary: '#020617',
    secondaryContainer: '#064E3B',
    onSecondaryContainer: '#A7F3D0',
    tertiary: semantic.ai,
    error: semantic.expense,             // #F43F5E
    background: darkTheme.background,    // #020617
    surface: darkTheme.surface,          // #0F172A
    surfaceVariant: darkTheme.surfaceElevated, // #1E293B
    onSurface: darkTheme.text,           // #F8FAFC
    onSurfaceVariant: darkTheme.textSecondary, // #94A3B8
    outline: darkTheme.border,           // #334155
  },
};

/**
 * Custom React Navigation Light Theme
 */
export const navLightTheme = {
  ...NavLightTheme,
  colors: {
    ...NavLightTheme.colors,
    primary: brand.emerald,
    background: lightTheme.background,
    card: lightTheme.surface,
    text: lightTheme.text,
    border: lightTheme.border,
    notification: brand.emerald,
  },
};

/**
 * Custom React Navigation Dark Theme
 */
export const navDarkTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: brand.emerald,
    background: darkTheme.background,
    card: darkTheme.surface,
    text: darkTheme.text,
    border: darkTheme.border,
    notification: brand.emerald,
  },
};

export { brand, semantic, lightTheme, darkTheme, spacing, typography };

export default {
  brand,
  semantic,
  light: lightTheme,
  dark: darkTheme,
  paperLight: paperLightTheme,
  paperDark: paperDarkTheme,
  navLight: navLightTheme,
  navDark: navDarkTheme,
  spacing,
  typography,
};
