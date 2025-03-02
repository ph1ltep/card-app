import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Modal from './Modal'; // Adjust path as needed

const AddCardModal = ({
  isOpen,
  croppedBlob, // Blob of the cropped, transformed, 21:12 business card
  croppedImage, // URL of the cropped, transformed, 21:12 business card
  onClose, // Callback to close and reset
  onReset, // Callback to reset state to Step 1
}) => {
  const [fields, setFields] = useState({
    name: '', email: '', phone: '', company: '', address: '', title: '', website: ''
  });
  const [status, setStatus] = useState('Processing image...');
  const [imageUrl, setImageUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageUrl(croppedImage || null);
      if (croppedBlob) {
        performOCR(croppedBlob);
      } else {
        setStatus('Image not loaded or invalid');
      }
    }
  }, [isOpen, croppedBlob, croppedImage]);

  const performOCR = async (blob) => {
    try {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => console.log('Tesseract (AddCard):', m),
      });

      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_create_blocks: true,
        tessedit_create_lines: true,
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@.-_/# +',
      });

      const { data } = await worker.recognize(blob);
      await worker.terminate();

      if (!data.text || data.text.trim() === '') {
        throw new Error('No text detected from OCR');
      }

      console.log('OCR Result (AddCard):', data.text);
      await processNLP(data.text);
    } catch (err) {
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
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const newFields = await response.json();
      console.log('Received fields from /process:', newFields);
      setFields(newFields);
      setStatus('Ready to edit');
    } catch (err) {
      setStatus(`Error processing text: ${err.message}`);
    }
  };

  const handleFieldChange = (field, value) => {
    setFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
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
      setTimeout(() => {
        onReset(); // Reset to Step 1 after success
        onClose(); // Close the modal
      }, 1500);
    } catch (err) {
      setStatus(`Error saving card: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
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
        { text: 'Save', onClick: handleSave, className: 'blue-600', disabled: isSaving },
        { text: 'Cancel', onClick: handleCancel, className: 'gray-600' },
      ]}
      status={status}
    />
  );
};

export default AddCardModal;