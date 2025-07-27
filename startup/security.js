const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');

module.exports = (app) => {
    app.set('trust proxy', 1);
    // Helmet for Security Headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    "default-src": ["'self'"],
                    "script-src": [
                        "'self'",
                        "'unsafe-inline'",
                        "https://cdn.jsdelivr.net",
                        "https://api.mapbox.com",
                        "https://*.mapbox.com",
                        "https://www.youtube.com",
                        "https://www.youtube-nocookie.com"
                    ],
                    "worker-src": ["'self'", "blob:"],
                    "style-src": [
                        "'self'",
                        "'unsafe-inline'",
                        "https://fonts.googleapis.com",
                        "https://cdn.jsdelivr.net",
                        "https://api.mapbox.com",
                        "https://*.mapbox.com"
                    ],
                    "font-src": [
                        "'self'",
                        "https://fonts.gstatic.com",
                        "https://fonts.googleapis.com"
                    ],
                    "img-src": [
                        "'self'",
                        "data:",
                        "https://api.mapbox.com",
                        "https://*.mapbox.com", 
                        "https://i.ytimg.com",
                        "https://res.cloudinary.com"
                    ],
                    "connect-src": [
                        "'self'",
                        "https://api.mapbox.com",
                        "https://*.mapbox.com"
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
                }
            }
        })
    );    
    
    // Specific rate limit for /feedhope to prevent abuse
    const feedhopeLimiter = rateLimit({
        windowMs: 15 * 60 * 100,
        max: 30,
        message: 'Too many requests to /feedhope from this IP, please try again later.',
    });
    app.use('/feedhope', feedhopeLimiter);

    const chatbotLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: 'Too many requests to /chatbot from this IP, please try again later.',
    });
    app.use('/bot', chatbotLimiter);

    // Global rate limit for all other routes
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        message: 'Too many requests from this IP, please try again later.',
        handler: (req, res) => {
            console.warn(`⚠️ Global rate limit exceeded: ${req.ip} on ${req.originalUrl}`);
            res.status(429).json({
                success: false,
                message: 'Too many requests from this IP, please try again later.'
            });
        }
    });

    app.use(globalLimiter);

    app.use(mongoSanitize());
    app.use(hpp());
    app.use(cors({
        origin: ['https://example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    }));
};
