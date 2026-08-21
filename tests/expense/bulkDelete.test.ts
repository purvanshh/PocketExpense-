import { configureStore } from '@reduxjs/toolkit';

import expenseReducer, { addExpense, deleteExpenses } from '../../src/store/slices/expenseSlice';

const base = (localId: string, amount: number, _id?: string) => ({
    localId,
    amount,
    type: 'expense' as const,
    category: 'food',
    description: `item ${localId}`,
    paymentMethod: 'cash',
    date: new Date(2026, 7, 1).toISOString(),
    isRecurring: false,
    _id,
});

describe('deleteExpenses (bulk delete)', () => {
    const buildStore = () =>
        configureStore({ reducer: { expenses: expenseReducer } });

    it('removes every selected expense from items and pendingQueue', () => {
        const store = buildStore();
        store.dispatch(addExpense(base('a', 100)));
        store.dispatch(addExpense(base('b', 200)));
        store.dispatch(addExpense(base('c', 300)));

        store.dispatch(deleteExpenses(['a', 'c']));

        const { items, pendingQueue } = store.getState().expenses;
        expect(items.map((i) => i.localId)).toEqual(['b']);
        expect(pendingQueue.map((i) => i.localId)).toEqual(['b']);
    });

    it('drops nothing when the list is empty', () => {
        const store = buildStore();
        store.dispatch(addExpense(base('a', 100)));

        store.dispatch(deleteExpenses([]));

        expect(store.getState().expenses.items).toHaveLength(1);
    });

    it('creates a tombstone only for rows the server knows about', () => {
        const store = buildStore();
        store.dispatch(addExpense(base('a', 100, 'server-1')));
        store.dispatch(addExpense(base('b', 200)));

        store.dispatch(deleteExpenses(['a', 'b']));

        const { items, tombstones } = store.getState().expenses;
        expect(items).toHaveLength(0);
        expect(tombstones.map((t) => t.localId)).toEqual(['a']);
    });

    it('recalculates month totals after a bulk delete', () => {
        const store = buildStore();
        store.dispatch(addExpense(base('a', 100)));
        store.dispatch(addExpense(base('b', 50)));

        store.dispatch(deleteExpenses(['a']));

        expect(store.getState().expenses.totalExpense).toBe(50);
    });
});
