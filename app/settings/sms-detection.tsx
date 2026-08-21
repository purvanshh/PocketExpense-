import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
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
    setAutoAddEnabled,
    setAutoAddThreshold,
    setPermissionStatus,
} from '../../src/store/slices/smsSlice';
import { borderRadius, makeStyles, spacing, typography, useTheme } from '../../src/theme';
import {
    checkSmsPermission,
    requestReceiveSmsPermission,
    showNeverAskAgainAlert,
    showPermissionDeniedAlert,
} from '../../src/services/smsPermission';
import { clearDeduplicationCache } from '../../src/services/sms';
import { initSmsListener, simulateBulkSms, simulateSmsForTesting, stopSmsListener } from '../../src/services/smsListener';

const SIM_SAMPLES = [
    { label: 'Debit · Amazon', body: 'Rs.450.00 debited from A/c XX1234 at Amazon on 03-Mar-2026' },
    { label: 'Debit · Swiggy', body: 'Your A/c XX5678 is debited by Rs.1,250.50 on 02-03-2026 at Swiggy.' },
    { label: 'Credit · Salary', body: 'Rs.50,000 credited to A/c XX1234 by NEFT. Salary for Feb 2026.' },
    { label: 'Credit · Refund', body: 'Rs 12,500 received in A/c XX4321 from PayTM refund.' },
];

export default function SmsDetectionSettings() {
    const styles = useStyles();
    const { colors } = useTheme();
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const {
        isEnabled,
        permissionStatus,
        detectionCount,
        autoAddEnabled,
        autoAddThreshold,
        autoAddCount,
    } = useAppSelector((s) => s.sms);

    const [simSender, setSimSender] = useState('VM-HDFCBK');
    const [simBody, setSimBody] = useState(SIM_SAMPLES[0].body);
    const [simBulkRunning, setSimBulkRunning] = useState(false);

    useEffect(() => {
        checkSmsPermission().then((status) => {
            dispatch(setPermissionStatus(status));
        });
    }, []);

    const handleToggle = useCallback(
        async (value: boolean) => {
            if (value) {
                if (__DEV__) {
                    // Expo Go can't grant SMS permission and ships no native
                    // SMS listener; the simulator drives the pipeline directly,
                    // so allow the toggle so both paths can be exercised.
                    dispatch(enableSmsDetection());
                    return;
                }

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

    const handleSimulate = useCallback(async () => {
        // Re-sending the same message would otherwise be dropped as a duplicate.
        await clearDeduplicationCache();
        simulateSmsForTesting(simBody, simSender);
    }, [simBody, simSender]);

    const handleBulk = useCallback(async () => {
        setSimBulkRunning(true);
        try {
            await clearDeduplicationCache();
            await simulateBulkSms(50, simBody, simSender);
        } finally {
            setSimBulkRunning(false);
        }
    }, [simBody, simSender]);

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

                {/* Auto-add */}
                <Card style={styles.toggleCard}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.successBg }]}>
                                <Ionicons name="flash" size={22} color={colors.success} />
                            </View>
                            <View style={styles.toggleTextContainer}>
                                <Text style={styles.toggleTitle}>Log without asking</Text>
                                <Text style={styles.toggleDesc}>
                                    Skip the confirmation sheet when a message is
                                    unambiguous. You can always undo.
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={autoAddEnabled}
                            onValueChange={(v) => {
                                dispatch(setAutoAddEnabled(v));
                            }}
                            disabled={!isEnabled}
                            trackColor={{ false: colors.inputBg, true: colors.primary + '60' }}
                            thumbColor={autoAddEnabled ? colors.primary : '#f4f3f4'}
                        />
                    </View>

                    {autoAddEnabled && (
                        <View style={styles.thresholdBlock}>
                            <Text style={styles.thresholdLabel}>
                                Required confidence: {Math.round(autoAddThreshold * 100)}%
                            </Text>
                            <View style={styles.thresholdRow}>
                                {[0.8, 0.9, 0.95].map((value) => {
                                    const active = Math.abs(autoAddThreshold - value) < 0.001;
                                    return (
                                        <TouchableOpacity
                                            key={value}
                                            style={[
                                                styles.thresholdChip,
                                                active && { backgroundColor: colors.primary },
                                            ]}
                                            onPress={() => dispatch(setAutoAddThreshold(value))}
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected: active }}
                                        >
                                            <Text
                                                style={[
                                                    styles.thresholdChipText,
                                                    active && { color: colors.textWhite },
                                                ]}
                                            >
                                                {Math.round(value * 100)}%
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <Text style={styles.thresholdHint}>
                                Anything below this still asks you first.
                                {autoAddCount > 0 ? ` ${autoAddCount} logged so far.` : ''}
                            </Text>
                        </View>
                    )}
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

                {/* Simulator (dev only) */}
                {__DEV__ && (
                    <>
                        <Text style={styles.sectionTitle}>Simulator (Dev only)</Text>
                        <Card style={styles.infoCard}>
                            <Text style={styles.simLabel}>Sender</Text>
                            <TextInput
                                style={styles.simInput}
                                value={simSender}
                                onChangeText={setSimSender}
                                autoCapitalize="characters"
                                placeholder="VM-HDFCBK"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={styles.simLabel}>SMS Body</Text>
                            <TextInput
                                style={[styles.simInput, styles.simBodyInput]}
                                value={simBody}
                                onChangeText={setSimBody}
                                multiline
                                placeholderTextColor={colors.textLight}
                            />

                            <View style={styles.simChipRow}>
                                {SIM_SAMPLES.map((s) => (
                                    <TouchableOpacity
                                        key={s.label}
                                        style={styles.simChip}
                                        onPress={() => setSimBody(s.body)}
                                    >
                                        <Text style={styles.simChipText}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.simActions}>
                                <TouchableOpacity
                                    style={styles.simSendBtn}
                                    onPress={handleSimulate}
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="send" size={16} color={colors.textWhite} />
                                    <Text style={styles.simSendText}>Send SMS</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.simBulkBtn}
                                    onPress={handleBulk}
                                    disabled={simBulkRunning}
                                    accessibilityRole="button"
                                >
                                    {simBulkRunning ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <>
                                            <Ionicons name="flash" size={16} color={colors.primary} />
                                            <Text style={styles.simBulkText}>Bulk (50)</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.simHint}>
                                Runs the real detection pipeline. With &quot;Log without asking&quot;
                                off you&apos;ll get a confirmation sheet; with it on the expense is
                                added instantly with an UNDO toast. The dedup cache is cleared on
                                each send so you can reuse the same message. In Expo Go the toggle
                                above enables directly — SMS permission isn&apos;t available there.
                            </Text>
                        </Card>
                    </>
                )}

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
                        If your bank&apos;s SMS format isn&apos;t detected, the feature can be extended
                        with additional patterns in future updates.
                    </Text>
                </Card>

                <View style={{ height: 40 }} />
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
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    backBtn: {
        marginRight: spacing.md,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
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
        color: c.textMain,
    },
    toggleDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginTop: 2,
    },
    thresholdBlock: {
        marginTop: spacing.lg,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: c.border,
    },
    thresholdLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textMain,
        marginBottom: spacing.sm,
    },
    thresholdRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    thresholdChip: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.md,
    },
    thresholdChipText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
    },
    thresholdHint: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        marginTop: spacing.sm,
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
        color: c.textSecondary,
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
        color: c.textMain,
    },
    divider: {
        height: 1,
        backgroundColor: c.inputBg,
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
        color: c.primary,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
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
        borderBottomColor: c.inputBg,
        marginBottom: spacing.lg,
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: c.primary + '15',
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
        color: c.textMain,
    },
    stepDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
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
        color: c.textMain,
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
        color: c.textSecondary,
        flex: 1,
    },
    supportedDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
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
        color: c.textMain,
        marginTop: spacing.lg,
    },
    unavailableDesc: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
    },
    simLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textSecondary,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    simInput: {
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.sm,
        padding: spacing.md,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    simBodyInput: {
        minHeight: 72,
        textAlignVertical: 'top',
    },
    simChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    simChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.primary + '15',
    },
    simChipText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: c.primary,
    },
    simActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    simSendBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xxl,
        backgroundColor: c.primaryDark,
    },
    simSendText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.textWhite,
    },
    simBulkBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xxl,
        backgroundColor: c.inputBg,
    },
    simBulkText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.md,
        color: c.primary,
    },
    simHint: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        marginTop: spacing.md,
        lineHeight: 18,
    },
}));
