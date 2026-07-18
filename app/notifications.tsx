import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { GradientHeader } from '../src/components/common/GradientHeader';
import { useAppSelector } from '../src/store/hooks';
import {
    clearNotifications,
    markAllRead,
    markRead,
    selectUnreadCount,
    type NotificationKind,
} from '../src/store/slices/notificationSlice';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../src/theme';
import { formatRelativeTime } from '../src/utils/formatters';

type Tone = 'error' | 'warning' | 'info' | 'success';

/** Icon and accent per notification kind. */
const KIND_META: Record<
    NotificationKind,
    { icon: keyof typeof Ionicons.glyphMap; tone: Tone }
> = {
    'budget-exceeded': { icon: 'alert-circle', tone: 'error' },
    'budget-warning': { icon: 'warning', tone: 'warning' },
    'auto-added': { icon: 'flash', tone: 'success' },
    info: { icon: 'information-circle', tone: 'info' },
};

export default function NotificationsScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();

    const items = useAppSelector((s) => s.notifications.items);
    const unread = selectUnreadCount(items);

    const toneColor: Record<Tone, string> = {
        error: colors.error,
        warning: colors.warning,
        info: colors.info,
        success: colors.success,
    };

    const toneBg: Record<Tone, string> = {
        error: colors.errorBg,
        warning: colors.warningBg,
        info: colors.infoBg,
        success: colors.successBg,
    };

    return (
        <View style={styles.container}>
            <GradientHeader height={120}>
                <View style={[styles.header, { marginTop: insets.top }]}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textOnGradient} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                    <TouchableOpacity
                        onPress={() => dispatch(markAllRead())}
                        disabled={unread === 0}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Mark all as read"
                    >
                        <Ionicons
                            name="checkmark-done"
                            size={22}
                            color={unread === 0 ? 'transparent' : colors.textOnGradient}
                        />
                    </TouchableOpacity>
                </View>
            </GradientHeader>

            <ScrollView contentContainerStyle={styles.content}>
                {items.map((notification) => {
                    const meta = KIND_META[notification.kind] ?? KIND_META.info;

                    return (
                        <TouchableOpacity
                            key={notification.id}
                            style={[styles.card, !notification.read && styles.unreadCard]}
                            onPress={() => dispatch(markRead(notification.id))}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`${notification.title}. ${notification.message}`}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: toneBg[meta.tone] },
                                ]}
                            >
                                <Ionicons
                                    name={meta.icon}
                                    size={22}
                                    color={toneColor[meta.tone]}
                                />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.cardTitle}>{notification.title}</Text>
                                <Text style={styles.cardMessage}>{notification.message}</Text>
                                <Text style={styles.cardDate}>
                                    {formatRelativeTime(notification.createdAt)}
                                </Text>
                            </View>
                            {!notification.read && <View style={styles.dot} />}
                        </TouchableOpacity>
                    );
                })}

                {items.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons
                            name="notifications-off-outline"
                            size={48}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySubtext}>
                            Budget alerts and auto-logged transactions will appear here.
                        </Text>
                    </View>
                )}

                {items.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => dispatch(clearNotifications())}
                        accessibilityRole="button"
                    >
                        <Text style={styles.clearText}>Clear all</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: spacing.lg,
    },
    backButton: {
        padding: spacing.xs,
        minWidth: 32,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontFamily: typography.fontFamily.semiBold,
        color: c.textOnGradient,
    },
    content: {
        padding: spacing.lg,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    unreadCard: {
        borderLeftWidth: 3,
        borderLeftColor: c.primary,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: typography.sizes.md,
        fontFamily: typography.fontFamily.semiBold,
        color: c.textMain,
        marginBottom: 2,
    },
    cardMessage: {
        fontSize: typography.sizes.sm,
        fontFamily: typography.fontFamily.regular,
        color: c.textSecondary,
        marginBottom: 4,
        lineHeight: 18,
    },
    cardDate: {
        fontSize: 10,
        fontFamily: typography.fontFamily.medium,
        color: c.textLight,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: c.primary,
        marginLeft: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: spacing.md,
        color: c.textMain,
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
    },
    emptySubtext: {
        marginTop: spacing.xs,
        color: c.textSecondary,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    clearButton: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    clearText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.error,
    },
}));
