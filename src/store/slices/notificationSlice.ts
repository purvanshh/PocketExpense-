import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NotificationKind =
    | 'budget-warning'
    | 'budget-exceeded'
    | 'auto-added'
    | 'info';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    /** ISO timestamp. */
    createdAt: string;
    read: boolean;
    kind: NotificationKind;
}

interface NotificationState {
    items: AppNotification[];
}

const initialState: NotificationState = {
    items: [],
};

/** Cap the feed so persisted storage can't grow without bound. */
const MAX_ITEMS = 50;

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<AppNotification>) => {
            state.items.unshift(action.payload);
            if (state.items.length > MAX_ITEMS) {
                state.items.length = MAX_ITEMS;
            }
        },
        markRead: (state, action: PayloadAction<string>) => {
            const item = state.items.find((n) => n.id === action.payload);
            if (item) item.read = true;
        },
        markAllRead: (state) => {
            state.items.forEach((n) => {
                n.read = true;
            });
        },
        clearNotifications: (state) => {
            state.items = [];
        },
        hydrateNotifications: (state, action: PayloadAction<AppNotification[]>) => {
            state.items = action.payload;
        },
    },
});

export const {
    addNotification,
    markRead,
    markAllRead,
    clearNotifications,
    hydrateNotifications,
} = notificationSlice.actions;

export const selectUnreadCount = (items: AppNotification[]) =>
    items.reduce((n, item) => (item.read ? n : n + 1), 0);

export default notificationSlice.reducer;
