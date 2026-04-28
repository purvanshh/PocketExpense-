import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, categoryTint, makeStyles, spacing, typography, useTheme } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface TransactionItemProps {
    id: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    description: string;
    date: string;
    currency?: string;
    onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    id,
    amount,
    type,
    category,
    description,
    date,
    currency = 'INR',
    onPress,
}) => {
    const styles = useStyles();
    const { colors, isDark } = useTheme();

    const categoryConfig = categoryTint(category, isDark);
    const isExpense = type === 'expense';
    const label = description || categoryConfig.label;
    const signedAmount = `${isExpense ? '-' : '+'}${formatCurrency(amount, currency)}`;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${signedAmount}, ${formatDate(date)}`}
        >
            <View style={styles.leftContent}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: categoryConfig.color },
                    ]}
                >
                    <Text style={styles.icon}>{categoryConfig.icon}</Text>
                </View>
                <View style={styles.textContent}>
                    <Text style={styles.description} numberOfLines={1}>
                        {label}
                    </Text>
                    <Text style={styles.date}>{formatDate(date)}</Text>
                </View>
            </View>
            <View style={styles.rightContent}>
                <Text
                    style={[
                        styles.amount,
                        { color: isExpense ? colors.error : colors.success },
                    ]}
                    numberOfLines={1}
                >
                    {signedAmount}
                </Text>
                <View style={styles.chevron}>
                    <Text style={styles.chevronText}>›</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const useStyles = makeStyles((c) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        // Without this the description can push the amount off the row.
        minWidth: 0,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    icon: {
        fontSize: 22,
    },
    textContent: {
        flex: 1,
        minWidth: 0,
    },
    description: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
        marginBottom: 2,
    },
    date: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        // Keep the amount fully legible; the description truncates instead.
        flexShrink: 0,
        marginLeft: spacing.sm,
    },
    amount: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        marginRight: spacing.xs,
    },
    chevron: {
        width: 20,
        alignItems: 'center',
    },
    chevronText: {
        fontSize: 20,
        color: c.textSecondary,
    },
}));

export default TransactionItem;
