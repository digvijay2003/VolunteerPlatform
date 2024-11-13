require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const session = require('./config/session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
// const AdminJS = require('adminjs');
// const AdminJSExpress = require('@adminjs/express');
// const mongooseAdminJS = require('@adminjs/mongoose');
// const mongoose = require('mongoose');

// Import your models
// const Volunteer = require('./models/volunteer');
// const Donation = require('./models/donation');
// const Request = require('./models/request');
// const ContactUs = require('./models/contactUs');

// // Initialize Mongoose AdminJS Adapter
// AdminJS.registerAdapter(mongooseAdminJS);

// // Create an AdminJS instance
// const adminJs = new AdminJS({
//   databases: [mongoose],  // Connect AdminJS to your MongoDB database
//   resources: [
//     { resource: Volunteer, options: { parent: { name: 'Volunteers' } } },
//     { resource: Donation, options: { parent: { name: 'Donations' } } },
//     { resource: Request, options: { parent: { name: 'Requests' } } },
//     { resource: ContactUs, options: { parent: { name: 'Contacts' } } }
//   ],
//   rootPath: '/admin',  // Set the root path for your admin panel
// });

// // Build and use the AdminJS router with authentication (if needed)
// const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
//   authenticate: async (email, password) => {
//     // Replace with your own authentication logic
//     if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
//       return { email: process.env.ADMIN_EMAIL };
//     }
//     return null;
//   },
//   cookiePassword: 'sessionsecret',  // A secure secret for session handling
// });

// Initialize Express
const app = express();

// Connect to the database
connectDB();

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
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

// AdminJS route
// app.use(adminJs.options.rootPath, adminRouter);  // Attach AdminJS route

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
