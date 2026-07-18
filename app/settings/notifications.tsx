import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    DEFAULT_PREFS,
    ensurePermission,
    loadPrefs,
    savePrefs,
    type NotificationPrefs,
} from '../../src/services/notifications';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../src/theme';

const THRESHOLDS = [50, 75, 80, 90];

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = useStyles();
    const { colors } = useTheme();

    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        loadPrefs().then((p) => {
            setPrefs(p);
            setLoading(false);
        });
    }, []);

    const update = async (patch: Partial<NotificationPrefs>) => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        await savePrefs(next);

        // Ask for permission the moment alerts are switched on, so the user
        // finds out here rather than silently missing their first alert.
        if (patch.enabled) {
            const granted = await ensurePermission();
            setPermissionDenied(!granted);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

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
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={[styles.row, styles.rowDivider]}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowLabel}>Budget alerts</Text>
                            <Text style={styles.rowDescription}>
                                Get notified as you approach your limits
                            </Text>
                        </View>
                        <Switch
                            value={prefs.enabled}
                            onValueChange={(v) => update({ enabled: v })}
                            trackColor={{ false: colors.inputBg, true: colors.primary }}
                            thumbColor={colors.cardBg}
                        />
                    </View>

                    <View style={[styles.row, styles.rowDivider]}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowLabel}>Alert when exceeded</Text>
                            <Text style={styles.rowDescription}>
                                A second alert once a budget is fully spent
                            </Text>
                        </View>
                        <Switch
                            value={prefs.notifyOnExceed}
                            onValueChange={(v) => update({ notifyOnExceed: v })}
                            disabled={!prefs.enabled}
                            trackColor={{ false: colors.inputBg, true: colors.primary }}
                            thumbColor={colors.cardBg}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowLabel}>Auto-added transactions</Text>
                            <Text style={styles.rowDescription}>
                                Tell me when an SMS is logged automatically
                            </Text>
                        </View>
                        <Switch
                            value={prefs.notifyOnAutoAdd}
                            onValueChange={(v) => update({ notifyOnAutoAdd: v })}
                            disabled={!prefs.enabled}
                            trackColor={{ false: colors.inputBg, true: colors.primary }}
                            thumbColor={colors.cardBg}
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Warn me at</Text>
                <View style={styles.chipRow}>
                    {THRESHOLDS.map((value) => {
                        const active = prefs.warnThreshold === value;
                        return (
                            <TouchableOpacity
                                key={value}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => update({ warnThreshold: value })}
                                disabled={!prefs.enabled}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {value}%
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {permissionDenied && (
                    <View style={styles.warning}>
                        <Ionicons name="warning-outline" size={18} color={colors.warning} />
                        <Text style={styles.warningText}>
                            Notification permission was denied. Enable it in your device
                            settings for alerts to appear.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
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
    card: {
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
    },
    rowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    rowText: {
        flex: 1,
    },
    rowLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    rowDescription: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: 2,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    chipRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    chip: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
    },
    chipActive: {
        backgroundColor: c.primary,
    },
    chipText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    chipTextActive: {
        color: c.textWhite,
    },
    warning: {
        flexDirection: 'row',
        gap: spacing.sm,
        backgroundColor: c.warningBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginTop: spacing.xl,
    },
    warningText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textMain,
        lineHeight: 18,
    },
}));
