const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function processOCR(input, tempPath = null) {
  try {
    let blob;
    if (typeof input === 'string') {
      // Handle imagePath (URL)
      const response = await fetch(input);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      blob = await response.blob();
    } else if (input instanceof Buffer) {
      // Handle Buffer from multer file (process-blob)
      blob = new Blob([input]);
    } else {
      throw new Error('Invalid input type for OCR processing');
    }

    // If tempPath is provided (e.g., for process-blob), save the blob temporarily
    if (tempPath) {
      await fs.promises.writeFile(tempPath, Buffer.from(await blob.arrayBuffer()));
    }

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => console.log('Tesseract:', m), // Log Tesseract progress
    });

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_create_blocks: true,
      tessedit_create_lines: true,
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@.-_/# +', // Matches parser expectations
    });

    const { data } = await worker.recognize(tempPath || blob);
    await worker.terminate();

    if (!data.text || data.text.trim() === '') {
      throw new Error('No text detected from OCR');
    }

    console.log('OCR Result:', data.text); // Log OCR result for debugging

    // Clean up temporary file if it exists
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    return data;
  } catch (err) {
    console.error('OCR error:', err);
    throw err;
  }
}

module.exports = { processOCR };