import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'themeMode';

interface ThemeContextValue {
    /** The palette for the currently active scheme. */
    colors: ThemeColors;
    /** True when dark colours are in use, whether chosen or inherited from the OS. */
    isDark: boolean;
    /** The user's stored preference, which may be 'system'. */
    mode: ThemeMode;
    /** Persist a new preference. */
    setMode: (mode: ThemeMode) => void;
    /** False until the stored preference has been read back. */
    isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [isReady, setIsReady] = useState(false);

    // Restore the saved preference once on mount.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (!cancelled && (stored === 'light' || stored === 'dark' || stored === 'system')) {
                    setModeState(stored);
                }
            } catch {
                // Fall back to 'system' — a missing preference is not an error.
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
            // A failed write only costs the preference on next launch.
        });
    }, []);

    const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

    const value = useMemo<ThemeContextValue>(
        () => ({
            colors: isDark ? darkColors : lightColors,
            isDark,
            mode,
            setMode,
            isReady,
        }),
        [isDark, mode, setMode, isReady]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used inside a <ThemeProvider>');
    }
    return ctx;
};
