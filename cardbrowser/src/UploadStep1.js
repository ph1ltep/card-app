import React, { useRef } from 'react';

const UploadStep1 = ({ setOriginalImage, setStep, setStatus }) => {
  const dropRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !window.cv) {
      setStatus('OpenCV.js not loaded yet!');
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    setStep(2);
    setStatus('Adjust the bounding box');
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0]);
    dropRef.current.classList.remove('border-blue-500');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current.classList.add('border-blue-500');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current.classList.remove('border-blue-500');
  };

  return (
    <div
      ref={dropRef}
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
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-gray-500 mt-2">or drag and drop here</p>
    </div>
  );
};

export default UploadStep1;