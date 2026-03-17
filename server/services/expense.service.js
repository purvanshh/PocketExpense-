const Expense = require('../models/Expense');
const budgetService = require('./budget.service');
const recurringService = require('./recurring.service');
const { AppError } = require('../middleware/errorHandler');

class ExpenseService {
    async getAll(userId, query) {
        const { page = 1, limit = 20, category, type, startDate, endDate, sort = '-date' } = query;

        const filter = { user: userId };

        if (category) filter.category = category;
        if (type) filter.type = type;

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const sortObj = {};
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [expenses, totalItems] = await Promise.all([
            Expense.find(filter)
                .sort(sortObj)
                .limit(parseInt(limit))
                .skip(skip),
            Expense.countDocuments(filter),
        ]);

        return {
            expenses,
            totalPages: Math.ceil(totalItems / parseInt(limit)),
            currentPage: parseInt(page),
            totalItems,
        };
    }

    async getById(userId, expenseId) {
        const expense = await Expense.findOne({ _id: expenseId, user: userId });
        if (!expense) {
            throw new AppError('Expense not found', 404);
        }
        return expense;
    }

    async create(userId, data) {
        const expenseData = {
            user: userId,
            ...data,
            syncStatus: 'synced',
        };

        if (data.isRecurring && data.frequency) {
            expenseData.nextRunDate = recurringService.getNextRunDate(
                data.frequency,
                data.date || new Date()
            );
        }

        const expense = await Expense.create(expenseData);

        if (expense.type === 'expense') {
            await budgetService.recalculateForExpense(userId, expense.category, expense.date);
        }

        return expense;
    }

    async update(userId, expenseId, data) {
        const expense = await Expense.findOne({ _id: expenseId, user: userId });
        if (!expense) {
            throw new AppError('Expense not found', 404);
        }

        const oldCategory = expense.category;
        const oldDate = expense.date;

        Object.assign(expense, data, { syncStatus: 'synced' });

        if (data.isRecurring && data.frequency) {
            expense.nextRunDate = recurringService.getNextRunDate(
                data.frequency,
                expense.date
            );
        } else if (data.isRecurring === false) {
            expense.frequency = null;
            expense.nextRunDate = null;
        }

        await expense.save();

        if (expense.type === 'expense') {
            await budgetService.recalculateForExpense(userId, expense.category, expense.date);
        }
        if (oldCategory !== expense.category) {
            await budgetService.recalculateForExpense(userId, oldCategory, oldDate);
        }

        return expense;
    }

    async delete(userId, expenseId) {
        const expense = await Expense.findOne({ _id: expenseId, user: userId });
        if (!expense) {
            throw new AppError('Expense not found', 404);
        }

        const { category, date, type } = expense;
        await expense.deleteOne();

        if (type === 'expense') {
            await budgetService.recalculateForExpense(userId, category, date);
        }

        return { id: expenseId };
    }

    async syncBulk(userId, expenses) {
        const results = [];

        for (const exp of expenses) {
            let existing = null;
            if (exp.localId) {
                existing = await Expense.findOne({ user: userId, localId: exp.localId });
            }

            if (existing) {
                Object.assign(existing, exp, { syncStatus: 'synced' });
                const updated = await existing.save();
                results.push({ localId: exp.localId, serverId: updated._id, status: 'updated' });
            } else {
                const newExpense = await Expense.create({
                    user: userId,
                    ...exp,
                    syncStatus: 'synced',
                });
                results.push({ localId: exp.localId, serverId: newExpense._id, status: 'created' });
            }
        }

        await budgetService.recalculateAllForUser(userId);

        return results;
    }
}

module.exports = new ExpenseService();
