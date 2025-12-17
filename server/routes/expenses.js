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

// All routes are protected
router.use(protect);

// Insights route (must be before /:id to avoid conflict)
router.get('/insights', getInsights);

// Sync route for offline data
router.post('/sync', syncExpenses);

// CRUD routes
router.route('/').get(getExpenses).post(createExpense);
router.route('/:id').get(getExpense).put(updateExpense).delete(deleteExpense);

module.exports = router;
