import React from 'react';
import { Text, View } from 'react-native';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

interface BalanceCardProps {
    totalSpend: number;
    percentageChange: number;
    currency?: string;
    label?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
    totalSpend,
    percentageChange,
    currency = 'INR',
    label = 'This Month Spend',
}) => {
    const styles = useStyles();
    const { colors } = useTheme();

    // Round first so a change like 0.4% reads as flat instead of "0% above"
    const roundedChange = Math.round(percentageChange);
    const isFlat = roundedChange === 0;
    const isPositiveChange = roundedChange > 0;

    const badgeBg = isFlat
        ? colors.inputBg
        : isPositiveChange ? colors.errorBg : colors.successBg;
    const badgeColor = isFlat
        ? colors.textSecondary
        : isPositiveChange ? colors.error : colors.success;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.amount}>{formatCurrency(totalSpend, currency)}</Text>
            <View style={[styles.changeBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.changeText, { color: badgeColor }]}>
                    {isFlat
                        ? 'Same as last month'
                        : `${isPositiveChange ? '↑' : '↓'} ${Math.abs(roundedChange)}% ${isPositiveChange ? 'above' : 'below'} last month`}
                </Text>
            </View>
        </View>
    );
};

const useStyles = makeStyles((c) => ({
    container: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textOnGradient,
        opacity: 0.7,
        marginBottom: spacing.xs,
    },
    amount: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.hero,
        color: c.textOnGradient,
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
}));

export default BalanceCard;
