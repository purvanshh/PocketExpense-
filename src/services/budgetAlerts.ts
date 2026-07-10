import AsyncStorage from '@react-native-async-storage/async-storage';

import { store } from '../store';
import { addNotification } from '../store/slices/notificationSlice';
import { categories } from '../theme/colors';
import { newId } from '../utils/id';
import { crossingKey, findCrossings, type BudgetScope } from './budgetThresholds';
import { loadPrefs, notify } from './notifications';

// Threshold logic lives in ./budgetThresholds and is unit-tested there.
export { crossingKey, findCrossings, type BudgetScope } from './budgetThresholds';

const FIRED_KEY = 'budgetAlertsFired';

/**
 * Alerts must fire at most once per budget per threshold per month, otherwise
 * every expense added past 80% would re-notify. Keys look like
 * `overall:80` and the whole set is dropped when the month rolls over.
 */
interface FiredState {
    period: string;
    keys: string[];
}

const currentPeriod = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

async function loadFired(): Promise<Set<string>> {
    try {
        const raw = await AsyncStorage.getItem(FIRED_KEY);
        if (!raw) return new Set();

        const parsed: FiredState = JSON.parse(raw);
        // A new month starts with a clean slate.
        if (parsed.period !== currentPeriod()) return new Set();

        return new Set(parsed.keys);
    } catch {
        return new Set();
    }
}

async function saveFired(keys: Set<string>): Promise<void> {
    const payload: FiredState = { period: currentPeriod(), keys: [...keys] };
    try {
        await AsyncStorage.setItem(FIRED_KEY, JSON.stringify(payload));
    } catch {
        // Losing the record only risks a duplicate alert, never a missing one.
    }
}

/**
 * Evaluate every budget scope and deliver alerts for newly crossed thresholds.
 * Safe to call after any change to expenses — repeat calls are deduplicated.
 * Returns how many alerts were raised.
 */
export async function checkBudgets(currency = 'INR'): Promise<number> {
    const prefs = await loadPrefs();
    if (!prefs.enabled) return 0;

    const state = store.getState();
    const { items } = state.expenses;
    const user = state.auth.user;
    const categoryBudgets = state.budgets?.items ?? [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Spend per category for the current month, expenses only.
    const spentByCategory = new Map<string, number>();
    let totalSpent = 0;

    for (const item of items) {
        if (item.type !== 'expense') continue;
        if (new Date(item.date) < startOfMonth) continue;

        totalSpent += item.amount;
        spentByCategory.set(
            item.category,
            (spentByCategory.get(item.category) ?? 0) + item.amount
        );
    }

    const scopes: BudgetScope[] = [];

    if (user?.budgetLimit && user.budgetLimit > 0) {
        scopes.push({
            id: 'overall',
            label: 'Monthly',
            spent: totalSpent,
            limit: user.budgetLimit,
        });
    }

    for (const budget of categoryBudgets) {
        const key = budget.category as keyof typeof categories;
        scopes.push({
            id: budget.category,
            label: categories[key]?.label ?? budget.category,
            spent: spentByCategory.get(budget.category) ?? 0,
            limit: budget.amount,
        });
    }

    if (scopes.length === 0) return 0;

    const fired = await loadFired();
    const crossings = findCrossings(
        scopes,
        fired,
        prefs.warnThreshold,
        prefs.notifyOnExceed,
        currency
    );

    for (const crossing of crossings) {
        store.dispatch(
            addNotification({
                id: newId(),
                title: crossing.title,
                message: crossing.message,
                createdAt: new Date().toISOString(),
                read: false,
                kind: crossing.kind,
            })
        );

        await notify(crossing.title, crossing.message);
        fired.add(crossingKey(crossing.scope.id, crossing.threshold));
    }

    if (crossings.length > 0) {
        await saveFired(fired);
    }

    return crossings.length;
}
