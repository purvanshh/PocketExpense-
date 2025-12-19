import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { borderRadius, colors, shadows } from '../../theme';

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

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.cardBg,
        borderRadius: borderRadius.xl,
        padding: 20,
        ...shadows.card,
    },
    elevated: {
        ...shadows.cardHeavy,
    },
    flat: {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
});

export default Card;
