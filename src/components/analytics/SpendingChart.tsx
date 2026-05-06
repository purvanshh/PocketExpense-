import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../theme';
import { formatCurrency, getMonthName } from '../../utils/formatters';

interface ChartData {
    month: number;
    year: number;
    income: number;
    expense: number;
}

interface SpendingChartProps {
    data: ChartData[];
    currency?: string;
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;
const BAR_WIDTH = 20;
const MAX_BAR_HEIGHT = 150;

export const SpendingChart: React.FC<SpendingChartProps> = ({
    data,
    currency = 'USD',
}) => {
    const styles = useStyles();
    const { colors } = useTheme();
    const maxValue = Math.max(
        ...data.map((d) => Math.max(d.income, d.expense)),
        1
    );

    const getBarHeight = (value: number) => {
        return (value / maxValue) * MAX_BAR_HEIGHT;
    };

    // Get Y-axis labels
    const yLabels = [
        formatCurrency(maxValue, currency).replace(/\.00$/, ''),
        formatCurrency(maxValue * 0.66, currency).replace(/\.00$/, ''),
        formatCurrency(maxValue * 0.33, currency).replace(/\.00$/, ''),
        '$0',
    ];

    return (
        <View style={styles.container}>
            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.chartPurple }]} />
                    <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.chartLime }]} />
                    <Text style={styles.legendText}>Expense</Text>
                </View>
            </View>

            {/* Chart */}
            <View style={styles.chartArea}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                    {yLabels.map((label, index) => (
                        <Text key={index} style={styles.yLabel}>
                            {label}
                        </Text>
                    ))}
                </View>

                {/* Bars */}
                <View style={styles.barsContainer}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.barGroup}>
                            <View style={styles.barsWrapper}>
                                {/* Income bar */}
                                <View
                                    style={[
                                        styles.bar,
                                        styles.incomeBar,
                                        { height: getBarHeight(item.income) },
                                    ]}
                                />
                                {/* Expense bar */}
                                <View
                                    style={[
                                        styles.bar,
                                        styles.expenseBar,
                                        { height: getBarHeight(item.expense) },
                                    ]}
                                />
                            </View>
                            <Text style={styles.xLabel}>{getMonthName(item.month - 1)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const useStyles = makeStyles((c, isDark) => ({
    container: {
        paddingVertical: spacing.md,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: spacing.lg,
        gap: spacing.lg,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: spacing.xs,
    },
    legendText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    chartArea: {
        flexDirection: 'row',
        height: MAX_BAR_HEIGHT + 40,
    },
    yAxis: {
        width: 50,
        justifyContent: 'space-between',
        paddingBottom: 25,
    },
    yLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        textAlign: 'right',
    },
    barsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingBottom: 25,
    },
    barGroup: {
        alignItems: 'center',
    },
    barsWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
    },
    bar: {
        width: BAR_WIDTH,
        borderTopLeftRadius: borderRadius.sm,
        borderTopRightRadius: borderRadius.sm,
        minHeight: 4,
    },
    incomeBar: {
        backgroundColor: c.chartPurple,
    },
    expenseBar: {
        backgroundColor: c.chartLime,
    },
    xLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        marginTop: spacing.sm,
    },
}));

export default SpendingChart;
