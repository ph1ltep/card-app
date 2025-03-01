const natural = require('natural');

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


module.exports = { parseFields };