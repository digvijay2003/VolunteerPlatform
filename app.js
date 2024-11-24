require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const session = require('./config/session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const logger = require('./config/logger');
const morgan = require('./config/morgan');

// Initialize Express
const app = express();

// Connect to the database
connectDB();

app.use(morgan);

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout/boilerplate');

app.use(expressLayouts);
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session);
app.use(flash());

// Global flash message middleware
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

app.use((req, res, next) => {
    logger.info({
        timestamp: new Date().toISOString(),
        message: `Route visited: ${req.method} ${req.originalUrl}`,
    });
    next();
});

// Routes
app.use('/', require('./routes/home'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/profile'));
app.use('/', require('./routes/donateFood'));
app.use('/', require('./routes/requestDonation'));
app.use('/', require('./routes/aboutUs'));
app.use('/admin', require('./routes/admin'));

app.use((req, res, next) => {
    const error = new Error('Page not found!');
    error.status = 404;
    logger.warn({
        timestamp: new Date().toISOString(),
        message: `404 - ${req.method} ${req.originalUrl}`,
    });
    res.status(404).render('errorHandling/error', { error: error.message });
});

app.use((err, req, res, next) => {
    logger.error({
        timestamp: new Date().toISOString(),
        message: `500 - ${err.message}`,
    });
    res.status(500).render('errorHandling/error', { error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info({
        timestamp: new Date().toISOString(),
        message: `Server running on port ${PORT}`,
    });
});
