import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { useAppSelector } from '../../store/hooks';
import { deleteExpense } from '../../store/slices/expenseSlice';
import { clearAutoAdded } from '../../store/slices/smsSlice';
import { borderRadius, elevation, makeStyles, spacing, typography, useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

/** How long the undo affordance stays on screen. */
const VISIBLE_MS = 6000;

/**
 * Confirmation for a transaction that was logged without asking. Auto-add is
 * only safe if reversing it is trivial, so this is the other half of that
 * feature rather than a decoration.
 */
export default function AutoAddToast() {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();

    const record = useAppSelector((s) => s.sms.lastAutoAdded);
    const currency = useAppSelector((s) => s.auth.user?.currency) ?? 'INR';

    const slide = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!record) return;

        Animated.parallel([
            Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }),
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(slide, { toValue: 80, duration: 180, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start(() => dispatch(clearAutoAdded()));
        }, VISIBLE_MS);

        return () => clearTimeout(timer);
    }, [record, dispatch, slide, opacity]);

    if (Platform.OS !== 'android' || !record) return null;

    const handleUndo = () => {
        dispatch(deleteExpense(record.localId));
        dispatch(clearAutoAdded());
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { bottom: insets.bottom + 90, opacity, transform: [{ translateY: slide }] },
            ]}
            pointerEvents="box-none"
        >
            <View style={styles.toast}>
                <Ionicons name="flash" size={18} color={colors.secondary} />
                <Text style={styles.text} numberOfLines={2}>
                    Logged {formatCurrency(record.amount, currency)}
                    {record.merchant ? ` at ${record.merchant}` : ''}
                </Text>
                <TouchableOpacity
                    onPress={handleUndo}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Undo automatic transaction"
                >
                    <Text style={styles.undo}>UNDO</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const useStyles = makeStyles((c, isDark) => ({
    container: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: c.primaryDark,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        ...elevation(isDark).cardHeavy,
    },
    text: {
        flex: 1,
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textWhite,
    },
    undo: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.sm,
        color: c.secondary,
        letterSpacing: 0.5,
    },
}));
