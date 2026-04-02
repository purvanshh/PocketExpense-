require('dotenv').config();

const environment = {
    get port() { return process.env.PORT || 5001; },
    get host() { return process.env.HOST || '0.0.0.0'; },
    get nodeEnv() { return process.env.NODE_ENV || 'development'; },
    get mongoUri() { return process.env.MONGODB_URI; },
    get jwtSecret() { return process.env.JWT_SECRET; },
    get jwtExpire() { return process.env.JWT_EXPIRE || '7d'; },
    get rateLimit() {
        return {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        };
    },
    get cors() {
        return { origin: process.env.CORS_ORIGIN || '*' };
    },
};

module.exports = environment;
