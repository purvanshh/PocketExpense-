import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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
import apiClient from '../../src/store/api/apiClient';
import { useAppSelector } from '../../src/store/hooks';
import { logout, updateBudgetLimit } from '../../src/store/slices/authSlice';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../src/theme';
import { formatCurrency } from '../../src/utils/formatters';

export default function AccountScreen() {
    const styles = useStyles();
    const { colors, isDark, mode } = useTheme();
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const { user } = useAppSelector((state) => state.auth);
    const { totalExpense } = useAppSelector((state) => state.expenses);
    const { pendingCount } = useAppSelector((state) => state.sync);

    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState(String(user?.budgetLimit || 0));

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => {
                        dispatch(logout());
                        router.replace('/(auth)/login');
                    }
                },
            ]
        );
    };

    const handleSaveBudget = async () => {
        const budgetValue = parseFloat(budgetInput) || 0;

        try {
            await apiClient.put('/auth/profile', {
                budgetLimit: budgetValue,
            });
            dispatch(updateBudgetLimit(budgetValue));
            setIsEditingBudget(false);
            Alert.alert('Success', 'Budget limit updated');
        } catch (error) {
            console.error('Failed to update budget:', error);
            // Still update locally
            dispatch(updateBudgetLimit(budgetValue));
            setIsEditingBudget(false);
        }
    };

    const budgetProgress = user?.budgetLimit
        ? Math.min((totalExpense / user.budgetLimit) * 100, 100)
        : 0;

    const isOverBudget = user?.budgetLimit && totalExpense > user.budgetLimit;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Account</Text>
                </View>

                {/* Profile Card */}
                <Card style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </Card>

                {/* Budget Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Monthly Budget</Text>

                    <Card style={styles.budgetCard}>
                        {isEditingBudget ? (
                            <View style={styles.editBudgetContainer}>
                                <View style={styles.budgetInputContainer}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.budgetInput}
                                        value={budgetInput}
                                        onChangeText={setBudgetInput}
                                        keyboardType="decimal-pad"
                                        placeholder="0"
                                        placeholderTextColor={colors.textLight}
                                        autoFocus
                                    />
                                </View>
                                <View style={styles.budgetActions}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            setIsEditingBudget(false);
                                            setBudgetInput(String(user?.budgetLimit || 0));
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Button
                                        title="Save"
                                        onPress={handleSaveBudget}
                                        size="small"
                                    />
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.budgetHeader}>
                                    <View>
                                        <Text style={styles.budgetLabel}>Budget Limit</Text>
                                        <Text style={styles.budgetAmount}>
                                            {formatCurrency(user?.budgetLimit || 0, user?.currency)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => setIsEditingBudget(true)}
                                    >
                                        <Ionicons name="pencil" size={18} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                {user?.budgetLimit ? (
                                    <>
                                        <View style={styles.progressContainer}>
                                            <View style={styles.progressBar}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        {
                                                            width: `${budgetProgress}%`,
                                                            backgroundColor: isOverBudget
                                                                ? colors.error
                                                                : colors.primary,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.budgetDetails}>
                                            <Text style={styles.budgetSpent}>
                                                {formatCurrency(totalExpense, user?.currency)} spent
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.budgetRemaining,
                                                    isOverBudget ? styles.overBudget : null,
                                                ]}
                                            >
                                                {isOverBudget
                                                    ? `${formatCurrency(totalExpense - user.budgetLimit, user?.currency)} over`
                                                    : `${formatCurrency(user.budgetLimit - totalExpense, user?.currency)} left`}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.noBudgetText}>
                                        Set a budget to track your spending
                                    </Text>
                                )}
                            </>
                        )}
                    </Card>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <Card style={styles.settingsCard}>
                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => router.push('/budgets')}
                        >
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: '#EDE7F6' }]}>
                                    <Ionicons name="wallet" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.settingsItemText}>Category Budgets</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => router.push('/insights')}
                        >
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: colors.warningBg }]}>
                                    <Ionicons name="bulb" size={20} color={colors.warning} />
                                </View>
                                <Text style={styles.settingsItemText}>Smart Insights</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => router.push('/export')}
                        >
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: colors.infoBg }]}>
                                    <Ionicons name="download" size={20} color={colors.info} />
                                </View>
                                <View>
                                    <Text style={styles.settingsItemText}>Export Data</Text>
                                    <Text style={styles.settingsSubText}>
                                        Download as CSV or PDF
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>

                    <Card style={styles.settingsCard}>
                        {Platform.OS === 'android' && (
                            <>
                                <TouchableOpacity
                                    style={styles.settingsItem}
                                    onPress={() => router.push('/settings/sms-detection')}
                                >
                                    <View style={styles.settingsItemLeft}>
                                        <View style={[styles.settingsIcon, { backgroundColor: '#E8F5E9' }]}>
                                            <Ionicons name="chatbubble-ellipses" size={20} color="#388E3C" />
                                        </View>
                                        <View>
                                            <Text style={styles.settingsItemText}>SMS Detection</Text>
                                            <Text style={styles.settingsSubText}>
                                                Auto-detect bank transactions
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <View style={styles.divider} />
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => router.push('/settings/appearance')}
                        >
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: colors.inputBg }]}>
                                    <Ionicons
                                        name={isDark ? 'moon' : 'sunny'}
                                        size={20}
                                        color={colors.primary}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.settingsItemText}>Appearance</Text>
                                    <Text style={styles.settingsSubText}>
                                        {mode === 'system'
                                            ? 'Match system'
                                            : mode === 'dark' ? 'Dark' : 'Light'}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => router.push('/settings/notifications')}
                        >
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: colors.infoBg }]}>
                                    <Ionicons name="notifications" size={20} color={colors.info} />
                                </View>
                                <Text style={styles.settingsItemText}>Notifications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.settingsItem}>
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: colors.successBg }]}>
                                    <Ionicons name="cloud" size={20} color={colors.success} />
                                </View>
                                <Text style={styles.settingsItemText}>Sync Status</Text>
                            </View>
                            <Text style={styles.settingsValue}>
                                {pendingCount > 0 ? `${pendingCount} pending` : 'Up to date'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.settingsItem}>
                            <View style={styles.settingsItemLeft}>
                                <View style={[styles.settingsIcon, { backgroundColor: colors.warningBg }]}>
                                    <Ionicons name="help-circle" size={20} color={colors.warning} />
                                </View>
                                <Text style={styles.settingsItemText}>Help & Support</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* Logout Button */}
                <Button
                    title="Logout"
                    onPress={handleLogout}
                    variant="outline"
                    style={styles.logoutButton}
                />

                {/* App Version */}
                <Text style={styles.versionText}>PocketExpense+ v1.0.0</Text>
            </ScrollView>
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
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
    },
    header: {
        paddingVertical: spacing.lg,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
    },
    profileCard: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    avatarContainer: {
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxxl,
        color: c.textWhite,
    },
    userName: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.xl,
        color: c.textMain,
        marginBottom: spacing.xs,
    },
    userEmail: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
    },
    section: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
        marginBottom: spacing.md,
    },
    budgetCard: {},
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    budgetLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginBottom: spacing.xs,
    },
    budgetAmount: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
    },
    editButton: {
        padding: spacing.sm,
    },
    progressContainer: {
        marginTop: spacing.lg,
    },
    progressBar: {
        height: 8,
        backgroundColor: c.inputBg,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    budgetDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    budgetSpent: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    budgetRemaining: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.success,
    },
    overBudget: {
        color: c.error,
    },
    noBudgetText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: spacing.md,
    },
    editBudgetContainer: {},
    budgetInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    currencySymbol: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
        marginRight: spacing.xs,
    },
    budgetInput: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
        flex: 1,
    },
    budgetActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
    },
    cancelButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    cancelButtonText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
    },
    settingsCard: {
        padding: 0,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingsIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    settingsItemText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    settingsSubText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        marginTop: 1,
    },
    settingsValue: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: c.inputBg,
        marginLeft: spacing.lg + 36 + spacing.md,
    },
    logoutButton: {
        marginTop: spacing.xxl,
    },
    versionText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textLight,
        textAlign: 'center',
        marginTop: spacing.lg,
    },
}));
