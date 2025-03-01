const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, index: true },
  title: { type: String, index: true },
  company: { type: String, index: true },
  email: String,
  phone: String,
  address: String,
  website: String,
  imagePath: String, // Path to the saved image
  imageId: { type: String, default: () => nanoid(10) }, // Unique 10-character ID
  savedAt: { type: Date, default: Date.now }, // Timestamp of save
});

module.exports = mongoose.model('Card', cardSchema);