import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Animated,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useDispatch } from 'react-redux';

import { useAppSelector } from '../../store/hooks';
import { addExpense } from '../../store/slices/expenseSlice';
import { clearDetectedTransaction, DetectedTransaction } from '../../store/slices/smsSlice';
import { borderRadius, categories, categoryTint, elevation, makeStyles, spacing, typography, useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const CATEGORY_LIST = Object.entries(categories).map(([key, val]) => ({
    key,
    ...val,
}));

export default function SmsTransactionModal() {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const dispatch = useDispatch();
    const { lastDetectedTransaction, showConfirmation } = useAppSelector((s) => s.sms);
    const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    const [editMode, setEditMode] = useState(false);
    const [editAmount, setEditAmount] = useState('');
    const [editMerchant, setEditMerchant] = useState('');
    const [editCategory, setEditCategory] = useState('other');
    const [editType, setEditType] = useState<'expense' | 'income'>('expense');

    useEffect(() => {
        if (showConfirmation && lastDetectedTransaction) {
            // Guarded setters: re-running this effect with the same transaction
            // must not schedule new renders, otherwise a re-render that changes
            // `lastDetectedTransaction` identity can spiral into
            // "Maximum update depth exceeded".
            setEditAmount((prev) => {
                const next = String(lastDetectedTransaction.amount);
                return next === prev ? prev : next;
            });
            setEditMerchant((prev) => {
                const next = lastDetectedTransaction.merchant ?? '';
                return next === prev ? prev : next;
            });
            setEditCategory((prev) => {
                const next = lastDetectedTransaction.category || 'other';
                return next === prev ? prev : next;
            });
            setEditType((prev) => {
                const next = lastDetectedTransaction.type;
                return next === prev ? prev : next;
            });

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 9,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);
            setEditMode(false);
        }
    }, [showConfirmation, lastDetectedTransaction]);

    const handleDismiss = useCallback(() => {
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            dispatch(clearDetectedTransaction());
        });
    }, [dispatch]);

    const handleConfirm = useCallback(() => {
        const amount = parseFloat(editAmount);
        if (isNaN(amount) || amount <= 0) return;

        dispatch(
            addExpense({
                amount,
                type: editType,
                category: editCategory,
                description: editMerchant ? `Auto-detected: ${editMerchant}` : 'Auto-detected from SMS',
                paymentMethod: 'bank_transfer',
                date: lastDetectedTransaction?.date || new Date().toISOString(),
                isRecurring: false,
            })
        );

        handleDismiss();
    }, [dispatch, editAmount, editType, editCategory, editMerchant, lastDetectedTransaction, handleDismiss]);

    if (Platform.OS !== 'android' || !showConfirmation || !lastDetectedTransaction) {
        return null;
    }

    const catConfig = categoryTint(editCategory, isDark);

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                    <Animated.View style={[styles.sheet, { transform: [{ scale: scaleAnim }] }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.iconCircle}>
                                <Ionicons
                                    name={editType === 'expense' ? 'arrow-down-circle' : 'arrow-up-circle'}
                                    size={28}
                                    color={editType === 'expense' ? colors.error : colors.success}
                                />
                            </View>
                            <Text style={styles.headerTitle}>Transaction Detected</Text>
                            <Text style={styles.headerSub}>
                                {lastDetectedTransaction?.confidenceLevel === 'low'
                                    ? 'Low confidence — please review carefully'
                                    : 'From bank SMS'}
                            </Text>
                        </View>

                        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                            {!editMode ? (
                                /* --- Preview Mode --- */
                                <View style={styles.previewCard}>
                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>Amount</Text>
                                        <Text
                                            style={[
                                                styles.previewAmount,
                                                { color: editType === 'expense' ? colors.error : colors.success },
                                            ]}
                                        >
                                            {editType === 'expense' ? '-' : '+'}
                                            {formatCurrency(parseFloat(editAmount) || 0)}
                                        </Text>
                                    </View>

                                    {editMerchant ? (
                                        <View style={styles.previewRow}>
                                            <Text style={styles.previewLabel}>Merchant</Text>
                                            <Text style={styles.previewValue}>{editMerchant}</Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>Category</Text>
                                        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color }]}>
                                            <Text style={styles.categoryIcon}>{catConfig.icon}</Text>
                                            <Text style={[styles.categoryLabel, { color: catConfig.textColor }]}>
                                                {catConfig.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.previewRow, { borderBottomWidth: 0 }]}>
                                        <Text style={styles.previewLabel}>Type</Text>
                                        <Text style={styles.previewValue}>
                                            {editType === 'expense' ? 'Expense' : 'Income'}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                /* --- Edit Mode --- */
                                <View style={styles.editSection}>
                                    <Text style={styles.fieldLabel}>Amount</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editAmount}
                                        onChangeText={setEditAmount}
                                        keyboardType="decimal-pad"
                                        placeholderTextColor={colors.textLight}
                                    />

                                    <Text style={styles.fieldLabel}>Merchant / Description</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editMerchant}
                                        onChangeText={setEditMerchant}
                                        placeholder="e.g. Amazon, Swiggy"
                                        placeholderTextColor={colors.textLight}
                                    />

                                    <Text style={styles.fieldLabel}>Type</Text>
                                    <View style={styles.typeRow}>
                                        {(['expense', 'income'] as const).map((t) => (
                                            <TouchableOpacity
                                                key={t}
                                                style={[
                                                    styles.typeChip,
                                                    editType === t && styles.typeChipActive,
                                                    editType === t && {
                                                        backgroundColor:
                                                            t === 'expense' ? colors.errorBg : colors.successBg,
                                                    },
                                                ]}
                                                onPress={() => setEditType(t)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.typeChipText,
                                                        editType === t && {
                                                            color: t === 'expense' ? colors.error : colors.success,
                                                        },
                                                    ]}
                                                >
                                                    {t === 'expense' ? 'Expense' : 'Income'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.fieldLabel}>Category</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.categoryScroll}
                                    >
                                        {CATEGORY_LIST.map((cat) => (
                                            <TouchableOpacity
                                                key={cat.key}
                                                style={[
                                                    styles.categoryChip,
                                                    editCategory === cat.key && {
                                                        backgroundColor: cat.color,
                                                        borderColor: cat.textColor,
                                                    },
                                                ]}
                                                onPress={() => setEditCategory(cat.key)}
                                            >
                                                <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                                                <Text
                                                    style={[
                                                        styles.categoryChipLabel,
                                                        editCategory === cat.key && { color: cat.textColor },
                                                    ]}
                                                >
                                                    {cat.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </ScrollView>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
                                <Text style={styles.dismissText}>Dismiss</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.editBtn}
                                onPress={() => setEditMode((prev) => !prev)}
                            >
                                <Ionicons
                                    name={editMode ? 'eye-outline' : 'create-outline'}
                                    size={18}
                                    color={colors.primary}
                                />
                                <Text style={styles.editText}>{editMode ? 'Preview' : 'Edit'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                                <Ionicons name="checkmark" size={18} color={colors.textWhite} />
                                <Text style={styles.confirmText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const useStyles = makeStyles((c, isDark) => ({
    overlay: {
        flex: 1,
        backgroundColor: c.overlay,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    sheet: {
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.xl,
        maxHeight: '80%',
        ...elevation(isDark).cardHeavy,
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing.xxl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: c.inputBg,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: c.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
    },
    headerSub: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: 2,
    },
    body: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    previewCard: {
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.cardBg,
    },
    previewLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    previewAmount: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xl,
    },
    previewValue: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    categoryIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    categoryLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
    },
    editSection: {
        gap: spacing.sm,
    },
    fieldLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: spacing.sm,
    },
    input: {
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.sm,
        padding: spacing.md,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    typeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    typeChip: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
        backgroundColor: c.inputBg,
        alignItems: 'center',
    },
    typeChipActive: {
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    typeChipText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    categoryScroll: {
        marginTop: spacing.xs,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.full,
        marginRight: spacing.sm,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    categoryChipIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    categoryChipLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: c.inputBg,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    dismissBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xxl,
        alignItems: 'center',
    },
    dismissText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
    },
    editBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.inputBg,
        gap: 4,
    },
    editText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.primary,
    },
    confirmBtn: {
        flex: 1.2,
        flexDirection: 'row',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xxl,
        backgroundColor: c.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    confirmText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.textWhite,
    },
}));
