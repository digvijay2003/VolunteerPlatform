const { createLogger, format, transports } = require('winston');
const Sentry = require('@sentry/node');
const TransportStream = require('winston-transport');

class SentryTransport extends TransportStream {
  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (info.level === 'error' || info.level === 'warn') {
      Sentry.captureMessage(`[${info.level.toUpperCase()}] ${info.message}`, {
        level: info.level,
        extra: info.meta || {},
      });
    }

    callback();
  }
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.colorize(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new SentryTransport(), 
  ],
});

module.exports = logger;