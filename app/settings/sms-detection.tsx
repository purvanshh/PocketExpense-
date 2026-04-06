import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { Card } from '../../src/components/common/Card';
import { useAppSelector } from '../../src/store/hooks';
import {
    disableSmsDetection,
    enableSmsDetection,
    setPermissionStatus,
} from '../../src/store/slices/smsSlice';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import {
    checkSmsPermission,
    requestReceiveSmsPermission,
    showNeverAskAgainAlert,
    showPermissionDeniedAlert,
} from '../../src/services/smsPermission';
import { initSmsListener, stopSmsListener } from '../../src/services/smsListener';

export default function SmsDetectionSettings() {
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { isEnabled, permissionStatus, detectionCount } = useAppSelector((s) => s.sms);

    useEffect(() => {
        checkSmsPermission().then((status) => {
            dispatch(setPermissionStatus(status));
        });
    }, []);

    const handleToggle = useCallback(
        async (value: boolean) => {
            if (value) {
                const status = await requestReceiveSmsPermission();
                dispatch(setPermissionStatus(status));

                if (status === 'granted') {
                    dispatch(enableSmsDetection());
                    await initSmsListener();
                } else if (status === 'never_ask_again') {
                    showNeverAskAgainAlert();
                } else {
                    showPermissionDeniedAlert();
                }
            } else {
                dispatch(disableSmsDetection());
                stopSmsListener();
            }
        },
        [dispatch]
    );

    const getStatusColor = () => {
        switch (permissionStatus) {
            case 'granted':
                return colors.success;
            case 'denied':
                return colors.warning;
            case 'never_ask_again':
                return colors.error;
            default:
                return colors.textSecondary;
        }
    };

    const getStatusLabel = () => {
        switch (permissionStatus) {
            case 'granted':
                return 'Granted';
            case 'denied':
                return 'Denied';
            case 'never_ask_again':
                return 'Blocked';
            case 'unavailable':
                return 'Not Available';
            default:
                return 'Unknown';
        }
    };

    if (Platform.OS !== 'android') {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.title}>SMS Detection</Text>
                </View>
                <View style={styles.unavailable}>
                    <Ionicons name="phone-portrait-outline" size={48} color={colors.textLight} />
                    <Text style={styles.unavailableTitle}>Android Only</Text>
                    <Text style={styles.unavailableDesc}>
                        Automatic SMS transaction detection is only available on Android devices.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.title}>SMS Detection</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Toggle */}
                <Card style={styles.toggleCard}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight + '20' }]}>
                                <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
                            </View>
                            <View style={styles.toggleTextContainer}>
                                <Text style={styles.toggleTitle}>Auto-detect Transactions</Text>
                                <Text style={styles.toggleDesc}>
                                    Detect bank transactions from incoming SMS
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isEnabled}
                            onValueChange={handleToggle}
                            trackColor={{ false: colors.inputBg, true: colors.primary + '60' }}
                            thumbColor={isEnabled ? colors.primary : '#f4f3f4'}
                        />
                    </View>
                </Card>

                {/* Status */}
                <Card style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Permission Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                            <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                {getStatusLabel()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Transactions Detected</Text>
                        <Text style={styles.statusValue}>{detectionCount}</Text>
                    </View>

                    {permissionStatus === 'never_ask_again' && (
                        <>
                            <View style={styles.divider} />
                            <TouchableOpacity
                                style={styles.openSettingsBtn}
                                onPress={() => Linking.openSettings()}
                            >
                                <Ionicons name="settings-outline" size={16} color={colors.primary} />
                                <Text style={styles.openSettingsText}>Open Device Settings</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Card>

                {/* How it Works */}
                <Text style={styles.sectionTitle}>How it Works</Text>
                <Card style={styles.infoCard}>
                    {[
                        {
                            icon: 'mail-outline' as const,
                            title: 'Bank SMS Arrives',
                            desc: 'App detects SMS from known bank sender IDs',
                        },
                        {
                            icon: 'code-slash' as const,
                            title: 'Local Parsing',
                            desc: 'Transaction details are extracted on your device using pattern matching',
                        },
                        {
                            icon: 'checkmark-circle-outline' as const,
                            title: 'You Confirm',
                            desc: 'A confirmation popup lets you review, edit, or dismiss',
                        },
                        {
                            icon: 'add-circle-outline' as const,
                            title: 'Expense Created',
                            desc: 'Confirmed transactions are added to your expense list',
                        },
                    ].map((step, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.stepRow,
                                idx === 3 && { borderBottomWidth: 0, paddingBottom: 0 },
                            ]}
                        >
                            <View style={styles.stepIcon}>
                                <Ionicons name={step.icon} size={20} color={colors.primary} />
                            </View>
                            <View style={styles.stepText}>
                                <Text style={styles.stepTitle}>{step.title}</Text>
                                <Text style={styles.stepDesc}>{step.desc}</Text>
                            </View>
                        </View>
                    ))}
                </Card>

                {/* Privacy Section */}
                <Text style={styles.sectionTitle}>Privacy & Security</Text>
                <Card style={styles.privacyCard}>
                    <View style={styles.privacyHeader}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.success} />
                        <Text style={styles.privacyHeaderText}>Your data stays on your device</Text>
                    </View>

                    {[
                        'Raw SMS content is never stored or sent to any server',
                        'Parsing happens entirely on your device',
                        'Only the transaction amount, merchant, and type are used',
                        'You can disable this feature at any time',
                        'All detected data is cleared when you disable the feature',
                        'No SMS content is logged, even in debug mode',
                    ].map((point, idx) => (
                        <View key={idx} style={styles.privacyRow}>
                            <Ionicons name="checkmark" size={16} color={colors.success} />
                            <Text style={styles.privacyText}>{point}</Text>
                        </View>
                    ))}
                </Card>

                {/* Supported Banks */}
                <Text style={styles.sectionTitle}>Supported Formats</Text>
                <Card style={styles.infoCard}>
                    <Text style={styles.supportedDesc}>
                        PocketExpense+ detects transactions from most Indian banks including HDFC,
                        SBI, ICICI, Axis, Kotak, PNB, BOI, Canara, Union, IDFC, and international
                        banks like AMEX, Citi, HSBC, Standard Chartered. UPI payments via Paytm,
                        PhonePe, GPay, and Razorpay are also supported.
                    </Text>
                    <Text style={[styles.supportedDesc, { marginTop: spacing.sm, color: colors.textLight }]}>
                        If your bank's SMS format isn't detected, the feature can be extended
                        with additional patterns in future updates.
                    </Text>
                </Card>

                <View style={{ height: 40 }} />
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
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    backBtn: {
        marginRight: spacing.md,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: colors.textMain,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 40,
    },
    toggleCard: {
        marginBottom: spacing.lg,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.md,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    toggleDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusCard: {
        marginBottom: spacing.xl,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    statusLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
    },
    statusValue: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    divider: {
        height: 1,
        backgroundColor: colors.inputBg,
        marginVertical: spacing.xs,
    },
    openSettingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        gap: 6,
    },
    openSettingsText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: colors.primary,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: colors.textMain,
        marginBottom: spacing.md,
    },
    infoCard: {
        marginBottom: spacing.xl,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.inputBg,
        marginBottom: spacing.lg,
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    stepText: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    stepDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    privacyCard: {
        marginBottom: spacing.xl,
    },
    privacyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    privacyHeaderText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    privacyText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        flex: 1,
    },
    supportedDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    unavailable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxxl,
    },
    unavailableTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.xl,
        color: colors.textMain,
        marginTop: spacing.lg,
    },
    unavailableDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
    },
});
