import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal'; // Adjust path as needed
import { detectCardEdges, transformImage } from '../utils/preprocess'; // Adjusted imports

const CaptureCardModal = ({ isOpen, onNext, onCancel, originalImage }) => {
  const [edges, setEdges] = useState(null);
  const [adjustedEdges, setAdjustedEdges] = useState(null);
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const dragIndex = useRef(null);

  useEffect(() => {
    if (isOpen && originalImage && window.cv) {
      console.log('Starting edge detection for:', originalImage);
      detectCardEdges(originalImage, (detectedEdges) => {
        console.log('Detected edges coordinates:', detectedEdges ? detectedEdges.map(e => ({ x: e.x, y: e.y })) : 'No edges detected');
        if (detectedEdges) {
          setEdges(detectedEdges);
          setAdjustedEdges(detectedEdges.map(edge => ({ ...edge }))); // Clone edges for adjustment
          drawVisualization(canvasRef.current, originalImage, detectedEdges);
        } else {
          setEdges(null);
          setAdjustedEdges(null);
          drawFallbackImage(canvasRef.current, originalImage);
        }
      });
    }
  }, [isOpen, originalImage]);

  const drawVisualization = (canvas, imageUrl, corners) => {
    if (!canvas || !imageUrl || !corners) {
      console.warn('Cannot draw visualization: missing canvas, image, or corners');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw red dashed polygon
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3; // Thinner lines for clarity
      ctx.setLineDash([5, 3]); // Dashed pattern
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw green arrow perpendicular to the longest edge
      drawArrow(ctx, corners, canvas.width);
    };
  };

  const drawArrow = (ctx, corners, imageWidth) => {
    if (!corners || corners.length !== 4) return;

    // Calculate all edges and find the longest hypotenuse
    const edges = [
      { p1: corners[0], p2: corners[1], length: Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y) },
      { p1: corners[1], p2: corners[2], length: Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y) },
      { p1: corners[2], p2: corners[3], length: Math.hypot(corners[3].x - corners[2].x, corners[3].y - corners[2].y) },
      { p1: corners[3], p2: corners[0], length: Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y) },
    ];

    const longestEdge = edges.reduce((max, edge) => edge.length > max.length ? edge : max, edges[0]);
    const { p1, p2 } = longestEdge;

    // Calculate the center of the polygon for arrow position
    const centroid = corners.reduce((acc, corner) => ({
      x: acc.x + corner.x / 4,
      y: acc.y + corner.y / 4,
    }), { x: 0, y: 0 });

    // Calculate the slope of the longest edge
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);

    // Calculate perpendicular direction (rotate 90° counterclockwise)
    const perpendicularDx = -dy / length;
    const perpendicularDy = dx / length;
    const arrowLength = length / 4; // Adjust arrow length relative to edge

    // Set arrow line width to 3% of image width
    const arrowLineWidth = imageWidth * 0.03; // 3% of image width
    const arrowHeadLength = arrowLength; // Use arrowLength for head length
    const arrowHeadWidth = arrowHeadLength * 0.4; // 40% of arrow length for head width

    // Position arrow at centroid, perpendicular to longest edge, pointing outward
    const startX = centroid.x - (perpendicularDx * arrowLength / 2);
    const startY = centroid.y - (perpendicularDy * arrowLength / 2);
    const endX = centroid.x + (perpendicularDx * arrowLength / 2);
    const endY = centroid.y + (perpendicularDy * arrowLength / 2);

    // Draw green arrow shaft
    ctx.strokeStyle = 'green';
    ctx.lineWidth = arrowLineWidth; // 3% of image width
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw green arrowhead (pointing away from the edge)
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - (perpendicularDx * arrowHeadLength),
      endY - (perpendicularDy * arrowHeadLength)
    );
    ctx.lineTo(
      endX - (perpendicularDx * arrowHeadLength) + (perpendicularDy * arrowHeadWidth / 2),
      endY - (perpendicularDy * arrowHeadLength) - (perpendicularDx * arrowHeadWidth / 2)
    );
    ctx.lineTo(
      endX - (perpendicularDx * arrowHeadLength) - (perpendicularDy * arrowHeadWidth / 2),
      endY - (perpendicularDy * arrowHeadLength) + (perpendicularDx * arrowHeadWidth / 2)
    );
    ctx.closePath();
    ctx.fillStyle = 'green';
    ctx.fill();
  };

  const drawFallbackImage = (canvas, imageUrl) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      console.warn('No valid card edges detected');
    };
  };

  // Handle dragging of polygon corners
  const handleCanvasClick = (e) => {
    if (!adjustedEdges) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    adjustedEdges.forEach((corner, index) => {
      if (Math.hypot(x - corner.x, y - corner.y) < 10) {
        isDragging.current = true;
        dragIndex.current = index;
        console.log('Starting drag on corner:', index, 'at coordinates:', { x: corner.x, y: corner.y });
      }
    });
  };

  const handleCanvasMove = (e) => {
    if (!isDragging.current || dragIndex.current === null) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newEdges = adjustedEdges.map(edge => ({ ...edge })); // Create new array of cloned objects
    newEdges[dragIndex.current] = { x: Math.max(0, Math.min(x, canvasRef.current.width - 1)), y: Math.max(0, Math.min(y, canvasRef.current.height - 1)) };
    setAdjustedEdges(newEdges);
    drawVisualization(canvasRef.current, originalImage, newEdges);
    console.log('Moving corner:', dragIndex.current, 'to coordinates:', { x, y });
  };

  const handleCanvasUp = () => {
    isDragging.current = false;
    dragIndex.current = null;
    console.log('Drag ended, final adjusted edges:', adjustedEdges ? adjustedEdges.map(e => ({ x: e.x, y: e.y })) : 'null');
  };

  // Transform and crop on "Next"
  const handleNext = () => {
    if (!adjustedEdges || !originalImage) {
      console.error('Cannot proceed: missing adjusted edges or image');
      return;
    }

    console.log('Starting transformation with adjusted edges:', adjustedEdges.map(e => ({ x: e.x, y: e.y })));
    transformImage(originalImage, adjustedEdges, (croppedBlob, croppedUrl) => {
      console.log('Cropped Blob and URL:', croppedBlob, croppedUrl);
      onNext(croppedBlob, croppedUrl); // Pass to parent component
    });
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
            className="max-w-full h-auto object-contain rounded-md border cursor-pointer"
            style={{ aspectRatio: 'auto' }}
            onMouseDown={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseUp={handleCanvasUp}
            onMouseLeave={handleCanvasUp}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
              disabled={!adjustedEdges}
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
        <p className="text-gray-500">Image not loaded or invalid</p>
      )}
    </Modal>
  );
};

export default CaptureCardModal;