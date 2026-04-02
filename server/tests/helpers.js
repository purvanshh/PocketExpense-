const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

const TEST_JWT_SECRET = 'test-secret-key-for-jest';

const createTestUser = async (overrides = {}) => {
    const user = await User.create({
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        ...overrides,
    });
    return user;
};

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, TEST_JWT_SECRET, { expiresIn: '1h' });
};

const createTestExpense = async (userId, overrides = {}) => {
    return Expense.create({
        user: userId,
        amount: 100,
        type: 'expense',
        category: 'food',
        description: 'Test expense',
        paymentMethod: 'cash',
        date: new Date(),
        syncStatus: 'synced',
        ...overrides,
    });
};

const createTestBudget = async (userId, overrides = {}) => {
    const now = new Date();
    return Budget.create({
        user: userId,
        category: 'food',
        amount: 1000,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        ...overrides,
    });
};

const createManyExpenses = async (userId, count, overrides = {}) => {
    const expenses = [];
    for (let i = 0; i < count; i++) {
        expenses.push({
            user: userId,
            amount: Math.round((Math.random() * 500 + 10) * 100) / 100,
            type: 'expense',
            category: ['food', 'travel', 'shopping', 'rent', 'entertainment'][i % 5],
            description: `Test expense ${i}`,
            paymentMethod: 'cash',
            date: new Date(Date.now() - i * 86400000),
            syncStatus: 'synced',
            ...overrides,
        });
    }
    return Expense.insertMany(expenses);
};

module.exports = {
    TEST_JWT_SECRET,
    createTestUser,
    generateToken,
    createTestExpense,
    createTestBudget,
    createManyExpenses,
};
