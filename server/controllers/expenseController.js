const expenseService = require('../services/expense.service');
const insightService = require('../services/insight.service');

const getExpenses = async (req, res, next) => {
    try {
        const result = await expenseService.getAll(req.user._id, req.query);
        res.json({
            success: true,
            message: 'Expenses fetched',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const getExpense = async (req, res, next) => {
    try {
        const expense = await expenseService.getById(req.user._id, req.params.id);
        res.json({
            success: true,
            message: 'Expense fetched',
            data: expense,
        });
    } catch (error) {
        next(error);
    }
};

const createExpense = async (req, res, next) => {
    try {
        const expense = await expenseService.create(req.user._id, req.body);
        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data: expense,
        });
    } catch (error) {
        next(error);
    }
};

const updateExpense = async (req, res, next) => {
    try {
        const expense = await expenseService.update(req.user._id, req.params.id, req.body);
        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: expense,
        });
    } catch (error) {
        next(error);
    }
};

const deleteExpense = async (req, res, next) => {
    try {
        const result = await expenseService.delete(req.user._id, req.params.id);
        res.json({
            success: true,
            message: 'Expense deleted successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const syncExpenses = async (req, res, next) => {
    try {
        const results = await expenseService.syncBulk(req.user._id, req.body.expenses);
        res.json({
            success: true,
            message: 'Sync completed',
            data: { results },
        });
    } catch (error) {
        next(error);
    }
};

const getInsights = async (req, res, next) => {
    try {
        const insights = await insightService.getBasicInsights(req.user._id, req.query);
        res.json({
            success: true,
            message: 'Insights fetched',
            data: insights,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    syncExpenses,
    getInsights,
};
