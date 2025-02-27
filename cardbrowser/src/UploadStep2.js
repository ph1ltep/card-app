import React, { useRef, useEffect } from 'react';

const UploadStep2 = ({
  originalImage,
  boundingBox,
  setBoundingBox,
  setCroppedImage,
  setCroppedBlob,
  setStep,
  setStatus,
}) => {
  const canvasRef = useRef(null);
  const matRef = useRef(null);

  useEffect(() => {
    if (originalImage && canvasRef.current) {
      const img = new Image();
      img.src = originalImage;
      img.onload = () => {
        const mat = window.cv.imread(img);
        matRef.current = mat.clone();

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
          const perimeter = window.cv.arcLength(maxContour, true);
          const epsilon = 0.02 * perimeter;
          const approx = new window.cv.Mat();
          window.cv.approxPolyDP(maxContour, approx, epsilon, true);

          if (approx.rows === 4) {
            const { corners, longestEdgeIndex } = orderCornersByLongestEdge(approx);
            console.log('Detected card corners:', corners);
            setBoundingBox(corners);
            drawBoundingBox(canvasRef.current, mat, corners, longestEdgeIndex);
            setStatus('');
          } else {
            setStatus('Card not detected as quadrilateral');
            window.cv.imshow(canvasRef.current, mat);
          }
          approx.delete();
        } else {
          setStatus('No card edges detected');
          window.cv.imshow(canvasRef.current, mat);
        }

        mat.delete();
        gray.delete();
        contours.delete();
        hierarchy.delete();
      };
    }
  }, [originalImage, setBoundingBox, setStatus]);

  const orderCornersByLongestEdge = (approx) => {
    const corners = [];
    for (let i = 0; i < 4; i++) {
      corners.push({
        x: approx.data32S[i * 2],
        y: approx.data32S[i * 2 + 1],
      });
    }

    // Calculate edge lengths (Euclidean distance)
    const edges = [
      { length: Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y), dx: corners[1].x - corners[0].x, dy: corners[1].y - corners[0].y, p1: corners[0], p2: corners[1], index: 0, isWidth: true }, // TL-TR
      { length: Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y), dx: corners[2].x - corners[1].x, dy: corners[2].y - corners[1].y, p1: corners[1], p2: corners[2], index: 1, isWidth: false }, // TR-BR
      { length: Math.hypot(corners[3].x - corners[2].x, corners[3].y - corners[2].y), dx: corners[3].x - corners[2].x, dy: corners[3].y - corners[2].y, p1: corners[2], p2: corners[3], index: 2, isWidth: true }, // BR-BL
      { length: Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y), dx: corners[0].x - corners[3].x, dy: corners[0].y - corners[3].y, p1: corners[3], p2: corners[0], index: 3, isWidth: false }, // BL-TL
    ];
    
    // Favor width edges (TL-TR, BR-BL)
    const widthEdges = edges.filter(edge => edge.isWidth);
    const longestEdge = widthEdges.reduce((max, edge) => edge.length > max.length ? edge : max, widthEdges[0]);
    console.log('Edge lengths:', edges);
    console.log('Longest width edge:', longestEdge);

    // Reorder corners starting from longest edge, clockwise
    const startIdx = longestEdge.index;
    let orderedCorners = [
      corners[startIdx], // Start at p1 of longest edge
      corners[(startIdx + 1) % 4],
      corners[(startIdx + 2) % 4],
      corners[(startIdx + 3) % 4],
    ];

    // Ensure top-left starts at min x,y and longest edge is top, left-to-right
    const minY = Math.min(...orderedCorners.map(c => c.y));
    const topCorners = orderedCorners.filter(c => Math.abs(c.y - minY) < 10); // Tolerance for near-top
    const topLeft = topCorners.reduce((min, c) => c.x < min.x ? c : min, topCorners[0]);
    const startCornerIdx = orderedCorners.indexOf(topLeft);
    orderedCorners = [
      orderedCorners[startCornerIdx],
      orderedCorners[(startCornerIdx + 1) % 4],
      orderedCorners[(startCornerIdx + 2) % 4],
      orderedCorners[(startCornerIdx + 3) % 4],
    ];

    const dx = orderedCorners[1].x - orderedCorners[0].x;
    const dy = orderedCorners[1].y - orderedCorners[0].y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // If dx < 0 (right-to-left), flip horizontally
    if (dx < 0) {
      const flipped = [orderedCorners[1], orderedCorners[0], orderedCorners[3], orderedCorners[2]];
      console.log('Flipped horizontally to correct orientation:', flipped);
      return { corners: flipped, longestEdgeIndex: (startIdx + 1) % 4 };
    }

    // If dy > 0 (top is below bottom), flip vertically
    if (dy > 0) {
      const flipped = [orderedCorners[3], orderedCorners[2], orderedCorners[1], orderedCorners[0]];
      console.log('Flipped vertically to correct orientation:', flipped);
      return { corners: flipped, longestEdgeIndex: (startIdx + 2) % 4 };
    }

    console.log('Longest edge angle:', angle);
    return { corners: orderedCorners, longestEdgeIndex: startIdx };
  };

  const drawBoundingBox = (canvas, mat, corners, longestEdgeIndex) => {
    window.cv.imshow(canvas, mat);
    const ctx = canvas.getContext('2d');

    // Draw red polygon (thicker border)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Highlight longest edge (blue, even thicker)
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 6;
    ctx.beginPath();
    const startIdx = longestEdgeIndex;
    const endIdx = (longestEdgeIndex + 1) % 4;
    ctx.moveTo(corners[startIdx].x, corners[startIdx].y);
    ctx.lineTo(corners[endIdx].x, corners[endIdx].y);
    ctx.stroke();

    // Draw angle (pre-transform)
    const angle = Math.atan2(corners[endIdx].y - corners[startIdx].y, corners[endIdx].x - corners[startIdx].x) * 180 / Math.PI;
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText(`Angle: ${angle.toFixed(2)}°`, 10, 30);
  };

  const handleNext = () => {
    if (!boundingBox || boundingBox.length !== 4) {
      setStatus('No valid card corners detected');
      return;
    }
    setStatus('Processing...');

    const srcPoints = new window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      boundingBox[0].x, boundingBox[0].y, // TL
      boundingBox[1].x, boundingBox[1].y, // TR
      boundingBox[2].x, boundingBox[2].y, // BR
      boundingBox[3].x, boundingBox[3].y, // BL
    ]);
    const cardWidth = 1050;
    const cardHeight = 600;
    const dstPoints = new window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      0, 0,
      cardWidth, 0,
      cardWidth, cardHeight,
      0, cardHeight,
    ]);
    const perspectiveTransform = window.cv.getPerspectiveTransform(srcPoints, dstPoints);
    const transformed = new window.cv.Mat();
    window.cv.warpPerspective(matRef.current, transformed, perspectiveTransform, { width: cardWidth, height: cardHeight });

    window.cv.imshow(canvasRef.current, transformed);
    canvasRef.current.toBlob(blob => {
      const croppedUrl = URL.createObjectURL(blob);
      setCroppedImage(croppedUrl);
      setCroppedBlob(blob);
      setStep(3);
      setStatus('');
    }, 'image/png');

    srcPoints.delete();
    dstPoints.delete();
    perspectiveTransform.delete();
    transformed.delete();
  };

  return (
    <>
      <canvas ref={canvasRef} className="max-w-full h-auto rounded-md mt-2 border" />
      <button
        onClick={handleNext}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Next
      </button>
    </>
  );
};

export default UploadStep2;