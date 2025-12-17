const Expense = require('../models/Expense');

// @desc    Get all expenses for user
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
    try {
        const { startDate, endDate, category, type, limit = 50, page = 1 } = req.query;

        const query = { user: req.user._id };

        // Date filtering
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Category filtering
        if (category) {
            query.category = category;
        }

        // Type filtering (expense or income)
        if (type) {
            query.type = type;
        }

        const expenses = await Expense.find(query)
            .sort({ date: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Expense.countDocuments(query);

        res.json({
            expenses,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
const getExpense = async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        res.json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
    try {
        const { amount, type, category, description, paymentMethod, date, isRecurring, localId } = req.body;

        const expense = await Expense.create({
            user: req.user._id,
            amount,
            type: type || 'expense',
            category,
            description,
            paymentMethod,
            date: date || Date.now(),
            isRecurring,
            localId,
            syncStatus: 'synced',
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const { amount, type, category, description, paymentMethod, date, isRecurring } = req.body;

        expense.amount = amount ?? expense.amount;
        expense.type = type || expense.type;
        expense.category = category || expense.category;
        expense.description = description ?? expense.description;
        expense.paymentMethod = paymentMethod || expense.paymentMethod;
        expense.date = date || expense.date;
        expense.isRecurring = isRecurring ?? expense.isRecurring;
        expense.syncStatus = 'synced';

        const updatedExpense = await expense.save();

        res.json(updatedExpense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        await expense.deleteOne();

        res.json({ message: 'Expense removed', id: req.params.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Bulk sync expenses (for offline data)
// @route   POST /api/expenses/sync
// @access  Private
const syncExpenses = async (req, res) => {
    try {
        const { expenses } = req.body;
        const results = [];

        for (const exp of expenses) {
            // Check if expense with localId already exists
            let existing = null;
            if (exp.localId) {
                existing = await Expense.findOne({
                    user: req.user._id,
                    localId: exp.localId,
                });
            }

            if (existing) {
                // Update existing
                existing.amount = exp.amount;
                existing.type = exp.type;
                existing.category = exp.category;
                existing.description = exp.description;
                existing.paymentMethod = exp.paymentMethod;
                existing.date = exp.date;
                existing.syncStatus = 'synced';
                const updated = await existing.save();
                results.push({ localId: exp.localId, serverId: updated._id, status: 'updated' });
            } else {
                // Create new
                const newExpense = await Expense.create({
                    user: req.user._id,
                    ...exp,
                    syncStatus: 'synced',
                });
                results.push({ localId: exp.localId, serverId: newExpense._id, status: 'created' });
            }
        }

        res.json({ results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get spending insights
// @route   GET /api/expenses/insights
// @access  Private
const getInsights = async (req, res) => {
    try {
        const { month, year } = req.query;

        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        // Current month date range
        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        // Previous month date range
        const startOfPrevMonth = new Date(targetYear, targetMonth - 1, 1);
        const endOfPrevMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Current month aggregation
        const currentMonthData = await Expense.aggregate([
            {
                $match: {
                    user: req.user._id,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                },
            },
        ]);

        // Previous month aggregation
        const prevMonthData = await Expense.aggregate([
            {
                $match: {
                    user: req.user._id,
                    date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
                },
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                },
            },
        ]);

        // Category breakdown for current month
        const categoryBreakdown = await Expense.aggregate([
            {
                $match: {
                    user: req.user._id,
                    type: 'expense',
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { total: -1 },
            },
        ]);

        // Daily breakdown for current month
        const dailyBreakdown = await Expense.aggregate([
            {
                $match: {
                    user: req.user._id,
                    date: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        type: '$type',
                    },
                    total: { $sum: '$amount' },
                },
            },
            {
                $sort: { '_id.date': 1 },
            },
        ]);

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date(targetYear, targetMonth - 5, 1);
        const monthlyTrend = await Expense.aggregate([
            {
                $match: {
                    user: req.user._id,
                    date: { $gte: sixMonthsAgo, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        year: { $year: '$date' },
                        type: '$type',
                    },
                    total: { $sum: '$amount' },
                },
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 },
            },
        ]);

        // Process data
        const currentExpense = currentMonthData.find((d) => d._id === 'expense')?.total || 0;
        const currentIncome = currentMonthData.find((d) => d._id === 'income')?.total || 0;
        const prevExpense = prevMonthData.find((d) => d._id === 'expense')?.total || 0;
        const prevIncome = prevMonthData.find((d) => d._id === 'income')?.total || 0;

        // Calculate percentage change
        const expenseChange = prevExpense > 0
            ? ((currentExpense - prevExpense) / prevExpense) * 100
            : currentExpense > 0 ? 100 : 0;

        const incomeChange = prevIncome > 0
            ? ((currentIncome - prevIncome) / prevIncome) * 100
            : currentIncome > 0 ? 100 : 0;

        res.json({
            currentMonth: {
                expense: currentExpense,
                income: currentIncome,
                balance: currentIncome - currentExpense,
            },
            previousMonth: {
                expense: prevExpense,
                income: prevIncome,
            },
            comparison: {
                expenseChange: Math.round(expenseChange * 100) / 100,
                incomeChange: Math.round(incomeChange * 100) / 100,
            },
            categoryBreakdown,
            dailyBreakdown,
            monthlyTrend,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
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
