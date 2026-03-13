const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: [
                'groceries', 'travel', 'car', 'home', 'insurance', 'education',
                'marketing', 'shopping', 'internet', 'water', 'rent', 'gym',
                'subscription', 'vacation', 'food', 'entertainment', 'salary',
                'freelance', 'investment', 'other',
            ],
        },
        amount: {
            type: Number,
            required: [true, 'Budget amount is required'],
            min: [0, 'Budget amount must be positive'],
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },
        totalSpent: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

budgetSchema.virtual('percentageUsed').get(function () {
    if (this.amount === 0) return 0;
    return Math.round((this.totalSpent / this.amount) * 10000) / 100;
});

budgetSchema.virtual('remainingAmount').get(function () {
    return Math.max(this.amount - this.totalSpent, 0);
});

// Prevent duplicate category budgets per month per user
budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ user: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
