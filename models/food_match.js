const mongoose = require('mongoose');

const matchFoodRequestDonationSchema = new mongoose.Schema({
  food_donation: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDonation', required: true },
  food_request: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRequest', required: true },
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, 
  matchedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['matched', 'on-review', 'rejected'], default: 'on-review' },
  note: { type : String},
  autoMatched: { type: Boolean, default: false },
  matchScore: { type: Number, default: 0 },
  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  failureReason:  { type : String},
  deliveryStatus: { type: String, enum: ['pending', 'assigned', 'delivered', 'failed'], default: 'pending' },
  deliveryRoute: { type: { type: String, enum: ['LineString'], default: 'LineString' }, coordinates: { type: [[Number]], default: [] },},
  deliveryMode: { type: String, enum: ['volunteer', 'requester', 'donor'], default: 'volunteer' },
  actualDeliveryTime: {type: Date},
  deliveryFeedback: { volunteer: { type : String}, requester: { type : String}, },
  ratings: { requester: { type: Number, min: 0, max: 5 }},
  notifications: { donorNotified: { type: Boolean, default: false }, requesterNotified: { type: Boolean, default: false },
  deliveryRetryCount: { type: Number, default: 0,},
  },
}, { timestamps: true });

matchFoodRequestDonationSchema.index({ assignedVolunteer: 1 });
matchFoodRequestDonationSchema.index({ deliveryStatus: 1 });
matchFoodRequestDonationSchema.index({ 'deliveryRoute.coordinates': '2dsphere' });

const FoodMatch = mongoose.model('FoodMatch', matchFoodRequestDonationSchema);

module.exports = FoodMatch;