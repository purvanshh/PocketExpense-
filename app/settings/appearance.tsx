import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    borderRadius,
    makeStyles,
    spacing,
    typography,
    useTheme,
    type ThemeMode,
} from '../../src/theme';

const OPTIONS: {
    mode: ThemeMode;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
        {
            mode: 'system',
            label: 'Match system',
            description: 'Follow your phone’s light or dark setting',
            icon: 'phone-portrait-outline',
        },
        {
            mode: 'light',
            label: 'Light',
            description: 'Always use the light theme',
            icon: 'sunny-outline',
        },
        {
            mode: 'dark',
            label: 'Dark',
            description: 'Always use the dark theme',
            icon: 'moon-outline',
        },
    ];

export default function AppearanceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = useStyles();
    const { colors, mode, setMode } = useTheme();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={24} color={colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Appearance</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Theme</Text>

                <View style={styles.card}>
                    {OPTIONS.map((option, index) => {
                        const isSelected = mode === option.mode;

                        return (
                            <TouchableOpacity
                                key={option.mode}
                                style={[
                                    styles.option,
                                    index < OPTIONS.length - 1 && styles.optionDivider,
                                ]}
                                onPress={() => setMode(option.mode)}
                                activeOpacity={0.7}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={option.label}
                            >
                                <View style={styles.optionIcon}>
                                    <Ionicons
                                        name={option.icon}
                                        size={20}
                                        color={isSelected ? colors.primary : colors.textSecondary}
                                    />
                                </View>
                                <View style={styles.optionText}>
                                    <Text
                                        style={[
                                            styles.optionLabel,
                                            isSelected && { color: colors.primary },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                    <Text style={styles.optionDescription}>
                                        {option.description}
                                    </Text>
                                </View>
                                {isSelected && (
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={22}
                                        color={colors.primary}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.footnote}>
                    Dark mode reduces glare in low light and can save battery on OLED
                    screens.
                </Text>
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
    },
    content: {
        padding: spacing.xl,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
    },
    optionDivider: {
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    optionIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.sm,
        backgroundColor: c.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    optionDescription: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: 2,
    },
    footnote: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: spacing.lg,
        lineHeight: 18,
    },
}));
