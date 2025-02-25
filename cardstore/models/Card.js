const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  company: String,
  address: String,
  imagePath: String, // Path to stored image
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Card', cardSchema);