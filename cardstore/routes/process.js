const express = require('express');
const router = express.Router();
const parser = require('../utils/parser');

router.post('/', (req, res) => {
  const { data } = req.body;
  console.log('Received Tesseract data for processing:', JSON.stringify(data, null, 2));
  if (!data || !data.text) {
    console.warn('No valid Tesseract data provided in request body');
    return res.status(400).json({ error: 'No valid Tesseract data provided' });
  }
  try {
    const fields = parser.parseFields(data); // Use parser.js for NLP
    console.log('Parsed fields (Process):', fields); // Debug parsed fields
    res.json(fields);
  } catch (err) {
    console.error('Process error:', err);
    res.status(500).json({ error: 'Processing error: ' + err.message });
  }
});

module.exports = router;