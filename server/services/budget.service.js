const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class BudgetService {
    async create(userId, data) {
        const existing = await Budget.findOne({
            user: userId,
            category: data.category,
            month: data.month,
            year: data.year,
        });

        if (existing) {
            throw new AppError(
                `Budget for ${data.category} already exists for ${data.month}/${data.year}`,
                409
            );
        }

        const budget = await Budget.create({ user: userId, ...data });
        await this.recalculateSpent(budget);

        return budget;
    }

    async getAll(userId) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const budgets = await Budget.find({ user: userId, month, year }).lean();

        return budgets.map((b) => ({
            ...b,
            percentageUsed: b.amount === 0 ? 0 : Math.round((b.totalSpent / b.amount) * 10000) / 100,
            remainingAmount: Math.max(b.amount - b.totalSpent, 0),
        }));
    }

    async getById(userId, budgetId) {
        const budget = await Budget.findOne({ _id: budgetId, user: userId });
        if (!budget) {
            throw new AppError('Budget not found', 404);
        }
        return budget;
    }

    async update(userId, budgetId, data) {
        const budget = await Budget.findOne({ _id: budgetId, user: userId });
        if (!budget) {
            throw new AppError('Budget not found', 404);
        }

        if (data.category || data.month || data.year) {
            const checkCategory = data.category || budget.category;
            const checkMonth = data.month || budget.month;
            const checkYear = data.year || budget.year;

            const duplicate = await Budget.findOne({
                user: userId,
                category: checkCategory,
                month: checkMonth,
                year: checkYear,
                _id: { $ne: budgetId },
            });

            if (duplicate) {
                throw new AppError(
                    `Budget for ${checkCategory} already exists for ${checkMonth}/${checkYear}`,
                    409
                );
            }
        }

        Object.assign(budget, data);
        await budget.save();
        await this.recalculateSpent(budget);

        return budget;
    }

    async delete(userId, budgetId) {
        const budget = await Budget.findOneAndDelete({ _id: budgetId, user: userId });
        if (!budget) {
            throw new AppError('Budget not found', 404);
        }
        return budget;
    }

    async recalculateSpent(budget) {
        const startOfMonth = new Date(budget.year, budget.month - 1, 1);
        const endOfMonth = new Date(budget.year, budget.month, 0, 23, 59, 59, 999);

        const result = await Expense.aggregate([
            {
                $match: {
                    user: budget.user,
                    category: budget.category,
                    type: 'expense',
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' },
                },
            },
        ]);

        budget.totalSpent = result.length > 0 ? result[0].totalSpent : 0;
        await budget.save();
    }

    async recalculateForExpense(userId, category, date) {
        const expenseDate = new Date(date);
        const month = expenseDate.getMonth() + 1;
        const year = expenseDate.getFullYear();

        const budget = await Budget.findOne({
            user: userId,
            category,
            month,
            year,
        });

        if (budget) {
            await this.recalculateSpent(budget);
            logger.debug(`Recalculated budget for ${category} ${month}/${year}: spent ${budget.totalSpent}`);
            return budget;
        }

        return null;
    }

    async recalculateAllForUser(userId) {
        const now = new Date();
        const budgets = await Budget.find({
            user: userId,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
        });

        for (const budget of budgets) {
            await this.recalculateSpent(budget);
        }
    }
}

module.exports = new BudgetService();
