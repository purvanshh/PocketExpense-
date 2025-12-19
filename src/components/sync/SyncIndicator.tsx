import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';

interface SyncIndicatorProps {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
    isOnline,
    isSyncing,
    pendingCount,
}) => {
    if (isOnline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    return (
        <View style={[
            styles.container,
            !isOnline && styles.offline,
            isSyncing && styles.syncing,
        ]}>
            <Ionicons
                name={
                    !isOnline ? 'cloud-offline' :
                        isSyncing ? 'sync' :
                            'cloud-upload'
                }
                size={14}
                color={colors.textWhite}
            />
            <Text style={styles.text}>
                {!isOnline ? 'Offline' :
                    isSyncing ? 'Syncing...' :
                        `${pendingCount} pending`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    offline: {
        backgroundColor: colors.textSecondary,
    },
    syncing: {
        backgroundColor: colors.warning,
    },
    text: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: colors.textWhite,
    },
});

export default SyncIndicator;
