import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../src/components/common/Card';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { fetchAdvancedInsights } from '../src/store/slices/insightSlice';
import { borderRadius, categories, colors, shadows, spacing, typography } from '../src/theme';
import { formatCurrency } from '../src/utils/formatters';

const { width } = Dimensions.get('window');

export default function InsightsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();

    const { advancedInsights, isLoading } = useAppSelector((state) => state.insights);
    const { user } = useAppSelector((state) => state.auth);

    useEffect(() => {
        dispatch(fetchAdvancedInsights());
    }, [dispatch]);

    const onRefresh = () => {
        dispatch(fetchAdvancedInsights());
    };

    const renderGrowthChart = () => {
        const rates = advancedInsights?.monthlyGrowthRate?.rates || [];
        if (rates.length === 0) return null;

        const maxTotal = Math.max(...rates.map((r) => r.total), 1);
        const barWidth = Math.max((width - 100) / rates.length - 12, 20);

        return (
            <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="trending-up" size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Monthly Spending Trend</Text>
                </View>
                <Text style={styles.avgGrowth}>
                    Avg Growth: {advancedInsights?.monthlyGrowthRate.averageGrowthRate}%
                </Text>
                <View style={styles.chartContainer}>
                    {rates.map((rate, index) => (
                        <View key={index} style={styles.barGroup}>
                            <View style={styles.barWrapper}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height: (rate.total / maxTotal) * 120,
                                            width: barWidth,
                                            backgroundColor: rate.growthRate > 0 ? colors.error : colors.success,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][rate.month - 1]}
                            </Text>
                            <Text style={[styles.growthLabel, { color: rate.growthRate > 0 ? colors.error : colors.success }]}>
                                {rate.growthRate > 0 ? '+' : ''}{rate.growthRate}%
                            </Text>
                        </View>
                    ))}
                </View>
            </Card>
        );
    };

    const renderTopCategories = () => {
        const topCats = advancedInsights?.topCategories || [];
        if (topCats.length === 0) return null;

        const maxTotal = topCats[0]?.total || 1;

        return (
            <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="podium" size={20} color={colors.warning} />
                    <Text style={styles.sectionTitle}>Top 3 Categories</Text>
                </View>
                {topCats.map((cat, index) => {
                    const catInfo = categories[cat._id as keyof typeof categories];
                    const percentage = (cat.total / maxTotal) * 100;
                    return (
                        <View key={cat._id} style={styles.categoryRow}>
                            <View style={styles.categoryLeft}>
                                <Text style={styles.rankBadge}>{index + 1}</Text>
                                <View style={[styles.catIcon, { backgroundColor: catInfo?.color || colors.inputBg }]}>
                                    <Text>{catInfo?.icon || '?'}</Text>
                                </View>
                                <View style={styles.catInfo}>
                                    <Text style={styles.catName}>{catInfo?.label || cat._id}</Text>
                                    <Text style={styles.catCount}>{cat.count} transactions</Text>
                                </View>
                            </View>
                            <View style={styles.categoryRight}>
                                <Text style={styles.catAmount}>{formatCurrency(cat.total, user?.currency)}</Text>
                                <View style={styles.miniBar}>
                                    <View style={[styles.miniBarFill, { width: `${percentage}%` }]} />
                                </View>
                            </View>
                        </View>
                    );
                })}
            </Card>
        );
    };

    const renderWeekdayWeekend = () => {
        const data = advancedInsights?.weekdayVsWeekend;
        if (!data) return null;

        const totalSpend = data.weekday.total + data.weekend.total;
        const weekdayPct = totalSpend > 0 ? (data.weekday.total / totalSpend) * 100 : 0;
        const weekendPct = totalSpend > 0 ? (data.weekend.total / totalSpend) * 100 : 0;

        return (
            <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="calendar" size={20} color={colors.info} />
                    <Text style={styles.sectionTitle}>Weekday vs Weekend</Text>
                </View>
                <View style={styles.comparisonRow}>
                    <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Weekdays</Text>
                        <Text style={styles.comparisonAmount}>{formatCurrency(data.weekday.total, user?.currency)}</Text>
                        <Text style={styles.comparisonSub}>{data.weekday.count} transactions</Text>
                        <View style={[styles.comparisonBar, { backgroundColor: colors.primary }]}>
                            <View style={{ width: `${weekdayPct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 4 }} />
                        </View>
                        <Text style={styles.comparisonPct}>{weekdayPct.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Weekends</Text>
                        <Text style={styles.comparisonAmount}>{formatCurrency(data.weekend.total, user?.currency)}</Text>
                        <Text style={styles.comparisonSub}>{data.weekend.count} transactions</Text>
                        <View style={[styles.comparisonBar, { backgroundColor: colors.chartLime }]}>
                            <View style={{ width: `${weekendPct}%`, height: '100%', backgroundColor: colors.chartLime, borderRadius: 4 }} />
                        </View>
                        <Text style={styles.comparisonPct}>{weekendPct.toFixed(1)}%</Text>
                    </View>
                </View>
            </Card>
        );
    };

    const renderAnomalies = () => {
        const anomalies = advancedInsights?.anomalies;
        if (!anomalies || !anomalies.detected) return null;

        return (
            <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                    <Text style={styles.sectionTitle}>Unusual Spending</Text>
                </View>
                <Text style={styles.anomalyInfo}>
                    Avg: {formatCurrency(anomalies.stats?.mean || 0, user?.currency)} | Std Dev: {formatCurrency(anomalies.stats?.stdDev || 0, user?.currency)}
                </Text>
                {anomalies.items.map((item, index) => {
                    const catInfo = categories[item.category as keyof typeof categories];
                    return (
                        <View key={index} style={styles.anomalyRow}>
                            <View style={styles.anomalyLeft}>
                                <Text>{catInfo?.icon || '?'}</Text>
                                <View>
                                    <Text style={styles.anomalyCategory}>{catInfo?.label || item.category}</Text>
                                    <Text style={styles.anomalyDate}>
                                        {new Date(item.date).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.anomalyRight}>
                                <Text style={styles.anomalyAmount}>
                                    {formatCurrency(item.amount, user?.currency)}
                                </Text>
                                <Text style={[styles.zScore, { color: item.zScore > 0 ? colors.error : colors.success }]}>
                                    z: {item.zScore}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </Card>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Smart Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoading && !advancedInsights ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Analyzing your spending...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {renderGrowthChart()}
                    {renderTopCategories()}
                    {renderWeekdayWeekend()}
                    {renderAnomalies()}

                    {!advancedInsights && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📈</Text>
                            <Text style={styles.emptyText}>No insights available yet</Text>
                            <Text style={styles.emptySubtext}>Add more transactions to see spending patterns</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xl, color: colors.textMain },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.md, color: colors.textSecondary, marginTop: spacing.lg },
    sectionCard: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.lg, color: colors.textMain },
    avgGrowth: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
    chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 170, paddingTop: spacing.md },
    barGroup: { alignItems: 'center' },
    barWrapper: { height: 120, justifyContent: 'flex-end' },
    bar: { borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 4 },
    barLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 4 },
    growthLabel: { fontFamily: typography.fontFamily.medium, fontSize: 9 },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.inputBg },
    categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rankBadge: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.lg, color: colors.primary, width: 24 },
    catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    catInfo: {},
    catName: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.md, color: colors.textMain },
    catCount: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.xs, color: colors.textSecondary },
    categoryRight: { alignItems: 'flex-end' },
    catAmount: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.md, color: colors.textMain },
    miniBar: { height: 4, width: 60, backgroundColor: colors.inputBg, borderRadius: 2, marginTop: 4 },
    miniBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
    comparisonRow: { flexDirection: 'row', gap: spacing.md },
    comparisonItem: { flex: 1, alignItems: 'center' },
    comparisonLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.sm, color: colors.textSecondary },
    comparisonAmount: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xl, color: colors.textMain, marginVertical: spacing.xs },
    comparisonSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.xs, color: colors.textSecondary },
    comparisonBar: { height: 6, width: '100%', borderRadius: 3, marginTop: spacing.sm, opacity: 0.3 },
    comparisonPct: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.sm, color: colors.textMain, marginTop: 4 },
    divider: { width: 1, backgroundColor: colors.inputBg },
    anomalyInfo: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
    anomalyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.inputBg },
    anomalyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    anomalyCategory: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.md, color: colors.textMain },
    anomalyDate: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.xs, color: colors.textSecondary },
    anomalyRight: { alignItems: 'flex-end' },
    anomalyAmount: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.md, color: colors.error },
    zScore: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.xs },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl * 2 },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.lg, color: colors.textMain },
    emptySubtext: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
