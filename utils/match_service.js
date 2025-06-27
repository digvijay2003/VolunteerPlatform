const FoodDonation = require('../models/food_donation');
const FoodRequest = require('../models/food_request');
const FoodMatch = require('../models/food_match');
const { Searcher } = require('fast-fuzzy');

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
  console.log(`📦 Food Type Similarity: "${requestType}" vs "${donationType}" → Score: ${maxScore}`);
  if (maxScore >= 0.85) return SCORE_THRESHOLDS.foodTypeHigh;
  if (maxScore >= 0.6) return SCORE_THRESHOLDS.foodTypeMid;
  return 0;
}

function getQuantityMatchScore(request, donation) {
  const reqQty = Number(request.quantity.amount || 0);
  const donQty = Number(donation.quantity.amount || 0);
  let score = 0;
  let unitScore = 0;
  let descScore = 0;

  if (donQty >= reqQty) {
    score += SCORE_THRESHOLDS.quantityFull;
    console.log(`✅ Quantity Full Match: ${donQty} >= ${reqQty}`);
  } else if (donQty >= reqQty * 0.8) {
    score += SCORE_THRESHOLDS.quantityPartial;
    console.log(`☑️ Quantity Partial Match: ${donQty} ≈ ${reqQty}`);
  } else {
    console.log(`❌ Quantity Insufficient: ${donQty} < ${reqQty * 0.8}`);
  }

  if (request.quantity.unit === donation.quantity.unit) {
    unitScore = SCORE_THRESHOLDS.quantityUnitMatch;
    score += unitScore;
    console.log(`✅ Unit Match: ${request.quantity.unit}`);
  } else {
    console.log(`❌ Unit Mismatch: ${request.quantity.unit} vs ${donation.quantity.unit}`);
  }

  const searcher = new Searcher([normalize(donation.quantity.description)]);
  const result = searcher.search(normalize(request.quantity.description));
  const similarity = result?.score || 0;

  if (similarity >= 0.7) {
    descScore = SCORE_THRESHOLDS.quantityDescriptionMatch;
    score += descScore;
    console.log(`✅ Quantity Description Match: "${request.quantity.description}" ≈ "${donation.quantity.description}" [score=${similarity}]`);
  } else {
    console.log(`❌ Quantity Description Mismatch: "${request.quantity.description}" vs "${donation.quantity.description}" [score=${similarity}]`);
  }

  return score;
}

function getMatchScore(request, donation) {
  let score = 0;
  const log = {
    request: request._id.toString(),
    donation: donation._id.toString(),
    components: {},
  };

  console.log(`\n🔗 Matching Request (${log.request}) with Donation (${log.donation})`);

  const foodTypeScore = getFoodTypeSimilarityScore(request.food_type, donation.food_type);
  score += foodTypeScore;
  log.components.foodTypeScore = foodTypeScore;

  const quantityScore = getQuantityMatchScore(request, donation);
  score += quantityScore;
  log.components.quantityScore = quantityScore;

  let urgencyScore = 0;
  if (request.urgency_level === 'high') urgencyScore = SCORE_THRESHOLDS.urgencyHigh;
  else if (request.urgency_level === 'medium') urgencyScore = SCORE_THRESHOLDS.urgencyMid;
  score += urgencyScore;
  log.components.urgencyScore = urgencyScore;

  const verifiedScore = donation.is_verified ? SCORE_THRESHOLDS.verified : 0;
  score += verifiedScore;
  log.components.verifiedScore = verifiedScore;

  log.totalScore = score;
  console.log(`📊 Match Breakdown:`, log);

  return score;
}

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

  console.log(`🔍 Found ${donations.length} donations near request (${request._id})`);

  for (let donation of donations) {
    const score = getMatchScore(request, donation);
    if (score >= 60) {
      console.log(`✅ Match Found (Score ${score}) — Creating record`);
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
    } else {
      console.log(`⛔ Skipped (Score ${score} < 60)`);
    }
  }

  console.log(`❌ No suitable match found for request (${request._id})`);
  return null;
}

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

  console.log(`🔍 Found ${requests.length} requests near donation (${donation._id})`);

  for (let request of requests) {
    const score = getMatchScore(request, donation);
    if (score >= 60) {
      console.log(`✅ Match Found (Score ${score}) — Creating record`);
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
    } else {
      console.log(`⛔ Skipped (Score ${score} < 60)`);
    }
  }

  console.log(`❌ No suitable match found for donation (${donation._id})`);
  return null;
}

module.exports = {
  matchFoodRequest,
  matchFoodDonation,
};