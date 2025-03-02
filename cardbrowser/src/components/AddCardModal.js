import React, { useState, useEffect } from 'react';
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
      // Use croppedBlob to set image URL and perform backend OCR/NLP
      if (croppedBlob) {
        const url = URL.createObjectURL(croppedBlob);
        setImageUrl(url);
        performOCR(croppedBlob); // Process Blob via backend
        return () => URL.revokeObjectURL(url); // Clean up to prevent memory leaks
      } else if (croppedImage) {
        setImageUrl(croppedImage);
        performOCRFromURL(croppedImage); // Process URL via backend
      }
    }
  }, [isOpen, croppedBlob, croppedImage]);

  const performOCR = async (blob) => {
    try {
      console.log('Cookies being sent:', document.cookie); // Debug cookies
      console.log('Sending croppedBlob to /process-blob:', blob); // Debug blob
      const formData = new FormData();
      formData.append('image', blob, 'cropped.png');
      console.log('FormData Content-Type:', formData.get('image')); // Debug FormData
      const response = await fetch('https://code-server.fthome.org/proxy/5000/process-blob', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      const newFields = await response.json();
      console.log('Received fields from /process-blob:', newFields); // Debug response
      setFields(newFields);
      setStatus('Ready to edit');
    } catch (err) {
      console.error('OCR/NLP error (AddCard):', err);
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
      console.error('OCR/NLP error from URL (AddCard):', err);
      setStatus(`Error processing image: ${err.message}`);
    }
  };

  const handleFieldChange = (field, value) => {
    setFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setStatus('Saving...');
    try {
      await onSave(fields);
      setStatus('Saved successfully!');
      setTimeout(() => onCancel(), 1500);
    } catch (err) {
      console.error('Save error:', err);
      setStatus(`Error: ${err.message}`);
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
        { text: 'Cancel', onClick: handleCancel, className: 'gray-500' },
      ]}
      status={status}
    />
  );
};

export default AddCardModal;