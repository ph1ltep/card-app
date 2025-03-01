import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

const EditCardModal = ({
  card, // Card data for editing, or null for initial upload
  onSave, // Callback for saving updated fields
  onRemove, // Callback for removing the card
  onReScan, // Callback for re-scanning the image
  onClose, // Callback to close the modal
  isOpen, // Flag to control modal visibility
}) => {
  const [fields, setFields] = useState(card || {
    name: '', email: '', phone: '', company: '', address: '', title: '', website: ''
  });
  const [status, setStatus] = useState('Loading...');
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (isOpen && card?.imagePath) {
      // Load existing image for editing
      setImageUrl(`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`);
      setStatus('Editing card...');
    } else if (isOpen && !card) {
      // Handle initial upload (no image yet, handled by parent)
      setStatus('Ready to edit');
    }
  }, [isOpen, card]);

  const handleFieldChange = (field, value) => {
    setFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setStatus('Saving...');
    try {
      await onSave(fields);
      setStatus('Saved successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Save error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to delete this card and its image?')) {
      setStatus('Removing...');
      try {
        await onRemove();
        setStatus('Card removed successfully!');
        setTimeout(() => onClose(), 1500);
      } catch (err) {
        console.error('Remove error:', err);
        setStatus(`Error: ${err.message}`);
      }
    }
  };

  const handleReScan = async () => {
    if (!card?.imagePath) {
      setStatus('No image available for re-scanning');
      return;
    }
    setStatus('Re-scanning image...');
    try {
      const response = await fetch(`https://code-server.fthome.org/proxy/5000/process-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: card.imagePath }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const newFields = await response.json();
      setFields(newFields);
      setStatus('Re-scanned successfully - Ready to edit');
    } catch (err) {
      console.error('Re-scan error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-4xl w-full mx-auto bg-white shadow-md rounded-lg p-6">
        {imageUrl && (
          <img src={imageUrl} alt={`${fields.name || 'Card'} image`} className="w-full h-auto rounded-md mb-4" />
        )}
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-700">Detected Fields</h3>
          {['name', 'email', 'phone', 'company', 'address', 'title', 'website'].map(field => (
            <div key={field} className="mt-2">
              <label className="block text-sm font-medium text-gray-600 capitalize">{field}</label>
              <input
                type="text"
                value={fields[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${field}`}
              />
            </div>
          ))}
          <div className="mt-4 flex justify-end gap-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleRemove}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
            <button
              onClick={handleReScan}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Re-scan
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
          {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;