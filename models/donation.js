const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: {
        type: String,
        required: true
    },
    foodtype: {
        type: String,
        required: true
    },
    quantity: {
        amount: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1']
        },
        unit: {
            type: String,
            enum: ['kg', 'liter', 'pieces'],
            required: true
        },
        description: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['pending', 'success'],
        default: "pending"
    },
    location: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            index: '2dsphere',
            required: true
        }
    },
    createdAt : {
        type: Date,
        default: Date.now()
    },
    connectedRequesters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }]
});

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;
