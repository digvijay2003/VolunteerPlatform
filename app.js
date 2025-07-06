require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const startAgenda = require('./jobs/agenda');
const agenda = require('./jobs/agendaInstance');

const app = express();

// Connect to Database and start Agenda
connectDB().then(() => {
  startAgenda(); 
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down Agenda gracefully...');
  await agenda.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down Agenda gracefully...');
  await agenda.stop();
  process.exit(0);
});

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout/boilerplate');
app.use(require('express-ejs-layouts'));

// Startup Modules
require('./startup/security')(app);
require('./startup/middleware')(app);
require('./startup/sanitize')(app);

// Routes
require('./startup/routes')(app);

// Error Handling
require('./startup/errorHandler')(app);

// Server Startup
require('./startup/server')(app);