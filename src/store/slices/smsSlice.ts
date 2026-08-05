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

/** A transaction logged without confirmation, retained briefly so it can be undone. */
export interface AutoAddedRecord {
    localId: string;
    amount: number;
    merchant: string;
    category: string;
    at: string;
}

export interface SmsState {
    isEnabled: boolean;
    permissionStatus: 'granted' | 'denied' | 'never_ask_again' | 'unavailable' | 'unknown';
    lastDetectedTransaction: DetectedTransaction | null;
    showConfirmation: boolean;
    detectionCount: number;
    /** Skip the confirmation sheet when confidence clears `autoAddThreshold`. */
    autoAddEnabled: boolean;
    autoAddThreshold: number;
    lastAutoAdded: AutoAddedRecord | null;
    autoAddCount: number;
}

const initialState: SmsState = {
    isEnabled: false,
    permissionStatus: 'unknown',
    lastDetectedTransaction: null,
    showConfirmation: false,
    detectionCount: 0,
    autoAddEnabled: false,
    // Deliberately stricter than the 0.75 that merely opens the sheet: logging
    // without asking should require near-certainty.
    autoAddThreshold: 0.9,
    lastAutoAdded: null,
    autoAddCount: 0,
};

const smsSlice = createSlice({
    name: 'sms',
    initialState,
    reducers: {
        enableSmsDetection: (state) => {
            state.isEnabled = true;
        },
        disableSmsDetection: (state) => {
            state.isEnabled = false;
            state.lastDetectedTransaction = null;
            state.showConfirmation = false;
            // Auto-add cannot outlive detection being switched off.
            state.autoAddEnabled = false;
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
        setAutoAddEnabled: (state, action: PayloadAction<boolean>) => {
            state.autoAddEnabled = action.payload;
        },
        setAutoAddThreshold: (state, action: PayloadAction<number>) => {
            state.autoAddThreshold = Math.min(1, Math.max(0.5, action.payload));
        },
        recordAutoAdded: (state, action: PayloadAction<AutoAddedRecord>) => {
            state.lastAutoAdded = action.payload;
            state.detectionCount += 1;
            state.autoAddCount += 1;
        },
        clearAutoAdded: (state) => {
            state.lastAutoAdded = null;
        },
        hydrateSmsSettings: (
            state,
            action: PayloadAction<{
                isEnabled: boolean;
                autoAddEnabled?: boolean;
                autoAddThreshold?: number;
            }>
        ) => {
            state.isEnabled = action.payload.isEnabled;
            if (typeof action.payload.autoAddEnabled === 'boolean') {
                state.autoAddEnabled = action.payload.autoAddEnabled;
            }
            if (typeof action.payload.autoAddThreshold === 'number') {
                state.autoAddThreshold = action.payload.autoAddThreshold;
            }
        },
    },
});

export const {
    enableSmsDetection,
    disableSmsDetection,
    setPermissionStatus,
    setDetectedTransaction,
    clearDetectedTransaction,
    setAutoAddEnabled,
    setAutoAddThreshold,
    recordAutoAdded,
    clearAutoAdded,
    hydrateSmsSettings,
} = smsSlice.actions;

export default smsSlice.reducer;
