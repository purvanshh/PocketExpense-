import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface AmountInputProps {
    value: string;
    onChangeText: (text: string) => void;
    currency?: string;
    placeholder?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
    value,
    onChangeText,
    currency = '$',
    placeholder = '0.00',
}) => {
    const handleChange = (text: string) => {
        // Only allow numbers and one decimal point
        const cleaned = text.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) return;
        if (parts[1]?.length > 2) return;
        onChangeText(cleaned);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.currency}>{currency}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={handleChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                maxLength={12}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    currency: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 48,
        color: colors.textMain,
        marginRight: spacing.xs,
    },
    input: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 48,
        color: colors.textMain,
        minWidth: 100,
        textAlign: 'left',
    },
});

export default AmountInput;
