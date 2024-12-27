const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Event title must be less than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [500, 'Description must be less than 500 characters']
  },
  eventType: {
    type: String,
    required: true,
    enum: ['Donation Drive', 'Volunteer Drive', 'Charity Event', 'Health Drive'], // Add 'Health Drive'
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      validate: {
        validator: (value) => /^[0-9]{5,6}$/.test(value),
        message: 'Invalid zip code format'
      }
    }
  },
  organizer: {
    name: {
      type: String,
      required: [true, 'Organizer name is required']
    },
    contact: {
      type: String,
      required: [true, 'Organizer contact is required'],
      validate: {
        validator: (value) => /^[0-9]{10}$/.test(value),
        message: 'Invalid contact number'
      }
    },
    email: {
      type: String,
      required: [true, 'Organizer email is required'],
      validate: {
        validator: (value) => /^\S+@\S+\.\S+$/.test(value),
        message: 'Invalid email format'
      }
    }
  },
  donations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation'
    }
  ],
  requests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request'
    }
  ],
  volunteers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer'
    }
  ],
  maxParticipants: {
    type: Number,
    required: [true, 'Maximum participants are required'],
    min: [1, 'There must be at least one participant']
  },
  participants: [
    {
      name: {
        type: String,
        required: [true, 'Participant name is required']
      },
      email: {
        type: String,
        required: [true, 'Participant email is required'],
        validate: {
          validator: (value) => /^\S+@\S+\.\S+$/.test(value),
          message: 'Invalid email format'
        }
      },
      contact: {
        type: String,
        required: [true, 'Participant contact number is required'],
        validate: {
          validator: (value) => /^[0-9]{10}$/.test(value),
          message: 'Invalid contact number'
        }
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Upcoming'
  }
});

EventSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Event', EventSchema);