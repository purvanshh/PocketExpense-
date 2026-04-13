// PocketExpense+ Theme - Violet Glassmorphism Design System

export {
    categories,
    categoryTint,
    darkColors,
    lightColors,
    paymentMethods,
    type CategoryKey,
    type ThemeColors,
} from './colors';
export { makeStyles } from './makeStyles';
export { ThemeProvider, useTheme, type ThemeMode } from './ThemeContext';

import { lightColors } from './colors';

/**
 * @deprecated Static light palette. Kept so non-visual modules can read a
 * colour without a React context. Anything that renders should use
 * `useTheme().colors` (or `makeStyles`) so it responds to the dark scheme.
 */
export const colors = lightColors;

export const borderRadius = {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    full: 9999,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

// Shadows read as depth on light backgrounds but disappear on dark ones, where
// a lifted surface colour does the same job. `useElevation` picks between them.
export const shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    cardHeavy: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    tabBar: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    fab: {
        shadowColor: '#8A64EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 12,
    },
};

/** Dark-mode shadow set: softer, since contrast comes from surface colour. */
export const darkShadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeavy: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    },
    tabBar: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 8,
    },
    fab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
};

/** Pick the shadow set matching the active scheme. */
export const elevation = (isDark: boolean) => (isDark ? darkShadows : shadows);

export const typography = {
    fontFamily: {
        regular: 'Poppins_400Regular',
        medium: 'Poppins_500Medium',
        semiBold: 'Poppins_600SemiBold',
        bold: 'Poppins_700Bold',
    },
    sizes: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        xxl: 24,
        xxxl: 32,
        hero: 40,
    },
};
