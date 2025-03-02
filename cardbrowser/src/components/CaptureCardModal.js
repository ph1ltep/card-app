import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal'; // Adjust path as needed (should point to src/components/Modal.js)

const CaptureCardModal = ({
  isOpen,
  onNext,
  onCancel,
  originalImage,
}) => {
  const [edges, setEdges] = useState(null);
  const canvasRef = useRef(null);
  const matRef = useRef(null);

  useEffect(() => {
    if (isOpen && originalImage && window.cv) {
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
            setEdges(corners);
            drawBoundingBox(canvasRef.current, mat, corners, longestEdgeIndex);
          } else {
            window.cv.imshow(canvasRef.current, mat);
          }
          approx.delete();
        } else {
          window.cv.imshow(canvasRef.current, mat);
        }

        mat.delete();
        gray.delete();
        contours.delete();
        hierarchy.delete();
      };
    } else {
      setEdges(null);
      matRef.current = null; // Reset matRef when modal closes
    }
  }, [isOpen, originalImage]);

  const orderCornersByLongestEdge = (approx) => {
    const corners = [];
    for (let i = 0; i < 4; i++) {
      corners.push({
        x: approx.data32S[i * 2],
        y: approx.data32S[i * 2 + 1],
      });
    }

    const edges = [
      { length: Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y), p1: corners[0], p2: corners[1], index: 0, isWidth: true },
      { length: Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y), p1: corners[1], p2: corners[2], index: 1, isWidth: false },
      { length: Math.hypot(corners[3].x - corners[2].x, corners[3].y - corners[2].y), p1: corners[2], p2: corners[3], index: 2, isWidth: true },
      { length: Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y), p1: corners[3], p2: corners[0], index: 3, isWidth: false },
    ];
    
    const widthEdges = edges.filter(edge => edge.isWidth);
    const longestEdge = widthEdges.reduce((max, edge) => edge.length > max.length ? edge : max, widthEdges[0]);

    let orderedCorners = [
      corners[longestEdge.index],
      corners[(longestEdge.index + 1) % 4],
      corners[(longestEdge.index + 2) % 4],
      corners[(longestEdge.index + 3) % 4],
    ];

    const minY = Math.min(...orderedCorners.map(c => c.y));
    const topCorners = orderedCorners.filter(c => Math.abs(c.y - minY) < 10);
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

    if (dx < 0) {
      orderedCorners = [orderedCorners[1], orderedCorners[0], orderedCorners[3], orderedCorners[2]];
      return { corners: orderedCorners, longestEdgeIndex: (longestEdge.index + 1) % 4 };
    }
    if (dy > 0) {
      orderedCorners = [orderedCorners[3], orderedCorners[2], orderedCorners[1], orderedCorners[0]];
      return { corners: orderedCorners, longestEdgeIndex: (longestEdge.index + 2) % 4 };
    }

    return { corners: orderedCorners, longestEdgeIndex: longestEdge.index };
  };

  const drawBoundingBox = (canvas, mat, corners, longestEdgeIndex) => {
    window.cv.imshow(canvas, mat);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 6;
    const startIdx = longestEdgeIndex;
    const endIdx = (longestEdgeIndex + 1) % 4;
    ctx.beginPath();
    ctx.moveTo(corners[startIdx].x, corners[startIdx].y);
    ctx.lineTo(corners[endIdx].x, corners[endIdx].y);
    ctx.stroke();
  };

  const handleNext = () => {
    if (!edges || edges.length !== 4 || !matRef.current) return;
    const srcPoints = new window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      edges[0].x, edges[0].y,
      edges[1].x, edges[1].y,
      edges[2].x, edges[2].y,
      edges[3].x, edges[3].y,
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
      onNext(blob, croppedUrl); // Pass croppedBlob and croppedImage to Upload.js
    }, 'image/png');

    srcPoints.delete();
    dstPoints.delete();
    perspectiveTransform.delete();
    transformed.delete();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Capture Card"
      className="max-h-[85vh] overflow-y-auto"
    >
      {originalImage ? (
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto object-contain rounded-md border"
            style={{ aspectRatio: 'auto' }}
          />
          <div className="w-full flex justify-end gap-2">
            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
              disabled={!edges}
            >
              Next
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-500">Image not loaded or invalid</p>
        </div>
      )}
    </Modal>
  );
};

export default CaptureCardModal;