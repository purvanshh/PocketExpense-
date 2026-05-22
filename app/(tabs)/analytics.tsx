import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InsightCard } from '../../src/components/analytics/InsightCard';
import { SpendingChart } from '../../src/components/analytics/SpendingChart';
import { Card } from '../../src/components/common/Card';
import apiClient from '../../src/store/api/apiClient';
import { useAppSelector } from '../../src/store/hooks';
import { borderRadius, elevation, makeStyles, spacing, typography, useTheme } from '../../src/theme';
import { formatCurrency } from '../../src/utils/formatters';

interface InsightsData {
    currentMonth: {
        expense: number;
        income: number;
        balance: number;
    };
    previousMonth: {
        expense: number;
        income: number;
    };
    comparison: {
        expenseChange: number;
        incomeChange: number;
    };
    categoryBreakdown: Array<{
        _id: string;
        total: number;
        count: number;
    }>;
    monthlyTrend: Array<{
        _id: { month: number; year: number; type: string };
        total: number;
    }>;
}

export default function AnalyticsScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAppSelector((state) => state.auth);
    const { items, totalExpense, totalIncome } = useAppSelector(
        (state) => state.expenses
    );

    const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
    const [refreshing, setRefreshing] = useState(false);
    const [insights, setInsights] = useState<InsightsData | null>(null);

    const fetchInsights = async () => {
        try {
            const response = await apiClient.get('/expenses/insights');
            setInsights(response.data);
        } catch (error) {
            console.error('Failed to fetch insights:', error);
            // Use local data as fallback
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchInsights();
        setRefreshing(false);
    };

    // Prepare chart data from local data or API insights
    const chartData = React.useMemo(() => {
        if (insights?.monthlyTrend) {
            // Group by month
            const monthlyData: Record<string, { income: number; expense: number }> = {};
            insights.monthlyTrend.forEach((item) => {
                const key = `${item._id.year}-${item._id.month}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = { income: 0, expense: 0 };
                }
                if (item._id.type === 'income') {
                    monthlyData[key].income = item.total;
                } else {
                    monthlyData[key].expense = item.total;
                }
            });

            return Object.entries(monthlyData)
                .map(([key, data]) => {
                    const [year, month] = key.split('-').map(Number);
                    return { month, year, ...data };
                })
                .slice(-6);
        }

        // Fallback to generating from local data
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthItems = items.filter((item) => {
                const itemDate = new Date(item.date);
                return (
                    itemDate.getMonth() === date.getMonth() &&
                    itemDate.getFullYear() === date.getFullYear()
                );
            });

            const income = monthItems
                .filter((i) => i.type === 'income')
                .reduce((sum, i) => sum + i.amount, 0);
            const expense = monthItems
                .filter((i) => i.type === 'expense')
                .reduce((sum, i) => sum + i.amount, 0);

            months.push({
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                income,
                expense,
            });
        }
        return months;
    }, [insights, items]);

    // Calculate percentage change
    const expenseChange = insights?.comparison?.expenseChange ?? 0;
    const currentExpense = insights?.currentMonth?.expense ?? totalExpense;
    const currentIncome = insights?.currentMonth?.income ?? totalIncome;

    // Get history items (grouped by date)
    const historyItems = React.useMemo(() => {
        const grouped: Record<string, { expense: number; income: number }> = {};
        items.forEach((item) => {
            const dateKey = format(new Date(item.date), 'dd MMMM yyyy');
            if (!grouped[dateKey]) {
                grouped[dateKey] = { expense: 0, income: 0 };
            }
            if (item.type === 'expense') {
                grouped[dateKey].expense += item.amount;
            } else {
                grouped[dateKey].income += item.amount;
            }
        });

        return Object.entries(grouped)
            .slice(0, 5)
            .map(([date, data]) => ({ date, ...data }));
    }, [items]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Analytics</Text>
                </View>

                {/* View Mode Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            viewMode === 'monthly' && styles.toggleButtonActive,
                        ]}
                        onPress={() => setViewMode('monthly')}
                    >
                        <Text
                            style={[
                                styles.toggleText,
                                viewMode === 'monthly' && styles.toggleTextActive,
                            ]}
                        >
                            Monthly ▾
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Chart Card */}
                <Card style={styles.chartCard}>
                    <SpendingChart data={chartData} currency={user?.currency} />
                </Card>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <InsightCard
                        title="Income"
                        amount={currentIncome}
                        currency={user?.currency}
                        icon="trending-up"
                        iconColor={colors.success}
                        iconBgColor={colors.successBg}
                    />
                    <View style={{ width: spacing.md }} />
                    <InsightCard
                        title="Expenses"
                        amount={currentExpense}
                        currency={user?.currency}
                        icon="trending-down"
                        iconColor={colors.error}
                        iconBgColor={colors.errorBg}
                    />
                </View>

                {/* History Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>History</Text>

                    <Card style={styles.historyCard}>
                        {historyItems.length === 0 ? (
                            <Text style={styles.emptyText}>No history yet</Text>
                        ) : (
                            historyItems.map((item, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.historyItem,
                                        index < historyItems.length - 1 && styles.historyItemBorder,
                                    ]}
                                >
                                    <View>
                                        <Text style={styles.historyLabel}>Date</Text>
                                        <Text style={styles.historyDate}>{item.date}</Text>
                                    </View>
                                    <View style={styles.historyAmounts}>
                                        {item.income > 0 && (
                                            <Text style={styles.historyIncome}>
                                                +{formatCurrency(item.income, user?.currency)}
                                            </Text>
                                        )}
                                        {item.expense > 0 && (
                                            <Text style={styles.historyExpense}>
                                                -{formatCurrency(item.expense, user?.currency)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((c, isDark) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
    },
    header: {
        paddingVertical: spacing.lg,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    toggleButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: c.inputBg,
    },
    toggleButtonActive: {
        backgroundColor: c.cardBg,
        ...elevation(isDark).card,
    },
    toggleText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    toggleTextActive: {
        color: c.textMain,
    },
    chartCard: {
        marginBottom: spacing.lg,
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.xl,
        color: c.textMain,
        marginBottom: spacing.lg,
    },
    historyCard: {
        padding: 0,
        overflow: 'hidden',
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
    },
    historyItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: c.inputBg,
    },
    historyLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginBottom: 2,
    },
    historyDate: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    historyAmounts: {
        alignItems: 'flex-end',
    },
    historyIncome: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.sm,
        color: c.success,
    },
    historyExpense: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.sm,
        color: c.error,
    },
    emptyText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
        textAlign: 'center',
        padding: spacing.xl,
    },
}));
