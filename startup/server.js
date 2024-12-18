const logger = require('../config/logger');

module.exports = (app) => {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        logger.info({ timestamp: new Date().toISOString(), message: `Server running on port ${PORT}` });
    });
};