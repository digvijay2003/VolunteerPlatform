const Agenda = require('agenda');

const agenda = new Agenda({
  db: { address: process.env.DB_URL, collection: 'agendaJobs' },
});

module.exports = agenda;