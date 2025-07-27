const multer = require('multer'); 
const logger = require('../config/logger');
const ExpressError = require('./express_error'); 

const notFound = (req, res, next) => {
    const error = new Error('Page not found!');
    error.status = 404;

    logger.warn({
        timestamp: new Date().toISOString(),
        message: `404 - ${req.method} ${req.originalUrl}`,
    });

    res.status(404).render('error/error', {
        error_message: error.message,
        status_code: 404,
        title: '404 - Not Found',
        stylesheet: '',
    });
};

const internalServerError = (err, req, res, next) => {
    let message = err.message || 'Something went wrong!';
    let statusCode = err.statusCode || 500;

    if (err.name === 'ValidationError') {
        message = `Validation Error: ${Object.values(err.errors).map(val => val.message).join(', ')}`;
        statusCode = 400; 
        logger.error({
            timestamp: new Date().toISOString(),
            message: `400 - Validation Error: ${message}`,
            stack: err.stack,
        });
    }

    if (err.name === 'StrictPopulateError') {
        message = `Mongoose Population Error: ${err.message}`;
        statusCode = 400;
        logger.error({
            timestamp: new Date().toISOString(),
            message: `400 - Mongoose Population Error: ${message}`,
            stack: err.stack,
        });
    }

    if (err instanceof multer.MulterError) {
        req.flash('error', 'File upload error: ' + err.message);
        res.redirect(req.originalUrl);
    } else if (err.message.includes('Invalid file type') || err.message.includes('File too large')) {
        req.flash('error', 'The uploaded file must be a PNG, JPG, or PDF and not exceed 100KB.');
    } else {
        req.flash('error', err.message || 'Error during registration.');
    }
    

    if (err instanceof ExpressError) {
        statusCode = err.statusCode;
        logger.warn({
            timestamp: new Date().toISOString(),
            message: `${statusCode} - ${err.message}`,
        });
    } else {
        logger.error({
            timestamp: new Date().toISOString(),
            message: `${statusCode} - ${err.message}`,
            stack: err.stack,
        });
    }

    res.status(statusCode).render('error/error', {
        error_message: message, 
        status_code: statusCode,
        title: `${statusCode} - Error`,
        stylesheet: '', 
    });
};

module.exports = {
    notFound,
    internalServerError,
};