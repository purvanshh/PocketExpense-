import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { store } from '../store';
import { setDetectedTransaction, setPermissionStatus } from '../store/slices/smsSlice';
import { parseSms, isBankMessage, generateTransactionHash, isDuplicate, recordHash } from './sms';
import { detectCategory } from './categoryDetector';
import { checkSmsPermission } from './smsPermission';

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

    store.dispatch(
        setDetectedTransaction({
            amount: transaction.amount,
            merchant: transaction.merchant || '',
            type: transaction.type || 'expense',
            date: (transaction.date || new Date()).toISOString(),
            category,
            accountLastFour: transaction.accountLast4 || undefined,
            confidence: transaction.confidence,
            confidenceLevel,
        })
    );
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
