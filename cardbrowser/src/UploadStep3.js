import React, { useEffect } from 'react';
import Tesseract from 'tesseract.js';

const UploadStep3 = ({
  croppedImage,
  detectedFields,
  setDetectedFields,
  croppedBlob,
  setStep,
  setStatus,
  resetState,
}) => {
  useEffect(() => {
    if (croppedBlob) {
      const detectText = async () => {
        try {
          console.log('Starting Tesseract recognition...');
          console.log('Blob type:', croppedBlob.type);
          const worker = await Tesseract.createWorker('eng');
          await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO, // General text detection
          });
          const { data } = await worker.recognize(croppedBlob);
          await worker.terminate();

          console.log('Tesseract data:', data);

          const textLines = (data.text || '').split('\n').filter(line => line.trim().length > 0);
          const fields = detectFields(textLines);
          console.log('Detected fields:', fields);
          setDetectedFields(fields);
          setStatus('Text detected - Ready for refinement');
        } catch (err) {
          console.error('OCR error details:', err.stack || err);
          setStatus(`OCR error: ${err.message}`);
        }
      };
      detectText();
    }
  }, [croppedBlob, setDetectedFields, setStatus]);

  const detectFields = (textLines) => {
    const fields = {
      name: '',
      title: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      website: '',
    };

    let usedLines = new Set();

    for (let line of textLines) {
      if (usedLines.has(line)) continue;

      // Name: First capitalized line (assume person name)
      if (!fields.name && /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/.test(line)) {
        fields.name = line.trim();
        usedLines.add(line);
      }
      // Title: Next line with job keywords
      else if (!fields.title && !fields.name && [
        'Head', 'Chief', 'Officer', 'Manager', 'Director', 'Executive', 'President', 'VP', 'Senior', 'Analyst', 'Contracts', 'Procurement'
      ].some(kw => line.includes(kw))) {
        fields.title = line.trim();
        usedLines.add(line);
      }
      // Phone: Numeric pattern
      else if (!fields.phone && /^(\+\d{1,3}\s?\d{3,4}\s?\d{3,4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})$/.test(line)) {
        fields.phone = line.trim();
        usedLines.add(line);
      }
      // Company: Line with org keywords
      else if (!fields.company && [
        'Inc', 'Ltd', 'Corp', 'LLC', 'Pte', 'Co'
      ].some(kw => line.includes(kw)) || /^[A-Z][a-z]+/.test(line)) {
        fields.company = line.trim();
        usedLines.add(line);
      }
      // Address: Multi-line with numbers or places
      else if (!fields.address && (/\d/.test(line) || [
        'St', 'Street', 'Ave', 'Avenue', 'Rd', 'Road', 'Blvd', 'Boulevard', 'Ln', 'Lane'
      ].some(st => line.includes(st)))) {
        fields.address = fields.address ? `${fields.address}, ${line.trim()}` : line.trim();
        usedLines.add(line);
      }
      // Email: Pattern match
      else if (!fields.email && /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(line)) {
        fields.email = line.trim();
        usedLines.add(line);
      }
      // Website: URL pattern
      else if (!fields.website && /www\.[^\s]+\.[a-z]{2,}/i.test(line)) {
        fields.website = line.trim();
        usedLines.add(line);
      }
    }

    // Fallbacks if no matches
    if (!fields.name && textLines.length > 0) fields.name = textLines[0].trim();
    if (!fields.title && textLines.some(l => ['Head', 'Chief', 'Officer'].some(kw => l.includes(kw)))) fields.title = textLines.find(l => ['Head', 'Chief', 'Officer'].some(kw => l.includes(kw))).trim();
    if (!fields.email && textLines.some(l => /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(l))) fields.email = textLines.find(l => /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(l)).trim();
    if (!fields.phone && textLines.some(l => /^(\+\d{1,3}\s?\d{3,4}\s?\d{3,4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})$/.test(l))) fields.phone = textLines.find(l => /^(\+\d{1,3}\s?\d{3,4}\s?\d{3,4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})$/.test(l)).trim();
    if (!fields.company && textLines.some(l => ['Inc', 'Ltd', 'Corp'].some(kw => l.includes(kw)))) fields.company = textLines.find(l => ['Inc', 'Ltd', 'Corp'].some(kw => l.includes(kw))).trim();
    if (!fields.address && textLines.some(l => /\d/.test(l))) fields.address = textLines.filter(l => /\d/.test(l)).join(', ');
    if (!fields.website && textLines.some(l => /www\.[^\s]+\.[a-z]{2,}/i.test(l))) fields.website = textLines.find(l => /www\.[^\s]+\.[a-z]{2,}/i.test(l)).trim();

    return fields;
  };

  const handleFieldChange = (field, value) => {
    setDetectedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setStatus('Saving...');
    if (!croppedBlob) {
      setStatus('No cropped image available');
      return;
    }
    const formData = new FormData();
    formData.append('image', croppedBlob, 'cropped.png');
    formData.append('text', JSON.stringify(detectedFields));

    try {
      const response = await fetch('/proxy/5000/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const result = await response.json();
      setStatus(`Saved: ${result.message}`);
      setTimeout(() => {
        resetState();
      }, 1500);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <>
      <img src={croppedImage} alt="Cropped" className="max-w-full h-auto rounded-md mt-2 border" />
      <div className="mt-4">
        <h3 className="text-lg font-medium text-gray-700">Detected Fields</h3>
        {['name', 'title', 'email', 'phone', 'company', 'address', 'website'].map(field => (
          <div key={field} className="mt-2">
            <label className="block text-sm font-medium text-gray-600 capitalize">{field}</label>
            <input
              type="text"
              value={detectedFields[field] || ''} // Ensure controlled input
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${field}`}
            />
          </div>
        ))}
        <button
          onClick={handleSave}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
      </div>
    </>
  );
};

export default UploadStep3;