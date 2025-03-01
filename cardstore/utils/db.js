const mongoose = require('mongoose');

const MONGO_USER = process.env.MONGO_USER || 'default-user';
const MONGO_PASS = process.env.MONGO_PASS || 'default-password';
const MONGO_URL = process.env.MONGO_URL || 'localhost:27017';
const DATABASE = 'cardstore';

// Construct MongoDB connection string with authentication
const MONGODB_URI = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_URL}/${DATABASE}?authSource=admin`;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true, 
      serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
    });
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err; // Re-throw to be caught in index.js
  }
}

module.exports = { connectDB };