import {
    csvCell,
    escapeHtml,
    selectForExport,
    summarise,
    toCSV,
} from '../../src/services/exportFormat';
import type { Expense } from '../../src/store/slices/expenseSlice';

const expense = (over: Partial<Expense> = {}): Expense => ({
    localId: 'a1',
    amount: 100,
    type: 'expense',
    category: 'food',
    description: 'Lunch',
    paymentMethod: 'upi',
    date: '2026-08-10T12:00:00.000Z',
    isRecurring: false,
    syncStatus: 'synced',
    updatedAt: '2026-08-10T12:00:00.000Z',
    ...over,
});

describe('csvCell', () => {
    it('leaves plain values untouched', () => {
        expect(csvCell('Lunch')).toBe('Lunch');
        expect(csvCell(42)).toBe('42');
    });

    it('quotes values containing a comma', () => {
        expect(csvCell('Lunch, tip')).toBe('"Lunch, tip"');
    });

    it('doubles embedded quotes', () => {
        expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    });

    it('quotes values containing newlines', () => {
        expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    });
});

describe('toCSV', () => {
    it('emits a header row', () => {
        expect(toCSV([]).split('\n')[0]).toBe(
            'Date,Type,Category,Description,Payment Method,Amount,Recurring'
        );
    });

    it('signs expenses negative and income positive so the column sums', () => {
        const csv = toCSV([
            expense({ amount: 100, type: 'expense' }),
            expense({ localId: 'b', amount: 500, type: 'income', category: 'salary' }),
        ]);
        const rows = csv.trim().split('\n').slice(1);

        expect(rows[0].split(',')[5]).toBe('-100');
        expect(rows[1].split(',')[5]).toBe('500');
    });

    it('keeps a comma-bearing description in one column', () => {
        const csv = toCSV([expense({ description: 'Lunch, with tip' })]);
        const row = csv.trim().split('\n')[1];

        expect(row).toContain('"Lunch, with tip"');
        // Header has 7 columns; a naive join would produce 8 fields here.
        expect(row.match(/"/g)).toHaveLength(2);
    });

    it('resolves category and payment method to display labels', () => {
        const csv = toCSV([expense({ category: 'food', paymentMethod: 'upi' })]);
        expect(csv).toContain('Food');
        expect(csv).toContain('UPI');
    });

    it('ends with a trailing newline', () => {
        expect(toCSV([expense()]).endsWith('\n')).toBe(true);
    });
});

describe('summarise', () => {
    it('separates spending from income', () => {
        const result = summarise([
            expense({ amount: 100 }),
            expense({ localId: 'b', amount: 250 }),
            expense({ localId: 'c', amount: 1000, type: 'income', category: 'salary' }),
        ]);

        expect(result.totalExpense).toBe(350);
        expect(result.totalIncome).toBe(1000);
        expect(result.balance).toBe(650);
        expect(result.count).toBe(3);
    });

    it('groups spending by category, largest first', () => {
        const result = summarise([
            expense({ amount: 100, category: 'food' }),
            expense({ localId: 'b', amount: 500, category: 'rent' }),
            expense({ localId: 'c', amount: 50, category: 'food' }),
        ]);

        expect(result.byCategory[0]).toEqual({
            category: 'rent',
            label: 'Rent',
            total: 500,
        });
        expect(result.byCategory[1].total).toBe(150);
    });

    it('excludes income from the category breakdown', () => {
        const result = summarise([
            expense({ amount: 1000, type: 'income', category: 'salary' }),
        ]);
        expect(result.byCategory).toHaveLength(0);
    });

    it('handles an empty set', () => {
        expect(summarise([])).toEqual({
            totalExpense: 0,
            totalIncome: 0,
            balance: 0,
            count: 0,
            byCategory: [],
        });
    });
});

describe('selectForExport', () => {
    const range = {
        start: new Date('2026-08-01T00:00:00.000Z'),
        end: new Date('2026-08-31T23:59:59.999Z'),
        label: 'August 2026',
    };

    it('excludes rows outside the window', () => {
        const rows = selectForExport(
            [
                expense({ date: '2026-07-31T12:00:00.000Z' }),
                expense({ localId: 'b', date: '2026-08-15T12:00:00.000Z' }),
                expense({ localId: 'c', date: '2026-09-01T12:00:00.000Z' }),
            ],
            range
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].localId).toBe('b');
    });

    it('orders oldest first', () => {
        const rows = selectForExport(
            [
                expense({ localId: 'late', date: '2026-08-20T12:00:00.000Z' }),
                expense({ localId: 'early', date: '2026-08-02T12:00:00.000Z' }),
            ],
            range
        );

        expect(rows.map((r) => r.localId)).toEqual(['early', 'late']);
    });
});

describe('escapeHtml', () => {
    it('neutralises markup so a description cannot break the PDF', () => {
        expect(escapeHtml('<script>alert("x")</script>')).toBe(
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
        );
    });
});
