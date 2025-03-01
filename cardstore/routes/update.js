const express = require('express');
const router = express.Router();
const Card = require('../models/Card');

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  try {
    // Update only the fields provided, retaining imagePath, imageId, and savedAt
    const updatedCard = await Card.findByIdAndUpdate(
      id,
      { $set: fields },
      { new: true, runValidators: true }
    ).lean();
    if (!updatedCard) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(updatedCard);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update error: ' + err.message });
  }
});

module.exports = router;