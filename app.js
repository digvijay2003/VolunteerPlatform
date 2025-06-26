require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const startAgenda = require('./jobs/agenda');

const app = express();

// Connect to Database and start Agenda
connectDB().then(() => {
  startAgenda(); 
});

const Agenda = require('agenda');
const agenda = new Agenda({
  db: { address: process.env.DB_URL, collection: 'agendaJobs' }
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
// require('./startup/sanitize')(app);

// swagger documentation
require('./startup/swagger')(app); 

// Routes
require('./startup/routes')(app);

// Error Handling
require('./startup/errorHandler')(app);

// Server Startup
require('./startup/server')(app);