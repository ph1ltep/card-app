import React, { useState, useEffect } from 'react';
import UploadStep1 from './UploadStep1';
import UploadStep2 from './UploadStep2';
import UploadStep3 from './UploadStep3';
import UploadStep4 from './UploadStep4';

const Upload = () => {
  const [step, setStep] = useState(1);
  const [originalImage, setOriginalImage] = useState(null);
  const [boundingBox, setBoundingBox] = useState(null); // Reintroduced for preview
  const [croppedImage, setCroppedImage] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [detectedFields, setDetectedFields] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    website: '',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!window.cv) {
      setStatus('Loading OpenCV.js...');
      const checkOpenCV = setInterval(() => {
        if (window.cv) {
          setStatus('');
          clearInterval(checkOpenCV);
        }
      }, 100);
    }
  }, []);

  const resetState = () => {
    setStep(1);
    setOriginalImage(null);
    setBoundingBox(null);
    setCroppedImage(null);
    setCroppedBlob(null);
    setDetectedFields({ name: '', email: '', phone: '', company: '', address: '' });
    setStatus('');
  };

  return (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        {step === 1 ? 'New Card' : step === 2 ? 'Adjust Card Edges' : step === 3 ? 'Edit Details' : 'Saving'}
      </h2>

      {step === 1 && <UploadStep1 setOriginalImage={setOriginalImage} setStep={setStep} setStatus={setStatus} />}
      {step === 2 && originalImage && (
        <UploadStep2
          originalImage={originalImage}
          boundingBox={boundingBox}
          setBoundingBox={setBoundingBox}
          setCroppedImage={setCroppedImage}
          setCroppedBlob={setCroppedBlob}
          setStep={setStep}
          setStatus={setStatus}
        />
      )}
      {step === 3 && croppedImage && (
        <UploadStep3
          croppedImage={croppedImage}
          detectedFields={detectedFields}
          setDetectedFields={setDetectedFields}
          croppedBlob={croppedBlob}
          setStep={setStep}
          setStatus={setStatus}
          resetState={resetState}
        />
      )}
      {step === 4 && <UploadStep4 status={status} resetState={resetState} />}

      {status && step !== 4 && <p className="mt-4 text-sm text-gray-600">{status}</p>}
    </div>
  );
};

export default Upload;