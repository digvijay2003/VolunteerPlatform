const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  description: { type: String, required: true }
});

const donationRequestSchema = new mongoose.Schema({
    requesterName: {
        type: String,
        required: true,
        trim: true
    },
    requesterPhone: {
        type: String,  
        required: true,
        match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number']
    },
    foodType: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        amount: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
            validate: {
                validator: Number.isInteger,
                message: 'Amount must be an integer'
            }
        },
        unit: {
            type: String,
            enum: ['kg', 'liter', 'pieces'],
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        }
    },
    requestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'fulfilled'],
        default: 'pending'
    },
    location: {
        type: String,
        required: true
    },
    descriptionOfNeed: {
        type: String,
        required: true,
        trim: true
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
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    fulfilledAt: {
        type: Date
    },
    urgencyLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        required: true
    },
    numberOfPeople: {
        type: Number,
        required: true,
        min: [1, 'Must be at least 1']
    },
    expirationDate: {
        type: Date
    },
    proofImages: [imageSchema],
    governmentId: {
        type: String,  
        required: true,
        trim: true
    },
    governmentIdImages: [imageSchema], 
    isVerified: {
        type: Boolean,
        default: false  
    },
    verifiedByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',  
        required: false
    }
}, { timestamps: true });

donationRequestSchema.index({ requestStatus: 1 });
donationRequestSchema.index({ location: 1 });
donationRequestSchema.index({ createdAt: -1 });
donationRequestSchema.index({ requestStatus: 1, urgencyLevel: 1 });
donationRequestSchema.index({ requestStatus: 1, urgencyLevel: 1, createdAt: -1 });
donationRequestSchema.index({ isVerified: 1 });

const Request = mongoose.model('Request', donationRequestSchema);

module.exports = Request;