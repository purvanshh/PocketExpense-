import { configureStore } from '@reduxjs/toolkit';
import { persistListener } from './persistMiddleware';
import authReducer from './slices/authSlice';
import budgetReducer from './slices/budgetSlice';
import expenseReducer from './slices/expenseSlice';
import insightReducer from './slices/insightSlice';
import notificationReducer from './slices/notificationSlice';
import smsReducer from './slices/smsSlice';
import syncReducer from './slices/syncSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        expenses: expenseReducer,
        sync: syncReducer,
        budgets: budgetReducer,
        insights: insightReducer,
        sms: smsReducer,
        notifications: notificationReducer,
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
        }).prepend(persistListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
