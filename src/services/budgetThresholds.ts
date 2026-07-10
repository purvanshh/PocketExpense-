import { formatCurrency } from '../utils/formatters';

/**
 * Pure threshold logic for budget alerts.
 *
 * Deliberately free of any store, storage or notification import so it can be
 * unit-tested directly. `budgetAlerts.ts` supplies the side effects.
 */

export type CrossingKind = 'budget-warning' | 'budget-exceeded';

export interface BudgetScope {
    /** 'overall', or a category key such as 'food'. */
    id: string;
    /** Human-readable name used in the alert copy. */
    label: string;
    spent: number;
    limit: number;
}

export interface Crossing {
    scope: BudgetScope;
    threshold: number;
    kind: CrossingKind;
    title: string;
    message: string;
}

/** Stable key identifying one alert, so it fires at most once per period. */
export const crossingKey = (scopeId: string, threshold: number): string =>
    `${scopeId}:${threshold}`;

/**
 * Returns the crossings that are newly reached and not already recorded in
 * `fired`. A scope past 100% reports only the exceeded alert, never both.
 */
export function findCrossings(
    scopes: BudgetScope[],
    fired: Set<string>,
    warnThreshold: number,
    notifyOnExceed: boolean,
    currency = 'INR'
): Crossing[] {
    const crossings: Crossing[] = [];

    for (const scope of scopes) {
        if (!scope.limit || scope.limit <= 0) continue;
        if (scope.spent < 0) continue;

        const pct = (scope.spent / scope.limit) * 100;
        const noun = scope.label.toLowerCase();

        if (pct >= 100) {
            // Past the limit the warning is redundant, so only the exceeded
            // alert is considered — and only if the user wants it.
            if (!notifyOnExceed) continue;

            const key = crossingKey(scope.id, 100);
            if (fired.has(key)) continue;

            crossings.push({
                scope,
                threshold: 100,
                kind: 'budget-exceeded',
                title: `${scope.label} budget exceeded`,
                message: `You've spent ${formatCurrency(scope.spent, currency)} of your ${formatCurrency(scope.limit, currency)} ${noun} budget.`,
            });
            continue;
        }

        if (pct >= warnThreshold) {
            const key = crossingKey(scope.id, warnThreshold);
            if (fired.has(key)) continue;

            crossings.push({
                scope,
                threshold: warnThreshold,
                kind: 'budget-warning',
                title: `${scope.label} budget at ${Math.floor(pct)}%`,
                message: `${formatCurrency(scope.limit - scope.spent, currency)} left of your ${formatCurrency(scope.limit, currency)} ${noun} budget.`,
            });
        }
    }

    return crossings;
}
