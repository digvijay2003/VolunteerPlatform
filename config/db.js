const mongoose = require('mongoose');
const dbUrl = process.env.DB_URL;

const connectDB = async () => {
    try {
      await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connected...');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
};

module.exports = connectDB;