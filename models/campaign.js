const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,
  goal_amount: Number,
  raised_amount: { type: Number, default: 0 },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_boosted: { type: Boolean, default: false },
  boost_ends_at: Date,
  approved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);