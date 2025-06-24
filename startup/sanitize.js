module.exports = (app) => {
  app.use((req, res, next) => {
    const sanitizeString = (value) => {
      if (typeof value === 'string') {
        return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      return value;
    };

    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject); // recursively sanitize array elements
      }

      if (obj !== null && typeof obj === 'object') {
        for (const key in obj) {
          obj[key] = sanitizeObject(obj[key]);
        }
        return obj;
      }

      return sanitizeString(obj); // sanitize only string leaf nodes
    };

    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);

    next();
  });
};