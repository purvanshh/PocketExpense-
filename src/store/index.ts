import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import expenseReducer from './slices/expenseSlice';
import syncReducer from './slices/syncSlice';
import budgetReducer from './slices/budgetSlice';
import insightReducer from './slices/insightSlice';
import smsReducer from './slices/smsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        expenses: expenseReducer,
        sync: syncReducer,
        budgets: budgetReducer,
        insights: insightReducer,
        sms: smsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'expenses/addExpense',
                    'expenses/updateExpense',
                    'expenses/setExpenses',
                    'budgets/fetchAll/fulfilled',
                    'budgets/create/fulfilled',
                    'insights/fetchAdvanced/fulfilled',
                    'sms/setDetectedTransaction',
                ],
                ignoredPaths: ['expenses.items', 'expenses.pendingQueue'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
