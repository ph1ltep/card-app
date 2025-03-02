const express = require('express');
const router = express.Router();
const { processOCR } = require('../utils/ocr');
const parser = require('../utils/parser');

router.post('/', async (req, res) => {
  const { imagePath } = req.body;
  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }

  try {
    const imageUrl = `https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(imagePath)}`;
    
    // Process the image with OCR
    const data = await processOCR(imageUrl);

    console.log('Parsed fields (ProcessImage):', parser.parseFields(data)); // Debug parsed fields

    res.json(parser.parseFields(data));
  } catch (err) {
    console.error('Process-image error:', err);
    res.status(500).json({ error: 'Process-image error: ' + err.message });
  }
});

module.exports = router;