import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Hosted MediaPipe hand model asset.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export default function useHandTracker(webcamRef) {
  // Public hook state consumed by App UI and CanvasManager.
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [handState, setHandState] = useState({
    indexTip: null,
    pinchDistance: Number.POSITIVE_INFINITY,
  });

  const handLandmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastPointRef = useRef(null);

  // One-time MediaPipe initialization (WASM files + model + GPU delegate).
  useEffect(() => {
    let mounted = true;
    let progressInterval = null;

    const loadHandTracker = async () => {
      try {
        // Simulated progress while WASM and model files load.
        setLoadingProgress(5);

        progressInterval = setInterval(() => {
          setLoadingProgress((prev) => (prev < 85 ? prev + 3 : prev));
        }, 120);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!mounted) return;

        setLoadingProgress(92);
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!mounted) return;

        setLoadingProgress(100);
        setReady(true);
      } catch (err) {
        if (!mounted) return;
        console.error('MediaPipe init failed:', err);
        setError('Unable to initialize camera tracking. Check permissions and reload.');
      } finally {
        if (progressInterval) clearInterval(progressInterval);
      }
    };

    loadHandTracker();

    return () => {
      mounted = false;
      if (progressInterval) clearInterval(progressInterval);
    };
  }, []);

  // Per-frame detection loop while camera video is active.
  useEffect(() => {
    if (!ready) return undefined;

    const predict = () => {
      const video = webcamRef.current?.video;
      const tracker = handLandmarkerRef.current;

      if (!video || !tracker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(predict);
        return;
      }

      // Only run detection when video timestamp advances.
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const results = tracker.detectForVideo(video, performance.now());
        const hand = results.landmarks?.[0];

        if (!hand) {
          // No hand in frame -> report null point and infinite pinch distance.
          setHandState({ indexTip: null, pinchDistance: Number.POSITIVE_INFINITY });
        } else {
          // Index tip (8) + thumb tip (4) create pinch distance for draw trigger.
          const indexTip = hand[8];
          const thumbTip = hand[4];
          const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);

          // Mirror X so hand movement matches mirrored camera preview.
          const mirroredPoint = { x: 1 - indexTip.x, y: indexTip.y, z: indexTip.z ?? 0 };
          const prev = lastPointRef.current;

          // Skip tiny movement updates to reduce React re-renders.
          if (
            !prev ||
            Math.abs(prev.x - mirroredPoint.x) > 0.0012 ||
            Math.abs(prev.y - mirroredPoint.y) > 0.0012 ||
            Math.abs(prev.d - pinchDistance) > 0.0012
          ) {
            lastPointRef.current = { x: mirroredPoint.x, y: mirroredPoint.y, d: pinchDistance };
            setHandState({ indexTip: mirroredPoint, pinchDistance });
          }
        }
      }

      rafRef.current = requestAnimationFrame(predict);
    };

    rafRef.current = requestAnimationFrame(predict);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [ready, webcamRef]);

  return {
    ready,
    error,
    loadingProgress,
    indexTip: handState.indexTip,
    pinchDistance: handState.pinchDistance,
  };
}
