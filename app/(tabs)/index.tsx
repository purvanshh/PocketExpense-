import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { CustomDatePicker } from '../../src/components/common/CustomDatePicker';
import { GradientHeader } from '../../src/components/common/GradientHeader';
import { BalanceCard } from '../../src/components/home/BalanceCard';
import { SpendingWallet } from '../../src/components/home/SpendingWallet';
import { TransactionItem } from '../../src/components/home/TransactionItem';
import { SyncIndicator } from '../../src/components/sync/SyncIndicator';
import { syncEngine } from '../../src/services/syncEngine';
import { useAppSelector } from '../../src/store/hooks';
import { selectUnreadCount } from '../../src/store/slices/notificationSlice';
import { borderRadius, elevation, makeStyles, spacing, typography, useTheme } from '../../src/theme';
import { monthOverMonthChange, totalsForMonth } from '../../src/utils/stats';

export default function HomeScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const { user } = useAppSelector((state) => state.auth);
    const { items, totalExpense, totalIncome } = useAppSelector(
        (state) => state.expenses
    );
    const { isOnline, isSyncing, pendingCount } = useAppSelector(
        (state) => state.sync
    );
    const notifications = useAppSelector((state) => state.notifications.items);
    const unreadCount = selectUnreadCount(notifications);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // The header date acts as a month selector: picking any day shows that
    // month's figures rather than always showing the current one.
    const isCurrentMonth =
        selectedDate.getMonth() === new Date().getMonth() &&
        selectedDate.getFullYear() === new Date().getFullYear();

    const monthTotals = useMemo(
        () => totalsForMonth(items, selectedDate),
        [items, selectedDate]
    );

    const percentageChange = useMemo(
        () => monthOverMonthChange(items, selectedDate),
        [items, selectedDate]
    );

    // Recent transactions for the selected month, newest first.
    const recentTransactions = useMemo(() => {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const end = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            0, 23, 59, 59, 999
        );

        return items
            .filter((item) => {
                const d = new Date(item.date);
                return d >= start && d <= end;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [items, selectedDate]);

    const balance = monthTotals.income - monthTotals.expense;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // An explicit pull-to-refresh overrides any active backoff window.
        await syncEngine.fullSync(true);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        // Initial data fetch
        syncEngine.fetchFromServer();
    }, []);

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setShowDatePicker(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Gradient Header */}
                <GradientHeader>
                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => router.push('/(tabs)/account')}
                        >
                            <Ionicons name="settings-outline" size={24} color={colors.textMain} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateContainer}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={16} color={colors.textMain} />
                            <Text style={styles.dateText}>{format(selectedDate, 'EEE, dd MMM')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => router.push('/notifications')}
                        >
                            <Ionicons
                                name="notifications-outline"
                                size={24}
                                color={colors.textOnGradient}
                            />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Custom Date Picker Modal */}
                    <CustomDatePicker
                        visible={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        onSelect={handleDateSelect}
                        selectedDate={selectedDate}
                    />

                    {/* Sync Indicator */}
                    <View style={styles.syncContainer}>
                        <SyncIndicator
                            isOnline={isOnline}
                            isSyncing={isSyncing}
                            pendingCount={pendingCount}
                        />
                    </View>

                    {/* Balance Card */}
                    <BalanceCard
                        totalSpend={monthTotals.expense}
                        percentageChange={percentageChange}
                        currency={user?.currency}
                        label={
                            isCurrentMonth
                                ? 'This Month Spend'
                                : `${format(selectedDate, 'MMMM')} Spend`
                        }
                    />
                </GradientHeader>

                {/* Content */}
                <View style={styles.content}>
                    {/* Spending Wallet */}
                    <SpendingWallet
                        balance={balance}
                        currency={user?.currency}
                        onPress={() => router.push('/(tabs)/analytics')}
                    />

                    {/* Recent Transactions */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Transactions</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentTransactions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>📝</Text>
                                <Text style={styles.emptyText}>No transactions yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Tap the + button to add your first expense
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.transactionsList}>
                                {recentTransactions.map((transaction) => (
                                    <TransactionItem
                                        key={transaction.localId}
                                        id={transaction.localId}
                                        amount={transaction.amount}
                                        type={transaction.type}
                                        category={transaction.category}
                                        description={transaction.description}
                                        date={transaction.date}
                                        currency={user?.currency}
                                        onPress={() => router.push(`/expense/${transaction.localId}`)}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* FAB Button */}
            <TouchableOpacity
                style={[styles.fab, { bottom: 100 + insets.bottom }]}
                onPress={() => router.push('/expense/add')}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color={colors.textWhite} />
            </TouchableOpacity>
        </View>
    );
}

const useStyles = makeStyles((c, isDark) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    scrollView: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: c.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: c.textWhite,
        fontSize: 10,
        fontWeight: 'bold',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    dateText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textMain,
    },
    syncContainer: {
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    content: {
        paddingHorizontal: spacing.lg,
        marginTop: -spacing.xl,
    },
    section: {
        marginTop: spacing.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.xl,
        color: c.textMain,
    },
    seeAllText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.primary,
    },
    transactionsList: {
        gap: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.xl,
        ...elevation(isDark).card,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    fab: {
        position: 'absolute',
        right: spacing.xl,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: c.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation(isDark).fab,
    },
}));
