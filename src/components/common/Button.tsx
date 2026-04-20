import React from 'react';
import {
    ActivityIndicator,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle
} from 'react-native';
import { borderRadius, typography, useTheme } from '../../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
    icon,
}) => {
    const { colors } = useTheme();

    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: borderRadius.xxl,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
        };

        const sizeStyles: Record<string, ViewStyle> = {
            small: { paddingVertical: 10, paddingHorizontal: 20 },
            medium: { paddingVertical: 14, paddingHorizontal: 28 },
            large: { paddingVertical: 18, paddingHorizontal: 36 },
        };

        const variantStyles: Record<string, ViewStyle> = {
            primary: { backgroundColor: colors.primaryDark },
            secondary: { backgroundColor: colors.primary },
            outline: {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: colors.primary,
            },
            ghost: { backgroundColor: 'transparent' },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            opacity: disabled ? 0.5 : 1,
        };
    };

    const getTextStyle = (): TextStyle => {
        const baseStyle: TextStyle = {
            fontFamily: typography.fontFamily.semiBold,
        };

        const sizeStyles: Record<string, TextStyle> = {
            small: { fontSize: typography.sizes.sm },
            medium: { fontSize: typography.sizes.md },
            large: { fontSize: typography.sizes.lg },
        };

        const variantStyles: Record<string, TextStyle> = {
            primary: { color: colors.textWhite },
            secondary: { color: colors.textWhite },
            outline: { color: colors.primary },
            ghost: { color: colors.primary },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
        };
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[getButtonStyle(), style]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textWhite}
                    size="small"
                />
            ) : (
                <>
                    {icon && <>{icon}</>}
                    <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : null, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

export default Button;
