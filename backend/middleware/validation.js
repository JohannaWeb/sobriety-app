const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * Password strength validation rules
 */
const passwordRules = () => {
    return body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number');
};

/**
 * Username validation rules
 */
const usernameRules = () => {
    return body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
        .trim()
        .escape();
};

/**
 * Register validation
 */
const validateRegister = [
    usernameRules(),
    passwordRules(),
    validate,
];

/**
 * Login validation
 */
const validateLogin = [
    body('username').notEmpty().withMessage('Username is required').trim().escape(),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
];

/**
 * Journal entry validation
 */
const validateJournalEntry = [
    body('date').isISO8601().withMessage('Valid date is required'),
    body('content').notEmpty().withMessage('Content is required').trim(),
    body('mood').optional().isIn(['happy', 'grateful', 'struggling', 'neutral', 'anxious', 'confident'])
        .withMessage('Invalid mood value'),
    validate,
];

/**
 * Post validation
 */
const validatePost = [
    body('title').notEmpty().withMessage('Title is required').trim().escape(),
    body('content').notEmpty().withMessage('Content is required').trim(),
    validate,
];

/**
 * Comment validation
 */
const validateComment = [
    body('content').notEmpty().withMessage('Content is required').trim(),
    validate,
];

/**
 * ID parameter validation
 */
const validateId = [
    param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
    validate,
];

module.exports = {
    validate,
    validateRegister,
    validateLogin,
    validateJournalEntry,
    validatePost,
    validateComment,
    validateId,
};
