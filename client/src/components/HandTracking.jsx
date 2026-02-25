import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';
import DrawingCanvas from './DrawingCanvas';

const STATUS_CONFIG = {
  draw:    { label: 'DRAW',    className: 'draw' },
  erase:   { label: 'ERASE',   className: 'erase' },
  pause:   { label: 'PAUSED',  className: 'pause' },
  loading: { label: 'LOADING', className: 'loading' },
};

const HandTracking = forwardRef(function HandTracking(
  { color, thickness, erasing, onInactivityTimeout },
  ref
) {
  const videoRef = useRef(null);
  const skeletonCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

  // Hand tracking via CDN MediaPipe
  const { gesture: rawGesture, indexTip, isReady, error: trackingError } = useHandTracking(
    videoRef,
    skeletonCanvasRef,
    onInactivityTimeout
  );

  const gesture = erasing ? 'erase' : rawGesture;

  useImperativeHandle(ref, () => ({
    clearCanvas: () => drawingCanvasRef.current?.clearCanvas(),
    getDataURL: () => drawingCanvasRef.current?.getDataURL(),
  }));

  // Resize observer to keep canvases in sync with container
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.round(width), height: Math.round(height) });
          const sc = skeletonCanvasRef.current;
          if (sc) {
            sc.width = Math.round(width);
            sc.height = Math.round(height);
          }
        }
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const statusKey = !isReady ? 'loading' : gesture;
  const { label, className } = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pause;

  if (trackingError) {
    return (
      <div className="error-card" style={{ maxWidth: 960, margin: '20px auto' }}>
        <h3>🎥 Camera Error</h3>
        <p>{trackingError}</p>
        <p style={{ marginTop: 12, fontSize: '0.8rem', opacity: 0.7 }}>
          Make sure your browser has camera permissions enabled. Try refreshing the page.
        </p>
        <button
          style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer' }}
          onClick={() => window.location.reload()}
        >
          🔄 Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrapper"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Webcam Feed — MediaPipe Camera will attach to this */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          position: 'absolute',
          top: 0, left: 0,
        }}
      />

      {/* Hand Skeleton Overlay */}
      <canvas
        ref={skeletonCanvasRef}
        className="skeleton-canvas"
        width={dimensions.width}
        height={dimensions.height}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      {/* Drawing Canvas */}
      <DrawingCanvas
        ref={drawingCanvasRef}
        gesture={gesture}
        indexTip={indexTip}
        color={color}
        thickness={thickness}
        dimensions={dimensions}
      />

      {/* Loading Overlay */}
      {!isReady && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p className="loading-text">Initializing hand tracking…</p>
        </div>
      )}

      {/* Gesture Status Badge */}
      <div className="status-bar">
        <div className={`status-badge ${className}`}>
          <span className="status-dot" />
          {label}
        </div>
      </div>

      {/* Gesture Guide */}
      <div className="gesture-guide">
        <div className={`gesture-item ${gesture === 'draw' ? 'active' : ''}`}>
          <span className="gesture-icon">☝️</span> One finger = Draw
        </div>
        <div className={`gesture-item ${gesture === 'erase' ? 'active' : ''}`}>
          <span className="gesture-icon">✌️</span> Two fingers = Erase
        </div>
        <div className="gesture-item">
          <span className="gesture-icon">✊</span> Fist = Pause
        </div>
      </div>
    </div>
  );
});

export default HandTracking;
