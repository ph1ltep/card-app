import React, { useState, useEffect } from 'react';
import CaptureCardModal from './components/CaptureCardModal'; // Adjust path as needed
import AddCardModal from './components/AddCardModal'; // Adjust path as needed

const Upload = () => {
  const [step, setStep] = useState(1);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [status, setStatus] = useState('');
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [captureImage, setCaptureImage] = useState(null);

  useEffect(() => {
    if (!window.cv) {
      setStatus('Loading OpenCV.js...');
      const checkOpenCV = setInterval(() => {
        if (window.cv) {
          setStatus('');
          clearInterval(checkOpenCV);
        }
      }, 100);
      return () => clearInterval(checkOpenCV);
    }
  }, []);

  const handleImageSelect = (file) => {
    if (!file || !window.cv) {
      setStatus('OpenCV.js not loaded yet!');
      return;
    }
    const url = URL.createObjectURL(file);
    setCaptureImage(url);
    setIsCaptureModalOpen(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleImageSelect(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCaptureNext = (croppedBlob, croppedImage) => {
    setCroppedBlob(croppedBlob);
    setCroppedImage(croppedImage);
    setIsCaptureModalOpen(false);
    setIsAddCardModalOpen(true);
    setCaptureImage(null);
  };

  const handleCaptureCancel = () => {
    setIsCaptureModalOpen(false);
    setCaptureImage(null);
  };

  const handleAddCardReset = () => {
    setStep(1);
    setCroppedBlob(null);
    setCroppedImage(null);
    setStatus('');
    setIsCaptureModalOpen(false);
    setIsAddCardModalOpen(false);
    setCaptureImage(null);
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        {step === 1 ? 'New Card' : 'Saving'}
      </h2>

      {step === 1 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="border-2 border-dashed border-gray-300 p-4 rounded-md text-center hover:border-blue-500 transition-colors"
        >
          <button
            onClick={() => document.getElementById('fileInput').click()}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            New Card
          </button>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e.target.files[0])}
            className="hidden"
          />
          <p className="text-gray-500 mt-2">or drag and drop here</p>
        </div>
      )}
      {step === 2 && <div>Saving...</div>}

      <CaptureCardModal
        isOpen={isCaptureModalOpen}
        onNext={handleCaptureNext}
        onCancel={handleCaptureCancel}
        originalImage={captureImage}
      />
      <AddCardModal
        isOpen={isAddCardModalOpen}
        croppedBlob={croppedBlob}
        croppedImage={croppedImage}
        onClose={handleCaptureCancel}
        onReset={handleAddCardReset}
      />

      {status && step !== 2 && <p className="mt-4 text-sm text-gray-600">{status}</p>}
    </div>
  );
};

export default Upload;