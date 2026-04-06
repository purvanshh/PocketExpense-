import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { store } from '../store';
import apiClient from '../store/api/apiClient';
import {
    Expense,
    markAsSynced,
    setExpenses
} from '../store/slices/expenseSlice';
import {
    setLastSyncTime,
    setOnlineStatus,
    setPendingCount,
    setSyncError,
    setSyncing,
} from '../store/slices/syncSlice';

class SyncEngine {
    private unsubscribe: (() => void) | null = null;

    // Initialize network listener
    init() {
        this.unsubscribe = NetInfo.addEventListener((state) => {
            const isOnline = state.isConnected && state.isInternetReachable;
            store.dispatch(setOnlineStatus(isOnline ?? false));

            if (isOnline) {
                // Trigger sync when coming online
                this.syncPending();
            }
        });
    }

    // Cleanup listener
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    // Check network status
    async checkNetworkStatus(): Promise<boolean> {
        const state = await NetInfo.fetch();
        return (state.isConnected && state.isInternetReachable) ?? false;
    }

    // Sync pending expenses to server
    async syncPending(): Promise<void> {
        const state = store.getState();
        const { pendingQueue } = state.expenses;
        const { token } = state.auth;

        if (!token || pendingQueue.length === 0) {
            return;
        }

        const isOnline = await this.checkNetworkStatus();
        if (!isOnline) {
            return;
        }

        store.dispatch(setSyncing(true));
        store.dispatch(setPendingCount(pendingQueue.length));

        try {
            const response = await apiClient.post('/expenses/sync', {
                expenses: pendingQueue,
            });

            const { results } = response.data.data;

            // Mark each expense as synced
            for (const result of results) {
                store.dispatch(
                    markAsSynced({
                        localId: result.localId,
                        serverId: result.serverId,
                    })
                );
            }

            store.dispatch(setLastSyncTime(new Date().toISOString()));
            store.dispatch(setPendingCount(0));
        } catch (error: any) {
            console.error('Sync error:', error);
            store.dispatch(setSyncError(error.message || 'Sync failed'));
        }
    }

    // Fetch latest data from server
    async fetchFromServer(): Promise<void> {
        const state = store.getState();
        const { token } = state.auth;

        if (!token) {
            return;
        }

        const isOnline = await this.checkNetworkStatus();
        if (!isOnline) {
            // Load from local storage
            await this.loadFromLocal();
            return;
        }

        store.dispatch(setSyncing(true));

        try {
            const response = await apiClient.get('/expenses', {
                params: { limit: 100 },
            });

            const serverExpenses: Expense[] = response.data.data.expenses.map(
                (exp: any) => ({
                    _id: exp._id,
                    localId: exp.localId || exp._id,
                    amount: exp.amount,
                    type: exp.type,
                    category: exp.category,
                    description: exp.description,
                    paymentMethod: exp.paymentMethod,
                    date: exp.date,
                    isRecurring: exp.isRecurring,
                    syncStatus: 'synced' as const,
                })
            );

            // Merge with local pending items
            const localState = store.getState();
            const { pendingQueue } = localState.expenses;

            // Add pending items that aren't on server yet
            const mergedExpenses = [...serverExpenses];
            for (const pending of pendingQueue) {
                if (!serverExpenses.find((s) => s.localId === pending.localId)) {
                    mergedExpenses.push(pending);
                }
            }

            // Sort by date
            mergedExpenses.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            store.dispatch(setExpenses(mergedExpenses));
            store.dispatch(setLastSyncTime(new Date().toISOString()));

            // Persist locally
            await AsyncStorage.setItem('expenses', JSON.stringify(mergedExpenses));
        } catch (error: any) {
            console.error('Fetch error:', error);
            // Fall back to local data
            await this.loadFromLocal();
            store.dispatch(setSyncError(error.message || 'Fetch failed'));
        }
    }

    // Load data from local storage
    async loadFromLocal(): Promise<void> {
        try {
            const expensesJson = await AsyncStorage.getItem('expenses');
            const pendingQueueJson = await AsyncStorage.getItem('pendingQueue');

            const expenses: Expense[] = expensesJson ? JSON.parse(expensesJson) : [];
            const pendingQueue: Expense[] = pendingQueueJson
                ? JSON.parse(pendingQueueJson)
                : [];

            store.dispatch(setExpenses(expenses));
            store.dispatch(setPendingCount(pendingQueue.length));
        } catch (error) {
            console.error('Load from local error:', error);
        }
    }

    // Save data to local storage
    async saveToLocal(expenses: Expense[]): Promise<void> {
        await AsyncStorage.setItem('expenses', JSON.stringify(expenses));
    }

    // Full sync - fetch and push
    async fullSync(): Promise<void> {
        await this.syncPending();
        await this.fetchFromServer();
    }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
