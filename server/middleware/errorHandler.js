const logger = require('../config/logger');
const environment = require('../config/environment');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    if (err.name === 'ValidationError') {
        statusCode = 400;
        const messages = Object.values(err.errors).map((e) => e.message);
        message = messages.join(', ');
    }

    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate value for ${field}`;
    }

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    logger.error(`${statusCode} - ${message}`, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: environment.nodeEnv === 'development' ? err.stack : undefined,
    });

    res.status(statusCode).json({
        success: false,
        message,
        ...(environment.nodeEnv === 'development' && { stack: err.stack }),
    });
};

module.exports = { AppError, errorHandler };
