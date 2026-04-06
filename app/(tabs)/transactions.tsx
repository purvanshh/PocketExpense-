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

import { FilterModal, FilterState } from '../../src/components/expense/FilterModal';
import { TransactionItem } from '../../src/components/home/TransactionItem';
import { useAppSelector } from '../../src/store/hooks';
import { Expense } from '../../src/store/slices/expenseSlice';
import { borderRadius, categories, colors, spacing, typography } from '../../src/theme';

export default function TransactionsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { items } = useAppSelector((state) => state.expenses);
    const { user } = useAppSelector((state) => state.auth);

    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        category: null,
        type: 'all',
        startDate: null,
        endDate: null,
        sort: '-date',
    });

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.type !== 'all') count++;
        if (filters.category) count++;
        if (filters.startDate) count++;
        if (filters.sort !== '-date') count++;
        return count;
    }, [filters]);

    const filteredTransactions = useMemo(() => {
        let result = [...items];

        if (filters.type !== 'all') {
            result = result.filter((item) => item.type === filters.type);
        }

        if (filters.category) {
            result = result.filter((item) => item.category === filters.category);
        }

        if (filters.startDate) {
            result = result.filter((item) => new Date(item.date) >= filters.startDate!);
        }

        if (filters.endDate) {
            result = result.filter((item) => new Date(item.date) <= filters.endDate!);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((item) => {
                const categoryLabel = categories[item.category as keyof typeof categories]?.label || '';
                return (
                    item.description.toLowerCase().includes(query) ||
                    categoryLabel.toLowerCase().includes(query)
                );
            });
        }

        const sortField = filters.sort.startsWith('-') ? filters.sort.substring(1) : filters.sort;
        const sortDir = filters.sort.startsWith('-') ? -1 : 1;

        result.sort((a, b) => {
            const aVal = sortField === 'date' ? new Date(a.date).getTime() : a.amount;
            const bVal = sortField === 'date' ? new Date(b.date).getTime() : b.amount;
            return (aVal - bVal) * sortDir;
        });

        return result;
    }, [items, filters, searchQuery]);

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
            <View style={styles.header}>
                <Text style={styles.title}>Transactions</Text>
                <Text style={styles.countText}>{filteredTransactions.length} items</Text>
            </View>

            <View style={styles.searchRow}>
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
                <TouchableOpacity
                    style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                    onPress={() => setShowFilters(true)}
                >
                    <Ionicons
                        name="options"
                        size={20}
                        color={activeFilterCount > 0 ? colors.textWhite : colors.textMain}
                    />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

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
                            {searchQuery || activeFilterCount > 0
                                ? 'Try adjusting your filters'
                                : 'Add your first transaction'}
                        </Text>
                    </View>
                }
            />

            <FilterModal
                visible={showFilters}
                onClose={() => setShowFilters(false)}
                onApply={setFilters}
                initialFilters={filters}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    title: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xxl, color: colors.textMain },
    countText: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: colors.textSecondary },
    searchRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
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
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtnActive: { backgroundColor: colors.primary },
    filterBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.error,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadgeText: { color: colors.textWhite, fontSize: 10, fontWeight: 'bold' },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl * 2 },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.sizes.lg, color: colors.textMain, marginBottom: spacing.xs },
    emptySubtext: { fontFamily: typography.fontFamily.regular, fontSize: typography.sizes.sm, color: colors.textSecondary },
});
