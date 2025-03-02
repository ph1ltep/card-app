import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Modal from './Modal'; // Adjust path as needed

const EditCardModal = ({
  card, // Card data for editing (required)
  onSave, // Callback for saving updated fields
  onRemove, // Callback for removing the card
  onReScan, // Callback for re-scanning the image
  onClose, // Callback to close the modal
  isOpen, // Flag to control modal visibility
}) => {
  const [fields, setFields] = useState(card || {
    name: '', email: '', phone: '', company: '', address: '', title: '', website: ''
  });
  const [status, setStatus] = useState('Editing card...');
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (isOpen && card?.imagePath) {
      // Attempt to load the image and handle errors
      const loadImage = async () => {
        try {
          const response = await fetch(`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`);
          if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} for ${card.imagePath}`);
            setImageUrl(`${getPlaceholderUrl()}placeholder_card.png`); // Use placeholder on failure
            return;
          }
          setImageUrl(`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`);
        } catch (err) {
          console.error('Image load error:', err);
          setImageUrl(`${getPlaceholderUrl()}placeholder_card.png`); // Use placeholder on error
        }
      };
      loadImage();
    } else {
      setImageUrl(null); // Reset if modal closes
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
      const response = await fetch(`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const blob = await response.blob();

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => console.log('Tesseract (EditCard):', m), // Log Tesseract progress
      });

      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_create_blocks: true,
        tessedit_create_lines: true,
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@.-_/# +', // Matches parser expectations
      });

      const { data } = await worker.recognize(blob);
      await worker.terminate();

      if (!data.text || data.text.trim() === '') {
        throw new Error('No text detected from OCR');
      }

      console.log('OCR Result (EditCard):', data.text); // Log OCR result
      await processNLP(data.text); // Send to backend for NLP parsing
    } catch (err) {
      console.error('Re-scan OCR error (EditCard):', err);
      setStatus(`Error re-scanning image: ${err.message}`);
    }
  };

  const processNLP = async (text) => {
    try {
      const response = await fetch('https://code-server.fthome.org/proxy/5000/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { text } }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
      const newFields = await response.json();
      console.log('Received fields from /process:', newFields); // Debug response
      setFields(newFields);
      setStatus('Re-scanned successfully - Ready to edit');
    } catch (err) {
      console.error('NLP error (EditCard):', err);
      setStatus(`Error processing text: ${err.message}`);
    }
  };

  // Ensure PUBLIC_URL has a trailing slash for consistency
  const getPlaceholderUrl = () => {
    const publicUrl = process.env.PUBLIC_URL || '/';
    return publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Card"
      imageSrc={imageUrl} // Use imageUrl directly, now it includes placeholder if needed
      fields={fields}
      onFieldChange={handleFieldChange}
      buttons={[
        { text: 'Save', onClick: handleSave, className: 'blue-600' },
        { text: 'Remove', onClick: handleRemove, className: 'red-600' },
        { text: 'Re-scan', onClick: handleReScan, className: 'green-600' },
        { text: 'Close', onClick: onClose, className: 'gray-600' },
      ]}
      status={status}
    />
    // Removed the children img element, as imageSrc now handles it
  );
};

export default EditCardModal;