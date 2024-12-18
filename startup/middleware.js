const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const express = require('express');
const session = require('../config/session');
const flash = require('connect-flash');
const logger = require('../config/logger')
const morgan = require('../config/morgan');

module.exports = (app) => {

    // General Middlewares
    app.use(morgan);
    app.use(compression());
    app.use(bodyParser.json({ limit: '10kb' }));
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
    app.use(flash());

    // Flash Middleware for Views
    app.use((req, res, next) => {
        res.locals.success = req.flash('success');
        res.locals.error = req.flash('error');
        next();
    });

    app.use((req, res, next) => {
        logger.info({
            timestamp: new Date().toISOString(),
            message: `Route visited: ${req.method} ${req.originalUrl}`,
        });
        next();
    });
};
