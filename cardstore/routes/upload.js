const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const Card = require('../models/Card');

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('image'), async (req, res) => {
  console.log('Upload request received:', { body: req.body, file: req.file });
  if (!req.file) {
    console.error('No image uploaded');
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const fields = JSON.parse(req.body.fields || '{}');

  // Clean and sanitize fields for filename
  const company = (fields.company || '').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '');
  const name = (fields.name || '').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '');
  const fileExtension = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
  const generatedId = nanoid(10); // Generate a 10-character unique ID
  const filename = `${company}_${name}_${generatedId}.${fileExtension}`.toLowerCase();
  const imagePath = filename; // Store only the filename, not /uploads/

  // Move the uploaded file to the new filename
  const oldPath = req.file.path;
  const newPath = path.join('uploads', filename);

  try {
    fs.renameSync(oldPath, newPath);
  } catch (err) {
    console.error('Error renaming file:', err);
    return res.status(500).json({ error: 'Failed to save image: ' + err.message });
  }

  // Prepare card data with imageId and savedAt
  const cardData = {
    ...fields,
    imagePath: imagePath, // Store only the filename
    imageId: generatedId,
    savedAt: new Date(),
  };
  console.log('Saving card:', cardData);

  try {
    const card = new Card(cardData);
    await card.save();
    console.log('Card saved successfully to MongoDB');
    res.json({ message: 'Card saved!', card });
  } catch (err) {
    console.error('Upload error details:', err.stack || err);
    // Clean up the file if save fails
    fs.unlinkSync(newPath);
    res.status(500).json({ error: 'Upload error: ' + err.message });
  }
});

module.exports = router;