import { useMemo } from 'react';
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import type { ThemeColors } from './colors';
import { useTheme } from './ThemeContext';

// Mirrors React Native's own StyleSheet.create signature. The `T & NamedStyles<any>`
// parameter position is what makes string literals such as `alignItems: 'center'`
// narrow to their union type instead of widening to `string`.
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Builds a hook that returns theme-aware styles.
 *
 * StyleSheet.create is normally called at module scope, which freezes the
 * colours at import time and makes a runtime theme switch impossible. This
 * defers the call into the component and memoises per palette, so styles are
 * rebuilt only when the scheme actually flips.
 *
 *   const useStyles = makeStyles((c) => ({
 *       card: { backgroundColor: c.cardBg },
 *   }));
 *
 *   const styles = useStyles();
 */
export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
    factory: (colors: ThemeColors, isDark: boolean) => T & NamedStyles<any>
) {
    return function useStyles(): T {
        const { colors, isDark } = useTheme();
        return useMemo(
            () => StyleSheet.create(factory(colors, isDark)),
            [colors, isDark]
        );
    };
}
