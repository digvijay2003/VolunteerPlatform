const { check, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation Errors:', errors.array());
        const errorMessages = errors
            .array()
            .reduce((acc, curr) => {
                if (!acc[curr.param]) {
                    acc[curr.param] = curr.msg;
                }
                return acc;
            }, {});

        req.flash('error', Object.values(errorMessages));

        return res.redirect(req.originalUrl || '/default-route');
    }
    next();
};

const validateVolunteerRegistration = [
    check('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),

    check('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),

    check('password')
        .trim()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),

    check('phone')
        .trim()
        .matches(/^\+?\d{10,15}$/)
        .withMessage('Please enter a valid phone number'),

    check('location')
        .trim()
        .notEmpty()
        .withMessage('Location is required'),

    check('role')
        .optional()
        .isIn(['driver', 'coordinator', 'general'])
        .withMessage('Invalid role value'),

    check('availability')
        .trim()
        .notEmpty()
        .withMessage('Availability is required'),

    check('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array')
        .custom((skills) =>
            skills.every(skill => ['delivery', 'cooking', 'communication', 'logistics'].includes(skill))
        )
        .withMessage('Invalid skill value'),

    check('emergencyContact.name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Emergency contact name cannot be empty'),
    check('emergencyContact.phone')
        .optional()
        .matches(/^\+?\d{10,15}$/)
        .withMessage('Please enter a valid phone number for the emergency contact'),
    handleValidationErrors
];

const validateVolunteerLogin = [
    check('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),
    check('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required'),

    handleValidationErrors
];

const validateVolunteerEdit = [
    check('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),

    check('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),

    check('password')
        .trim()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),

    check('phone')
        .trim()
        .matches(/^\+?\d{10,15}$/)
        .withMessage('Please enter a valid phone number'),

    check('location')
        .trim()
        .notEmpty()
        .withMessage('Location is required'),

    check('role')
        .optional()
        .isIn(['driver', 'coordinator', 'general'])
        .withMessage('Invalid role value'),

    check('availability')
        .trim()
        .notEmpty()
        .withMessage('Availability is required'),

    check('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array')
        .custom((skills) =>
            skills.every(skill => ['delivery', 'cooking', 'communication', 'logistics'].includes(skill))
        )
        .withMessage('Invalid skill value'),

    check('emergencyContact.name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Emergency contact name cannot be empty'),
    check('emergencyContact.phone')
        .optional()
        .matches(/^\+?\d{10,15}$/)
        .withMessage('Please enter a valid phone number for the emergency contact'),
    handleValidationErrors
];

module.exports = {
    validateVolunteerRegistration,
    validateVolunteerLogin,
    validateVolunteerEdit,
};