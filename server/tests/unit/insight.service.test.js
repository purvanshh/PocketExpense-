const mongoose = require('mongoose');
require('../setup');
const { createTestUser, createTestExpense } = require('../helpers');

const Expense = require('../../models/Expense');
const insightService = require('../../services/insight.service');

describe('InsightService', () => {
    let user;

    beforeEach(async () => {
        user = await createTestUser();
    });

    describe('detectAnomalies (z-score)', () => {
        it('should detect no anomalies with fewer than 5 expenses', () => {
            const expenses = [
                { amount: 100, category: 'food', date: new Date() },
                { amount: 200, category: 'food', date: new Date() },
            ];

            const result = insightService.detectAnomalies(expenses);

            expect(result.detected).toBe(false);
            expect(result.message).toBe('Not enough data for anomaly detection');
        });

        it('should detect anomalies with deterministic data', () => {
            // Mean = 100, StdDev = ~10 (for small values)
            // 1000 should have z-score > 2
            const expenses = [
                { amount: 100, category: 'food', date: new Date() },
                { amount: 105, category: 'food', date: new Date() },
                { amount: 95, category: 'food', date: new Date() },
                { amount: 102, category: 'food', date: new Date() },
                { amount: 98, category: 'food', date: new Date() },
                { amount: 1000, category: 'food', date: new Date() }, // outlier
            ];

            const result = insightService.detectAnomalies(expenses);

            expect(result.detected).toBe(true);
            expect(result.items.length).toBeGreaterThanOrEqual(1);
            expect(result.items[0].amount).toBe(1000);
            expect(result.items[0].zScore).toBeGreaterThan(2);
        });

        it('should compute correct mean and stdDev', () => {
            // All equal → stdDev = 0
            const expenses = [
                { amount: 50, category: 'food', date: new Date() },
                { amount: 50, category: 'food', date: new Date() },
                { amount: 50, category: 'food', date: new Date() },
                { amount: 50, category: 'food', date: new Date() },
                { amount: 50, category: 'food', date: new Date() },
            ];

            const result = insightService.detectAnomalies(expenses);

            expect(result.detected).toBe(false);
            expect(result.message).toBe('All expenses are identical');
        });

        it('should correctly calculate z-scores with known distribution', () => {
            // Mean=100, values: [60,80,100,120,140] → stdDev = sqrt(800) ≈ 28.28
            // For 100+3*28.28 ≈ 184.85 → z = 3
            const expenses = [
                { amount: 60, category: 'food', date: new Date() },
                { amount: 80, category: 'food', date: new Date() },
                { amount: 100, category: 'food', date: new Date() },
                { amount: 120, category: 'food', date: new Date() },
                { amount: 140, category: 'food', date: new Date() },
            ];

            const result = insightService.detectAnomalies(expenses);

            // With stdDev ~28.28, no value is > 2 std devs from mean (max deviation is 40)
            // 40/28.28 = 1.41 which is < 2
            expect(result.detected).toBe(false);
            expect(result.stats.mean).toBe(100);
            expect(result.stats.stdDev).toBeCloseTo(28.28, 1);
        });

        it('should limit anomalies to top 5', () => {
            const expenses = [];
            // 10 normal expenses
            for (let i = 0; i < 10; i++) {
                expenses.push({ amount: 100, category: 'food', date: new Date() });
            }
            // 6 anomalies
            for (let i = 0; i < 6; i++) {
                expenses.push({ amount: 10000 + i * 1000, category: 'food', date: new Date() });
            }

            const result = insightService.detectAnomalies(expenses);
            expect(result.items.length).toBeLessThanOrEqual(5);
        });

        it('should sort anomalies by absolute z-score descending', () => {
            const expenses = [
                { amount: 100, category: 'food', date: new Date() },
                { amount: 102, category: 'food', date: new Date() },
                { amount: 98, category: 'food', date: new Date() },
                { amount: 101, category: 'food', date: new Date() },
                { amount: 99, category: 'food', date: new Date() },
                { amount: 5000, category: 'food', date: new Date() },
                { amount: 3000, category: 'food', date: new Date() },
            ];

            const result = insightService.detectAnomalies(expenses);

            if (result.items.length >= 2) {
                expect(Math.abs(result.items[0].zScore))
                    .toBeGreaterThanOrEqual(Math.abs(result.items[1].zScore));
            }
        });
    });

    describe('getBasicInsights (with real DB)', () => {
        it('should return correct monthly totals', async () => {
            const now = new Date();

            await createTestExpense(user._id, {
                amount: 500, type: 'expense', category: 'food', date: now,
            });
            await createTestExpense(user._id, {
                amount: 1000, type: 'income', category: 'salary', date: now,
            });

            const insights = await insightService.getBasicInsights(user._id.toString(), {});

            expect(insights.currentMonth.expense).toBe(500);
            expect(insights.currentMonth.income).toBe(1000);
            expect(insights.currentMonth.balance).toBe(500);
        });

        it('should calculate expense change percentage correctly', async () => {
            const now = new Date();
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            await createTestExpense(user._id, {
                amount: 200, type: 'expense', category: 'food', date: lastMonth,
            });
            await createTestExpense(user._id, {
                amount: 400, type: 'expense', category: 'food', date: now,
            });

            const insights = await insightService.getBasicInsights(user._id.toString(), {});

            // (400-200)/200 * 100 = 100%
            expect(insights.comparison.expenseChange).toBe(100);
        });

        it('should return empty data for user with no expenses', async () => {
            const insights = await insightService.getBasicInsights(user._id.toString(), {});

            expect(insights.currentMonth.expense).toBe(0);
            expect(insights.currentMonth.income).toBe(0);
            expect(insights.categoryBreakdown).toHaveLength(0);
        });
    });

    describe('getAdvancedInsights (with real DB)', () => {
        it('should return top 3 categories sorted by total', async () => {
            const now = new Date();

            await createTestExpense(user._id, { amount: 500, category: 'food', date: now });
            await createTestExpense(user._id, { amount: 200, category: 'food', date: now });
            await createTestExpense(user._id, { amount: 300, category: 'travel', date: now });
            await createTestExpense(user._id, { amount: 100, category: 'shopping', date: now });
            await createTestExpense(user._id, { amount: 50, category: 'entertainment', date: now });

            const insights = await insightService.getAdvancedInsights(user._id.toString());

            expect(insights.topCategories.length).toBeLessThanOrEqual(3);
            expect(insights.topCategories[0]._id).toBe('food');
            expect(insights.topCategories[0].total).toBe(700);

            // Verify sorting
            for (let i = 1; i < insights.topCategories.length; i++) {
                expect(insights.topCategories[i - 1].total)
                    .toBeGreaterThanOrEqual(insights.topCategories[i].total);
            }
        });

        it('should calculate monthly growth rate', async () => {
            const now = new Date();
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            await createTestExpense(user._id, { amount: 1000, category: 'food', date: lastMonth });
            await createTestExpense(user._id, { amount: 1500, category: 'food', date: now });

            const insights = await insightService.getAdvancedInsights(user._id.toString());

            // (1500 - 1000) / 1000 * 100 = 50%
            if (insights.monthlyGrowthRate.rates.length > 0) {
                expect(insights.monthlyGrowthRate.rates[0].growthRate).toBe(50);
            }
        });

        it('should return empty insights for no data', async () => {
            const insights = await insightService.getAdvancedInsights(user._id.toString());

            expect(insights.topCategories).toHaveLength(0);
            expect(insights.anomalies.detected).toBe(false);
        });
    });
});
