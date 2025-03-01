require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./utils/db'); // MongoDB connection
const processRoute = require('./routes/process');
const uploadRoute = require('./routes/upload');
const searchRoute = require('./routes/search');
const updateRoute = require('./routes/update'); // Import update route
const deleteRoute = require('./routes/delete'); // Ensure delete route is imported
const parser = require('./utils/parser');

const app = express();

// Middleware
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB before starting the server
db.connectDB().catch(err => {
  console.error('Failed to connect to MongoDB, exiting:', err);
  process.exit(1);
});

// Mount routes
app.use('/process', processRoute);
app.use('/upload', uploadRoute);
app.use('/search', searchRoute);
app.use('/update', updateRoute); // Mount update route
app.use('/delete', deleteRoute); // Mount delete route

// New endpoint for re-scanning (process existing image)
app.post('/process-image', async (req, res) => {
  const { imagePath } = req.body;
  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }

  try {
    const imageUrl = `https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(imagePath)}`;
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const blob = await response.blob();

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => console.log('Tesseract:', m),
    });

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_create_blocks: true,
      tessedit_create_lines: true,
      tessedit_char_whitelist: '',
    });

    const { data } = await worker.recognize(blob);
    await worker.terminate();

    if (!data.text) {
      throw new Error('No text detected from OCR');
    }

    const fields = parser.parseFields(data);
    res.json(fields);
  } catch (err) {
    console.error('Process-image error:', err);
    res.status(500).json({ error: 'Process-image error: ' + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));