import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import expenseReducer from './slices/expenseSlice';
import syncReducer from './slices/syncSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        expenses: expenseReducer,
        sync: syncReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for date handling
                ignoredActions: ['expenses/addExpense', 'expenses/updateExpense', 'expenses/setExpenses'],
                ignoredPaths: ['expenses.items', 'expenses.pendingQueue'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
