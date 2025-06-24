// connectDB.js
const mongoose = require('mongoose');
const logger = require('./logger');
const URL = process.env.DB_URL;

const connectDB = async () => {
    try {
        await mongoose.connect(URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            socketTimeoutMS: 45000,  
        });
        logger.info(`MongoDB connected`);

        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to MongoDB Atlas.');
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected.');
        });
        
    } catch (error) {
        logger.error(`Error: ${error}`);
        console.error('MongoDB connection error:', error);
        process.exit(1); 
    }
};

module.exports = connectDB;