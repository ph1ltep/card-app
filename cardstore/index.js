const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const nlp = require('compromise');
const Card = require('./models/Card');
const app = express();
const port = 5000;

// Connect to MongoDB
mongoose.connect('mongodb://mdb.fthome.org/cardstore', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB at mdb.fthome.org'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// /upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
  const { text } = req.body; // OCR text from frontend
  const imagePath = req.file.path;

  // Basic NLP parsing with compromise
  const doc = nlp(text);
  const name = doc.people().text() || text.split('\n')[0]; // First line as fallback
  const email = doc.match('#Email').text() || text.match(/[\w.-]+@[\w.-]+/)?.[0];
  const phone = doc.match('#PhoneNumber').text() || text.match(/\d{3}-\d{3}-\d{4}/)?.[0];
  const company = doc.organizations().text() || '';
  const address = doc.places().text() || '';

  const card = new Card({
    name,
    email,
    phone,
    company,
    address,
    imagePath,
  });

  card.save()
    .then(() => res.json({ message: 'Card saved!', card }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to Cardstore Backend!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});