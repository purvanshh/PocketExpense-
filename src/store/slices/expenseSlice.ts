import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';
// Simple unique ID generator
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};



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
}

interface ExpenseState {
    items: Expense[];
    pendingQueue: Expense[];
    isLoading: boolean;
    error: string | null;
    totalExpense: number;
    totalIncome: number;
}

const initialState: ExpenseState = {
    items: [],
    pendingQueue: [],
    isLoading: false,
    error: null,
    totalExpense: 0,
    totalIncome: 0,
};

// Helper to persist data
const persistExpenses = async (items: Expense[], pendingQueue: Expense[]) => {
    await AsyncStorage.setItem('expenses', JSON.stringify(items));
    await AsyncStorage.setItem('pendingQueue', JSON.stringify(pendingQueue));
};

// Calculate totals helper
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

const expenseSlice = createSlice({
    name: 'expenses',
    initialState,
    reducers: {
        setExpenses: (state, action: PayloadAction<Expense[]>) => {
            state.items = action.payload;
            const totals = calculateTotals(action.payload);
            state.totalExpense = totals.totalExpense;
            state.totalIncome = totals.totalIncome;
            state.isLoading = false;
        },
        addExpense: (state, action: PayloadAction<Omit<Expense, 'localId' | 'syncStatus'>>) => {
            const newExpense: Expense = {
                ...action.payload,
                localId: generateId(),
                syncStatus: 'pending',
            };
            state.items.unshift(newExpense);
            state.pendingQueue.push(newExpense);

            const totals = calculateTotals(state.items);
            state.totalExpense = totals.totalExpense;
            state.totalIncome = totals.totalIncome;

            persistExpenses(current(state.items), current(state.pendingQueue));
        },
        updateExpense: (
            state,
            action: PayloadAction<{ localId: string; updates: Partial<Expense> }>
        ) => {
            const index = state.items.findIndex(
                (item) => item.localId === action.payload.localId
            );
            if (index !== -1) {
                state.items[index] = {
                    ...state.items[index],
                    ...action.payload.updates,
                    syncStatus: 'pending',
                };

                // Add to pending queue if not already there
                const pendingIndex = state.pendingQueue.findIndex(
                    (item) => item.localId === action.payload.localId
                );
                if (pendingIndex !== -1) {
                    state.pendingQueue[pendingIndex] = state.items[index];
                } else {
                    state.pendingQueue.push(state.items[index]);
                }

                const totals = calculateTotals(state.items);
                state.totalExpense = totals.totalExpense;
                state.totalIncome = totals.totalIncome;

                persistExpenses(current(state.items), current(state.pendingQueue));
            }
        },
        deleteExpense: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(
                (item) => item.localId !== action.payload
            );
            state.pendingQueue = state.pendingQueue.filter(
                (item) => item.localId !== action.payload
            );

            const totals = calculateTotals(state.items);
            state.totalExpense = totals.totalExpense;
            state.totalIncome = totals.totalIncome;

            persistExpenses(state.items, state.pendingQueue);
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
            persistExpenses(current(state.items), state.pendingQueue);
        },
        clearPendingQueue: (state) => {
            state.pendingQueue = [];
            state.items = state.items.map((item) => ({
                ...item,
                syncStatus: 'synced' as const,
            }));
            persistExpenses(state.items, state.pendingQueue);
        },
        hydrateExpenses: (
            state,
            action: PayloadAction<{ items: Expense[]; pendingQueue: Expense[] }>
        ) => {
            state.items = action.payload.items;
            state.pendingQueue = action.payload.pendingQueue;
            const totals = calculateTotals(action.payload.items);
            state.totalExpense = totals.totalExpense;
            state.totalIncome = totals.totalIncome;
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
    clearPendingQueue,
    hydrateExpenses,
    setLoading,
    setError,
} = expenseSlice.actions;

export default expenseSlice.reducer;
