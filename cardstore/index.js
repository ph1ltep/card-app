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

// Load environment variables with fallbacks
const MONGO_USER = process.env.MONGO_USER || 'default-user';
const MONGO_PASS = process.env.MONGO_PASS || 'default-password';
const MONGO_URL = process.env.MONGO_URL || 'localhost:27017';
const DATABASE = 'cardstore';

// Construct MongoDB connection string with authentication
const MONGODB_URI = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_URL}/${DATABASE}?authSource=admin`;

// Async connect to MongoDB with authentication
(async () => {
  try {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true, 
      serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
    });
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if connection fails
  }
})();

function parseFields(tesseractData) {
  // Handle undefined or invalid input
  if (!tesseractData || typeof tesseractData !== 'object') {
    console.warn('Invalid Tesseract data to parseFields:', tesseractData);
    return { name: '', email: '', phone: '', company: '', address: '', title: '', website: '' };
  }

  const wordTokenizer = new natural.WordTokenizer();
  const sentenceTokenizer = new natural.SentenceTokenizer();

  // Fallback to text if blocks are null
  let allText = tesseractData.text || '';
  const lines = allText.split('\n').map(line => line.trim()).filter(line => line && line.length > 0);

  let name = '';
  let email = '';
  let phone = '';
  let company = '';
  let address = '';
  let title = '';
  let website = '';

  try {
    // Clean noise from lines
    const cleanLine = (line) => line.replace(/^\d+\s*|BIEL RE|^pg\s*|^\#7\s*/i, '').trim();
    const cleanLines = lines.map(cleanLine);

    // Use NLP to identify entities
    const people = [];
    const organizations = [];
    const possibleTitles = [];

    // Analyze each line for entities using NLP
    cleanLines.forEach(line => {
      const tokensInLine = wordTokenizer.tokenize(line);
      // Identify proper nouns (potential names)
      if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/.test(line)) {
        people.push(line);
      }
      // Identify organizations (capitalized, multi-word) using NLP
      if (natural.NGrams.bigrams(tokensInLine).some(bigram => 
        bigram.every(token => /^[A-Z][a-z]+/.test(token)) && !/[\w.-]+@[\w.-]+/i.test(line)
      )) {
        organizations.push(line);
      }
      // Identify potential titles (job-related keywords) using NLP
      if (/Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(line)) {
        possibleTitles.push(line);
      }
    });

    // Context-aware assignment with NLP, handling line breaks
    // Name: First proper noun or capitalized line at the top
    if (people.length > 0) {
      name = people[0]; // Take the first person entity as the name
      // Check subsequent lines for title or company
      const nameIndex = cleanLines.indexOf(name);
      if (nameIndex + 1 < cleanLines.length) {
        const nextLine = cleanLines[nameIndex + 1];
        if (/Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(nextLine)) {
          title = nextLine; // Assign title if it follows name
        } else if (natural.NGrams.bigrams(wordTokenizer.tokenize(nextLine)).some(bigram => 
          bigram.every(token => /^[A-Z][a-z]+/.test(token)) && !/[\w.-]+@[\w.-]+/i.test(nextLine)
        )) {
          company = nextLine; // Assign company if capitalized and not email
        }
      }
    }

    // Title: Use remaining title lines, ensuring not confused with names or companies
    if (!title && possibleTitles.length > 0) {
      title = possibleTitles[0]; // Take the first title if not already set
    }

    // Company: Use organizations not matching other fields, prioritize after name/title
    if (!company && organizations.length > 0) {
      company = organizations.find(org => !name.includes(org) && !title.includes(org) && !email.includes(org) && !phone.includes(org) && !address.includes(org) && !website.includes(org)) || '';
    }

    // Email, Phone, Website: Use NLP with minimal regex fallback, handling line breaks
    cleanLines.forEach(line => {
      // Email: Look for @ symbol and domain patterns using NLP
      if (line.includes('@') && /[\w.-]+@[\w.-]+\.[a-z]{2,}/.test(line)) {
        email = line;
      }
      // Phone: Look for number patterns with country codes or separators using NLP
      if (/\+?\d{1,4}\s?-?\d{3,4}\s?-?\d{3,4}/.test(line)) {
        phone = line;
      }
      // Website: Look for domain patterns, preferring standalone lines
      if (/(www\.[^\s]+|[^\s]+\.(com|co|org|net))/i.test(line) && !line.includes('@')) {
        website = line;
      }
    });

    // Address: Lines with numbers or address keywords, excluding phones, emails, and websites
    const addressLines = cleanLines.filter(line => 
      (/\d/.test(line) || /Building|Way|Street|Avenue|Road|Boulevard|Lane|Singapore|Melbourne|VIC/.test(line)) && 
      !phone.includes(line) && !email.includes(line) && !website.includes(line)
    );
    address = addressLines.length > 0 ? addressLines.join(', ') : '';

    // Fallbacks using NLP, minimizing regex
    if (!name && cleanLines.length > 0) {
      name = cleanLines.find(line => /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/.test(line)) || cleanLines[0]; // NLP-preferred name
    }
    if (!title && cleanLines.some(line => /Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(line))) {
      title = cleanLines.find(line => /Chief|Head|Officer|Director|Development|Contracts|Procurement/i.test(line));
    }
    if (!company && cleanLines.some(line => /^[A-Z][a-z]+/.test(line) && !isField(line, [name, email, phone, address, title, website]))) {
      company = cleanLines.find(line => /^[A-Z][a-z]+/.test(line) && !isField(line, [name, email, phone, address, title, website]));
    }
    if (!email && cleanLines.some(line => line.includes('@'))) {
      email = cleanLines.find(line => line.includes('@') && /[\w.-]+@[\w.-]+\.[a-z]{2,}/.test(line)) || '';
    }
    if (!phone && cleanLines.some(line => /\+?\d{1,4}\s?-?\d{3,4}\s?-?\d{3,4}/.test(line))) {
      phone = cleanLines.find(line => /\+?\d{1,4}\s?-?\d{3,4}\s?-?\d{3,4}/.test(line)) || '';
    }
    if (!website && cleanLines.some(line => /(www\.[^\s]+|[^\s]+\.(com|co|org|net))/i.test(line))) {
      website = cleanLines.find(line => /(www\.[^\s]+|[^\s]+\.(com|co|org|net))/i.test(line) && !line.includes('@')) || '';
    }
    if (!address && cleanLines.some(line => /\d/.test(line) && !/\+?\d{1,4}\s?-?\d{3,4}\s?-?\d{3,4}/.test(line))) {
      address = cleanLines.filter(line => /\d/.test(line) && !/\+?\d{1,4}\s?-?\d{3,4}\s?-?\d{3,4}/.test(line)).join(', ');
    }

    // Helper function to check if a line matches any field
    function isField(line, fields) {
      return fields.some(field => field && field.includes(line));
    }

    console.log('Parsed fields:', { name, email, phone, company, address, title, website });
    return { name, email, phone, company, address, title, website };
  } catch (err) {
    console.error('Upload error details:', err.stack || err);
    return { name: '', email: '', phone: '', company: '', address: '', title: '', website: '' };
  }
}

app.post('/process', (req, res) => {
  const { data } = req.body; // Receive raw Tesseract data
  console.log('Received Tesseract data for processing:', JSON.stringify(data, null, 2));
  if (!data) {
    console.warn('No Tesseract data provided in request body');
    return res.status(400).json({ error: 'No Tesseract data provided' });
  }
  try {
    const fields = parseFields(data);
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
    console.log('Card saved successfully to MongoDB');
    res.json({ message: 'Card saved!', card });
  } catch (err) {
    console.error('Upload error details:', err.stack || err);
    res.status(500).json({ error: 'Upload error: ' + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));