import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

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
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
});

export default GradientHeader;
