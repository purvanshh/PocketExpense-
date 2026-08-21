import AsyncStorage from '@react-native-async-storage/async-storage';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import {
    addNotification,
    clearNotifications,
    markAllRead,
    markRead,
} from './slices/notificationSlice';
import {
    addExpense,
    applyServerSnapshot,
    clearPendingQueue,
    deleteExpense,
    deleteExpenses,
    markAsSynced,
    queueRetry,
    setExpenses,
    updateExpense,
} from './slices/expenseSlice';
import {
    disableSmsDetection,
    enableSmsDetection,
    setAutoAddEnabled,
    setAutoAddThreshold,
} from './slices/smsSlice';
import type { RootState } from './index';

export const persistListener = createListenerMiddleware();

/**
 * Writes are coalesced: several rapid mutations produce one disk write instead
 * of one per action. Reducers stay pure — persistence is a side effect of the
 * action, observed here rather than performed inside the reducer.
 */
const DEBOUNCE_MS = 150;

const writeQueue = new Map<string, string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWrite(key: string, value: unknown) {
    writeQueue.set(key, JSON.stringify(value));

    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, DEBOUNCE_MS);
}

async function flush() {
    flushTimer = null;
    if (writeQueue.size === 0) return;

    const pairs: [string, string][] = [...writeQueue.entries()];
    writeQueue.clear();

    try {
        await AsyncStorage.multiSet(pairs);
    } catch (error) {
        // Re-queue so the next mutation retries rather than dropping state.
        for (const [k, v] of pairs) {
            if (!writeQueue.has(k)) writeQueue.set(k, v);
        }
        if (__DEV__) console.warn('[persist] write failed', error);
    }
}

/** Force any pending write to disk — used before the app backgrounds. */
export async function flushPersistence(): Promise<void> {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    await flush();
}

persistListener.startListening({
    matcher: isAnyOf(
        addExpense,
        updateExpense,
        deleteExpense,
        deleteExpenses,
        markAsSynced,
        clearPendingQueue,
        setExpenses,
        applyServerSnapshot,
        queueRetry
    ),
    effect: (_action, api) => {
        const state = api.getState() as RootState;
        scheduleWrite('expenses', state.expenses.items);
        scheduleWrite('pendingQueue', state.expenses.pendingQueue);
        scheduleWrite('tombstones', state.expenses.tombstones);
    },
});

persistListener.startListening({
    matcher: isAnyOf(addNotification, markRead, markAllRead, clearNotifications),
    effect: (_action, api) => {
        const state = api.getState() as RootState;
        scheduleWrite('notifications', state.notifications.items);
    },
});

persistListener.startListening({
    matcher: isAnyOf(
        enableSmsDetection,
        disableSmsDetection,
        setAutoAddEnabled,
        setAutoAddThreshold
    ),
    effect: (_action, api) => {
        const { sms } = api.getState() as RootState;
        scheduleWrite('smsSettings', {
            isEnabled: sms.isEnabled,
            autoAddEnabled: sms.autoAddEnabled,
            autoAddThreshold: sms.autoAddThreshold,
        });
    },
});
