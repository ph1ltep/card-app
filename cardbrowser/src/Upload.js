import React, { useState } from 'react';
import Tesseract from 'tesseract.js';

const Upload = () => {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!window.cv) {
        setStatus('OpenCV.js not loaded yet!');
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      setStatus('Processing...');

      const img = new Image();
      img.src = url;
      img.onload = async () => {
        // Crop with OpenCV
        const mat = window.cv.imread(img);
        const gray = new window.cv.Mat();
        window.cv.cvtColor(mat, gray, window.cv.COLOR_RGBA2GRAY);
        window.cv.threshold(gray, gray, 120, 255, window.cv.THRESH_BINARY);

        const contours = new window.cv.MatVector();
        const hierarchy = new window.cv.Mat();
        window.cv.findContours(gray, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let maxContour = null;
        for (let i = 0; i < contours.size(); i++) {
          const area = window.cv.contourArea(contours.get(i));
          if (area > maxArea) {
            maxArea = area;
            maxContour = contours.get(i);
          }
        }

        if (maxContour) {
          const rect = window.cv.boundingRect(maxContour);
          const cropped = mat.roi(rect);
          window.cv.imshow('canvasOutput', cropped);

          // OCR with Tesseract
          const worker = await Tesseract.createWorker('eng');
          const { data: { text } } = await worker.recognize(cropped.data);
          await worker.terminate();

          // Upload to backend
          const formData = new FormData();
          formData.append('image', file);
          formData.append('text', text);

          try {
            const response = await fetch('http://localhost:5000/upload', {
              method: 'POST',
              body: formData,
            });
            const result = await response.json();
            setStatus(`Uploaded: ${result.message}`);
          } catch (err) {
            setStatus(`Error: ${err.message}`);
          }

          cropped.delete();
        }
        mat.delete();
        gray.delete();
        contours.delete();
        hierarchy.delete();
        URL.revokeObjectURL(url);
      };
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold">Upload Business Card</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} className="mt-2" />
      {preview && <img src={preview} alt="Preview" className="max-w-xs mt-2" />}
      <canvas id="canvasOutput" className="max-w-xs mt-2"></canvas>
      <p className="mt-2">{status || 'Ready'}</p>
    </div>
  );
};

export default Upload;