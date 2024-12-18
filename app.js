require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to Database
connectDB();

// Startup Modules
require('./startup/security')(app);
require('./startup/middleware')(app);
require('./startup/sanitize')(app);

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout/boilerplate');
app.use(require('express-ejs-layouts'));

// Routes
require('./startup/routes')(app);

// Error Handling
require('./startup/errorHandler')(app);

// Server Startup
require('./startup/server')(app);