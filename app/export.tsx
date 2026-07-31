import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import {
    exportCSV,
    exportPDF,
    selectForExport,
    summarise,
    type ExportRange,
} from '../src/services/export';
import { useAppSelector } from '../src/store/hooks';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../src/theme';
import { formatCurrency } from '../src/utils/formatters';

type PeriodKey = 'this-month' | 'last-month' | 'last-3' | 'this-year' | 'all';

const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function buildRange(key: PeriodKey, now = new Date()): ExportRange {
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (key) {
        case 'last-month': {
            const start = new Date(year, month - 1, 1);
            return {
                start,
                end: new Date(year, month, 0, 23, 59, 59, 999),
                label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            };
        }
        case 'last-3': {
            const start = new Date(year, month - 2, 1);
            return { start, end: endOfDay(now), label: 'Last 3 months' };
        }
        case 'this-year':
            return {
                start: new Date(year, 0, 1),
                end: endOfDay(now),
                label: String(year),
            };
        case 'all':
            return { start: new Date(0), end: endOfDay(now), label: 'All time' };
        case 'this-month':
        default: {
            const start = new Date(year, month, 1);
            return {
                start,
                end: endOfDay(now),
                label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            };
        }
    }
}

const PERIODS: { key: PeriodKey; label: string }[] = [
    { key: 'this-month', label: 'This month' },
    { key: 'last-month', label: 'Last month' },
    { key: 'last-3', label: 'Last 3 months' },
    { key: 'this-year', label: 'This year' },
    { key: 'all', label: 'All time' },
];

export default function ExportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = useStyles();
    const { colors } = useTheme();

    const { items } = useAppSelector((s) => s.expenses);
    const { user } = useAppSelector((s) => s.auth);
    const currency = user?.currency ?? 'INR';

    const [period, setPeriod] = useState<PeriodKey>('this-month');
    const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);

    const range = useMemo(() => buildRange(period), [period]);
    const rows = useMemo(() => selectForExport(items, range), [items, range]);
    const summary = useMemo(() => summarise(rows), [rows]);

    const run = async (kind: 'csv' | 'pdf') => {
        if (rows.length === 0) {
            Alert.alert('Nothing to export', 'There are no transactions in this period.');
            return;
        }

        setBusy(kind);
        try {
            if (kind === 'csv') {
                await exportCSV(rows, range);
            } else {
                await exportPDF(rows, range, currency);
            }
        } catch (error: any) {
            Alert.alert(
                'Export failed',
                error?.message ?? 'Could not create the file. Please try again.'
            );
        } finally {
            setBusy(null);
        }
    };

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
                <Text style={styles.headerTitle}>Export</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Period</Text>
                <View style={styles.chipWrap}>
                    {PERIODS.map((p) => {
                        const active = period === p.key;
                        return (
                            <TouchableOpacity
                                key={p.key}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => setPeriod(p.key)}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Card style={styles.summaryCard}>
                    <Text style={styles.summaryPeriod}>{range.label}</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Transactions</Text>
                        <Text style={styles.summaryValue}>{summary.count}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Spent</Text>
                        <Text style={[styles.summaryValue, { color: colors.error }]}>
                            {formatCurrency(summary.totalExpense, currency)}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Received</Text>
                        <Text style={[styles.summaryValue, { color: colors.success }]}>
                            {formatCurrency(summary.totalIncome, currency)}
                        </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                        <Text style={styles.summaryKey}>Net</Text>
                        <Text style={styles.summaryValue}>
                            {formatCurrency(summary.balance, currency)}
                        </Text>
                    </View>
                </Card>

                <Button
                    title={busy === 'csv' ? 'Preparing…' : 'Export as CSV'}
                    onPress={() => run('csv')}
                    loading={busy === 'csv'}
                    disabled={busy !== null}
                    style={styles.action}
                    icon={<Ionicons name="grid-outline" size={18} color={colors.textWhite} />}
                />

                <Button
                    title={busy === 'pdf' ? 'Preparing…' : 'Export as PDF'}
                    onPress={() => run('pdf')}
                    loading={busy === 'pdf'}
                    disabled={busy !== null}
                    variant="outline"
                    style={styles.action}
                    icon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
                />

                <Text style={styles.footnote}>
                    CSV opens in any spreadsheet app. Amounts are signed, so spending is
                    negative and income positive — summing the column gives your net.
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
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.full,
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
    summaryCard: {
        marginTop: spacing.xl,
    },
    summaryPeriod: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
        marginBottom: spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: c.border,
        marginTop: spacing.xs,
        paddingTop: spacing.md,
    },
    summaryKey: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
    },
    summaryValue: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    action: {
        marginTop: spacing.lg,
    },
    footnote: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: spacing.xl,
        lineHeight: 18,
    },
}));
