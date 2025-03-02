const express = require('express');
const router = express.Router();
const { processOCR } = require('../utils/ocr');
const parser = require('../utils/parser');
const fs = require('fs');
const path = require('path');

router.post('/process-blob', async (req, res) => {
  const { image } = req.files || {}; // Assuming multer middleware for file uploads
  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  try {
    // Generate temporary path for the blob
    const tempPath = path.join('uploads', `temp_${Date.now()}_${image.name}`);
    
    // Process the image with OCR
    const data = await processOCR(image.data, tempPath);

    console.log('Parsed fields (ProcessBlob):', parser.parseFields(data)); // Debug parsed fields

    res.json(parser.parseFields(data));
  } catch (err) {
    console.error('Process-blob error:', err);
    res.status(500).json({ error: 'Process-blob error: ' + err.message });
  }
});

module.exports = router;