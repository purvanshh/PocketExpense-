const jwt = require('jsonwebtoken');
const User = require('../models/User');
const environment = require('../config/environment');
const { AppError } = require('./errorHandler');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, environment.jwtSecret);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return next(new AppError('User not found', 401));
            }

            next();
        } catch (error) {
            return next(new AppError('Not authorized, token failed', 401));
        }
    }

    if (!token) {
        return next(new AppError('Not authorized, no token', 401));
    }
};

module.exports = { protect };
