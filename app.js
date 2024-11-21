require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const session = require('./config/session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');

// Initialize Express
const app = express();

// Connect to the database
connectDB();

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
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
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

// Error handling middleware
app.use((req, res, next) => {
    res.status(404).render('errorHandling/error', { error: 'Page not found!' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errorHandling/error', { error: 'Something went wrong!' });
});

// Start the server
app.listen(3000, () => console.log('Server running on port 3000'));
