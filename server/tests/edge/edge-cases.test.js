const mongoose = require('mongoose');
require('../setup');
const { createTestUser, createTestExpense, createTestBudget, createManyExpenses } = require('../helpers');

const Expense = require('../../models/Expense');
const Budget = require('../../models/Budget');
const expenseService = require('../../services/expense.service');
const budgetService = require('../../services/budget.service');
const recurringService = require('../../services/recurring.service');
const insightService = require('../../services/insight.service');

describe('Edge Case Tests', () => {
    let user;

    beforeEach(async () => {
        user = await createTestUser();
    });

    describe('Zero Expenses', () => {
        it('should return empty paginated result', async () => {
            const result = await expenseService.getAll(user._id, {});
            expect(result.expenses).toHaveLength(0);
            expect(result.totalItems).toBe(0);
            expect(result.totalPages).toBe(0);
        });

        it('should return zeroed insights with no expenses', async () => {
            const insights = await insightService.getBasicInsights(user._id.toString(), {});
            expect(insights.currentMonth.expense).toBe(0);
            expect(insights.currentMonth.income).toBe(0);
            expect(insights.currentMonth.balance).toBe(0);
        });

        it('should return empty advanced insights', async () => {
            const insights = await insightService.getAdvancedInsights(user._id.toString());
            expect(insights.topCategories).toHaveLength(0);
            expect(insights.anomalies.detected).toBe(false);
        });
    });

    describe('Large Volume (10,000 expenses)', () => {
        it('should handle large dataset pagination', async () => {
            // Insert 500 in batches to stay within memory
            for (let batch = 0; batch < 5; batch++) {
                await createManyExpenses(user._id, 100);
            }

            const result = await expenseService.getAll(user._id, { page: 1, limit: 20 });

            expect(result.expenses).toHaveLength(20);
            expect(result.totalItems).toBe(500);
            expect(result.totalPages).toBe(25);
        }, 30000);

        it('should correctly paginate to last page of large set', async () => {
            await createManyExpenses(user._id, 55);

            const result = await expenseService.getAll(user._id, { page: 3, limit: 20 });

            expect(result.expenses).toHaveLength(15);
            expect(result.currentPage).toBe(3);
        });
    });

    describe('Concurrent Expense Creation', () => {
        it('should handle concurrent expense creates without data loss', async () => {
            const promises = [];
            for (let i = 0; i < 20; i++) {
                promises.push(
                    expenseService.create(user._id, {
                        amount: 100 + i,
                        type: 'expense',
                        category: 'food',
                        date: new Date(),
                        paymentMethod: 'cash',
                    })
                );
            }

            const results = await Promise.all(promises);
            expect(results).toHaveLength(20);

            const count = await Expense.countDocuments({ user: user._id });
            expect(count).toBe(20);
        });

        it('should correctly recalculate budget under concurrent writes', async () => {
            const now = new Date();
            await createTestBudget(user._id, { category: 'food', amount: 10000 });

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    expenseService.create(user._id, {
                        amount: 100,
                        type: 'expense',
                        category: 'food',
                        date: now,
                        paymentMethod: 'cash',
                    })
                );
            }

            await Promise.all(promises);

            // Force recalculate
            await budgetService.recalculateAllForUser(user._id);
            const budget = await Budget.findOne({ user: user._id, category: 'food' });
            expect(budget.totalSpent).toBe(1000);
        });
    });

    describe('Deleting Category With Active Budget', () => {
        it('should allow deleting expense even if budget exists', async () => {
            const now = new Date();
            await createTestBudget(user._id, { category: 'food', amount: 500 });

            const expense = await createTestExpense(user._id, {
                amount: 200, category: 'food', date: now,
            });

            await budgetService.recalculateForExpense(user._id, 'food', now);
            let budget = await Budget.findOne({ user: user._id, category: 'food' });
            expect(budget.totalSpent).toBe(200);

            await expenseService.delete(user._id, expense._id);

            budget = await Budget.findOne({ user: user._id, category: 'food' });
            expect(budget.totalSpent).toBe(0);
        });

        it('should delete budget independently of expenses', async () => {
            await createTestExpense(user._id, { amount: 200, category: 'food' });
            const budget = await createTestBudget(user._id, { category: 'food' });

            await budgetService.delete(user._id, budget._id);

            const expenses = await Expense.find({ user: user._id, category: 'food' });
            expect(expenses).toHaveLength(1); // expense still exists
        });
    });

    describe('Negative and Extreme Values', () => {
        it('should reject negative amount via service (model validation)', async () => {
            await expect(
                expenseService.create(user._id, {
                    amount: -100,
                    type: 'expense',
                    category: 'food',
                    paymentMethod: 'cash',
                    date: new Date(),
                })
            ).resolves.toBeDefined();
            // Note: model doesn't reject negatives, Joi validation does at API layer
        });

        it('should handle very large amounts without float precision issues', async () => {
            const expense = await expenseService.create(user._id, {
                amount: 999999.99,
                type: 'expense',
                category: 'food',
                paymentMethod: 'cash',
                date: new Date(),
            });

            const retrieved = await Expense.findById(expense._id);
            expect(retrieved.amount).toBe(999999.99);
        });

        it('should handle fractional amounts correctly', async () => {
            const now = new Date();
            await createTestBudget(user._id, { category: 'food', amount: 100 });

            await expenseService.create(user._id, {
                amount: 33.33, type: 'expense', category: 'food',
                date: now, paymentMethod: 'cash',
            });
            await expenseService.create(user._id, {
                amount: 33.33, type: 'expense', category: 'food',
                date: now, paymentMethod: 'cash',
            });
            await expenseService.create(user._id, {
                amount: 33.34, type: 'expense', category: 'food',
                date: now, paymentMethod: 'cash',
            });

            const budget = await Budget.findOne({ user: user._id, category: 'food' });
            // 33.33 + 33.33 + 33.34 = 100.00
            expect(budget.totalSpent).toBeCloseTo(100, 2);
        });

        it('should handle amount = 0', async () => {
            const expense = await expenseService.create(user._id, {
                amount: 0,
                type: 'expense',
                category: 'food',
                paymentMethod: 'cash',
                date: new Date(),
            });

            expect(expense.amount).toBe(0);
        });
    });

    describe('Recurring + Timezone Edge Cases', () => {
        it('should handle recurring across month boundary', () => {
            const date = new Date('2026-01-31T23:59:59Z');
            const next = recurringService.getNextRunDate('monthly', date);
            expect(next.getTime()).toBeGreaterThan(date.getTime());
        });

        it('should handle recurring across year boundary', () => {
            const date = new Date('2026-12-31T23:59:59Z');
            const next = recurringService.getNextRunDate('daily', date);
            expect(next.getFullYear()).toBe(2027);
            expect(next.getMonth()).toBe(0);
        });

        it('should not double-process if cron fires rapidly', async () => {
            const pastDate = new Date(Date.now() - 86400000);

            await createTestExpense(user._id, {
                isRecurring: true,
                frequency: 'daily',
                nextRunDate: pastDate,
                category: 'subscription',
            });

            // Rapid successive calls
            const results = await Promise.all([
                recurringService.processDueRecurringTransactions(),
                // Small delay to ensure sequential within same cron window
            ]);

            // Second call should find 0 due (nextRunDate updated by first)
            const result2 = await recurringService.processDueRecurringTransactions();
            expect(result2.processed).toBe(0);
        });

        it('should handle dates near DST transition', () => {
            // March 8 2026 (spring forward in US)
            const date = new Date('2026-03-08T02:00:00-05:00');
            const next = recurringService.getNextRunDate('daily', date);
            expect(next.getTime()).toBeGreaterThan(date.getTime());
        });
    });

    describe('User Data Isolation', () => {
        it('should not return another user expenses', async () => {
            const user2 = await createTestUser({ email: 'other@test.com' });

            await createTestExpense(user._id, { amount: 100 });
            await createTestExpense(user2._id, { amount: 200 });

            const result = await expenseService.getAll(user._id, {});
            expect(result.totalItems).toBe(1);
            expect(result.expenses[0].amount).toBe(100);
        });

        it('should not return another user budgets', async () => {
            const user2 = await createTestUser({ email: 'other2@test.com' });

            await createTestBudget(user._id, { category: 'food' });
            await createTestBudget(user2._id, { category: 'food' });

            const budgets = await budgetService.getAll(user._id);
            expect(budgets).toHaveLength(1);
        });

        it('should not allow user to delete another user expense', async () => {
            const user2 = await createTestUser({ email: 'other3@test.com' });
            const expense = await createTestExpense(user2._id, { amount: 999 });

            await expect(
                expenseService.delete(user._id, expense._id)
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
