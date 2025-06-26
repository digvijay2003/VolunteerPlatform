const FoodDonation = require('../models/food_donation');
const FoodRequest = require('../models/food_request');
const FoodMatch = require('../models/food_match');
const { Searcher } = require('fast-fuzzy');

// Constants
const EARTH_RADIUS_KM = 6378.1;
const MAX_DISTANCE_KM = 20;
const MAX_DISTANCE_RAD = MAX_DISTANCE_KM / EARTH_RADIUS_KM;

// Scoring Weights
const SCORE_THRESHOLDS = {
  foodTypeHigh: 30,
  foodTypeMid: 20,
  quantityFull: 20,
  quantityPartial: 10,
  urgencyHigh: 20,
  urgencyMid: 10,
  verified: 10,
};

// Helper: Normalize text for matching
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper: Fuzzy match food types
function getFoodTypeSimilarityScore(requestType, donationType) {
  const requestKeywords = normalize(requestType).split(/[\s,]+/);
  const donationKeywords = normalize(donationType).split(/[\s,]+/);

  let maxScore = 0;

  for (let req of requestKeywords) {
    const searcher = new Searcher(donationKeywords, { returnMatchData: true }); // ✅ Fix here
    const results = searcher.search(req);
    const similarity = results?.[0]?.score || 0;
    if (similarity > maxScore) maxScore = similarity;
  }

  if (maxScore >= 0.85) return SCORE_THRESHOLDS.foodTypeHigh;
  if (maxScore >= 0.6) return SCORE_THRESHOLDS.foodTypeMid;
  return 0;
}

// Compute total match score
function getMatchScore(request, donation) {
  let score = 0;

  const log = {
    request: request._id.toString(),
    donation: donation._id.toString(),
    components: {},
  };

  // Food Type Match
  const foodTypeScore = getFoodTypeSimilarityScore(request.food_type, donation.food_type);
  score += foodTypeScore;
  log.components.foodTypeScore = foodTypeScore;

  // Quantity Match
  const reqQty = Number(request.quantity.amount || 0);
  const donQty = Number(donation.quantity.amount || 0);
  let quantityScore = 0;

  if (donQty >= reqQty) quantityScore = SCORE_THRESHOLDS.quantityFull;
  else if (donQty >= reqQty * 0.8) quantityScore = SCORE_THRESHOLDS.quantityPartial;

  score += quantityScore;
  log.components.quantityScore = quantityScore;

  // Urgency Match
  let urgencyScore = 0;
  if (request.urgency_level === 'high') urgencyScore = SCORE_THRESHOLDS.urgencyHigh;
  else if (request.urgency_level === 'medium') urgencyScore = SCORE_THRESHOLDS.urgencyMid;

  score += urgencyScore;
  log.components.urgencyScore = urgencyScore;

  // Donor Verification Match
  const verifiedScore = donation.is_verified ? SCORE_THRESHOLDS.verified : 0;
  score += verifiedScore;
  log.components.verifiedScore = verifiedScore;

  log.totalScore = score;

  console.log(`🔍 Match breakdown between request(${log.request}) and donation(${log.donation}):`, log);

  return score;
}

// Match a request to available donations
async function matchFoodRequest(request) {
  const donations = await FoodDonation.find({
    status: 'pending',
    expiration_date: { $gte: new Date() },
    location_geo: {
      $geoWithin: {
        $centerSphere: [request.location_geo.coordinates, MAX_DISTANCE_RAD],
      },
    },
  });

  for (let donation of donations) {
    const score = getMatchScore(request, donation);
    if (score >= 60) {
      const match = await FoodMatch.create({
        food_request: request._id,
        food_donation: donation._id,
        autoMatched: true,
        matchScore: score,
        note: 'Auto-matched based on proximity, type, and quantity',
        status: 'matched',
      });

      request.connected_donations.push(donation._id);
      request.status = 'matched';
      await request.save();

      donation.connected_requests.push(request._id);
      donation.status = 'matched';
      await donation.save();

      return match;
    }
  }

  return null;
}

// Match a donation to available requests
async function matchFoodDonation(donation) {
  const requests = await FoodRequest.find({
    status: 'pending',
    expiration_date: { $gte: new Date() },
    location_geo: {
      $geoWithin: {
        $centerSphere: [donation.location_geo.coordinates, MAX_DISTANCE_RAD],
      },
    },
  });

  for (let request of requests) {
    const score = getMatchScore(request, donation);
    if (score >= 60) {
      const match = await FoodMatch.create({
        food_request: request._id,
        food_donation: donation._id,
        autoMatched: true,
        matchScore: score,
        note: 'Auto-matched based on proximity, type, and quantity',
        status: 'matched',
      });

      request.connected_donations.push(donation._id);
      request.status = 'matched';
      await request.save();

      donation.connected_requests.push(request._id);
      donation.status = 'matched';
      await donation.save();

      return match;
    }
  }

  return null;
}

module.exports = {
  matchFoodRequest,
  matchFoodDonation,
};