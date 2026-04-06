import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DetectedTransaction {
    amount: number;
    merchant: string;
    type: 'expense' | 'income';
    date: string;
    category: string;
    accountLastFour?: string;
    confidence?: number;
    confidenceLevel?: 'high' | 'low' | 'ignore';
}

export interface SmsState {
    isEnabled: boolean;
    permissionStatus: 'granted' | 'denied' | 'never_ask_again' | 'unavailable' | 'unknown';
    lastDetectedTransaction: DetectedTransaction | null;
    showConfirmation: boolean;
    detectionCount: number;
}

const initialState: SmsState = {
    isEnabled: false,
    permissionStatus: 'unknown',
    lastDetectedTransaction: null,
    showConfirmation: false,
    detectionCount: 0,
};

const persistSmsSettings = async (isEnabled: boolean) => {
    await AsyncStorage.setItem('smsDetectionEnabled', JSON.stringify(isEnabled));
};

const smsSlice = createSlice({
    name: 'sms',
    initialState,
    reducers: {
        enableSmsDetection: (state) => {
            state.isEnabled = true;
            persistSmsSettings(true);
        },
        disableSmsDetection: (state) => {
            state.isEnabled = false;
            state.lastDetectedTransaction = null;
            state.showConfirmation = false;
            persistSmsSettings(false);
        },
        setPermissionStatus: (
            state,
            action: PayloadAction<SmsState['permissionStatus']>
        ) => {
            state.permissionStatus = action.payload;
        },
        setDetectedTransaction: (
            state,
            action: PayloadAction<DetectedTransaction>
        ) => {
            state.lastDetectedTransaction = action.payload;
            state.showConfirmation = true;
            state.detectionCount += 1;
        },
        clearDetectedTransaction: (state) => {
            state.lastDetectedTransaction = null;
            state.showConfirmation = false;
        },
        hydrateSmsSettings: (
            state,
            action: PayloadAction<{ isEnabled: boolean }>
        ) => {
            state.isEnabled = action.payload.isEnabled;
        },
    },
});

export const {
    enableSmsDetection,
    disableSmsDetection,
    setPermissionStatus,
    setDetectedTransaction,
    clearDetectedTransaction,
    hydrateSmsSettings,
} = smsSlice.actions;

export default smsSlice.reducer;
