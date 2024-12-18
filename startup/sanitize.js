module.exports = (app) => {
    app.use((req, res, next) => {
        const sanitizeString = (value) => {
            if (typeof value === 'string') {
                return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            return value;
        };

        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    sanitizeObject(obj[key]);
                } else {
                    obj[key] = sanitizeString(obj[key]);
                }
            }
        };

        if (req.body) sanitizeObject(req.body);
        if (req.query) sanitizeObject(req.query);
        if (req.params) sanitizeObject(req.params);

        next();
    });
};