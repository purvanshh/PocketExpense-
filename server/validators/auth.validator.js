const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
        .messages({ 'any.required': 'Name is required' }),
    email: Joi.string().email().lowercase().trim().required()
        .messages({ 'any.required': 'Email is required' }),
    password: Joi.string().min(6).max(128).required()
        .messages({ 'any.required': 'Password is required', 'string.min': 'Password must be at least 6 characters' }),
});

const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50),
    email: Joi.string().email().lowercase().trim(),
    password: Joi.string().min(6).max(128),
    budgetLimit: Joi.number().min(0),
    currency: Joi.string().max(5),
    avatar: Joi.string().allow(''),
});

module.exports = { registerSchema, loginSchema, updateProfileSchema };
