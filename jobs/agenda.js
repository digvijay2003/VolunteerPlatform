// jobs/agenda.js
const Agenda = require('agenda');
const mongoose = require('mongoose');
const { matchFoodRequest, matchFoodDonation } = require('../utils/match_service');
const FoodRequest = require('../models/food_request');
const FoodDonation = require('../models/food_donation');

// Init Agenda with same MongoDB connection
const agenda = new Agenda({
  db: { address: process.env.DB_URL, collection: 'agendaJobs' },
});

// Define the retry job
agenda.define('retry-unmatched-requests', async (job, done) => {
  try {
    const pendingRequests = await FoodRequest.find({ status: 'pending', expiration_date: { $gte: new Date() } });
    for (const request of pendingRequests) {
      await matchFoodRequest(request);
    }

    const pendingDonations = await FoodDonation.find({ status: 'pending', expiration_date: { $gte: new Date() } });
    for (const donation of pendingDonations) {
      await matchFoodDonation(donation);
    }

    console.log(`✅ Agenda Job completed: retry-unmatched-requests`);
    done();
  } catch (err) {
    console.error(`❌ Agenda Job failed: ${err.message}`);
    done(err);
  }
});

// Schedule job every 30 minutes
async function startAgenda() {
  await agenda.start();
  await agenda.every('0,30 * * * *', 'retry-unmatched-requests');
  console.log('🕒 Agenda scheduler initialized and running.');
}

module.exports = startAgenda;