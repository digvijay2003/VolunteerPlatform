// config/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB_URL}),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
});
