require('dotenv').config();

const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const startAgenda = require('./jobs/agenda');
const agenda = require('./jobs/agendaInstance');
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");
const logger = require('./config/logger');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  _experiments: { enableLogs: true },
});

const app = express();
Sentry.setupExpressErrorHandler(app);

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

app.use((req, res, next) => {
  if (req.user) {
    Sentry.setUser({
      id: req.user.id,
      email: req.user.email,
    });
  }

  Sentry.setContext('request', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    ip: req.ip,
  });

  next();
});

require('./startup/middleware')(app);
require('./startup/sanitize')(app);

// Routes
require('./startup/routes')(app);

// Error Handling
require('./startup/errorHandler')(app);

app.use(function onError(err, req, res, next) {
  logger.error(`Unhandled Error: ${err.message}`);
  res.statusCode = 500;
  res.end(`An error occurred: ${res.sentry || 'Unknown'}\n`);
});

// Server Startup
require('./startup/server')(app);