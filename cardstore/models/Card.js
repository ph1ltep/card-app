const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, index: true },
  title: { type: String, index: true },
  company: { type: String, index: true },
  email: String,
  phone: String,
  address: String,
  website: String,
  imagePath: String,
});

module.exports = mongoose.model('Card', cardSchema);