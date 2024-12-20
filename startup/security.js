const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');

module.exports = (app) => {
    // Helmet for Security Headers
    app.use(
        helmet({
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "script-src": [
                "'self'",
                "https://cdn.jsdelivr.net", 
                "https://api.mapbox.com",
                "https://www.youtube.com",
                "https://www.youtube-nocookie.com"
              ],
              "style-src": [
                "'self'", 
                "'unsafe-inline'",
                "https://fonts.googleapis.com", 
                "https://cdn.jsdelivr.net", 
                "https://api.mapbox.com"
              ],
              "font-src": [
                "'self'", 
                "https://fonts.googleapis.com", 
                "https://fonts.gstatic.com"
              ],
              "img-src": [
                "'self'", 
                "data:", 
                "https://api.mapbox.com",
                "https://i.ytimg.com"
              ],
              "connect-src": [
                "'self'", 
                "https://api.mapbox.com"
              ],
              "frame-src": [
                "'self'",
                "https://www.youtube.com",
                "https://www.youtube-nocookie.com"
              ],
              "media-src": [
                "'self'",
                "https://www.youtube.com"
              ] 
            },
          },
        })
      );
      
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later.',
    });
    app.use('/api', limiter);

    app.use(mongoSanitize());

    app.use(hpp());

    app.use(cors({
        origin: ['https://example.com'], 
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }));
};
