const mongoose = require('mongoose');
const { imageSchema, quantitySchema, geoSchema } = require('./common');

const foodDonationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donor_name: { type: String, required: true, trim: true },
  donor_phone: { type: String, required: true, match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'] },
  food_type: { type: String, required: true, trim: true },
  quantity: quantitySchema,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  location_text: { type: String, required: true },
  location_geo: geoSchema,
  description: { type: String, required: true, trim: true },
  expiration_date: { type: Date },
  proof_images: { type: [imageSchema], required: true, validate: { validator: function (v) { return Array.isArray(v) && v.length > 0; }, message: 'At least one proof image is required.' }},
  is_verified: { type: Boolean, default: false },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  connected_requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FoodRequest' }],
  fulfilled_at: { type: Date }
}, { timestamps: true });

// Indexes
foodDonationSchema.index({ status: 1 });
foodDonationSchema.index({ is_verified: 1 });
foodDonationSchema.index({ createdAt: -1 });
foodDonationSchema.index({ 'location_geo': '2dsphere' });

const FoodDonation = mongoose.model('FoodDonation', foodDonationSchema);

module.exports = FoodDonation;