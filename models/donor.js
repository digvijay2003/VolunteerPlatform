const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
    name: { 
        type: String,
        required: true
    },
    email:
    {
        type: String,
        required: true,
        unique: true
    },
    phone:
    {
        type:String,
        required:true
    },
});

const donationSchema = new mongoose.Schema({
    donorId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MoneyDonor',
        required: true
    },
    amount:
    {
        type: Number,
        required: true
    },
    message:
    {
        type: String
    },
    createdAt:{ 
        type: Date,
        default: Date.now
    },
});

const Donor = mongoose.model('MoneyDonor', donorSchema);
const MoneyDonation = mongoose.model('MoneyDonation', donationSchema);

module.exports = {
  Donor,
  MoneyDonation,
};
