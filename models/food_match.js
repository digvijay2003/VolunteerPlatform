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
  previousAssignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  deliveryfailureReason:  { type : String},
  deliveryStatus: { type: String, enum: ['pending', 'assigned', 'delivered','in_transit','failed'], default: 'pending' },
  deliveryRoute: { type: { type: String, enum: ['LineString'], default: 'LineString' }, coordinates: { type: [[Number]], default: [] },},
  deliveryMode: { type: String, enum: ['volunteer', 'requester', 'donor'], default: 'volunteer' },
  deliveryactualDeliveryTime: {type: Date},
  deliveryFeedback: { volunteer: { type : String}, requester: { type : String}, },
  deliveryratings: { requester: { type: Number, min: 0, max: 5 }},
  deliverynotifications: { donorNotified: { type: Boolean, default: false }, requesterNotified: { type: Boolean, default: false }, volunteerNotified: { type: Boolean, default: false }},
  deliveryRetryCount: { type: Number, default: 0,},
  donorOtp: { type: String }, 
  requesterOtp: { type: String }, 
  verifyOtpWithDonor: { type: Boolean, default: false },
  verifyOtpWithRequester: { type: Boolean, default: false },
}, { timestamps: true });

matchFoodRequestDonationSchema.index({ assignedVolunteer: 1 });
matchFoodRequestDonationSchema.index({ deliveryStatus: 1 });
matchFoodRequestDonationSchema.index({ 'deliveryRoute.coordinates': '2dsphere' });

const FoodMatch = mongoose.model('FoodMatch', matchFoodRequestDonationSchema);

module.exports = FoodMatch;