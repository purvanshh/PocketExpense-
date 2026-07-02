import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NOTIFICATION_PREFS_KEY = 'notificationPrefs';

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

// Foreground presentation. Without this a notification fired while the app is
// open is swallowed silently.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

let androidChannelReady = false;

/** Android requires an explicit channel before anything will surface. */
async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android' || androidChannelReady) return;

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
