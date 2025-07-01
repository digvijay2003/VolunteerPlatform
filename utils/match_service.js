const FoodDonation = require('../models/food_donation');
const FoodRequest = require('../models/food_request');
const FoodMatch = require('../models/food_match');
const { Searcher } = require('fast-fuzzy');
const agenda = require('../jobs/agendaInstance');

const EARTH_RADIUS_KM = 6378.1;
const MAX_DISTANCE_KM = 20;
const MAX_DISTANCE_RAD = MAX_DISTANCE_KM / EARTH_RADIUS_KM;

const SCORE_THRESHOLDS = {
  foodTypeHigh: 30,
  foodTypeMid: 20,
  quantityFull: 20,
  quantityPartial: 10,
  urgencyHigh: 20,
  urgencyMid: 10,
  verified: 10,
  quantityUnitMatch: 5,
  quantityDescriptionMatch: 5,
};

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFoodTypeSimilarityScore(requestType, donationType) {
  const requestKeywords = normalize(requestType).split(/\s+/);
  const donationKeywords = normalize(donationType).split(/\s+/);
  let maxScore = 0;
  for (let req of requestKeywords) {
    const searcher = new Searcher(donationKeywords, { returnMatchData: true });
    const results = searcher.search(req);
    const similarity = results?.[0]?.score || 0;
    if (similarity > maxScore) maxScore = similarity;
  }
  if (maxScore >= 0.85) return SCORE_THRESHOLDS.foodTypeHigh;
  if (maxScore >= 0.6) return SCORE_THRESHOLDS.foodTypeMid;
  return 0;
}

function getQuantityMatchScore(request, donation) {
  const reqQty = Number(request.quantity.amount || 0);
  const donQty = Number(donation.quantity.amount || 0);
  let score = 0;

  if (donQty >= reqQty) {
    score += SCORE_THRESHOLDS.quantityFull;
  } else if (donQty >= reqQty * 0.8) {
    score += SCORE_THRESHOLDS.quantityPartial;
  }

  if (request.quantity.unit === donation.quantity.unit) {
    score += SCORE_THRESHOLDS.quantityUnitMatch;
  }

  const searcher = new Searcher([normalize(donation.quantity.description)]);
  const result = searcher.search(normalize(request.quantity.description));
  const similarity = result?.score || 0;

  if (similarity >= 0.7) {
    score += SCORE_THRESHOLDS.quantityDescriptionMatch;
  }

  return score;
}

function getMatchScore(request, donation) {
  let score = 0;
  score += getFoodTypeSimilarityScore(request.food_type, donation.food_type);
  score += getQuantityMatchScore(request, donation);

  if (request.urgency_level === 'high') score += SCORE_THRESHOLDS.urgencyHigh;
  else if (request.urgency_level === 'medium') score += SCORE_THRESHOLDS.urgencyMid;

  if (donation.is_verified) score += SCORE_THRESHOLDS.verified;

  return score;
}

async function matchEntity(primary, oppositeModel, isRequest) {
  const location = primary.location_geo.coordinates;

  const opposites = await oppositeModel.find({
    status: 'pending',
    expiration_date: { $gte: new Date() },
    location_geo: {
      $geoWithin: {
        $centerSphere: [location, MAX_DISTANCE_RAD],
      },
    },
  });

  console.log(`🔍 Found ${opposites.length} ${isRequest ? 'donations' : 'requests'} near ${primary._id}`);

  for (const opposite of opposites) {
    const request = isRequest ? primary : opposite;
    const donation = isRequest ? opposite : primary;

    const score = getMatchScore(request, donation);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (score >= 60) {
      const match = await FoodMatch.create({
        food_request: request._id,
        food_donation: donation._id,
        autoMatched: true,
        matchScore: score,
        donorOtp: Math.floor(100000 + Math.random() * 900000).toString(),
        requesterOtp: Math.floor(100000 + Math.random() * 900000).toString(),
        note: 'Auto-matched based on proximity, type, and quantity',
        status: 'matched',
      });

      request.connected_donations?.push(donation._id);
      request.status = 'matched';
      donation.connected_requests?.push(request._id);
      donation.status = 'matched';
      donation.match = match._id;
      request.match = match._id;

      await Promise.all([request.save(), donation.save()]);

      await agenda.now('assign-delivery-agent', { matchId: match._id });
      console.log(`✅ Match created (score: ${score}) → delivery scheduled for match: ${match._id}`);

      return match;
    }
  }

  console.log(`❌ No suitable match found for ${primary._id}`);
  return null;
}

async function matchFoodRequest(request) {
  return await matchEntity(request, FoodDonation, true);
}

async function matchFoodDonation(donation) {
  return await matchEntity(donation, FoodRequest, false);
}

module.exports = {
  matchFoodRequest,
  matchFoodDonation,
};