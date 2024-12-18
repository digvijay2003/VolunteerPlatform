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
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
                    frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
                    mediaSrc: ["'self'", "https://www.youtube.com"],
                    imgSrc: ["'self'", "https://i.ytimg.com"],
                    connectSrc: ["'self'"],
                },
            },
        })
    );
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

    // Rate Limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later.',
    });
    app.use('/api', limiter);

    // NoSQL Injection Prevention
    app.use(mongoSanitize());

    // Prevent HTTP Parameter Pollution
    app.use(hpp());

    // CORS
    app.use(cors({
        origin: ['https://example.com'], 
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }));
};
