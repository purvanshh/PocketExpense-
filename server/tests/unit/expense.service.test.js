const mongoose = require('mongoose');
require('../setup');
const { createTestUser, createTestExpense, createTestBudget, createManyExpenses } = require('../helpers');

const Expense = require('../../models/Expense');
const Budget = require('../../models/Budget');
const expenseService = require('../../services/expense.service');

describe('ExpenseService', () => {
    let user;

    beforeEach(async () => {
        user = await createTestUser();
    });

    describe('create', () => {
        it('should create an expense and return it', async () => {
            const data = {
                amount: 250,
                type: 'expense',
                category: 'food',
                description: 'Lunch',
                paymentMethod: 'upi',
                date: new Date(),
            };

            const expense = await expenseService.create(user._id, data);

            expect(expense).toBeDefined();
            expect(expense.amount).toBe(250);
            expect(expense.category).toBe('food');
            expect(expense.syncStatus).toBe('synced');
            expect(expense.user.toString()).toBe(user._id.toString());
        });

        it('should set nextRunDate for recurring expenses', async () => {
            const now = new Date();
            const data = {
                amount: 500,
                type: 'expense',
                category: 'subscription',
                description: 'Netflix',
                paymentMethod: 'credit_card',
                date: now,
                isRecurring: true,
                frequency: 'monthly',
            };

            const expense = await expenseService.create(user._id, data);

            expect(expense.isRecurring).toBe(true);
            expect(expense.frequency).toBe('monthly');
            expect(expense.nextRunDate).toBeDefined();
            expect(expense.nextRunDate.getMonth()).toBe((now.getMonth() + 1) % 12);
        });

        it('should recalculate budget when expense is created', async () => {
            const now = new Date();
            await createTestBudget(user._id, { category: 'food', amount: 1000 });

            await expenseService.create(user._id, {
                amount: 300, type: 'expense', category: 'food',
                date: now, paymentMethod: 'cash',
            });

            const budget = await Budget.findOne({ user: user._id, category: 'food' });
            expect(budget.totalSpent).toBe(300);
        });

        it('should NOT recalculate budget for income type', async () => {
            await createTestBudget(user._id, { category: 'salary', amount: 5000 });

            await expenseService.create(user._id, {
                amount: 3000, type: 'income', category: 'salary',
                date: new Date(), paymentMethod: 'bank_transfer',
            });

            const budget = await Budget.findOne({ user: user._id, category: 'salary' });
            expect(budget.totalSpent).toBe(0);
        });
    });

    describe('update', () => {
        it('should update expense fields', async () => {
            const expense = await createTestExpense(user._id, { amount: 100 });

            const updated = await expenseService.update(user._id, expense._id, { amount: 200 });

            expect(updated.amount).toBe(200);
        });

        it('should recalculate budget for new category when category changes', async () => {
            const now = new Date();
            await createTestBudget(user._id, { category: 'food', amount: 1000 });
            await createTestBudget(user._id, { category: 'travel', amount: 2000 });

            const expense = await createTestExpense(user._id, {
                amount: 300, category: 'food', date: now,
            });

            await expenseService.update(user._id, expense._id, { category: 'travel' });

            const foodBudget = await Budget.findOne({ user: user._id, category: 'food' });
            const travelBudget = await Budget.findOne({ user: user._id, category: 'travel' });

            expect(foodBudget.totalSpent).toBe(0);
            expect(travelBudget.totalSpent).toBe(300);
        });

        it('should clear recurring fields when isRecurring set to false', async () => {
            const expense = await createTestExpense(user._id, {
                isRecurring: true,
                frequency: 'weekly',
                nextRunDate: new Date(),
            });

            const updated = await expenseService.update(user._id, expense._id, {
                isRecurring: false,
            });

            expect(updated.isRecurring).toBe(false);
            expect(updated.frequency).toBeNull();
            expect(updated.nextRunDate).toBeNull();
        });

        it('should throw 404 for non-existent expense', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            await expect(
                expenseService.update(user._id, fakeId, { amount: 999 })
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('delete', () => {
        it('should delete expense and recalculate budget', async () => {
            const now = new Date();
            await createTestBudget(user._id, { category: 'food', amount: 1000 });

            const expense = await createTestExpense(user._id, {
                amount: 400, category: 'food', date: now,
            });

            // Recalculate after create
            const budgetService = require('../../services/budget.service');
            await budgetService.recalculateForExpense(user._id, 'food', now);

            let budget = await Budget.findOne({ user: user._id, category: 'food' });
            expect(budget.totalSpent).toBe(400);

            await expenseService.delete(user._id, expense._id);

            budget = await Budget.findOne({ user: user._id, category: 'food' });
            expect(budget.totalSpent).toBe(0);
        });

        it('should throw 404 for non-existent expense', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            await expect(
                expenseService.delete(user._id, fakeId)
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getAll (pagination & filtering)', () => {
        it('should return paginated results', async () => {
            await createManyExpenses(user._id, 25);

            const result = await expenseService.getAll(user._id, { page: 1, limit: 10 });

            expect(result.expenses).toHaveLength(10);
            expect(result.totalItems).toBe(25);
            expect(result.totalPages).toBe(3);
            expect(result.currentPage).toBe(1);
        });

        it('should return page 2 correctly', async () => {
            await createManyExpenses(user._id, 25);

            const result = await expenseService.getAll(user._id, { page: 2, limit: 10 });

            expect(result.expenses).toHaveLength(10);
            expect(result.currentPage).toBe(2);
        });

        it('should return last page with remaining items', async () => {
            await createManyExpenses(user._id, 25);

            const result = await expenseService.getAll(user._id, { page: 3, limit: 10 });

            expect(result.expenses).toHaveLength(5);
        });

        it('should filter by category', async () => {
            await createManyExpenses(user._id, 10);

            const result = await expenseService.getAll(user._id, { category: 'food' });
            result.expenses.forEach((e) => expect(e.category).toBe('food'));
        });

        it('should filter by type', async () => {
            await createTestExpense(user._id, { type: 'income', category: 'salary' });
            await createTestExpense(user._id, { type: 'expense', category: 'food' });

            const result = await expenseService.getAll(user._id, { type: 'income' });

            expect(result.expenses).toHaveLength(1);
            expect(result.expenses[0].type).toBe('income');
        });

        it('should filter by date range', async () => {
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 86400000);
            const lastMonth = new Date(today.getTime() - 30 * 86400000);

            await createTestExpense(user._id, { date: today });
            await createTestExpense(user._id, { date: lastMonth });

            const result = await expenseService.getAll(user._id, {
                startDate: lastWeek.toISOString(),
                endDate: today.toISOString(),
            });

            expect(result.expenses).toHaveLength(1);
        });

        it('should sort by amount ascending', async () => {
            await createTestExpense(user._id, { amount: 300 });
            await createTestExpense(user._id, { amount: 100 });
            await createTestExpense(user._id, { amount: 200 });

            const result = await expenseService.getAll(user._id, { sort: 'amount' });

            expect(result.expenses[0].amount).toBe(100);
            expect(result.expenses[2].amount).toBe(300);
        });

        it('should return empty for no data', async () => {
            const result = await expenseService.getAll(user._id, {});

            expect(result.expenses).toHaveLength(0);
            expect(result.totalItems).toBe(0);
            expect(result.totalPages).toBe(0);
        });
    });

    describe('syncBulk', () => {
        it('should create new expenses and update existing ones', async () => {
            const existing = await createTestExpense(user._id, {
                localId: 'local-1',
                amount: 100,
            });

            const results = await expenseService.syncBulk(user._id, [
                { localId: 'local-1', amount: 200, type: 'expense', category: 'food' },
                { localId: 'local-2', amount: 300, type: 'expense', category: 'travel' },
            ]);

            expect(results).toHaveLength(2);
            expect(results[0].status).toBe('updated');
            expect(results[1].status).toBe('created');

            const updatedExpense = await Expense.findOne({ localId: 'local-1' });
            expect(updatedExpense.amount).toBe(200);
        });
    });
});
