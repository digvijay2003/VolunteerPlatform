const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { imageSchema } = require('./common');

const volunteerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'] },
  location: { type: String, required: true },
  geometry: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true, index: '2dsphere' }
  },
  role: { type: String, enum: ['driver', 'coordinator', 'general'], default: 'general' },
  availability: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  skills: [{ type: String, enum: ['delivery', 'cooking', 'communication', 'logistics'] }],
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    comment: { type: String },
    rating: { type: Number, min: 0, max: 5 }
  }],
  emergencyContact: {
    name: { type: String },
    phone: { type: String, match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'] }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  governmentIdProofs: [imageSchema],
  governmentIdVerified: { type: Boolean, default: false },
  verifiedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  verificationResponse: { type: String },
  isBanned: { type: Boolean, default: false },
  bannedReason: { type: String }
});

// 🔐 Hash password before saving
volunteerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔄 Hash password if updated
volunteerSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.password) update.password = await bcrypt.hash(update.password, 10);
  next();
});

// ✅ Password comparison
volunteerSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    return false;
  }
};

const Volunteer = mongoose.model('Volunteer', volunteerSchema);
module.exports = Volunteer;