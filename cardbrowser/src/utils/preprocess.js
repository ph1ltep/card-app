// Edge detection function
export const detectCardEdges = (imageUrl, callback) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
  
      // Load image into OpenCV
      const mat = window.cv.imread(canvas);
      const gray = new window.cv.Mat();
      window.cv.cvtColor(mat, gray, window.cv.COLOR_RGBA2GRAY); // Grayscale for edge detection
      const edges = new window.cv.Mat();
      window.cv.Canny(gray, edges, 100, 200); // Detect edges with Canny
  
      // Find contours
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();
      window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);
  
      // Find the largest quadrilateral contour
      let maxArea = 0;
      let maxContour = null;
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);
        if (area > maxArea) {
          maxArea = area;
          maxContour = contour;
        }
      }
  
      if (maxContour) {
        const perimeter = window.cv.arcLength(maxContour, true);
        const approx = new window.cv.Mat();
        window.cv.approxPolyDP(maxContour, approx, 0.02 * perimeter, true); // Approximate polygon
  
        if (approx.rows === 4) { // Check for quadrilateral
          const corners = [];
          for (let i = 0; i < 4; i++) {
            corners.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] });
          }
          callback(corners, mat); // Return corners and original matrix
        } else {
          console.warn('No quadrilateral detected');
          callback(null, mat);
        }
        approx.delete();
      } else {
        console.warn('No contour detected');
        callback(null, mat);
      }
  
      // Clean up
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      mat.delete();
    };
  };
  
  // Transformation function
  export const transformImage = (originalImageUrl, corners, callback) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = originalImageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
  
      const mat = window.cv.imread(canvas);
      const srcPoints = new window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y,
      ]);
  
      // Define target rectangle with 21:12 aspect ratio
      const cardWidth = 2100; // Width in pixels
      const cardHeight = 1200; // Height for 21:12 ratio
      const dstPoints = new window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
        0, 0,          // Top-left
        cardWidth, 0,   // Top-right
        cardWidth, cardHeight, // Bottom-right
        0, cardHeight,  // Bottom-left
      ]);
  
      // Apply perspective transform
      const perspectiveTransform = window.cv.getPerspectiveTransform(srcPoints, dstPoints);
      const transformed = new window.cv.Mat();
      window.cv.warpPerspective(mat, transformed, perspectiveTransform, { width: cardWidth, height: cardHeight });
  
      // Convert to blob for output
      window.cv.imshow(canvas, transformed);
      canvas.toBlob(blob => {
        const croppedUrl = URL.createObjectURL(blob);
        callback(blob, croppedUrl);
      }, 'image/png');
  
      // Clean up
      srcPoints.delete();
      dstPoints.delete();
      perspectiveTransform.delete();
      transformed.delete();
      mat.delete();
    };
  };