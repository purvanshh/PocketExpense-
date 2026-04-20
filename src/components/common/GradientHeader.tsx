import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, spacing, useTheme } from '../../theme';

interface GradientHeaderProps {
    children: React.ReactNode;
    style?: ViewStyle;
    height?: number;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
    children,
    style,
    height = 280,
}) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.gradient,
                { height: height + insets.top, paddingTop: insets.top },
                style,
            ]}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        width: '100%',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
    },
});

export default GradientHeader;
