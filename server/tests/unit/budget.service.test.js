const mongoose = require('mongoose');
require('../setup');
const { createTestUser, createTestExpense, createTestBudget } = require('../helpers');

const Budget = require('../../models/Budget');
const budgetService = require('../../services/budget.service');

describe('BudgetService', () => {
    let user;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    beforeEach(async () => {
        user = await createTestUser();
    });

    describe('create', () => {
        it('should create a budget', async () => {
            const budget = await budgetService.create(user._id, {
                category: 'food',
                amount: 5000,
                month: currentMonth,
                year: currentYear,
            });

            expect(budget).toBeDefined();
            expect(budget.category).toBe('food');
            expect(budget.amount).toBe(5000);
            expect(budget.totalSpent).toBe(0);
        });

        it('should prevent duplicate category/month/year per user', async () => {
            await budgetService.create(user._id, {
                category: 'food', amount: 5000,
                month: currentMonth, year: currentYear,
            });

            await expect(
                budgetService.create(user._id, {
                    category: 'food', amount: 3000,
                    month: currentMonth, year: currentYear,
                })
            ).rejects.toMatchObject({ statusCode: 409 });
        });

        it('should allow same category in different months', async () => {
            await budgetService.create(user._id, {
                category: 'food', amount: 5000,
                month: currentMonth, year: currentYear,
            });

            const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

            const budget2 = await budgetService.create(user._id, {
                category: 'food', amount: 6000,
                month: nextMonth, year: nextYear,
            });

            expect(budget2).toBeDefined();
            expect(budget2.amount).toBe(6000);
        });

        it('should recalculate totalSpent from existing expenses on create', async () => {
            await createTestExpense(user._id, {
                amount: 200, category: 'food', date: now,
            });
            await createTestExpense(user._id, {
                amount: 300, category: 'food', date: now,
            });

            const budget = await budgetService.create(user._id, {
                category: 'food', amount: 1000,
                month: currentMonth, year: currentYear,
            });

            expect(budget.totalSpent).toBe(500);
        });
    });

    describe('recalculateSpent', () => {
        it('should correctly sum expenses for the budget period', async () => {
            const budget = await createTestBudget(user._id, {
                category: 'food', amount: 2000,
            });

            await createTestExpense(user._id, { amount: 150, category: 'food', date: now });
            await createTestExpense(user._id, { amount: 250, category: 'food', date: now });
            await createTestExpense(user._id, { amount: 100, category: 'travel', date: now });

            await budgetService.recalculateSpent(budget);

            const updated = await Budget.findById(budget._id);
            expect(updated.totalSpent).toBe(400);
        });

        it('should not count income toward budget spent', async () => {
            const budget = await createTestBudget(user._id, {
                category: 'salary', amount: 10000,
            });

            await createTestExpense(user._id, {
                amount: 5000, type: 'income', category: 'salary', date: now,
            });

            await budgetService.recalculateSpent(budget);

            const updated = await Budget.findById(budget._id);
            expect(updated.totalSpent).toBe(0);
        });

        it('should not count expenses from other months', async () => {
            const budget = await createTestBudget(user._id, {
                category: 'food', amount: 2000,
            });

            await createTestExpense(user._id, { amount: 300, category: 'food', date: now });

            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            await createTestExpense(user._id, { amount: 500, category: 'food', date: lastMonth });

            await budgetService.recalculateSpent(budget);

            const updated = await Budget.findById(budget._id);
            expect(updated.totalSpent).toBe(300);
        });
    });

    describe('percentageUsed calculation', () => {
        it('should be 0 when no expenses', async () => {
            const budgets = await budgetService.create(user._id, {
                category: 'food', amount: 1000,
                month: currentMonth, year: currentYear,
            });

            const all = await budgetService.getAll(user._id);
            expect(all[0].percentageUsed).toBe(0);
        });

        it('should calculate percentage correctly', async () => {
            await createTestExpense(user._id, { amount: 250, category: 'food', date: now });

            await budgetService.create(user._id, {
                category: 'food', amount: 1000,
                month: currentMonth, year: currentYear,
            });

            const all = await budgetService.getAll(user._id);
            expect(all[0].percentageUsed).toBe(25);
        });

        it('should handle over-budget (>100%)', async () => {
            await createTestExpense(user._id, { amount: 1500, category: 'food', date: now });

            await budgetService.create(user._id, {
                category: 'food', amount: 1000,
                month: currentMonth, year: currentYear,
            });

            const all = await budgetService.getAll(user._id);
            expect(all[0].percentageUsed).toBe(150);
            expect(all[0].remainingAmount).toBe(0);
        });

        it('should handle zero budget amount', async () => {
            await budgetService.create(user._id, {
                category: 'food', amount: 0,
                month: currentMonth, year: currentYear,
            });

            const all = await budgetService.getAll(user._id);
            expect(all[0].percentageUsed).toBe(0);
        });
    });

    describe('update', () => {
        it('should update budget amount', async () => {
            const budget = await createTestBudget(user._id);

            const updated = await budgetService.update(user._id, budget._id, { amount: 5000 });
            expect(updated.amount).toBe(5000);
        });

        it('should throw 404 for non-existent budget', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            await expect(
                budgetService.update(user._id, fakeId, { amount: 999 })
            ).rejects.toMatchObject({ statusCode: 404 });
        });

        it('should reject update that creates duplicate', async () => {
            await createTestBudget(user._id, { category: 'food' });
            const travelBudget = await createTestBudget(user._id, { category: 'travel' });

            await expect(
                budgetService.update(user._id, travelBudget._id, { category: 'food' })
            ).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('delete', () => {
        it('should delete the budget', async () => {
            const budget = await createTestBudget(user._id);

            await budgetService.delete(user._id, budget._id);

            const found = await Budget.findById(budget._id);
            expect(found).toBeNull();
        });

        it('should throw 404 for non-existent budget', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            await expect(
                budgetService.delete(user._id, fakeId)
            ).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
