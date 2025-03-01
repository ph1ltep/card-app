import React, { useEffect } from 'react';
import Tesseract from 'tesseract.js';

const UploadStep3 = ({
  croppedImage,
  detectedFields,
  setDetectedFields,
  croppedBlob,
  setStep,
  setStatus,
  resetState,
}) => {
  useEffect(() => {
    if (croppedBlob) {
      const processImage = async () => {
        setStatus('Preprocessing image...');
        try {
          console.log('Cropped Blob:', croppedBlob); // Debug croppedBlob
          // Step 1: Preprocess image with OpenCV.js (simplified)
          const img = new Image();
          img.src = URL.createObjectURL(croppedBlob);
          await new Promise((resolve) => (img.onload = resolve));

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Use OpenCV.js for basic preprocessing (less aggressive)
          if (window.cv) {
            const mat = window.cv.imread(canvas);
            const gray = new window.cv.Mat();
            window.cv.cvtColor(mat, gray, window.cv.COLOR_RGBA2GRAY);
            window.cv.threshold(gray, gray, 128, 255, window.cv.THRESH_BINARY); // Basic binarization
            window.cv.imshow(canvas, gray);

            mat.delete();
            gray.delete();
          }

          // Convert processed canvas to Blob for Tesseract
          canvas.toBlob(async (processedBlob) => {
            setStatus('Processing OCR...');
            // Initialize Tesseract worker with English + Simplified Chinese
            const worker = await Tesseract.createWorker('eng+chi_sim', 1, {
              logger: (m) => console.log('Tesseract:', m), // Detailed logging
            });

            // Set parameters for better detection, relaxed whitelist
            await worker.setParameters({
              tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // Try SINGLE_BLOCK for structured text
              tessedit_char_whitelist: '', // Remove whitelist to allow all characters
            });

            // Perform OCR on the processed image
            const { data } = await worker.recognize(processedBlob);
            await worker.terminate(); // Clean up worker
            console.log('Tesseract OCR Result:', data); // Debug full result
            const fullText = data.text || '';

            if (!fullText) {
              throw new Error('No text detected from OCR');
            }

            console.log('OCR Text sent to backend:', fullText);

            setStatus('Processing text...');
            // Send text to backend for parsing
            const response = await fetch('/proxy/5000/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: fullText }),
              credentials: 'include',
            });
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const fields = await response.json();
            setDetectedFields(fields);
            setStatus('Text detected - Ready to edit');
          }, 'image/png');
        } catch (err) {
          console.error('Processing error:', err);
          setStatus(`Error: ${err.message}`);
        }
      };
      processImage();
    }
  }, [croppedBlob, setDetectedFields, setStatus]);

  const handleFieldChange = (field, value) => {
    setDetectedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setStatus('Uploading...');
    if (!croppedBlob) {
      setStatus('No cropped image available');
      return;
    }
    const formData = new FormData();
    formData.append('image', croppedBlob, 'cropped.png');
    formData.append('fields', JSON.stringify(detectedFields));
    try {
      const response = await fetch('/proxy/5000/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      setStatus(`Saved: ${result.message}`);
      setTimeout(() => resetState(), 1500);
    } catch (err) {
      console.error('Save error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <>
      <img src={croppedImage} alt="Cropped" className="max-w-full h-auto rounded-md mt-2 border" />
      <div className="mt-4">
        <h3 className="text-lg font-medium text-gray-700">Detected Fields</h3>
        {['name', 'email', 'phone', 'company', 'address', 'title', 'website'].map(field => (
          <div key={field} className="mt-2">
            <label className="block text-sm font-medium text-gray-600 capitalize">{field}</label>
            <input
              type="text"
              value={detectedFields[field] || ''}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${field}`}
            />
          </div>
        ))}
        <button
          onClick={handleSave}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
      </div>
    </>
  );
};

export default UploadStep3;