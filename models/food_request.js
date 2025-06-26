const mongoose = require('mongoose');
const { imageSchema, quantitySchema, geoSchema } = require('./common');

const foodRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requester_name: { type: String, required: true, trim: true },
  requester_phone: { type: String, required: true, match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'] },
  food_type: { type: String, required: true, trim: true },
  quantity: quantitySchema,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'matched'], default: 'pending' },
  location_text: { type: String, required: true },
  location_geo: geoSchema,
  need_description: { type: String, required: true, trim: true },
  urgency_level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  number_of_people: { type: Number, required: true, min: [1, 'Must be at least 1'] },
  expiration_date: { type: Date },
  proof_images: [imageSchema],
  government_id_number: { type: String, required: true, trim: true },
  government_id_images: [imageSchema],
  is_verified: { type: Boolean, default: false },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  connected_donations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FoodDonation' }],
  fulfilled_at: { type: Date }
}, { timestamps: true });

// Indexes
foodRequestSchema.index({ status: 1 });
foodRequestSchema.index({ is_verified: 1 });
foodRequestSchema.index({ createdAt: -1 });
foodRequestSchema.index({ 'location_geo': '2dsphere' });
foodRequestSchema.index({ status: 1, urgency_level: 1, createdAt: -1 });

const FoodRequest = mongoose.model('FoodRequest', foodRequestSchema);

module.exports = FoodRequest;