import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
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
import { checkBudgets } from '../../src/services/budgetAlerts';
import { syncEngine } from '../../src/services/syncEngine';
import { useAppSelector } from '../../src/store/hooks';
import { addExpense } from '../../src/store/slices/expenseSlice';
import { borderRadius, categoryTint, makeStyles, paymentMethods, spacing, typography, useTheme } from '../../src/theme';
import { formatDate } from '../../src/utils/formatters';

export default function AddExpenseScreen() {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { user } = useAppSelector((state) => state.auth);

    // Pre-filled by the receipt scanner. Every param arrives as a string.
    const params = useLocalSearchParams<{
        amount?: string;
        description?: string;
        date?: string;
        receiptUri?: string;
        ocrConfidence?: string;
    }>();

    const [amount, setAmount] = useState(params.amount ?? '');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [category, setCategory] = useState('food');
    const [description, setDescription] = useState(params.description ?? '');
    const [paymentMethod, setPaymentMethod] = useState('upi');
    const [receiptUri, setReceiptUri] = useState<string | null>(params.receiptUri ?? null);
    const [date, setDate] = useState(() => {
        if (!params.date) return new Date();
        const parsed = new Date(params.date);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

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
        const desc = description.trim() || categoryTint(category, isDark).label;

        dispatch(
            addExpense({
                amount: amountValue,
                type,
                category,
                description: desc,
                paymentMethod,
                date: date.toISOString(),
                isRecurring,
                frequency: isRecurring ? frequency : null,
                receiptUri,
            })
        );

        // Budget thresholds are evaluated centrally so the in-app feed and the
        // system notification stay in step. Totals already include this expense,
        // so nothing is added to them here.
        await checkBudgets(user?.currency ?? 'INR');

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
                    currency="₹"
                />

                {/* Receipt */}
                {receiptUri ? (
                    <View style={styles.receiptRow}>
                        <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                        <View style={styles.receiptText}>
                            <Text style={styles.receiptTitle}>Receipt attached</Text>
                            {params.ocrConfidence ? (
                                <Text style={styles.receiptHint}>
                                    {Number(params.ocrConfidence) >= 0.6
                                        ? 'Fields filled from the photo — check them below.'
                                        : 'Could not read it clearly. Please enter the amount.'}
                                </Text>
                            ) : (
                                <Text style={styles.receiptHint}>
                                    Saved with this transaction.
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => setReceiptUri(null)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel="Remove receipt"
                        >
                            <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => router.push('/expense/scan')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Scan a receipt"
                    >
                        <Ionicons name="camera-outline" size={20} color={colors.primary} />
                        <Text style={styles.scanButtonText}>Scan a receipt</Text>
                    </TouchableOpacity>
                )}

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

                {/* Recurring Toggle */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recurring</Text>
                    <TouchableOpacity
                        style={styles.recurringToggle}
                        onPress={() => setIsRecurring(!isRecurring)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.recurringLeft}>
                            <Ionicons
                                name="repeat"
                                size={20}
                                color={isRecurring ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[
                                styles.recurringText,
                                isRecurring && { color: colors.textMain }
                            ]}>
                                Make this recurring
                            </Text>
                        </View>
                        <View style={[styles.toggle, isRecurring && styles.toggleActive]}>
                            <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbActive]} />
                        </View>
                    </TouchableOpacity>

                    {isRecurring && (
                        <View style={styles.frequencyContainer}>
                            {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                                <TouchableOpacity
                                    key={freq}
                                    style={[
                                        styles.frequencyButton,
                                        frequency === freq && styles.frequencyButtonActive,
                                    ]}
                                    onPress={() => setFrequency(freq)}
                                >
                                    <Text style={[
                                        styles.frequencyText,
                                        frequency === freq && styles.frequencyTextActive,
                                    ]}>
                                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
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

const useStyles = makeStyles((c, isDark) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.inputBg,
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
        color: c.textMain,
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
        backgroundColor: c.inputBg,
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
        backgroundColor: c.error,
    },
    typeButtonActiveIncome: {
        backgroundColor: c.success,
    },
    typeButtonText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
    },
    typeButtonTextActive: {
        color: c.textWhite,
    },
    section: {
        marginTop: spacing.xl,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: c.primary,
    },
    scanButtonText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.primary,
    },
    receiptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    receiptThumb: {
        width: 44,
        height: 56,
        borderRadius: borderRadius.xs,
        backgroundColor: c.border,
    },
    receiptText: {
        flex: 1,
    },
    receiptTitle: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    receiptHint: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: 2,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
        marginBottom: spacing.md,
    },
    categoryCard: {
        paddingVertical: spacing.md,
    },
    descriptionInput: {
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textMain,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        gap: spacing.md,
    },
    dateText: {
        flex: 1,
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    paymentMethods: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    paymentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    paymentButtonActive: {
        backgroundColor: c.primary,
    },
    paymentIcon: {
        fontSize: 16,
    },
    paymentText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    paymentTextActive: {
        color: c.textWhite,
    },
    recurringToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    recurringLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    recurringText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
    },
    toggle: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: c.textLight,
        padding: 2,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: c.primary,
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: c.cardBg,
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    frequencyContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    frequencyButton: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
    },
    frequencyButtonActive: {
        backgroundColor: c.primary,
    },
    frequencyText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    frequencyTextActive: {
        color: c.textWhite,
    },
    submitButton: {
        marginTop: spacing.xxl,
    },
}));
