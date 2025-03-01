const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  company: String,
  address: String,
  title: String,
  website: String,
  imagePath: String,
});

module.exports = mongoose.model('Card', cardSchema);