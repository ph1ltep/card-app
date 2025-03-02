import React, { useEffect, useState } from 'react'; // Confirmed React, useEffect, useState are imported
import AddCardModal from './components/AddCardModal'; // Adjust path as needed

const UploadStep3 = ({
  croppedImage,
  croppedBlob,
  setStep,
  setStatus,
  resetState,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (croppedBlob) {
      setIsModalOpen(true); // Open modal for initial upload
    }
  }, [croppedBlob]);

  const handleSave = async (fields) => {
    const formData = new FormData();
    formData.append('image', croppedBlob, 'cropped.png');
    formData.append('fields', JSON.stringify(fields));
    try {
      const response = await fetch('https://code-server.fthome.org/proxy/5000/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      setStatus(`Saved: ${result.message}`);
      setTimeout(() => {
        resetState();
        setIsModalOpen(false); // Close modal after saving
      }, 1500);
    } catch (err) {
      throw err;
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    resetState();
  };

  return (
    <>
      {isModalOpen && (
        <AddCardModal
          croppedBlob={croppedBlob}
          croppedImage={croppedImage}
          onSave={handleSave}
          onCancel={handleCancel}
          isOpen={isModalOpen}
        />
      )}
    </>
  );
};

export default UploadStep3;