const express = require('express');
const router = express.Router();
const {
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    syncExpenses,
    getInsights,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const {
    createExpenseSchema,
    updateExpenseSchema,
    expenseQuerySchema,
    syncExpensesSchema,
} = require('../validators/expense.validator');

router.use(protect);

// Insights (must be before /:id)
router.get('/insights', getInsights);

// Sync route for offline data
router.post('/sync', validate(syncExpensesSchema), syncExpenses);

// CRUD routes
router.route('/')
    .get(validateQuery(expenseQuerySchema), getExpenses)
    .post(validate(createExpenseSchema), createExpense);

router.route('/:id')
    .get(getExpense)
    .put(validate(updateExpenseSchema), updateExpense)
    .delete(deleteExpense);

module.exports = router;
