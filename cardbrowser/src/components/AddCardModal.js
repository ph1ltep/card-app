import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Modal from './Modal'; // Adjust path as needed

const AddCardModal = ({
  croppedBlob, // Blob of the cropped image for new card creation
  croppedImage, // URL of the cropped image (optional)
  onSave, // Callback for saving the new card
  onCancel, // Callback to cancel and close the modal
  isOpen, // Flag to control modal visibility
}) => {
  const [fields, setFields] = useState({
    name: '', email: '', phone: '', company: '', address: '', title: '', website: ''
  });
  const [status, setStatus] = useState('Processing image...');
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Use croppedBlob to set image URL and perform frontend OCR, then backend NLP
      if (croppedBlob) {
        const url = URL.createObjectURL(croppedBlob);
        setImageUrl(url);
        performOCR(croppedBlob); // Process Blob via Tesseract in frontend
        return () => URL.revokeObjectURL(url); // Clean up to prevent memory leaks
      } else if (croppedImage) {
        setImageUrl(croppedImage);
        performOCRFromURL(croppedImage); // Process URL via Tesseract in frontend
      }
    }
  }, [isOpen, croppedBlob, croppedImage]);

  const performOCR = async (blob) => {
    try {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => console.log('Tesseract (AddCard):', m), // Log Tesseract progress
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

      console.log('OCR Result (AddCard):', data.text); // Log OCR result
      await processNLP(data.text); // Send to backend for NLP parsing
    } catch (err) {
      console.error('OCR error (AddCard):', err);
      setStatus(`Error processing image: ${err.message}`);
    }
  };

  const performOCRFromURL = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const blob = await response.blob();
      await performOCR(blob); // Reuse the same OCR logic
    } catch (err) {
      console.error('OCR error from URL (AddCard):', err);
      setStatus(`Error processing image: ${err.message}`);
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
      setStatus('Ready to edit');
    } catch (err) {
      console.error('NLP error (AddCard):', err);
      setStatus(`Error processing text: ${err.message}`);
    }
  };

  const handleFieldChange = (field, value) => {
    setFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setStatus('Saving...');
    try {
      const formData = new FormData();
      formData.append('image', croppedBlob, 'cropped.png');
      formData.append('fields', JSON.stringify(fields));
      const response = await fetch('https://code-server.fthome.org/proxy/5000/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      setStatus(`Saved: ${result.message}`);
      setTimeout(() => onCancel(), 1500); // Close modal after saving
    } catch (err) {
      console.error('Save error:', err);
      setStatus(`Error saving card: ${err.message}`);
    }
  };

  const handleCancel = () => {
    onCancel();
    // Clean up any object URL to prevent memory leaks
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="New Card"
      imageSrc={imageUrl}
      fields={fields}
      onFieldChange={handleFieldChange}
      buttons={[
        { text: 'Save', onClick: handleSave, className: 'blue-600' },
        { text: 'Cancel', onClick: handleCancel, className: 'gray-600' },
      ]}
      status={status}
    />
  );
};

export default AddCardModal;