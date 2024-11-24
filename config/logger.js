const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const { Loggly } = require('winston-loggly-bulk'); 

const token_Loggly = process.env.LOGGLY_TOKEN;
const subdomain_Loggly = process.env.LOGGLY_SUBDOMAIN;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const isProduction = 'production' === 'production';

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        colorize(),
        logFormat
    ),
    transports: [
        new transports.Console(), // Log to console
        new transports.File({ filename: 'logs/error.log', level: 'error' }), 
        new transports.File({ filename: 'logs/combined.log' }), 
    ]
});

if (isProduction) {
    logger.add(new Loggly({
        token: token_Loggly,   
        subdomain: subdomain_Loggly, 
        tags: ['Winston-NodeJS'], 
        json: true, 
        debug: true, 
        onError: (error) => {
            console.error('Loggly transport error:', error);
            logger.error(`Loggly transport error: ${error.message}`);
        }
    }));
}

module.exports = logger;