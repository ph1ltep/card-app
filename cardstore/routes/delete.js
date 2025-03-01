const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const fs = require('fs');
const path = require('path');

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Delete the image file from uploads/
    const imagePath = path.join('uploads', card.imagePath);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Deleted image: ${imagePath}`);
    }

    // Delete the card from MongoDB
    await Card.findByIdAndDelete(id);
    res.json({ message: 'Card and image deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete error: ' + err.message });
  }
});

module.exports = router;