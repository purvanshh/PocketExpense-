const express = require('express');
const router = express.Router();
const { createBudget, getBudgets, updateBudget, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createBudgetSchema, updateBudgetSchema } = require('../validators/budget.validator');

router.use(protect);

router.route('/')
    .get(getBudgets)
    .post(validate(createBudgetSchema), createBudget);

router.route('/:id')
    .put(validate(updateBudgetSchema), updateBudget)
    .delete(deleteBudget);

module.exports = router;
