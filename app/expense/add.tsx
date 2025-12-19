import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { AmountInput } from '../../src/components/expense/AmountInput';
import { CategoryGrid } from '../../src/components/expense/CategoryGrid';
import { syncEngine } from '../../src/services/syncEngine';
import { useAppSelector } from '../../src/store/hooks';
import { addExpense } from '../../src/store/slices/expenseSlice';
import {
    borderRadius,
    categories,
    colors,
    paymentMethods,
    spacing,
    typography
} from '../../src/theme';
import { formatDate } from '../../src/utils/formatters';

export default function AddExpenseScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { user } = useAppSelector((state) => state.auth);

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState('food');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const amountValue = parseFloat(amount);

        if (!amountValue || amountValue <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (!category) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        setIsSubmitting(true);

        // Generate category label as description if empty
        const desc = description.trim() || categories[category as keyof typeof categories]?.label || '';

        // Add to local store immediately (offline-first)
        dispatch(
            addExpense({
                amount: amountValue,
                type,
                category,
                description: desc,
                paymentMethod,
                date: date.toISOString(),
                isRecurring: false,
            })
        );

        // Check budget alert
        if (type === 'expense' && user?.budgetLimit) {
            const { totalExpense } = (await import('../../src/store')).store.getState().expenses;
            if (totalExpense + amountValue > user.budgetLimit) {
                Alert.alert(
                    '⚠️ Budget Alert',
                    `This expense will put you over your monthly budget of $${user.budgetLimit}!`,
                    [{ text: 'OK' }]
                );
            }
        }

        // Trigger sync
        syncEngine.syncPending();

        setIsSubmitting(false);
        router.back();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Transaction</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Type Toggle */}
                <View style={styles.typeToggle}>
                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            type === 'expense' && styles.typeButtonActiveExpense,
                        ]}
                        onPress={() => setType('expense')}
                    >
                        <Text
                            style={[
                                styles.typeButtonText,
                                type === 'expense' && styles.typeButtonTextActive,
                            ]}
                        >
                            Expense
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            type === 'income' && styles.typeButtonActiveIncome,
                        ]}
                        onPress={() => setType('income')}
                    >
                        <Text
                            style={[
                                styles.typeButtonText,
                                type === 'income' && styles.typeButtonTextActive,
                            ]}
                        >
                            Income
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <AmountInput
                    value={amount}
                    onChangeText={setAmount}
                    currency="$"
                />

                {/* Category Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Category</Text>
                    <Card style={styles.categoryCard}>
                        <CategoryGrid
                            selectedCategory={category}
                            onSelectCategory={setCategory}
                            type={type}
                        />
                    </Card>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description (Optional)</Text>
                    <TextInput
                        style={styles.descriptionInput}
                        placeholder="Add a note..."
                        placeholderTextColor={colors.textLight}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={100}
                    />
                </View>

                {/* Date */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar" size={20} color={colors.primary} />
                        <Text style={styles.dateText}>{formatDate(date)}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                    />
                )}

                {/* Payment Method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <View style={styles.paymentMethods}>
                        {Object.entries(paymentMethods).map(([key, method]) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.paymentButton,
                                    paymentMethod === key && styles.paymentButtonActive,
                                ]}
                                onPress={() => setPaymentMethod(key)}
                            >
                                <Text style={styles.paymentIcon}>{method.icon}</Text>
                                <Text
                                    style={[
                                        styles.paymentText,
                                        paymentMethod === key && styles.paymentTextActive,
                                    ]}
                                >
                                    {method.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Submit Button */}
                <Button
                    title={type === 'expense' ? 'Add Expense' : 'Add Income'}
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    style={styles.submitButton}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.inputBg,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: colors.textMain,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: colors.inputBg,
        borderRadius: borderRadius.full,
        padding: 4,
        marginTop: spacing.lg,
    },
    typeButton: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderRadius: borderRadius.full,
    },
    typeButtonActiveExpense: {
        backgroundColor: colors.error,
    },
    typeButtonActiveIncome: {
        backgroundColor: colors.success,
    },
    typeButtonText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    typeButtonTextActive: {
        color: colors.textWhite,
    },
    section: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: colors.textMain,
        marginBottom: spacing.md,
    },
    categoryCard: {
        paddingVertical: spacing.md,
    },
    descriptionInput: {
        backgroundColor: colors.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textMain,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        gap: spacing.md,
    },
    dateText: {
        flex: 1,
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    paymentMethods: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    paymentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    paymentButtonActive: {
        backgroundColor: colors.primary,
    },
    paymentIcon: {
        fontSize: 16,
    },
    paymentText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    paymentTextActive: {
        color: colors.textWhite,
    },
    submitButton: {
        marginTop: spacing.xxl,
    },
});
