const budgetService = require('../services/budget.service');

const createBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.create(req.user._id, req.body);
        res.status(201).json({
            success: true,
            message: 'Budget created successfully',
            data: budget,
        });
    } catch (error) {
        next(error);
    }
};

const getBudgets = async (req, res, next) => {
    try {
        const budgets = await budgetService.getAll(req.user._id);
        res.json({
            success: true,
            message: 'Budgets fetched successfully',
            data: budgets,
        });
    } catch (error) {
        next(error);
    }
};

const updateBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.update(req.user._id, req.params.id, req.body);
        res.json({
            success: true,
            message: 'Budget updated successfully',
            data: budget,
        });
    } catch (error) {
        next(error);
    }
};

const deleteBudget = async (req, res, next) => {
    try {
        await budgetService.delete(req.user._id, req.params.id);
        res.json({
            success: true,
            message: 'Budget deleted successfully',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { createBudget, getBudgets, updateBudget, deleteBudget };
