const FoodMatch = require('../models/food_match');
const Volunteer = require('../models/volunteer');
const agenda = require('../jobs/agendaInstance'); // Required for scheduling retry

function getDistanceByUrgency(urgency) {
  if (urgency === 'high') return 10000;
  if (urgency === 'medium') return 5000;
  return 7000;
}

async function assignDeliveryAgent(matchId) {
  const match = await FoodMatch.findById(matchId)
    .populate('food_donation')
    .populate('food_request');

  if (!match) {
    console.error(`⚠️ Match not found for ID ${matchId}`);
    return;
  }

  const { food_donation, food_request } = match;

  // Step 1: Donor willing to deliver
  if (food_donation.delivery_willing) {
    match.deliveryMode = 'donor';
    match.deliveryStatus = 'assigned';
    await match.save();
    return;
  }

  // Step 2: Requester can pick up
  if (food_request.can_pickup) {
    match.deliveryMode = 'requester';
    match.deliveryStatus = 'assigned';
    await match.save();
    return;
  }

  // Step 3: Assign volunteer based on urgency
  const maxDistance = getDistanceByUrgency(food_request.urgency_level);

  const volunteers = await Volunteer.find({
    availability: true,
    status: 'active',
    geometry: {
      $near: {
        $geometry: food_donation.location_geo,
        $maxDistance: maxDistance,
      }
    }
  }).limit(1);

  if (volunteers?.length) {
    const volunteer = volunteers[0];

    match.assignedVolunteer = volunteer._id;
    match.deliveryMode = 'volunteer';
    match.deliveryStatus = 'assigned';
    await match.save();

    volunteer.currentAssignments.push(match._id);
    volunteer.availability = false;
    await volunteer.save();

    food_donation.delivered_by_volunteer = volunteer._id;
    await food_donation.save();

    food_request.delivered_by_volunteer = volunteer._id;
    await food_request.save();

    return;
  }

  const MAX_RETRY = 5;

  match.deliveryStatus = 'pending';
  match.deliveryRetryCount = (match.deliveryRetryCount || 0) + 1;

  if (match.deliveryRetryCount > MAX_RETRY) {
    console.warn(`🚫 Retry limit reached for match ${matchId}. Not scheduling again.`);
    await match.save();
    return;
  }

  await match.save();

  console.log(`🔁 No volunteer found. Retrying match ${matchId} in 10 minutes... (Attempt ${match.deliveryRetryCount})`);
  await agenda.schedule('in 10 minutes', 'assign-delivery-agent', { matchId });
}

module.exports = assignDeliveryAgent;