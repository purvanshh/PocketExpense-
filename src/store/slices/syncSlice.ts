import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: string | null;
    pendingCount: number;
    error: string | null;
}

const initialState: SyncState = {
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
};

const syncSlice = createSlice({
    name: 'sync',
    initialState,
    reducers: {
        setOnlineStatus: (state, action: PayloadAction<boolean>) => {
            state.isOnline = action.payload;
        },
        setSyncing: (state, action: PayloadAction<boolean>) => {
            state.isSyncing = action.payload;
        },
        setLastSyncTime: (state, action: PayloadAction<string>) => {
            state.lastSyncTime = action.payload;
            state.isSyncing = false;
        },
        setPendingCount: (state, action: PayloadAction<number>) => {
            state.pendingCount = action.payload;
        },
        setSyncError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isSyncing = false;
        },
        resetSync: (state) => {
            state.isSyncing = false;
            state.error = null;
        },
    },
});

export const {
    setOnlineStatus,
    setSyncing,
    setLastSyncTime,
    setPendingCount,
    setSyncError,
    resetSync,
} = syncSlice.actions;

export default syncSlice.reducer;
