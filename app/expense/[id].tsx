import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { deleteExpense, updateExpense } from '../../src/store/slices/expenseSlice';
import {
    borderRadius,
    categories,
    colors,
    paymentMethods,
    spacing,
    typography,
} from '../../src/theme';
import { formatDate } from '../../src/utils/formatters';

export default function EditExpenseScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();

    const expense = useAppSelector((state) =>
        state.expenses.items.find((e) => e.localId === id)
    );

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState('food');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form with existing expense data
    useEffect(() => {
        if (expense) {
            setAmount(String(expense.amount));
            setType(expense.type);
            setCategory(expense.category);
            setDescription(expense.description);
            setPaymentMethod(expense.paymentMethod);
            setDate(new Date(expense.date));
        }
    }, [expense]);

    if (!expense) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>Expense not found</Text>
                <Button title="Go Back" onPress={() => router.back()} />
            </View>
        );
    }

    const handleSave = async () => {
        const amountValue = parseFloat(amount);

        if (!amountValue || amountValue <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);

        const desc = description.trim() || categories[category as keyof typeof categories]?.label || '';

        dispatch(
            updateExpense({
                localId: id!,
                updates: {
                    amount: amountValue,
                    type,
                    category,
                    description: desc,
                    paymentMethod,
                    date: date.toISOString(),
                },
            })
        );

        syncEngine.syncPending();

        setIsSubmitting(false);
        router.back();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        dispatch(deleteExpense(id!));
                        syncEngine.syncPending();
                        router.back();
                    },
                },
            ]
        );
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
                <Text style={styles.headerTitle}>Edit Transaction</Text>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                >
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                </TouchableOpacity>
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
                    title="Save Changes"
                    onPress={handleSave}
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
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.lg,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
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
    deleteButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
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
