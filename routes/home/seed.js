const mongoose = require('mongoose');
const Event = require('../../models/event');

const sampleEvents = [
    {
      title: 'Food Drive in Kangra',
      description: 'Join us to distribute food packets to families in need.',
      eventType: 'Donation Drive',
      date: new Date('2024-02-15'), 
      location: {
        city: 'Kangra',
        state: 'Himachal Pradesh',
        zipCode: '176001', 
        address: 'Community Hall, Kangra',
      },
      organizer: {
        name: 'FeedHope Volunteers',
        contact: '9876543210',
        email: 'info@feedhope.com',
      },
      maxParticipants: 100, // Added max participants
      status: 'Upcoming',
    },
    {
      title: 'Blood Donation Camp',
      description: 'Help save lives by donating blood.',
      eventType: 'Health Drive',
      date: new Date('2024-03-10'), // A future date
      location: {
        city: 'Shimla',
        state: 'Himachal Pradesh',
        zipCode: '171001', // Added zip code
        address: 'Shimla Mall Road', // Added address
      },
      organizer: {
        name: 'FeedHope Health Team',
        contact: '9876543220',
        email: 'health@feedhope.com',
      },
      maxParticipants: 50, // Added max participants
      status: 'Upcoming',
    },
  ];  

const seedData = async () => {
  try {
    await Event.deleteMany({});
    await Event.insertMany(sampleEvents);
    console.log('Sample events added.');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Export the function
module.exports = seedData;