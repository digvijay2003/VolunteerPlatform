const errorHandler = require('../middleware/errorHandler');

module.exports = (app) => {
    app.use(errorHandler.notFound);
    app.use(errorHandler.internalServerError);
};