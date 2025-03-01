const express = require('express');
const router = express.Router();
const Card = require('../models/Card');

router.get('/', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Convert query to regex for wildcard support (* or % -> .* in regex)
    const searchRegex = new RegExp(query.replace(/[*%]/g, '.*'), 'i'); // Case-insensitive, wildcards (* or %) match any characters

    // Search across name, title, and company fields
    const cards = await Card.find({
      $or: [
        { name: searchRegex },
        { title: searchRegex },
        { company: searchRegex },
      ],
    }).lean(); // Use .lean() for faster queries without Mongoose documents

    res.json(cards);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search error: ' + err.message });
  }
});

module.exports = router;