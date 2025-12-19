import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

interface SpendingWalletProps {
    balance: number;
    currency?: string;
    onPress?: () => void;
}

export const SpendingWallet: React.FC<SpendingWalletProps> = ({
    balance,
    currency = 'USD',
    onPress,
}) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.leftContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.label}>Spending Wallet</Text>
            </View>
            <View style={styles.rightContent}>
                <Text style={styles.balance}>{formatCurrency(balance, currency)}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.card,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balance: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: colors.textMain,
        marginRight: spacing.xs,
    },
});

export default SpendingWallet;
