const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true,  }, 
  plan: { type: String, enum: ['Free', 'Premium'], default: 'Free', },
  startDate: { type: Date, default: Date.now, },
  endDate: { type: Date, },
  status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active', },
  lastPaymentDate: { type: Date, },
  paymentId: { type: String, },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);