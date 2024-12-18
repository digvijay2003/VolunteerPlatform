const logger = require('../config/logger');

const notFound = (req, res, next) => {
    const error = new Error('Page not found!');
    error.status = 404;

    logger.warn({
        timestamp: new Date().toISOString(),
        message: `404 - ${req.method} ${req.originalUrl}`,
    });

    res.status(404).render('error/error', {
        error_message: error.message,
        title: '404 - Not Found',
        stylesheet: '',
    });
};

const internalServerError = (err, req, res, next) => {
    logger.error({
        timestamp: new Date().toISOString(),
        message: `500 - ${err.message}`,
    });

    res.status(500).render('error/error', {
        error_message: 'Something went wrong!',
        title: '500 - Internal Server Error',
        stylesheet: '',
    });
};

module.exports = {
    notFound,
    internalServerError,
};
