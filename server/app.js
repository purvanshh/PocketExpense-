const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const environment = require('./config/environment');
const logger = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budgets');
const insightRoutes = require('./routes/insights');

const createApp = () => {
    const app = express();

    // Trust reverse proxy headers to get correct client IP address
    app.set('trust proxy', true);

    // Security headers
    app.use(helmet());

    // Prevent NoSQL injection
    app.use(mongoSanitize());

    // Prevent HTTP parameter pollution
    app.use(hpp());

    app.use(cors(environment.cors));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Request logging (skip in test to reduce noise)
    if (environment.nodeEnv !== 'test') {
        app.use((req, res, next) => {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
            logger.info(`${req.method} ${req.originalUrl} - Client IP: ${ip}`);
            next();
        });
    }

    // Versioned routes with rate limiting
    app.use('/api/v1', apiLimiter);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/expenses', expenseRoutes);
    app.use('/api/v1/budgets', budgetRoutes);
    app.use('/api/v1/insights', insightRoutes);

    // Backward-compatible routes
    app.use('/api/auth', authRoutes);
    app.use('/api/expenses', expenseRoutes);
    app.use('/api/budgets', budgetRoutes);
    app.use('/api/insights', insightRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: 'PocketExpense+ API is running',
            data: {
                status: 'ok',
                environment: environment.nodeEnv,
                timestamp: new Date().toISOString(),
            },
        });
    });

    // Centralized error handler
    app.use(errorHandler);

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: 'Route not found',
        });
    });

    return app;
};

module.exports = createApp;
