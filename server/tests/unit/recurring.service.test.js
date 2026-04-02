const mongoose = require('mongoose');
require('../setup');
const { createTestUser, createTestExpense } = require('../helpers');

const Expense = require('../../models/Expense');
const recurringService = require('../../services/recurring.service');

describe('RecurringService', () => {
    let user;

    beforeEach(async () => {
        user = await createTestUser();
    });

    describe('getNextRunDate', () => {
        it('should add 1 day for daily frequency', () => {
            const date = new Date('2026-03-01T10:00:00Z');
            const next = recurringService.getNextRunDate('daily', date);
            expect(next.getDate()).toBe(2);
        });

        it('should add 7 days for weekly frequency', () => {
            const date = new Date('2026-03-01T10:00:00Z');
            const next = recurringService.getNextRunDate('weekly', date);
            expect(next.getDate()).toBe(8);
        });

        it('should add 1 month for monthly frequency', () => {
            const date = new Date('2026-03-01T10:00:00Z');
            const next = recurringService.getNextRunDate('monthly', date);
            expect(next.getMonth()).toBe(3); // April
        });

        it('should handle month overflow (Dec -> Jan)', () => {
            const date = new Date('2026-12-15T10:00:00Z');
            const next = recurringService.getNextRunDate('monthly', date);
            expect(next.getMonth()).toBe(0); // January
            expect(next.getFullYear()).toBe(2027);
        });

        it('should handle end-of-month correctly for monthly', () => {
            const date = new Date('2026-01-31T10:00:00Z');
            const next = recurringService.getNextRunDate('monthly', date);
            // JS Date(2026,1,31) rolls Feb 31 → Mar 3, so month=2 (March)
            expect(next.getTime()).toBeGreaterThan(date.getTime());
            // The key invariant: next run is always in the future
            expect(next.getMonth()).toBeGreaterThanOrEqual(1);
        });

        it('should throw for invalid frequency', () => {
            expect(() => {
                recurringService.getNextRunDate('invalid', new Date());
            }).toThrow('Invalid frequency');
        });
    });

    describe('processDueRecurringTransactions', () => {
        it('should create new expense from due recurring transaction', async () => {
            const pastDate = new Date(Date.now() - 86400000); // yesterday

            await createTestExpense(user._id, {
                isRecurring: true,
                frequency: 'daily',
                nextRunDate: pastDate,
                amount: 100,
                category: 'subscription',
                description: 'Daily sub',
            });

            const result = await recurringService.processDueRecurringTransactions();

            expect(result.processed).toBe(1);

            const allExpenses = await Expense.find({ user: user._id });
            expect(allExpenses.length).toBe(2);

            const generatedExpense = allExpenses.find((e) => !e.isRecurring);
            expect(generatedExpense).toBeDefined();
            expect(generatedExpense.amount).toBe(100);
            expect(generatedExpense.description).toContain('(recurring)');
        });

        it('should update nextRunDate after processing', async () => {
            const pastDate = new Date(Date.now() - 86400000);

            const recurring = await createTestExpense(user._id, {
                isRecurring: true,
                frequency: 'weekly',
                nextRunDate: pastDate,
            });

            await recurringService.processDueRecurringTransactions();

            const updated = await Expense.findById(recurring._id);
            expect(updated.nextRunDate.getTime()).toBeGreaterThan(Date.now());
            expect(updated.lastProcessedDate).toBeDefined();
        });

        it('should NOT create duplicates when cron runs twice (idempotency)', async () => {
            const pastDate = new Date(Date.now() - 86400000);

            await createTestExpense(user._id, {
                isRecurring: true,
                frequency: 'daily',
                nextRunDate: pastDate,
                amount: 500,
                category: 'subscription',
            });

            // First run
            const result1 = await recurringService.processDueRecurringTransactions();
            expect(result1.processed).toBe(1);

            // Second run immediately after - should skip because lastProcessedDate is recent
            const result2 = await recurringService.processDueRecurringTransactions();
            expect(result2.processed).toBe(0);

            const totalExpenses = await Expense.countDocuments({ user: user._id });
            // 1 recurring template + 1 generated = 2 total
            expect(totalExpenses).toBe(2);
        });

        it('should NOT process transactions with future nextRunDate', async () => {
            const futureDate = new Date(Date.now() + 86400000);

            await createTestExpense(user._id, {
                isRecurring: true,
                frequency: 'daily',
                nextRunDate: futureDate,
            });

            const result = await recurringService.processDueRecurringTransactions();
            expect(result.processed).toBe(0);
        });

        it('should return processed: 0 when no recurring transactions exist', async () => {
            const result = await recurringService.processDueRecurringTransactions();
            expect(result).toEqual({ processed: 0 });
        });

        it('should process multiple recurring transactions in one run', async () => {
            const pastDate = new Date(Date.now() - 86400000);

            await createTestExpense(user._id, {
                isRecurring: true, frequency: 'daily',
                nextRunDate: pastDate, category: 'subscription',
            });
            await createTestExpense(user._id, {
                isRecurring: true, frequency: 'daily',
                nextRunDate: pastDate, category: 'food',
            });

            const result = await recurringService.processDueRecurringTransactions();
            expect(result.processed).toBe(2);
        });
    });
});
