import React, { useState, useEffect } from 'react';
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
      // Load existing image for editing, but don’t run OCR/NLP
      setImageUrl(`https://code-server.fthome.org/proxy/5000/uploads/${encodeURIComponent(card.imagePath)}`);
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
      console.error('Re-scan error (EditCard):', err);
      setStatus(`Error re-scanning image: ${err.message}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Card"
      imageSrc={imageUrl}
      fields={fields}
      onFieldChange={handleFieldChange}
      buttons={[
        { text: 'Save', onClick: handleSave, className: 'blue-600' },
        { text: 'Remove', onClick: handleRemove, className: 'red-600' },
        { text: 'Re-scan', onClick: handleReScan, className: 'green-600' },
        { text: 'Close', onClick: onClose, className: 'gray-500' },
      ]}
      status={status}
    />
  );
};

export default EditCardModal;