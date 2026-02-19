import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { normToCanvas } from '../utils/handGestures';

/**
 * DrawingCanvas
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders an HTML5 Canvas overlay on top of the webcam feed.
 * Draws strokes based on tracked fingertip position and gesture mode.
 *
 * Props:
 *  - gesture    : 'draw' | 'erase' | 'pause'
 *  - indexTip   : {x, y} normalized fingertip coordinates (or null)
 *  - color      : hex color string
 *  - thickness  : brush size in pixels
 *  - dimensions : {width, height} of the canvas
 */
const DrawingCanvas = forwardRef(function DrawingCanvas(
  { gesture, indexTip, color, thickness, dimensions },
  ref
) {
  const canvasRef = useRef(null);

  // Track previous fingertip position for continuous line drawing
  const prevPointRef = useRef(null);
  // Track whether we were in draw mode last frame (to handle stroke breaks)
  const wasDrawingRef = useRef(false);

  // ── Expose canvas methods to parent via ref ────────────────────────────────
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      prevPointRef.current = null;
    },
    getDataURL: () => canvasRef.current?.toDataURL('image/png') || null,
  }));

  // ── Resize canvas when dimensions change ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions) return;

    // Preserve existing drawing when resizing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(tempCanvas, 0, 0, dimensions.width, dimensions.height);
  }, [dimensions]);

  // ── Main Drawing Effect ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    if (!indexTip) {
      // No hand detected — reset prev point so we don't connect across gaps
      prevPointRef.current = null;
      wasDrawingRef.current = false;
      return;
    }

    // Convert normalized MediaPipe coords → canvas pixels
    const currentPoint = normToCanvas(indexTip, width, height, true);

    if (gesture === 'draw') {
      // ── Draw stroke ──────────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (prevPointRef.current && wasDrawingRef.current) {
        // Continue the stroke from previous point
        ctx.beginPath();
        ctx.moveTo(prevPointRef.current.x, prevPointRef.current.y);

        // Smooth curve using quadratic bezier to midpoint
        const midX = (prevPointRef.current.x + currentPoint.x) / 2;
        const midY = (prevPointRef.current.y + currentPoint.y) / 2;
        ctx.quadraticCurveTo(prevPointRef.current.x, prevPointRef.current.y, midX, midY);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
      } else {
        // Start of a new stroke — draw a dot at the starting position
        ctx.beginPath();
        ctx.arc(currentPoint.x, currentPoint.y, thickness / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      prevPointRef.current = currentPoint;
      wasDrawingRef.current = true;

    } else if (gesture === 'erase') {
      // ── Erase mode ───────────────────────────────────────────────────────
      // Use destination-out composite operation to punch a hole
      ctx.globalCompositeOperation = 'destination-out';
      const eraseRadius = thickness * 4; // eraser is larger than pen
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, eraseRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fill();

      // Reset composite after erasing
      ctx.globalCompositeOperation = 'source-over';

      prevPointRef.current = currentPoint;
      wasDrawingRef.current = false;

    } else {
      // Pause / unknown gesture — break the stroke
      prevPointRef.current = null;
      wasDrawingRef.current = false;
    }
  }, [gesture, indexTip, color, thickness, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      width={dimensions?.width || 1280}
      height={dimensions?.height || 720}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
});

export default DrawingCanvas;
