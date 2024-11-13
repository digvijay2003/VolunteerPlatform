const mongoose = require('mongoose');

const requestDonation = new mongoose.Schema({
    requester_name: {
        type: String,
        required: true
    },
    requester_phone: {
        type: Number,
        required: true,
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
        enum: ['pending', 'success','rejected','failed'],
        default: "pending"
    },
    location: {
        type: String,
        required: true
    },
    need_description: {
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
    createdAt: {
        type: Date,
        default: Date.now()
    },
    fulfilledAt: {
        type: Date
    },
    volunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Volunteer',
        default: null
    },
    connectedDonors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
    }],
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        required: true
    },
    number_of_people: {
        type: Number,
        required: true,
        min: [1, 'Must be at least 1']
    },
    expiration_date: {
        type: Date,
        required: false
    },
    images: [{
        url:String,
        filename:String
    }],
});

const Request = mongoose.model('Request', requestDonation);
module.exports = Request;
