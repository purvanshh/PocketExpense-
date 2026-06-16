import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { newId } from '../../utils/id';

export interface Expense {
    _id?: string;
    localId: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    description: string;
    paymentMethod: string;
    date: string;
    isRecurring: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | null;
    nextRunDate?: string | null;
    syncStatus: 'synced' | 'pending' | 'conflict';
    /** Local wall-clock of the last edit. Drives conflict resolution. */
    updatedAt: string;
    /** Set when this row was created from a receipt capture. */
    receiptUri?: string | null;
}

/**
 * A delete that has not yet been confirmed by the server. Without these a
 * deleted row is simply absent locally, so the next server fetch resurrects it.
 */
export interface Tombstone {
    localId: string;
    serverId?: string;
    deletedAt: string;
    attempts: number;
}

interface RetryState {
    attempts: number;
    /** ISO timestamp before which no sync should be attempted. */
    nextAttemptAt: string | null;
    lastError: string | null;
}

interface ExpenseState {
    items: Expense[];
    pendingQueue: Expense[];
    tombstones: Tombstone[];
    isLoading: boolean;
    error: string | null;
    totalExpense: number;
    totalIncome: number;
    retry: RetryState;
}

const initialState: ExpenseState = {
    items: [],
    pendingQueue: [],
    tombstones: [],
    isLoading: false,
    error: null,
    totalExpense: 0,
    totalIncome: 0,
    retry: { attempts: 0, nextAttemptAt: null, lastError: null },
};

/** Month-to-date totals. Recomputed after any mutation to items. */
const calculateTotals = (items: Expense[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return items.reduce(
        (acc, item) => {
            const itemDate = new Date(item.date);
            if (itemDate >= startOfMonth) {
                if (item.type === 'expense') {
                    acc.totalExpense += item.amount;
                } else {
                    acc.totalIncome += item.amount;
                }
            }
            return acc;
        },
        { totalExpense: 0, totalIncome: 0 }
    );
};

const recalc = (state: ExpenseState) => {
    const totals = calculateTotals(state.items);
    state.totalExpense = totals.totalExpense;
    state.totalIncome = totals.totalIncome;
};

/** Queue an item for upload, replacing any earlier queued version of it. */
const enqueue = (state: ExpenseState, expense: Expense) => {
    const index = state.pendingQueue.findIndex((e) => e.localId === expense.localId);
    if (index !== -1) {
        state.pendingQueue[index] = expense;
    } else {
        state.pendingQueue.push(expense);
    }
};

const expenseSlice = createSlice({
    name: 'expenses',
    initialState,
    reducers: {
        setExpenses: (state, action: PayloadAction<Expense[]>) => {
            state.items = action.payload;
            recalc(state);
            state.isLoading = false;
        },

        addExpense: (
            state,
            action: PayloadAction<
                Omit<Expense, 'localId' | 'syncStatus' | 'updatedAt'> &
                Partial<Pick<Expense, 'localId'>>
            >
        ) => {
            const newExpense: Expense = {
                ...action.payload,
                localId: action.payload.localId ?? newId(),
                syncStatus: 'pending',
                updatedAt: new Date().toISOString(),
            };

            state.items.unshift(newExpense);
            enqueue(state, newExpense);
            recalc(state);
        },

        updateExpense: (
            state,
            action: PayloadAction<{ localId: string; updates: Partial<Expense> }>
        ) => {
            const index = state.items.findIndex(
                (item) => item.localId === action.payload.localId
            );
            if (index === -1) return;

            state.items[index] = {
                ...state.items[index],
                ...action.payload.updates,
                syncStatus: 'pending',
                updatedAt: new Date().toISOString(),
            };

            enqueue(state, state.items[index]);
            recalc(state);
        },

        deleteExpense: (state, action: PayloadAction<string>) => {
            const existing = state.items.find((i) => i.localId === action.payload);

            state.items = state.items.filter((item) => item.localId !== action.payload);
            state.pendingQueue = state.pendingQueue.filter(
                (item) => item.localId !== action.payload
            );

            // Only rows the server knows about need a tombstone; a row that was
            // never uploaded can just disappear.
            if (existing?._id) {
                state.tombstones.push({
                    localId: existing.localId,
                    serverId: existing._id,
                    deletedAt: new Date().toISOString(),
                    attempts: 0,
                });
            }

            recalc(state);
        },

        markAsSynced: (
            state,
            action: PayloadAction<{ localId: string; serverId: string }>
        ) => {
            const index = state.items.findIndex(
                (item) => item.localId === action.payload.localId
            );
            if (index !== -1) {
                state.items[index]._id = action.payload.serverId;
                state.items[index].syncStatus = 'synced';
            }
            state.pendingQueue = state.pendingQueue.filter(
                (item) => item.localId !== action.payload.localId
            );
        },

        /** Drop a tombstone once the server has confirmed the delete. */
        markDeleteSynced: (state, action: PayloadAction<string>) => {
            state.tombstones = state.tombstones.filter(
                (t) => t.localId !== action.payload
            );
        },

        /** Record a failed delete attempt so it can be retried or given up on. */
        markDeleteFailed: (state, action: PayloadAction<string>) => {
            const t = state.tombstones.find((x) => x.localId === action.payload);
            if (t) t.attempts += 1;
        },

        clearPendingQueue: (state) => {
            state.pendingQueue = [];
            state.items = state.items.map((item) => ({
                ...item,
                syncStatus: 'synced' as const,
            }));
        },

        /**
         * Merge a server snapshot into local state.
         *
         * Rules, in order:
         *  1. A row with a local tombstone is dropped — the delete is in flight.
         *  2. A row still in the pending queue keeps the local copy — the edit
         *     has not been uploaded yet, so the server copy is by definition stale.
         *  3. Otherwise the newer `updatedAt` wins, defaulting to the server.
         */
        applyServerSnapshot: (state, action: PayloadAction<Expense[]>) => {
            const tombstoned = new Set(state.tombstones.map((t) => t.localId));
            const pending = new Map(state.pendingQueue.map((p) => [p.localId, p]));
            const merged: Expense[] = [];

            for (const serverItem of action.payload) {
                if (tombstoned.has(serverItem.localId)) continue;

                const localPending = pending.get(serverItem.localId);
                if (localPending) {
                    merged.push(localPending);
                    pending.delete(serverItem.localId);
                    continue;
                }

                const localItem = state.items.find(
                    (i) => i.localId === serverItem.localId
                );

                if (
                    localItem?.updatedAt &&
                    serverItem.updatedAt &&
                    new Date(localItem.updatedAt) > new Date(serverItem.updatedAt)
                ) {
                    merged.push({ ...localItem, syncStatus: 'conflict' });
                } else {
                    merged.push({ ...serverItem, syncStatus: 'synced' });
                }
            }

            // Anything still queued was never on the server — keep it.
            for (const leftover of pending.values()) {
                merged.push(leftover);
            }

            merged.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            state.items = merged;
            recalc(state);
            state.isLoading = false;
        },

        /** Record a sync failure and the backoff deadline. */
        queueRetry: (
            state,
            action: PayloadAction<{ nextAttemptAt: string; error: string }>
        ) => {
            state.retry.attempts += 1;
            state.retry.nextAttemptAt = action.payload.nextAttemptAt;
            state.retry.lastError = action.payload.error;
        },

        resetRetry: (state) => {
            state.retry = { attempts: 0, nextAttemptAt: null, lastError: null };
        },

        hydrateExpenses: (
            state,
            action: PayloadAction<{
                items: Expense[];
                pendingQueue: Expense[];
                tombstones?: Tombstone[];
            }>
        ) => {
            state.items = action.payload.items;
            state.pendingQueue = action.payload.pendingQueue;
            state.tombstones = action.payload.tombstones ?? [];
            recalc(state);
            state.isLoading = false;
        },

        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
    },
});

export const {
    setExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    markAsSynced,
    markDeleteSynced,
    markDeleteFailed,
    clearPendingQueue,
    applyServerSnapshot,
    queueRetry,
    resetRetry,
    hydrateExpenses,
    setLoading,
    setError,
} = expenseSlice.actions;

export default expenseSlice.reducer;
