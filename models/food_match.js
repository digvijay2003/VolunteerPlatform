const mongoose = require('mongoose');

const matchFoodRequestDonationSchema = new mongoose.Schema({
  food_donation: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDonation' },
  food_request: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRequest' },
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  matchedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['matched', 'partial', 'rejected'], default: 'matched' },
  note: String
});

const FoodMatch = mongoose.model('Match', matchFoodRequestDonationSchema);

modeule.exports = FoodMatch;