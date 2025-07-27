const mongoose = require('mongoose');

const moneyDonationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  gateway: { type: String },
  transaction_id: { type: String },
  receipt_url: { type: String },
  donated_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
}, { timestamps: true });

module.exports = mongoose.model('MoneyDonation', moneyDonationSchema);