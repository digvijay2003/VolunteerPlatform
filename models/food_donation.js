const mongoose = require('mongoose');

const foodDonationSchema = new mongoose.Schema({
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      required: true
    },
    foodDetails: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Delivered', 'Cancelled'],
      default: 'Pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    deliveryTime: {
      type: Date
    },
    history: [
      {
        status: {
          type: String,
          enum: ['Pending', 'In Progress', 'Delivered', 'Cancelled'],
          required: true
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Volunteer' 
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        notes: {
          type: String
        }
      }
    ]
  });
  const FoodDonation = mongoose.model('FoodDonation', foodDonationSchema);