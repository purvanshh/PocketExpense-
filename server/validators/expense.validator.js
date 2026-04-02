const Joi = require('joi');

const validCategories = [
    'groceries', 'travel', 'car', 'home', 'insurance', 'education',
    'marketing', 'shopping', 'internet', 'water', 'rent', 'gym',
    'subscription', 'vacation', 'food', 'entertainment', 'salary',
    'freelance', 'investment', 'other',
];

const validPaymentMethods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'];

const createExpenseSchema = Joi.object({
    amount: Joi.number().positive().required()
        .messages({ 'any.required': 'Amount is required' }),
    type: Joi.string().valid('expense', 'income').default('expense'),
    category: Joi.string().valid(...validCategories).required()
        .messages({ 'any.required': 'Category is required' }),
    description: Joi.string().trim().max(200).allow('').default(''),
    paymentMethod: Joi.string().valid(...validPaymentMethods).default('cash'),
    date: Joi.date().iso().default(() => new Date()),
    isRecurring: Joi.boolean().default(false),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').when('isRecurring', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional().allow(null),
    }),
    nextRunDate: Joi.date().iso().allow(null),
    localId: Joi.string().allow(null),
});

const updateExpenseSchema = Joi.object({
    amount: Joi.number().positive(),
    type: Joi.string().valid('expense', 'income'),
    category: Joi.string().valid(...validCategories),
    description: Joi.string().trim().max(200).allow(''),
    paymentMethod: Joi.string().valid(...validPaymentMethods),
    date: Joi.date().iso(),
    isRecurring: Joi.boolean(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').allow(null),
    nextRunDate: Joi.date().iso().allow(null),
});

const expenseQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid(...validCategories),
    type: Joi.string().valid('expense', 'income'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sort: Joi.string().default('-date'),
});

const syncExpensesSchema = Joi.object({
    expenses: Joi.array().items(
        Joi.object({
            amount: Joi.number().positive().required(),
            type: Joi.string().valid('expense', 'income').default('expense'),
            category: Joi.string().valid(...validCategories).required(),
            description: Joi.string().trim().max(200).allow('').default(''),
            paymentMethod: Joi.string().valid(...validPaymentMethods).default('cash'),
            date: Joi.date().iso(),
            isRecurring: Joi.boolean().default(false),
            frequency: Joi.string().valid('daily', 'weekly', 'monthly').allow(null),
            localId: Joi.string().allow(null),
        })
    ).min(1).required(),
});

module.exports = {
    createExpenseSchema,
    updateExpenseSchema,
    expenseQuerySchema,
    syncExpensesSchema,
    validCategories,
};
