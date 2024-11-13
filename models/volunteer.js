const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const volunteerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true,
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      required: true // Changed to false because not all volunteers may have a location
    },
    coordinates: {
      type: [Number],
      required: true // Changed to false because not all volunteers may have a location
    }
  }
});

volunteerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

volunteerSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
  }
  next();
});

volunteerSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    return false;
  }
};

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

module.exports = Volunteer;
