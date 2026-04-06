import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientHeader } from '../src/components/common/GradientHeader';
import { colors, spacing, typography } from '../src/theme';

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Mock notifications
    const notifications = [
        {
            id: '1',
            title: 'Welcome to PocketExpense+',
            message: 'Start tracking your expenses effectively!',
            date: 'Just now',
            read: false,
        },
        {
            id: '2',
            title: 'Budget Alert',
            message: 'You are close to your monthly budget limit.',
            date: '2 hours ago',
            read: true,
        },
    ];

    return (
        <View style={styles.container}>
            <GradientHeader>
                <View style={[styles.header, { marginTop: insets.top }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                    <View style={{ width: 24 }} />
                </View>
            </GradientHeader>

            <ScrollView contentContainerStyle={styles.content}>
                {notifications.map((notification) => (
                    <View key={notification.id} style={[styles.card, !notification.read && styles.unreadCard]}>
                        <View style={styles.iconContainer}>
                            <Ionicons
                                name={notification.read ? "notifications-outline" : "notifications"}
                                size={24}
                                color={colors.primary}
                            />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>{notification.title}</Text>
                            <Text style={styles.cardMessage}>{notification.message}</Text>
                            <Text style={styles.cardDate}>{notification.date}</Text>
                        </View>
                        {!notification.read && <View style={styles.dot} />}
                    </View>
                ))}

                {notifications.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                    </View>
                )}
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
        paddingBottom: spacing.lg,
    },
    backButton: {
        padding: spacing.xs,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontFamily: typography.fontFamily.semiBold,
        color: colors.textMain,
    },
    content: {
        padding: spacing.lg,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: colors.cardBg,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: '#F0F7FF', // Light blue tint
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.inputBg,
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
        color: colors.textMain,
        marginBottom: 2,
    },
    cardMessage: {
        fontSize: typography.sizes.sm,
        fontFamily: typography.fontFamily.regular,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 10,
        fontFamily: typography.fontFamily.medium,
        color: colors.textLight,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginLeft: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: spacing.md,
        color: colors.textSecondary,
        fontFamily: typography.fontFamily.medium,
    },
});
