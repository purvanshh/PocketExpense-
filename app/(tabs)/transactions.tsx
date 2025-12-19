import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransactionItem } from '../../src/components/home/TransactionItem';
import { useAppSelector } from '../../src/store/hooks';
import { Expense } from '../../src/store/slices/expenseSlice';
import { borderRadius, categories, colors, spacing, typography } from '../../src/theme';

type FilterType = 'all' | 'expense' | 'income';

export default function TransactionsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { items } = useAppSelector((state) => state.expenses);
    const { user } = useAppSelector((state) => state.auth);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return items.filter((item) => {
            // Type filter
            if (activeFilter !== 'all' && item.type !== activeFilter) {
                return false;
            }

            // Category filter
            if (selectedCategory && item.category !== selectedCategory) {
                return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const categoryLabel = categories[item.category as keyof typeof categories]?.label || '';
                return (
                    item.description.toLowerCase().includes(query) ||
                    categoryLabel.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [items, activeFilter, selectedCategory, searchQuery]);

    const renderItem = ({ item }: { item: Expense }) => (
        <TransactionItem
            id={item.localId}
            amount={item.amount}
            type={item.type}
            category={item.category}
            description={item.description}
            date={item.date}
            currency={user?.currency}
            onPress={() => router.push(`/expense/${item.localId}`)}
        />
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Transactions</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search transactions..."
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'expense', 'income'] as FilterType[]).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterButton,
                            activeFilter === filter && styles.filterButtonActive,
                        ]}
                        onPress={() => setActiveFilter(filter)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                activeFilter === filter && styles.filterTextActive,
                            ]}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Transactions List */}
            <FlatList
                data={filteredTransactions}
                renderItem={renderItem}
                keyExtractor={(item) => item.localId}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyText}>No transactions found</Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery ? 'Try a different search term' : 'Add your first transaction'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: colors.textMain,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        marginHorizontal: spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        gap: spacing.sm,
    },
    filterButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.inputBg,
    },
    filterButtonActive: {
        backgroundColor: colors.primaryDark,
    },
    filterText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.textWhite,
    },
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl * 2,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: colors.textMain,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
    },
});
