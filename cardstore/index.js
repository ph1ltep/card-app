require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const nlp = require('compromise');
const cors = require('cors');
const Card = require('./models/Card');
const fs = require('fs');
const app = express();
const port = 5000;

app.use(cors({
  origin: 'https://code-server.fthome.org',
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const mongoUser = process.env.MONGO_USER || 'your_username';
const mongoPass = process.env.MONGO_PASS || 'your_password';
console.log('Attempting MongoDB connection with:', { user: mongoUser, pass: mongoPass ? '[hidden]' : 'missing' });
mongoose.connect(`mongodb://${mongoUser}:${mongoPass}@mdb.fthome.org/cardstore`, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  bufferCommands: false,
  maxPoolSize: 10,
  retryWrites: true,
})
  .then(() => console.log('Connected to MongoDB at mdb.fthome.org'))
  .catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('error', (err) => console.error('MongoDB ongoing error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('open', () => console.log('MongoDB connection open'));
mongoose.connection.on('connecting', () => console.log('MongoDB connecting...'));

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

app.post('/upload', upload.single('image'), async (req, res) => {
  console.log('Upload request received:', { body: req.body, file: req.file });
  if (!req.file) {
    console.error('No image uploaded');
    return res.status(400).json({ error: 'No image uploaded' });
  }
  const { text = '' } = req.body;
  const imagePath = req.file.path;

  try {
    console.log('Processing text:', text);
    const doc = nlp(text);
    const name = doc.people().text() || text.split('\n')[0] || 'Unknown';
    const email = doc.match('#Email').text() || text.match(/[\w.-]+@[\w.-]+/)?.[0] || '';
    const phone = doc.match('#PhoneNumber').text() || text.match(/\d{3}-\d{3}-\d{4}/)?.[0] || '';
    const company = doc.organizations().text() || '';
    const address = doc.places().text() || '';

    console.log('Saving card:', { name, email, phone, company, address, imagePath });
    const card = new Card({ name, email, phone, company, address, imagePath });

    await card.save();
    console.log('Card saved successfully');
    res.json({ message: 'Card saved!', card });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload error: ' + err.message });
  }
});

app.get('/search', async (req, res) => {
  const { query } = req.query;
  console.log('Search request received:', { query });
  try {
    const cards = await Card.find({
      $or: [
        { name: new RegExp(query, 'i') },
        { email: new RegExp(query, 'i') },
        { company: new RegExp(query, 'i') },
      ],
    });
    console.log('Search results:', cards.length);
    res.json(cards);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to Cardstore Backend!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});