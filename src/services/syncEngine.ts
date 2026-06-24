import NetInfo from '@react-native-community/netinfo';

import { store } from '../store';
import apiClient from '../store/api/apiClient';
import {
    applyServerSnapshot,
    markAsSynced,
    markDeleteFailed,
    markDeleteSynced,
    queueRetry,
    resetRetry,
    type Expense,
} from '../store/slices/expenseSlice';
import {
    setLastSyncTime,
    setOnlineStatus,
    setPendingCount,
    setSyncError,
    setSyncing,
} from '../store/slices/syncSlice';

/** Pull size per request; the server caps `limit` at 100. */
const PAGE_SIZE = 100;
/** Stop paginating after this many pages so a bad response can't spin forever. */
const MAX_PAGES = 20;
/** Give up on a delete after this many failed attempts. */
const MAX_DELETE_ATTEMPTS = 5;

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 5 * 60_000;

const backoffFor = (attempts: number): number =>
    Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);

class SyncEngine {
    private unsubscribe: (() => void) | null = null;
    private inFlight = false;

    init() {
        this.unsubscribe = NetInfo.addEventListener((state) => {
            const isOnline = state.isConnected && state.isInternetReachable;
            store.dispatch(setOnlineStatus(isOnline ?? false));

            if (isOnline) {
                // Coming back online is the natural moment to drain the queue.
                this.syncPending();
            }
        });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    async checkNetworkStatus(): Promise<boolean> {
        const state = await NetInfo.fetch();
        return (state.isConnected && state.isInternetReachable) ?? false;
    }

    /** True when a previous failure's backoff window has not yet elapsed. */
    private isBackingOff(): boolean {
        const { nextAttemptAt } = store.getState().expenses.retry;
        if (!nextAttemptAt) return false;
        return Date.now() < new Date(nextAttemptAt).getTime();
    }

    private recordFailure(error: unknown) {
        const attempts = store.getState().expenses.retry.attempts;
        const message =
            error instanceof Error ? error.message : 'Sync failed';

        store.dispatch(
            queueRetry({
                nextAttemptAt: new Date(Date.now() + backoffFor(attempts)).toISOString(),
                error: message,
            })
        );
        store.dispatch(setSyncError(message));
    }

    /**
     * Push queued creates/updates, then queued deletes.
     * `force` skips the backoff check — used for pull-to-refresh, where the
     * user has explicitly asked for a retry.
     */
    async syncPending(force = false): Promise<void> {
        if (this.inFlight) return;
        if (!force && this.isBackingOff()) return;

        const state = store.getState();
        const { pendingQueue, tombstones } = state.expenses;
        const { token } = state.auth;

        if (!token) return;
        if (pendingQueue.length === 0 && tombstones.length === 0) return;

        if (!(await this.checkNetworkStatus())) return;

        this.inFlight = true;
        store.dispatch(setSyncing(true));
        store.dispatch(setPendingCount(pendingQueue.length + tombstones.length));

        try {
            if (pendingQueue.length > 0) {
                const response = await apiClient.post('/expenses/sync', {
                    expenses: pendingQueue.map(toWirePayload),
                });

                const results = response.data?.data?.results;
                if (!Array.isArray(results)) {
                    throw new Error('Unexpected sync response shape');
                }

                for (const result of results) {
                    if (result?.localId && result?.serverId) {
                        store.dispatch(
                            markAsSynced({
                                localId: result.localId,
                                serverId: result.serverId,
                            })
                        );
                    }
                }
            }

            await this.pushDeletes();

            store.dispatch(resetRetry());
            store.dispatch(setLastSyncTime(new Date().toISOString()));
            store.dispatch(setPendingCount(store.getState().expenses.pendingQueue.length));
        } catch (error) {
            this.recordFailure(error);
        } finally {
            this.inFlight = false;
        }
    }

    /**
     * Send each tombstone as a DELETE. A 404 counts as success — the row is
     * already gone server-side, which is the state we were trying to reach.
     */
    private async pushDeletes(): Promise<void> {
        const { tombstones } = store.getState().expenses;

        for (const tombstone of tombstones) {
            if (!tombstone.serverId) {
                store.dispatch(markDeleteSynced(tombstone.localId));
                continue;
            }

            if (tombstone.attempts >= MAX_DELETE_ATTEMPTS) {
                // Stop retrying forever; drop it so the queue can drain.
                store.dispatch(markDeleteSynced(tombstone.localId));
                continue;
            }

            try {
                await apiClient.delete(`/expenses/${tombstone.serverId}`);
                store.dispatch(markDeleteSynced(tombstone.localId));
            } catch (error: any) {
                if (error?.response?.status === 404) {
                    store.dispatch(markDeleteSynced(tombstone.localId));
                } else {
                    store.dispatch(markDeleteFailed(tombstone.localId));
                }
            }
        }
    }

    /** Pull every page of server expenses and merge them into local state. */
    async fetchFromServer(): Promise<void> {
        const { token } = store.getState().auth;
        if (!token) return;

        if (!(await this.checkNetworkStatus())) return;

        store.dispatch(setSyncing(true));

        try {
            const collected: Expense[] = [];
            let page = 1;
            let totalPages = 1;

            do {
                const response = await apiClient.get('/expenses', {
                    params: { page, limit: PAGE_SIZE },
                });

                const data = response.data?.data;
                const batch = data?.expenses;
                if (!Array.isArray(batch)) {
                    throw new Error('Unexpected expenses response shape');
                }

                collected.push(...batch.map(fromWirePayload));

                totalPages = Number(data?.totalPages) || 1;
                page += 1;
            } while (page <= totalPages && page <= MAX_PAGES);

            store.dispatch(applyServerSnapshot(collected));
            store.dispatch(resetRetry());
            store.dispatch(setLastSyncTime(new Date().toISOString()));
        } catch (error) {
            // Local state is already the source of truth for the UI, so a failed
            // pull just leaves the existing rows in place.
            this.recordFailure(error);
        }
    }

    /** Push first so local edits win, then pull. */
    async fullSync(force = false): Promise<void> {
        await this.syncPending(force);
        await this.fetchFromServer();
    }
}

/** Strip local-only bookkeeping the API's validator would reject. */
function toWirePayload(expense: Expense) {
    return {
        localId: expense.localId,
        amount: expense.amount,
        type: expense.type,
        category: expense.category,
        description: expense.description,
        paymentMethod: expense.paymentMethod,
        date: expense.date,
        isRecurring: expense.isRecurring,
        frequency: expense.frequency ?? null,
    };
}

function fromWirePayload(raw: any): Expense {
    return {
        _id: raw._id,
        localId: raw.localId || raw._id,
        amount: raw.amount,
        type: raw.type,
        category: raw.category,
        description: raw.description,
        paymentMethod: raw.paymentMethod,
        date: raw.date,
        isRecurring: raw.isRecurring,
        frequency: raw.frequency ?? null,
        nextRunDate: raw.nextRunDate ?? null,
        // The API's `updatedAt` timestamp is what makes conflict resolution work.
        updatedAt: raw.updatedAt || raw.date,
        syncStatus: 'synced',
    };
}

export const syncEngine = new SyncEngine();
export default syncEngine;
