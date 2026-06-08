import type { Expense } from '../store/slices/expenseSlice';

export interface MonthTotals {
    expense: number;
    income: number;
}

const inRange = (value: string, start: Date, end: Date) => {
    const d = new Date(value);
    return d >= start && d <= end;
};

/** Totals for the calendar month containing `reference`. */
export function totalsForMonth(items: Expense[], reference: Date): MonthTotals {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(
        reference.getFullYear(),
        reference.getMonth() + 1,
        0,
        23, 59, 59, 999
    );

    return items.reduce<MonthTotals>(
        (acc, item) => {
            if (!inRange(item.date, start, end)) return acc;
            if (item.type === 'expense') acc.expense += item.amount;
            else acc.income += item.amount;
            return acc;
        },
        { expense: 0, income: 0 }
    );
}

/**
 * Percentage change in spend versus the previous calendar month.
 *
 * Computed locally rather than from `/expenses/insights` so the figure is
 * available offline and can never disagree with the total shown beside it.
 * With no prior-month spend there is no meaningful ratio, so this reports
 * 100% when spending started this month and 0% when both months are empty.
 */
export function monthOverMonthChange(items: Expense[], now = new Date()): number {
    const current = totalsForMonth(items, now);
    const previousRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previous = totalsForMonth(items, previousRef);

    if (previous.expense === 0) {
        return current.expense > 0 ? 100 : 0;
    }

    return ((current.expense - previous.expense) / previous.expense) * 100;
}
