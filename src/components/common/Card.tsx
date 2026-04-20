import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { borderRadius, elevation, makeStyles, spacing } from '../../theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'elevated' | 'flat';
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'default',
}) => {
    const styles = useStyles();

    return (
        <View
            style={[
                styles.card,
                variant === 'elevated' && styles.elevated,
                variant === 'flat' && styles.flat,
                style,
            ]}
        >
            {children}
        </View>
    );
};

const useStyles = makeStyles((c, isDark) => ({
    card: {
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        ...elevation(isDark).card,
        // On dark backgrounds a shadow reads as nothing; a hairline edge is what
        // actually separates the card from the page.
        ...(isDark
            ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }
            : null),
    },
    elevated: {
        backgroundColor: c.surfaceElevated,
        ...elevation(isDark).cardHeavy,
    },
    flat: {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
}));

export default Card;
