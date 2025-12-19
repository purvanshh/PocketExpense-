import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, categories, colors, spacing, typography } from '../../theme';
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
    currency = 'USD',
    onPress,
}) => {
    const categoryConfig = categories[category as keyof typeof categories] || categories.other;
    const isExpense = type === 'expense';

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
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
                        {description || categoryConfig.label}
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
                >
                    {isExpense ? '-' : '+'}{formatCurrency(amount, currency)}
                </Text>
                <View style={styles.chevron}>
                    <Text style={styles.chevronText}>›</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
    },
    description: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: colors.textMain,
        marginBottom: 2,
    },
    date: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
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
        color: colors.textSecondary,
    },
});

export default TransactionItem;
