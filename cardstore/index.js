require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const db = require('./utils/db'); // MongoDB connection
const processRoute = require('./routes/process'); // Keep process route
const uploadRoute = require('./routes/upload');
const searchRoute = require('./routes/search');
const updateRoute = require('./routes/update');
const deleteRoute = require('./routes/delete');
// Remove processImageRoute and processBlobRoute imports
const parser = require('./utils/parser');

const app = express();

// Middleware
app.use(cors({ credentials: true, origin: 'http://localhost:3000' })); // Adjust for proxy if needed
app.use(express.json());

// Multer middleware for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB before starting the server
db.connectDB().catch(err => {
  console.error('Failed to connect to MongoDB, exiting:', err);
  process.exit(1);
});

// Mount routes
app.use('/process', processRoute); // Keep for Tesseract data.text processing
app.use('/upload', uploadRoute);
app.use('/search', searchRoute);
app.use('/update', updateRoute);
app.use('/delete', deleteRoute);
// Remove app.use('/process-image', processImageRoute);
// Remove app.use('/process-blob', upload.single('image'), processBlobRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));