import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

interface InsightCardProps {
    title: string;
    amount: number;
    currency?: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBgColor: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({
    title,
    amount,
    currency = 'USD',
    icon,
    iconColor,
    iconBgColor,
}) => {
    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <Text style={styles.amount}>{formatCurrency(amount, currency)}</Text>
            <Text style={styles.title}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xl,
        color: colors.textMain,
        marginBottom: spacing.xs,
    },
    title: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
});

export default InsightCard;
