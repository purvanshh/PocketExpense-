import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

interface BalanceCardProps {
    totalSpend: number;
    percentageChange: number;
    currency?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
    totalSpend,
    percentageChange,
    currency = 'USD',
}) => {
    const isPositiveChange = percentageChange >= 0;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>This Month Spend</Text>
            <Text style={styles.amount}>{formatCurrency(totalSpend, currency)}</Text>
            <View style={[
                styles.changeBadge,
                { backgroundColor: isPositiveChange ? colors.errorBg : colors.successBg }
            ]}>
                <Text style={[
                    styles.changeText,
                    { color: isPositiveChange ? colors.error : colors.success }
                ]}>
                    {isPositiveChange ? '↑' : '↓'} {Math.abs(percentageChange).toFixed(0)}% {isPositiveChange ? 'above' : 'below'} last month
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: colors.textMain,
        opacity: 0.7,
        marginBottom: spacing.xs,
    },
    amount: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.hero,
        color: colors.textMain,
        marginBottom: spacing.md,
    },
    changeBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    changeText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
    },
});

export default BalanceCard;
