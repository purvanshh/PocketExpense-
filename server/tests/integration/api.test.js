// Set env BEFORE any require so config/environment getters pick it up
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = '1000';

const mongoose = require('mongoose');
const supertest = require('supertest');
require('../setup');

const createApp = require('../../app');
const User = require('../../models/User');
const { createTestUser, createTestExpense, createTestBudget } = require('../helpers');

const app = createApp();
const request = supertest(app);

describe('API Integration Tests', () => {
    describe('Full Auth Flow: Register → Login → Use JWT → Create Expense', () => {
        it('should complete the full auth and expense creation flow', async () => {
            // 1. Register
            const registerRes = await request
                .post('/api/auth/register')
                .send({ name: 'Flow User', email: 'flow@test.com', password: 'pass123456' });

            expect(registerRes.status).toBe(201);
            expect(registerRes.body.success).toBe(true);
            expect(registerRes.body.data.token).toBeDefined();

            const token = registerRes.body.data.token;

            // 2. Login
            const loginRes = await request
                .post('/api/auth/login')
                .send({ email: 'flow@test.com', password: 'pass123456' });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.success).toBe(true);
            expect(loginRes.body.data.token).toBeDefined();

            // 3. Use JWT to create expense
            const expenseRes = await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${loginRes.body.data.token}`)
                .send({
                    amount: 150,
                    type: 'expense',
                    category: 'food',
                    description: 'Integration test',
                    paymentMethod: 'upi',
                });

            expect(expenseRes.status).toBe(201);
            expect(expenseRes.body.success).toBe(true);
            expect(expenseRes.body.data.amount).toBe(150);

            // 4. Fetch expenses
            const listRes = await request
                .get('/api/expenses')
                .set('Authorization', `Bearer ${loginRes.body.data.token}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.data.expenses.length).toBe(1);
        });
    });

    describe('Expense → Budget Auto-Update', () => {
        it('should auto-recalculate budget when expense is created', async () => {
            const user = await createTestUser({ email: 'budget-auto@test.com' });
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            const now = new Date();

            // Create budget
            const budgetRes = await request
                .post('/api/budgets')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    category: 'food',
                    amount: 1000,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                });

            expect(budgetRes.status).toBe(201);

            // Create expense
            await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 300,
                    type: 'expense',
                    category: 'food',
                    paymentMethod: 'cash',
                });

            // Check budget updated
            const budgetsRes = await request
                .get('/api/budgets')
                .set('Authorization', `Bearer ${token}`);

            expect(budgetsRes.status).toBe(200);
            const foodBudget = budgetsRes.body.data.find((b) => b.category === 'food');
            expect(foodBudget.totalSpent).toBe(300);
            expect(foodBudget.percentageUsed).toBe(30);
        });
    });

    describe('Joi Validation', () => {
        let token;

        beforeEach(async () => {
            const user = await createTestUser({ email: `joi-${Date.now()}@test.com` });
            const jwt = require('jsonwebtoken');
            token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        });

        it('should reject expense with missing amount', async () => {
            const res = await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${token}`)
                .send({ category: 'food', paymentMethod: 'cash' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject expense with invalid category', async () => {
            const res = await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 100, category: 'invalidCategory', paymentMethod: 'cash' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject expense with negative amount', async () => {
            const res = await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: -50, category: 'food', paymentMethod: 'cash' });

            expect(res.status).toBe(400);
        });

        it('should reject register with short password', async () => {
            const res = await request
                .post('/api/auth/register')
                .send({ name: 'Test', email: 'short@test.com', password: '123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject register with invalid email', async () => {
            const res = await request
                .post('/api/auth/register')
                .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

            expect(res.status).toBe(400);
        });

        it('should reject budget with missing required fields', async () => {
            const res = await request
                .post('/api/budgets')
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 500 }); // missing category, month, year

            expect(res.status).toBe(400);
        });

        it('should accept valid expense with recurring fields', async () => {
            const res = await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 500,
                    category: 'subscription',
                    paymentMethod: 'credit_card',
                    isRecurring: true,
                    frequency: 'monthly',
                });

            expect(res.status).toBe(201);
            expect(res.body.data.isRecurring).toBe(true);
            expect(res.body.data.frequency).toBe('monthly');
        });
    });

    describe('Duplicate Budget Handling', () => {
        it('should return 409 for duplicate category budget in same month', async () => {
            const user = await createTestUser({ email: `dup-${Date.now()}@test.com` });
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            const now = new Date();
            const budgetData = {
                category: 'food',
                amount: 1000,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            };

            const res1 = await request
                .post('/api/budgets')
                .set('Authorization', `Bearer ${token}`)
                .send(budgetData);

            expect(res1.status).toBe(201);

            const res2 = await request
                .post('/api/budgets')
                .set('Authorization', `Bearer ${token}`)
                .send(budgetData);

            expect(res2.status).toBe(409);
            expect(res2.body.success).toBe(false);
        });
    });

    describe('Authentication Errors', () => {
        it('should return 401 for missing token', async () => {
            const res = await request.get('/api/expenses');
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 401 for invalid token', async () => {
            const res = await request
                .get('/api/expenses')
                .set('Authorization', 'Bearer invalidtoken123');

            expect(res.status).toBe(401);
        });

        it('should return 401 for expired token', async () => {
            const jwt = require('jsonwebtoken');
            const user = await createTestUser({ email: `exp-${Date.now()}@test.com` });

            const expiredToken = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '0s' }
            );

            // Small delay to ensure expiry
            await new Promise((r) => setTimeout(r, 100));

            const res = await request
                .get('/api/expenses')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
        });
    });

    describe('404 Handling', () => {
        it('should return 404 for unknown route', async () => {
            const res = await request.get('/api/nonexistent');
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('API Versioning', () => {
        it('should work with /api/v1/ prefix', async () => {
            const res = await request
                .post('/api/v1/auth/register')
                .send({ name: 'V1 User', email: `v1-${Date.now()}@test.com`, password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Consistent Response Format', () => {
        it('should always return { success, message, data }', async () => {
            const user = await createTestUser({ email: `fmt-${Date.now()}@test.com` });
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Success response
            const successRes = await request
                .get('/api/expenses')
                .set('Authorization', `Bearer ${token}`);

            expect(successRes.body).toHaveProperty('success', true);
            expect(successRes.body).toHaveProperty('message');
            expect(successRes.body).toHaveProperty('data');

            // Error response
            const errorRes = await request
                .post('/api/expenses')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(errorRes.body).toHaveProperty('success', false);
            expect(errorRes.body).toHaveProperty('message');
        });
    });

    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const res = await request.get('/api/health');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('ok');
        });
    });
});
