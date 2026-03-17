const jwt = require('jsonwebtoken');
const User = require('../models/User');
const environment = require('../config/environment');
const { AppError } = require('../middleware/errorHandler');

const generateToken = (id) => {
    return jwt.sign({ id }, environment.jwtSecret, {
        expiresIn: environment.jwtExpire,
    });
};

const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            throw new AppError('User already exists', 400);
        }

        const user = await User.create({ name, email, password });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                budgetLimit: user.budgetLimit,
                currency: user.currency,
                token: generateToken(user._id),
            },
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            throw new AppError('Invalid email or password', 401);
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                budgetLimit: user.budgetLimit,
                currency: user.currency,
                avatar: user.avatar,
                token: generateToken(user._id),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({
            success: true,
            message: 'Profile fetched',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                budgetLimit: user.budgetLimit,
                currency: user.currency,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.budgetLimit = req.body.budgetLimit ?? user.budgetLimit;
        user.currency = req.body.currency || user.currency;
        user.avatar = req.body.avatar || user.avatar;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            success: true,
            message: 'Profile updated',
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                budgetLimit: updatedUser.budgetLimit,
                currency: updatedUser.currency,
                avatar: updatedUser.avatar,
                token: generateToken(updatedUser._id),
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, getProfile, updateProfile };
