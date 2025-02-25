import React, { useState } from 'react';
import cv from 'opencv.js';
import Tesseract from 'tesseract.js';

const Upload = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
      processImage(file);
    }
  };

  const processImage = async (file) => {
    setStatus('Processing...');

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const mat = cv.imread(img);
      const gray = new cv.Mat();
      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      cv.threshold(gray, gray, 120, 255, cv.THRESH_BINARY);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let maxContour = null;
      for (let i = 0; i < contours.size(); i++) {
        const area = cv.contourArea(contours.get(i));
        if (area > maxArea) {
          maxArea = area;
          maxContour = contours.get(i);
        }
      }

      if (maxContour) {
        const rect = cv.boundingRect(maxContour);
        const cropped = mat.roi(rect);
        cv.imshow('canvasOutput', cropped);

        const { data: { text } } = await Tesseract.recognize(cropped.data, 'eng');

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
    };
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold">Upload Business Card</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} className="mt-2" />
      {preview && <img src={preview} alt="Preview" className="max-w-xs mt-2" />}
      <canvas id="canvasOutput" className="max-w-xs mt-2"></canvas>
      <p className="mt-2">{status}</p>
    </div>
  );
};

export default Upload;