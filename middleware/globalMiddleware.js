const logger = require('../config/logger');

// Global Flash Middleware
const globalFlashMiddleware = (req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
};

// Route Logger Middleware
const routeLogger = (req, res, next) => {
    logger.info({
        timestamp: new Date().toISOString(),
        message: `Route visited: ${req.method} ${req.originalUrl}`,
    });
    next();
};

module.exports = {
    globalFlashMiddleware,
    routeLogger,
};