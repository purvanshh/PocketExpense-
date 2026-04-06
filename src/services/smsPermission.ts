import { Alert, Linking, Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

export type SmsPermissionStatus = 'granted' | 'denied' | 'never_ask_again' | 'unavailable';

export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
    if (Platform.OS !== 'android') return 'unavailable';

    try {
        const alreadyGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_SMS
        );
        if (alreadyGranted) return 'granted';

        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: 'SMS Permission',
                message:
                    'PocketExpense+ can automatically detect bank transactions from your SMS messages. ' +
                    'Messages are parsed locally on your device and never sent to any server. ' +
                    'Only the extracted transaction amount and merchant name are used.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
                buttonNeutral: 'Ask Later',
            }
        );

        switch (result) {
            case PermissionsAndroid.RESULTS.GRANTED:
                return 'granted';
            case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
                return 'never_ask_again';
            default:
                return 'denied';
        }
    } catch (err) {
        console.error('SMS permission request failed:', err);
        return 'denied';
    }
}

export async function checkSmsPermission(): Promise<SmsPermissionStatus> {
    if (Platform.OS !== 'android') return 'unavailable';

    try {
        const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_SMS
        );
        return granted ? 'granted' : 'denied';
    } catch {
        return 'denied';
    }
}

export async function requestReceiveSmsPermission(): Promise<SmsPermissionStatus> {
    if (Platform.OS !== 'android') return 'unavailable';

    try {
        const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ]);

        const readResult = results[PermissionsAndroid.PERMISSIONS.READ_SMS];
        const receiveResult = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];

        if (
            readResult === PermissionsAndroid.RESULTS.GRANTED &&
            receiveResult === PermissionsAndroid.RESULTS.GRANTED
        ) {
            return 'granted';
        }

        if (
            readResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
            receiveResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        ) {
            return 'never_ask_again';
        }

        return 'denied';
    } catch {
        return 'denied';
    }
}

export function showPermissionDeniedAlert(): void {
    Alert.alert(
        'Permission Required',
        'SMS permission is needed to auto-detect bank transactions. ' +
        'You can enable it later from Settings > SMS Detection.',
        [{ text: 'OK' }]
    );
}

export function showNeverAskAgainAlert(): void {
    Alert.alert(
        'Permission Blocked',
        'SMS permission has been permanently denied. To enable automatic transaction detection, ' +
        'please go to your device Settings > Apps > PocketExpense+ > Permissions and allow SMS access.',
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
    );
}
