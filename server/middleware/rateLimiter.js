const rateLimit = require('express-rate-limit');
const environment = require('../config/environment');

const apiLimiter = rateLimit({
    windowMs: environment.rateLimit.windowMs,
    max: environment.rateLimit.max,
    message: {
        success: false,
        message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
