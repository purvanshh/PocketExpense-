import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { store } from '../store';
import { addExpense } from '../store/slices/expenseSlice';
import { addNotification } from '../store/slices/notificationSlice';
import {
    recordAutoAdded,
    setDetectedTransaction,
    setPermissionStatus,
} from '../store/slices/smsSlice';
import { formatCurrency } from '../utils/formatters';
import { newId } from '../utils/id';
import { checkBudgets } from './budgetAlerts';
import { detectCategory } from './categoryDetector';
import { loadPrefs, notify } from './notifications';
import { generateTransactionHash, isBankMessage, isDuplicate, parseSms, recordHash } from './sms';
import { checkSmsPermission } from './smsPermission';
import { syncEngine } from './syncEngine';

type SmsReceivedEvent = {
    messageBody: string;
    senderPhoneNumber: string;
    timestamp?: number;
};

const DEBOUNCE_MS = 100;
const TIME_DEDUP_WINDOW_MS = 2 * 60 * 1000;

let listenerSubscription: { remove: () => void } | null = null;
let isInitialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastProcessedHash: string | null = null;
let lastProcessedTime = 0;

async function handleIncomingSms(event: SmsReceivedEvent): Promise<void> {
    const { messageBody, senderPhoneNumber, timestamp } = event;

    if (!messageBody || !isBankMessage(senderPhoneNumber || '', messageBody)) {
        return;
    }

    const smsTimestamp = timestamp ? new Date(timestamp) : undefined;
    const { transaction, confidenceLevel } = parseSms(messageBody, senderPhoneNumber, smsTimestamp);

    if (!transaction.isTransaction || transaction.amount === null || transaction.amount <= 0) {
        return;
    }

    if (confidenceLevel === 'ignore') return;

    // Deduplication: hash-based
    const hash = generateTransactionHash(
        transaction.amount,
        transaction.merchant,
        transaction.type,
        transaction.accountLast4,
        transaction.date,
    );

    if (await isDuplicate(hash)) return;

    // Time-window dedup: prevent same amount+type within 2 minutes
    const now = Date.now();
    if (lastProcessedHash === hash && now - lastProcessedTime < TIME_DEDUP_WINDOW_MS) {
        return;
    }

    await recordHash(hash);
    lastProcessedHash = hash;
    lastProcessedTime = now;

    const category = detectCategory(transaction.merchant || '');
    const merchant = transaction.merchant || '';
    const type = transaction.type || 'expense';
    const date = (transaction.date || new Date()).toISOString();

    const { autoAddEnabled, autoAddThreshold } = store.getState().sms;

    // Above the auto-add bar the transaction is logged straight away and the
    // user is told after the fact, with an undo. Below it, they confirm first.
    if (
        autoAddEnabled &&
        confidenceLevel === 'high' &&
        transaction.confidence >= autoAddThreshold
    ) {
        await autoAddTransaction({
            amount: transaction.amount,
            merchant,
            type,
            date,
            category,
        });
        return;
    }

    store.dispatch(
        setDetectedTransaction({
            amount: transaction.amount,
            merchant,
            type,
            date,
            category,
            accountLastFour: transaction.accountLast4 || undefined,
            confidence: transaction.confidence,
            confidenceLevel,
        })
    );
}

/** Log a high-confidence transaction without asking, then notify with an undo. */
async function autoAddTransaction(input: {
    amount: number;
    merchant: string;
    type: 'expense' | 'income';
    date: string;
    category: string;
}): Promise<void> {
    const localId = newId();

    store.dispatch(
        addExpense({
            localId,
            amount: input.amount,
            type: input.type,
            category: input.category,
            description: input.merchant
                ? `Auto-logged: ${input.merchant}`
                : 'Auto-logged from SMS',
            paymentMethod: 'bank_transfer',
            date: input.date,
            isRecurring: false,
        })
    );

    store.dispatch(
        recordAutoAdded({
            localId,
            amount: input.amount,
            merchant: input.merchant,
            category: input.category,
            at: new Date().toISOString(),
        })
    );

    const currency = store.getState().auth.user?.currency ?? 'INR';
    const where = input.merchant ? ` at ${input.merchant}` : '';
    const title = 'Transaction logged';
    const message = `${formatCurrency(input.amount, currency)}${where} was added automatically.`;

    store.dispatch(
        addNotification({
            id: newId(),
            title,
            message,
            createdAt: new Date().toISOString(),
            read: false,
            kind: 'auto-added',
        })
    );

    const prefs = await loadPrefs();
    if (prefs.notifyOnAutoAdd) {
        await notify(title, message);
    }

    // A new expense can push a budget over its threshold.
    await checkBudgets(currency);

    syncEngine.syncPending();
}

function debouncedHandler(event: SmsReceivedEvent): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const currentState = store.getState();
        if (!currentState.sms.isEnabled) return;
        handleIncomingSms(event);
    }, DEBOUNCE_MS);
}

export async function initSmsListener(): Promise<void> {
    if (Platform.OS !== 'android') return;

    // Singleton: prevent duplicate subscriptions
    if (isInitialized && listenerSubscription) return;

    const state = store.getState();
    if (!state.sms.isEnabled) return;

    const permStatus = await checkSmsPermission();
    store.dispatch(setPermissionStatus(permStatus));

    if (permStatus !== 'granted') return;

    try {
        const { SmsListenerModule } = NativeModules;

        if (!SmsListenerModule) {
            if (__DEV__) console.warn('[SMS] SmsListenerModule not available');
            return;
        }

        const emitter = new NativeEventEmitter(SmsListenerModule);
        listenerSubscription = emitter.addListener('onSMSReceived', debouncedHandler);
        isInitialized = true;
    } catch {
        // Silently fail in production — no SMS content in logs
    }
}

export function stopSmsListener(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    if (listenerSubscription) {
        listenerSubscription.remove();
        listenerSubscription = null;
    }
    isInitialized = false;
    lastProcessedHash = null;
    lastProcessedTime = 0;
}

export function restartSmsListener(): void {
    stopSmsListener();
    initSmsListener();
}

/**
 * Simulate incoming SMS for dev/testing only.
 * No-op in production builds.
 */
export function simulateSmsForTesting(body: string, sender: string = 'VM-HDFCBK'): void {
    if (__DEV__) {
        handleIncomingSms({ messageBody: body, senderPhoneNumber: sender });
    }
}

/**
 * Stress test utility: fires N simulated SMS events and returns timing metrics.
 * Only available in __DEV__ mode.
 */
export async function simulateBulkSms(
    count: number,
    sampleBody: string = 'Rs.450 debited from A/c XX1234 at Amazon on 03/03/2026',
    sender: string = 'VM-HDFCBK',
): Promise<{ totalMs: number; avgMs: number; count: number } | null> {
    if (!__DEV__) return null;

    const start = performance.now();
    for (let i = 0; i < count; i++) {
        const body = sampleBody.replace('450', String(100 + i));
        await handleIncomingSms({ messageBody: body, senderPhoneNumber: sender });
    }
    const totalMs = Math.round((performance.now() - start) * 100) / 100;

    return {
        totalMs,
        avgMs: Math.round((totalMs / count) * 100) / 100,
        count,
    };
}
