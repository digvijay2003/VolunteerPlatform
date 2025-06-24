const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  description: { type: String, required: true }
});

const quantitySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [1, 'Amount must be at least 1'],
    validate: { validator: Number.isInteger, message: 'Amount must be an integer' }
  },
  unit: { type: String, required: true, enum: ['kg', 'liter', 'pieces'] },
  description: { type: String, required: true, trim: true }
});

const geoSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], required: true },
  coordinates: { type: [Number], required: true, index: '2dsphere' }
});

const addressSchema = new mongoose.Schema({
  city:   { type: String, required: true, trim: true },
  state:  { type: String, required: true, trim: true },
  country:{ type: String, required: true, trim: true },
  zip:    { type: String, trim: true }
});

module.exports = {
  imageSchema,
  quantitySchema,
  geoSchema,
  addressSchema,
};