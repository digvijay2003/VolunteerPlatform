const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const express = require('express');
const session = require('../config/session');
const flash = require('connect-flash');
const logger = require('../config/logger')
const morgan = require('../config/morgan');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = (app) => {

    // General Middlewares
    app.use(morgan);
    app.use(compression());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(methodOverride('_method'));

    // Static Files
    app.use(express.static('public', {
        maxAge: '7d',
        etag: true,
        immutable: true,
    }));

    // Session and Flash
    app.use(session);
    app.use(async (req, res, next) => {
        if (req.session.token) {
            try {
                const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('-password');
                req.user = user;
            } catch (err) {
                // Handle expired or invalid token gracefully
                console.error('Failed to authenticate token:', err);
                req.session.token = null; // Clear the invalid token
            }
        }
        next();
    });
    app.use(flash());

    // Flash Middleware for Views
    app.use((req, res, next) => {
        res.locals.currentUser = req.user || null;
        res.locals.success = req.flash('success');
        res.locals.error = req.flash('error');
        next();
    });

    app.use((req, res, next) => {
        logger.info({
            timestamp: new Date().toISOString(),
            message: `Route visited: ${req.method} ${req.originalUrl}`,
            user: req.user?.id || 'Guest',
            request_id: req.headers['x-request-id'] || 'N/A',
            ip: req.ip,
        });
        next();
    });
};
