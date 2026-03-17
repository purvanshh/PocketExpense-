const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const logger = require('../config/logger');

class InsightService {
    async getBasicInsights(userId, query) {
        const { month, year } = query;
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
        const startOfPrevMonth = new Date(targetYear, targetMonth - 1, 1);
        const endOfPrevMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        const userObjId = new mongoose.Types.ObjectId(userId);

        const [currentMonthData, prevMonthData, categoryBreakdown, dailyBreakdown, monthlyTrend] =
            await Promise.all([
                Expense.aggregate([
                    { $match: { user: userObjId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
                    { $group: { _id: '$type', total: { $sum: '$amount' } } },
                ]),
                Expense.aggregate([
                    { $match: { user: userObjId, date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
                    { $group: { _id: '$type', total: { $sum: '$amount' } } },
                ]),
                Expense.aggregate([
                    {
                        $match: {
                            user: userObjId,
                            type: 'expense',
                            date: { $gte: startOfMonth, $lte: endOfMonth },
                        },
                    },
                    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                    { $sort: { total: -1 } },
                ]),
                Expense.aggregate([
                    { $match: { user: userObjId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
                    {
                        $group: {
                            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' },
                            total: { $sum: '$amount' },
                        },
                    },
                    { $sort: { '_id.date': 1 } },
                ]),
                Expense.aggregate([
                    {
                        $match: {
                            user: userObjId,
                            date: { $gte: new Date(targetYear, targetMonth - 5, 1), $lte: endOfMonth },
                        },
                    },
                    {
                        $group: {
                            _id: { month: { $month: '$date' }, year: { $year: '$date' }, type: '$type' },
                            total: { $sum: '$amount' },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                ]),
            ]);

        const currentExpense = currentMonthData.find((d) => d._id === 'expense')?.total || 0;
        const currentIncome = currentMonthData.find((d) => d._id === 'income')?.total || 0;
        const prevExpense = prevMonthData.find((d) => d._id === 'expense')?.total || 0;
        const prevIncome = prevMonthData.find((d) => d._id === 'income')?.total || 0;

        const expenseChange = prevExpense > 0
            ? ((currentExpense - prevExpense) / prevExpense) * 100
            : currentExpense > 0 ? 100 : 0;
        const incomeChange = prevIncome > 0
            ? ((currentIncome - prevIncome) / prevIncome) * 100
            : currentIncome > 0 ? 100 : 0;

        return {
            currentMonth: { expense: currentExpense, income: currentIncome, balance: currentIncome - currentExpense },
            previousMonth: { expense: prevExpense, income: prevIncome },
            comparison: {
                expenseChange: Math.round(expenseChange * 100) / 100,
                incomeChange: Math.round(incomeChange * 100) / 100,
            },
            categoryBreakdown,
            dailyBreakdown,
            monthlyTrend,
        };
    }

    async getAdvancedInsights(userId) {
        const now = new Date();
        const userObjId = new mongoose.Types.ObjectId(userId);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [monthlyGrowth, topCategories, weekdayWeekend, allExpenses] =
            await Promise.all([
                this.getMonthlySpendingGrowth(userObjId, sixMonthsAgo, now),
                this.getTopCategories(userObjId, now),
                this.getWeekdayVsWeekend(userObjId, now),
                this.getRecentExpensesForAnomalies(userObjId, sixMonthsAgo, now),
            ]);

        const anomalies = this.detectAnomalies(allExpenses);

        return {
            monthlyGrowthRate: monthlyGrowth,
            topCategories,
            weekdayVsWeekend: weekdayWeekend,
            anomalies,
        };
    }

    async getMonthlySpendingGrowth(userObjId, startDate, endDate) {
        const monthlyTotals = await Expense.aggregate([
            {
                $match: {
                    user: userObjId,
                    type: 'expense',
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        if (monthlyTotals.length < 2) {
            return { rates: monthlyTotals, averageGrowthRate: 0 };
        }

        const rates = [];
        for (let i = 1; i < monthlyTotals.length; i++) {
            const prev = monthlyTotals[i - 1].total;
            const curr = monthlyTotals[i].total;
            const rate = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
            rates.push({
                month: monthlyTotals[i]._id.month,
                year: monthlyTotals[i]._id.year,
                total: curr,
                growthRate: Math.round(rate * 100) / 100,
            });
        }

        const avgGrowth = rates.reduce((sum, r) => sum + r.growthRate, 0) / rates.length;

        return {
            rates,
            averageGrowthRate: Math.round(avgGrowth * 100) / 100,
        };
    }

    async getTopCategories(userObjId, now) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        return Expense.aggregate([
            {
                $match: {
                    user: userObjId,
                    type: 'expense',
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$amount' },
                },
            },
            { $sort: { total: -1 } },
            { $limit: 3 },
        ]);
    }

    async getWeekdayVsWeekend(userObjId, now) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const result = await Expense.aggregate([
            {
                $match: {
                    user: userObjId,
                    type: 'expense',
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $addFields: {
                    dayOfWeek: { $dayOfWeek: '$date' },
                },
            },
            {
                $group: {
                    _id: {
                        isWeekend: { $in: ['$dayOfWeek', [1, 7]] },
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$amount' },
                },
            },
        ]);

        const weekday = result.find((r) => !r._id.isWeekend) || { total: 0, count: 0, avgAmount: 0 };
        const weekend = result.find((r) => r._id.isWeekend) || { total: 0, count: 0, avgAmount: 0 };

        return {
            weekday: { total: weekday.total, count: weekday.count, avgPerTransaction: Math.round(weekday.avgAmount * 100) / 100 },
            weekend: { total: weekend.total, count: weekend.count, avgPerTransaction: Math.round(weekend.avgAmount * 100) / 100 },
            comparison: weekend.total > 0 && weekday.total > 0
                ? `Weekend spending is ${((weekend.total / (weekend.total + weekday.total)) * 100).toFixed(1)}% of total`
                : 'Not enough data',
        };
    }

    async getRecentExpensesForAnomalies(userObjId, startDate, endDate) {
        return Expense.find({
            user: userObjId,
            type: 'expense',
            date: { $gte: startDate, $lte: endDate },
        }).select('amount category date').lean();
    }

    detectAnomalies(expenses) {
        if (expenses.length < 5) {
            return { detected: false, message: 'Not enough data for anomaly detection', items: [] };
        }

        const amounts = expenses.map((e) => e.amount);
        const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
        const variance = amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) {
            return { detected: false, message: 'All expenses are identical', items: [] };
        }

        const anomalies = expenses
            .map((e) => {
                const zScore = (e.amount - mean) / stdDev;
                return { ...e, zScore: Math.round(zScore * 100) / 100 };
            })
            .filter((e) => Math.abs(e.zScore) > 2)
            .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
            .slice(0, 5);

        return {
            detected: anomalies.length > 0,
            stats: {
                mean: Math.round(mean * 100) / 100,
                stdDev: Math.round(stdDev * 100) / 100,
                totalAnalyzed: expenses.length,
            },
            items: anomalies,
        };
    }
}

module.exports = new InsightService();
