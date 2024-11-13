// config/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = session({
    secret: process.env.SESSION_SECRET, // replace with a strong secret
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://127.0.0.1:27017/volunteer-platform' }), // replace with your MongoDB connection string
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
});
