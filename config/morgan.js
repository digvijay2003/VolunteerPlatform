const morgan = require('morgan');
const logger = require('./logger');

morgan.token('user', function (req, res) {
    return req.user ? req.user.id : 'Guest';
});

morgan.token('request_id', function (req) {
    return req.headers['x-request-id'] || 'N/A';
});

morgan.token('route', function (req, res) {
    return req.route ? req.route.path : 'N/A';
});

morgan.token('content-type', function (req, res) {
    return req.headers['content-type'] || 'N/A';
});

// Morgan JSON logging format
module.exports = morgan((tokens, req, res) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        response_time: tokens['response-time'](req, res) + ' ms',
        content_length: tokens.res(req, res, 'content-length') || '-',
        http_version: tokens['http-version'](req, res),
        referrer: tokens.referrer(req, res),
        remote_addr: tokens['remote-addr'](req, res),
        user_agent: req.headers['user-agent'],
        user: tokens['user'](req, res), 
        request_id: tokens['request_id'](req),  
        route: tokens['route'](req, res), 
        content_type: tokens['content-type'](req, res),

    };

    return JSON.stringify(logEntry) + '\n';
}, {
    stream: {
        write: (message) => {
            console.log(message.trim());  
            console.log();
        }
    },
});
 