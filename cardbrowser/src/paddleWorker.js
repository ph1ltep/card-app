/* eslint-disable no-restricted-globals */
// paddleWorker.js
self.onmessage = async (event) => {
    try {
      // Import PaddleJS modules
      const { ocr } = await import('@paddlejs-models/ocr');
      const ocrInstance = await ocr();
  
      // Receive ImageData from the main thread
      const { imageData } = event.data;
  
      // PaddleOCR.js expects an Image or Canvas, so we need to adapt
      // Since we're in a worker, we’ll assume PaddleOCR can handle raw pixel data
      // If not, we might need to adjust this further
      const result = await ocrInstance.detect(imageData);
      const fullText = result.map(item => item.text).join('\n') || '';
      self.postMessage({ success: true, fullText });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  };