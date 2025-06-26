const mongoose = require('mongoose');

const matchFoodRequestDonationSchema = new mongoose.Schema({
  food_donation: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDonation', required: true },
  food_request: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRequest', required: true },
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // optional
  matchedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['matched', 'on-review', 'rejected'], default: 'on-review' },
  note: String,
  autoMatched: { type: Boolean, default: false },
  matchScore: { type: Number, default: 0 } // 0-100
}, { timestamps: true });

const FoodMatch = mongoose.model('FoodMatch', matchFoodRequestDonationSchema);

module.exports = FoodMatch;