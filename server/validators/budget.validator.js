const Joi = require('joi');
const { validCategories } = require('./expense.validator');

const createBudgetSchema = Joi.object({
    category: Joi.string().valid(...validCategories).required()
        .messages({ 'any.required': 'Category is required' }),
    amount: Joi.number().positive().required()
        .messages({ 'any.required': 'Budget amount is required' }),
    month: Joi.number().integer().min(1).max(12).required()
        .messages({ 'any.required': 'Month is required' }),
    year: Joi.number().integer().min(2020).max(2099).required()
        .messages({ 'any.required': 'Year is required' }),
});

const updateBudgetSchema = Joi.object({
    amount: Joi.number().positive(),
    category: Joi.string().valid(...validCategories),
    month: Joi.number().integer().min(1).max(12),
    year: Joi.number().integer().min(2020).max(2099),
}).min(1);

module.exports = { createBudgetSchema, updateBudgetSchema };
