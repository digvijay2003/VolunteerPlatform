const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { addressSchema } = require('./common');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, match: [/.+\@.+\..+/, 'Please enter a valid email'] },
  phone: { type: String, required: true, unique: true, match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'] },
  password: { type: String, required: true },
  address: addressSchema,
  roles: { type: [String], enum: ['donor', 'requester', 'volunteer'], default: [] },
  food_donations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FoodDonation', default: [] }],
  food_requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FoodRequest', default: [] }],
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  campaigns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }],
  money_donations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MoneyDonation' }],
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription',},
  donor_subscription: { active: { type: Boolean, default: false }, amount: {type: Number}, frequency: { type: String, enum: ['monthly', 'yearly'] }, next_charge: Date, payment_gateway_customer_id: String, },
}, { timestamps: true });

// 🔐 Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔄 Hash password if updated via findOneAndUpdate
userSchema.pre('findOneAndUpdate', async function(next) {
  const pwd = this.getUpdate().password;
  if (pwd) this.getUpdate().password = await bcrypt.hash(pwd, 10);
  next();
});

// ✅ Compare plaintext password with hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;