import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../theme';

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
    const styles = useStyles();
    const { colors } = useTheme();

    if (isOnline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    const label = !isOnline
        ? 'Offline'
        : isSyncing
            ? 'Syncing…'
            : `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} pending`;

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
            <Text style={styles.text}>{label}</Text>
        </View>
    );
};

const useStyles = makeStyles((c) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    offline: {
        backgroundColor: c.textSecondary,
    },
    syncing: {
        backgroundColor: c.warning,
    },
    text: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: c.textWhite,
    },
}));

export default SyncIndicator;
