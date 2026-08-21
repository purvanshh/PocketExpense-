import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const NOTIFICATION_PREFS_KEY = 'notificationPrefs';

type NotificationsModule = typeof import('expo-notifications');

// expo-notifications dropped remote notification support in Expo Go (SDK 53+).
// Loading it there calls console.error during module evaluation, so the whole
// module must be skipped — not just caught — when running in Expo Go. Every call
// then degrades to a no-op.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: NotificationsModule | null = null;

if (!isExpoGo) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const notif = require('expo-notifications') as NotificationsModule;

        // Foreground presentation. Without this a notification fired while the
        // app is open is swallowed silently.
        notif.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: false,
                shouldSetBadge: false,
            }),
        });

        Notifications = notif;
    } catch {
        Notifications = null;
    }
}

export interface NotificationPrefs {
    /** Master switch — when false nothing is ever delivered. */
    enabled: boolean;
    /** Warn once when a budget crosses this percentage. */
    warnThreshold: number;
    /** Warn again when a budget is fully spent. */
    notifyOnExceed: boolean;
    /** Notify when an SMS-detected transaction is auto-added. */
    notifyOnAutoAdd: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
    enabled: true,
    warnThreshold: 80,
    notifyOnExceed: true,
    notifyOnAutoAdd: true,
};

// Foreground presentation is configured when the module loads successfully
// above; no setup here keeps Expo Go safe.
let androidChannelReady = false;

/** Android requires an explicit channel before anything will surface. */
async function ensureAndroidChannel(): Promise<void> {
    if (!Notifications || Platform.OS !== 'android' || androidChannelReady) return;

    await Notifications.setNotificationChannelAsync('budget-alerts', {
        name: 'Budget alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });

    androidChannelReady = true;
}

/**
 * Asks for notification permission, requesting only if not already decided.
 * Returns false rather than throwing so callers can degrade quietly.
 */
export async function ensurePermission(): Promise<boolean> {
    try {
        if (!Notifications) return false;

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;

        if (existing !== 'granted') {
            const req = await Notifications.requestPermissionsAsync();
            status = req.status;
        }

        if (status !== 'granted') return false;

        await ensureAndroidChannel();
        return true;
    } catch {
        return false;
    }
}

export async function loadPrefs(): Promise<NotificationPrefs> {
    try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (!raw) return DEFAULT_PREFS;
        // Merge so a pref added in a later version still gets a default.
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_PREFS;
    }
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
}

/** Deliver immediately. Returns false if permission was missing. */
export async function notify(title: string, body: string): Promise<boolean> {
    if (!Notifications) return false;

    const prefs = await loadPrefs();
    if (!prefs.enabled) return false;

    const granted = await ensurePermission();
    if (!granted) return false;

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                ...(Platform.OS === 'android' ? { channelId: 'budget-alerts' } : null),
            },
            // null trigger => deliver now
            trigger: null,
        });
        return true;
    } catch {
        return false;
    }
}
