import type { Expense } from '../../src/store/slices/expenseSlice';
import { monthOverMonthChange, totalsForMonth } from '../../src/utils/stats';

const expense = (over: Partial<Expense> = {}): Expense => ({
    localId: 'a1',
    amount: 100,
    type: 'expense',
    category: 'food',
    description: '',
    paymentMethod: 'upi',
    date: '2026-08-10T12:00:00.000Z',
    isRecurring: false,
    syncStatus: 'synced',
    updatedAt: '2026-08-10T12:00:00.000Z',
    ...over,
});

const AUGUST = new Date(2026, 7, 15);

describe('totalsForMonth', () => {
    it('counts only rows inside the reference month', () => {
        const totals = totalsForMonth(
            [
                expense({ date: new Date(2026, 7, 1).toISOString(), amount: 100 }),
                expense({ localId: 'b', date: new Date(2026, 7, 31).toISOString(), amount: 50 }),
                expense({ localId: 'c', date: new Date(2026, 6, 31).toISOString(), amount: 999 }),
                expense({ localId: 'd', date: new Date(2026, 8, 1).toISOString(), amount: 999 }),
            ],
            AUGUST
        );

        expect(totals.expense).toBe(150);
    });

    it('separates income from spending', () => {
        const totals = totalsForMonth(
            [
                expense({ amount: 200 }),
                expense({ localId: 'b', amount: 900, type: 'income', category: 'salary' }),
            ],
            AUGUST
        );

        expect(totals.expense).toBe(200);
        expect(totals.income).toBe(900);
    });

    it('includes the final instant of the month', () => {
        const lastMoment = new Date(2026, 7, 31, 23, 59, 59, 999).toISOString();
        expect(totalsForMonth([expense({ date: lastMoment })], AUGUST).expense).toBe(100);
    });

    it('returns zeroes for an empty set', () => {
        expect(totalsForMonth([], AUGUST)).toEqual({ expense: 0, income: 0 });
    });
});

describe('monthOverMonthChange', () => {
    const july = (amount: number, id: string) =>
        expense({ localId: id, amount, date: new Date(2026, 6, 10).toISOString() });
    const august = (amount: number, id: string) =>
        expense({ localId: id, amount, date: new Date(2026, 7, 10).toISOString() });

    it('reports an increase as a positive percentage', () => {
        const change = monthOverMonthChange([july(100, 'a'), august(150, 'b')], AUGUST);
        expect(change).toBeCloseTo(50);
    });

    it('reports a decrease as a negative percentage', () => {
        const change = monthOverMonthChange([july(200, 'a'), august(100, 'b')], AUGUST);
        expect(change).toBeCloseTo(-50);
    });

    it('reports zero when both months match', () => {
        expect(monthOverMonthChange([july(100, 'a'), august(100, 'b')], AUGUST)).toBe(0);
    });

    it('reports 100% when spending starts this month', () => {
        expect(monthOverMonthChange([august(100, 'b')], AUGUST)).toBe(100);
    });

    it('reports zero when there is no spending at all', () => {
        expect(monthOverMonthChange([], AUGUST)).toBe(0);
    });

    it('does not divide by zero when the prior month is empty', () => {
        expect(Number.isFinite(monthOverMonthChange([august(500, 'b')], AUGUST))).toBe(true);
    });

    it('ignores income when comparing spend', () => {
        const change = monthOverMonthChange(
            [
                july(100, 'a'),
                august(100, 'b'),
                expense({
                    localId: 'c',
                    amount: 5000,
                    type: 'income',
                    category: 'salary',
                    date: new Date(2026, 7, 5).toISOString(),
                }),
            ],
            AUGUST
        );
        expect(change).toBe(0);
    });

    it('crosses a year boundary correctly', () => {
        const january = new Date(2026, 0, 15);
        const change = monthOverMonthChange(
            [
                expense({ localId: 'dec', amount: 100, date: new Date(2025, 11, 10).toISOString() }),
                expense({ localId: 'jan', amount: 200, date: new Date(2026, 0, 10).toISOString() }),
            ],
            january
        );
        expect(change).toBeCloseTo(100);
    });
});
