const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        amount: {
            type: Number,
            required: [true, 'Please add an amount'],
        },
        type: {
            type: String,
            enum: ['expense', 'income'],
            default: 'expense',
        },
        category: {
            type: String,
            required: [true, 'Please add a category'],
            enum: [
                'groceries',
                'travel',
                'car',
                'home',
                'insurance',
                'education',
                'marketing',
                'shopping',
                'internet',
                'water',
                'rent',
                'gym',
                'subscription',
                'vacation',
                'food',
                'entertainment',
                'salary',
                'freelance',
                'investment',
                'other',
            ],
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'],
            default: 'cash',
        },
        date: {
            type: Date,
            default: Date.now,
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        // For offline sync support
        localId: {
            type: String,
            default: null,
        },
        syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'conflict'],
            default: 'synced',
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
