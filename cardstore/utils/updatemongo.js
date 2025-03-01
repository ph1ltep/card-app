const mongoose = require('mongoose');
const Card = require('../models/Card');

const MONGO_USER = process.env.MONGO_USER || 'default-user';
const MONGO_PASS = process.env.MONGO_PASS || 'default-password';
const MONGO_URL = process.env.MONGO_URL || 'localhost:27017';
const DATABASE = 'cardstore';

const MONGODB_URI = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_URL}/${DATABASE}?authSource=admin`;

async function updateImagePaths() {
  try {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true, 
      serverSelectionTimeoutMS: 30000 
    });
    console.log('Connected to MongoDB successfully');

    const cards = await Card.find({ imagePath: { $regex: /^\/uploads\// } });
    for (const card of cards) {
      card.imagePath = card.imagePath.replace(/^\/uploads\//, '');
      await card.save();
      console.log(`Updated imagePath for card ${card.name}: ${card.imagePath}`);
    }
    console.log('Image paths updated successfully');
  } catch (err) {
    console.error('Error updating image paths:', err);
  } finally {
    await mongoose.disconnect();
  }
}

updateImagePaths();