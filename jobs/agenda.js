const agenda = require('../jobs/agendaInstance');
const { matchFoodRequest, matchFoodDonation } = require('../utils/match_service');
const assignDeliveryAgent = require('../utils/assign_delivery');
const FoodRequest = require('../models/food_request');
const FoodDonation = require('../models/food_donation');
const FoodMatch = require('../models/food_match');

// Retry unmatched requests and donations
agenda.define('retry-unmatched-requests', async (job, done) => {
  try {
    const pendingRequests = await FoodRequest.find({
      status: 'pending',
      expiration_date: { $gte: new Date() }
    });

    for (const request of pendingRequests) await matchFoodRequest(request);

    const pendingDonations = await FoodDonation.find({
      status: 'pending',
      expiration_date: { $gte: new Date() }
    });

    for (const donation of pendingDonations) await matchFoodDonation(donation);

    console.log(`✅ Job completed: retry-unmatched-requests`);
    done();
  } catch (err) {
    console.error(`❌ Job failed: retry-unmatched-requests → ${err.message}`);
    done(err);
  }
});

// Retry delivery assignment for pending delivery matches
agenda.define('retry-pending-delivery-matches', async (job, done) => {
  try {
    const pendingMatches = await FoodMatch.find({
      status: 'matched',
      deliveryStatus: 'pending'
    });

    const matchIds = [...new Set(pendingMatches.map(match => match._id.toString()))];

    for (const matchId of matchIds) {
      console.log(`🔁 Retrying delivery assignment for match ${matchId}`);
      await agenda.now('assign-delivery-agent', { matchId });
    }

    console.log(`✅ Job completed: retry-pending-delivery-matches`);
    done();
  } catch (err) {
    console.error(`❌ Job failed: retry-pending-delivery-matches → ${err.message}`);
    done(err);
  }
});

// Assign delivery agent for a specific match
agenda.define('assign-delivery-agent', async (job, done) => {
  try {
    const { matchId } = job.attrs.data;
    if (!matchId) {
      console.warn('⚠️ No matchId provided to assign-delivery-agent job');
      return done();
    }

    await assignDeliveryAgent(matchId);
    console.log(`🚚 Delivery assigned for match: ${matchId}`);
    done();
  } catch (err) {
    console.error(`❌ Delivery assignment failed: ${err.message}`);
    done(err);
  }
});

// Start and schedule recurring jobs
async function startAgenda() {
  await agenda.start();

  // Unique job definition to avoid duplicates
  await agenda.every('10 minutes', 'retry-unmatched-requests', {}, { unique: true });
  await agenda.every('15 minutes', 'retry-pending-delivery-matches', {}, { unique: true });

  console.log('🕒 Agenda initialized and scheduled');
}

module.exports = startAgenda;