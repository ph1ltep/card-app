require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const natural = require('natural');
const Card = require('./models/Card');

const app = express();
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cardstore', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).catch(err => console.error('MongoDB connection error:', err));

function parseFields(text) {
  // Handle undefined or non-string input
  if (!text || typeof text !== 'string') {
    console.warn('Invalid input to parseFields:', text);
    return { name: '', email: '', phone: '', company: '', address: '', title: '', website: '' };
  }

  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text);
  const lines = text.split('\n').map(line => line.trim()).filter(line => line && line.length > 0);

  let name = '';
  let email = '';
  let phone = '';
  let company = '';
  let address = '';
  let title = '';
  let website = '';

  try {
    // Context-aware parsing for flexible field order
    for (const [i, line] of lines.entries()) {
      const isCapitalized = /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/.test(line);
      const hasChinese = /[\u4E00-\u9FFF]/.test(line);
      const hasNumber = /\d/.test(line);
      const isEmail = /[\w.-]+@[\w.-]+/i.test(line);
      const isPhone = /\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i.test(line);
      const isWebsite = /(www\.[^\s]+|[^\s]+\.com|[^\s]+\.co)/i.test(line);
      const isAddress = /Building|Way|Street|Avenue|Road|Boulevard|Lane|Singapore|Melbourne|VIC/.test(line);
      const isTitle = /Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(line);
      const isNoise = /^\d{1}$|BIEL RE|^pg\s*|^\#7\s*/i.test(line); // Filter noise like "5," "BIEL RE," "pg," "#7"

      // Skip noise lines unless they fit a field pattern
      if (isNoise && !isPhone && !isAddress) continue;

      if (!name && (isCapitalized || hasChinese) && !isTitle) {
        // Name: Look for capitalized English or Chinese names, exclude titles
        name = line.replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim(); // Clean noise
        // Check next line for multi-part names or titles
        if (i + 1 < lines.length) {
          if (/^[A-Z][a-z]+/.test(lines[i + 1]) && !isTitle) {
            name += ` ${lines[i + 1].replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim()}`; // Combine with next capitalized name
          } else if (isTitle) {
            title = lines[i + 1].replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim(); // Assign title if it follows name
          }
        }
      } else if (isEmail) {
        email = line;
      } else if (isPhone) {
        phone = line;
      } else if (isWebsite) {
        website = line;
      } else if (isAddress || hasNumber) {
        // Address: Aggregate lines with address keywords or numbers, excluding phones and noise
        if (!phone || !line.match(/\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i)) {
          address = address ? `${address}, ${line.replace(/BIEL RE|^pg\s*|^\#7\s*/i, '').trim()}` : line.replace(/BIEL RE|^pg\s*|^\#7\s*/i, '').trim();
        }
      } else if (isTitle && !title) {
        // Title: Look for job-related keywords, ensuring it’s not already set
        title = line.replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim(); // Clean noise
        // Check next line for multi-part titles
        if (i + 1 < lines.length && isTitle) {
          title += ` ${lines[i + 1].replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim()}`;
        }
      } else if (!company && isCapitalized && !isEmail && !isPhone && !isAddress && !isWebsite && !isTitle) {
        // Company: Look for capitalized lines after name/title, excluding other fields
        company = line.replace(/^pg\s*|^\#7\s*/i, '').trim(); // Clean "pg" and "#7" noise
      }
    }

    // Fallbacks for robustness
    if (!name && lines.length > 0) {
      name = lines[0].replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim(); // Fallback to first line, clean noise
    }
    if (!email && text.match(/[\w.-]+@[\w.-]+/i)) {
      email = text.match(/[\w.-]+@[\w.-]+/i)[0];
    }
    if (!phone && text.match(/\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i)) {
      phone = text.match(/\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i)[0];
    }
    if (!company && lines.some(line => /^[A-Z][a-z]+/.test(line) && !isEmail(line) && !isPhone(line) && !isAddress(line) && !isWebsite(line) && !isTitle(line))) {
      company = lines.find(line => /^[A-Z][a-z]+/.test(line) && !isEmail(line) && !isPhone(line) && !isAddress(line) && !isWebsite(line) && !isTitle(line)).replace(/^pg\s*|^\#7\s*/i, '').trim();
    }
    if (!address && lines.some(line => /\d/.test(line) && !/\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i.test(line))) {
      address = lines.filter(line => /\d/.test(line) && !/\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i.test(line)).join(', ').replace(/BIEL RE|^pg\s*|^\#7\s*/i, '').trim();
    }
    if (!website && text.match(/(www\.[^\s]+|[^\s]+\.com|[^\s]+\.co)/i)) {
      website = text.match(/(www\.[^\s]+|[^\s]+\.com|[^\s]+\.co)/i)[0];
    }
    if (!title && lines.some(line => /Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(line))) {
      title = lines.find(line => /Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(line)).replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim();
    }

    // Helper function to check if a line matches a field pattern
    function isEmail(line) { return /[\w.-]+@[\w.-]+/i.test(line); }
    function isPhone(line) { return /\+?\d{1,4}\s?\d{3,4}\s?\d{3,4}/i.test(line); }

    console.log('Parsed fields:', { name, email, phone, company, address, title, website });
    return { name, email, phone, company, address, title, website };
  } catch (err) {
    console.error('Error in parseFields:', err);
    return { name: '', email: '', phone: '', company: '', address: '', title: '', website: '' };
  }
}

app.post('/process', (req, res) => {
  const { text } = req.body;
  console.log('Received text for processing:', text);
  if (!text) {
    console.warn('No text provided in request body');
    return res.status(400).json({ error: 'No text provided' });
  }
  try {
    const fields = parseFields(text);
    res.json(fields);
  } catch (err) {
    console.error('Process error:', err);
    res.status(500).json({ error: 'Processing error: ' + err.message });
  }
});

app.post('/upload', upload.single('image'), async (req, res) => {
  console.log('Upload request received:', { body: req.body, file: req.file });
  if (!req.file) {
    console.error('No image uploaded');
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const fields = JSON.parse(req.body.fields || '{}');
  const imagePath = req.file.path;

  try {
    const cardData = { ...fields, imagePath };
    console.log('Saving card:', cardData);
    const card = new Card(cardData);
    await card.save();
    console.log('Card saved successfully');
    res.json({ message: 'Card saved!', card });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload error: ' + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));