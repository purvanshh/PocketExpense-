import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import {
    Budget,
    createBudget,
    deleteBudget,
    fetchBudgets,
    updateBudget,
} from '../src/store/slices/budgetSlice';
import { borderRadius, categories, categoryTint, makeStyles, spacing, typography, useTheme } from '../src/theme';
import { formatCurrency } from '../src/utils/formatters';

export default function BudgetsScreen() {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();

    const { items: budgets, isLoading } = useAppSelector((state) => state.budgets);
    const { user } = useAppSelector((state) => state.auth);

    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('food');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        dispatch(fetchBudgets());
    }, [dispatch]);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const handleCreate = async () => {
        const amountVal = parseFloat(amount);
        if (!amountVal || amountVal <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        try {
            if (editingBudget) {
                await dispatch(
                    updateBudget({
                        id: editingBudget._id,
                        data: { amount: amountVal, category: selectedCategory },
                    })
                ).unwrap();
            } else {
                await dispatch(
                    createBudget({
                        category: selectedCategory,
                        amount: amountVal,
                        month: currentMonth,
                        year: currentYear,
                    })
                ).unwrap();
            }
            closeModal();
            dispatch(fetchBudgets());
        } catch (error: any) {
            Alert.alert('Error', error || 'Failed to save budget');
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Budget', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await dispatch(deleteBudget(id));
                    dispatch(fetchBudgets());
                },
            },
        ]);
    };

    const openEdit = (budget: Budget) => {
        setEditingBudget(budget);
        setSelectedCategory(budget.category);
        setAmount(String(budget.amount));
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBudget(null);
        setSelectedCategory('food');
        setAmount('');
    };

    const getStatusColor = (percentage: number) => {
        if (percentage >= 100) return colors.error;
        if (percentage >= 75) return colors.warning;
        return colors.success;
    };

    const expenseCategories = Object.entries(categories).filter(
        ([key]) => !['salary', 'freelance', 'investment'].includes(key)
    );

    const renderBudgetItem = useCallback(({ item }: { item: Budget }) => {
        const catInfo = categoryTint(item.category, isDark);
        const statusColor = getStatusColor(item.percentageUsed);

        return (
            <Card style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                    <View style={styles.budgetCategoryRow}>
                        <View style={[styles.categoryIcon, { backgroundColor: catInfo?.color || colors.inputBg }]}>
                            <Text style={styles.categoryEmoji}>{catInfo?.icon || '?'}</Text>
                        </View>
                        <View style={styles.budgetInfo}>
                            <Text style={styles.budgetCategory}>{catInfo?.label || item.category}</Text>
                            <Text style={styles.budgetAmountLabel}>
                                {formatCurrency(item.totalSpent, user?.currency)} of {formatCurrency(item.amount, user?.currency)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.budgetActions}>
                        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                            <Ionicons name="pencil" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
                            <Ionicons name="trash" size={16} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(item.percentageUsed, 100)}%`,
                                    backgroundColor: statusColor,
                                },
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.budgetFooter}>
                    <Text style={[styles.percentageText, { color: statusColor }]}>
                        {item.percentageUsed.toFixed(1)}% used
                    </Text>
                    <Text style={styles.remainingText}>
                        {formatCurrency(item.remainingAmount, user?.currency)} left
                    </Text>
                </View>
            </Card>
        );
    }, [user?.currency]);

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.totalSpent, 0);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.title}>Budgets</Text>
                <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {budgets.length > 0 && (
                <Card style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Monthly Budget</Text>
                    <Text style={styles.summaryAmount}>{formatCurrency(totalBudget, user?.currency)}</Text>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%`,
                                        backgroundColor: getStatusColor((totalSpent / (totalBudget || 1)) * 100),
                                    },
                                ]}
                            />
                        </View>
                    </View>
                    <Text style={styles.summarySubtext}>
                        {formatCurrency(totalSpent, user?.currency)} spent of {formatCurrency(totalBudget, user?.currency)}
                    </Text>
                </Card>
            )}

            {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={budgets}
                    renderItem={renderBudgetItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No budgets yet</Text>
                            <Text style={styles.emptySubtext}>
                                Create a budget to start tracking your spending by category
                            </Text>
                            <Button
                                title="Create Budget"
                                onPress={() => setShowModal(true)}
                                style={{ marginTop: spacing.lg }}
                            />
                        </View>
                    }
                />
            )}

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingBudget ? 'Edit Budget' : 'New Budget'}
                            </Text>
                            <TouchableOpacity onPress={closeModal}>
                                <Ionicons name="close" size={24} color={colors.textMain} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.fieldLabel}>Amount</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={styles.fieldLabel}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {expenseCategories.map(([key, cat]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.categoryChip,
                                            selectedCategory === key && {
                                                backgroundColor: colors.primary,
                                            },
                                        ]}
                                        onPress={() => setSelectedCategory(key)}
                                    >
                                        <Text style={styles.chipEmoji}>{cat.icon}</Text>
                                        <Text
                                            style={[
                                                styles.chipLabel,
                                                selectedCategory === key && { color: colors.textWhite },
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Button
                            title={editingBudget ? 'Update Budget' : 'Create Budget'}
                            onPress={handleCreate}
                            style={{ marginTop: spacing.lg }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const useStyles = makeStyles((c, isDark) => ({
    container: { flex: 1, backgroundColor: c.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xxl, color: c.textMain },
    summaryCard: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, alignItems: 'center' as const },
    summaryLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: c.textSecondary },
    summaryAmount: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xxxl, color: c.textMain, marginVertical: spacing.xs },
    summarySubtext: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: c.textSecondary, marginTop: spacing.sm },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    budgetCard: { marginBottom: spacing.md },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetCategoryRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    categoryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    categoryEmoji: { fontSize: 20 },
    budgetInfo: { flex: 1 },
    budgetCategory: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.md, color: c.textMain },
    budgetAmountLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: c.textSecondary, marginTop: 2 },
    budgetActions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: { padding: spacing.sm },
    progressContainer: { marginTop: spacing.md },
    progressBar: { height: 8, backgroundColor: c.inputBg, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
    percentageText: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.sm },
    remainingText: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: c.textSecondary },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl * 2 },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.lg, color: c.textMain },
    emptySubtext: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: c.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.xs },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: c.cardBg, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
    modalTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xl, color: c.textMain },
    fieldLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.md, color: c.textMain, marginBottom: spacing.sm, marginTop: spacing.lg },
    amountInput: {
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
    },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    chipEmoji: { fontSize: 14 },
    chipLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.sm, color: c.textMain },
}));
