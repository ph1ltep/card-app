import React, { useEffect } from 'react';
import EditCardModal from './components/EditCardModal'; // Adjust path as needed

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
      setTimeout(() => resetState(), 1500);
    } catch (err) {
      throw err;
    }
  };

  const handleRemove = () => {
    // No removal needed for initial upload; close modal instead
    setIsModalOpen(false);
    resetState();
  };

  const handleReScan = async () => {
    // Re-scanning not applicable for initial upload; handled by modal
  };

  const handleClose = () => {
    setIsModalOpen(false);
    resetState();
  };

  return (
    <>
      {isModalOpen && (
        <EditCardModal
          card={null} // No card data for initial upload
          onSave={handleSave}
          onRemove={handleRemove}
          onReScan={handleReScan}
          onClose={handleClose}
          isOpen={isModalOpen}
        />
      )}
    </>
  );
};

export default UploadStep3;