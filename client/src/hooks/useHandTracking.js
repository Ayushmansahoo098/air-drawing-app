import { useCallback, useEffect, useRef, useState } from 'react';
import { detectGesture, getIndexTip } from '../utils/handGestures';

export function useHandTracking(videoRef, skeletonCanvasRef) {
  const [gesture, setGesture] = useState('pause');
  const [indexTip, setIndexTip] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const handsRef = useRef(null);
  const animRef = useRef(null);

  const onResults = useCallback((results) => {
    const canvas = skeletonCanvasRef?.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const hand = results.multiHandLandmarks[0];
      if (canvas && ctx) drawHandSkeleton(ctx, hand, canvas.width, canvas.height);
      setGesture(detectGesture(hand));
      setIndexTip(getIndexTip(hand));
    } else {
      setGesture('pause');
      setIndexTip(null);
    }
  }, [skeletonCanvasRef]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Step 1: Wait for CDN globals
        await new Promise((resolve, reject) => {
          let tries = 0;
          const check = () => {
            if (window.Hands && window.Camera) return resolve();
            if (tries++ > 100) return reject(new Error('MediaPipe CDN failed to load. Check internet connection.'));
            setTimeout(check, 300);
          };
          check();
        });

        if (cancelled) return;

        // Step 2: Request camera permission
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
          throw new Error('Camera permission denied. Please allow camera access and refresh.');
        }

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        // Step 3: Wait for video element in DOM
        await new Promise((resolve, reject) => {
          let tries = 0;
          const check = () => {
            if (videoRef.current) return resolve();
            if (tries++ > 50) return reject(new Error('Video element not found in DOM.'));
            setTimeout(check, 100);
          };
          check();
        });

        if (cancelled) return;

        // Step 4: Attach stream to video
        const video = videoRef.current;
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(resolve);
          };
        });

        if (cancelled) return;

        // Step 5: Init MediaPipe Hands
        const hands = new window.Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        // Step 6: Frame loop
        const processFrame = async () => {
          if (cancelled || !handsRef.current || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            await handsRef.current.send({ image: videoRef.current });
          }
          animRef.current = requestAnimationFrame(processFrame);
        };

        if (!cancelled) {
          setIsReady(true);
          console.log('✅ Hand tracking ready');
          animRef.current = requestAnimationFrame(processFrame);
        }

      } catch (err) {
        console.error('❌ Init failed:', err);
        if (!cancelled) setError(err.message);
      }
    };

    const timer = setTimeout(init, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line

  return { gesture, indexTip, isReady, error };
}

// ─── Hand Skeleton Renderer ───────────────────────────────────────────────────
const FINGER_COLORS = {
  thumb:  '#ff4d6d',
  index:  '#00f5c8',
  middle: '#7b5ea7',
  ring:   '#ffd166',
  pinky:  '#06d6a0',
};

const CONNECTIONS = [
  { pairs: [[0,1],[1,2],[2,3],[3,4]], color: FINGER_COLORS.thumb },
  { pairs: [[0,5],[5,6],[6,7],[7,8]], color: FINGER_COLORS.index },
  { pairs: [[0,9],[9,10],[10,11],[11,12]], color: FINGER_COLORS.middle },
  { pairs: [[0,13],[13,14],[14,15],[15,16]], color: FINGER_COLORS.ring },
  { pairs: [[0,17],[17,18],[18,19],[19,20]], color: FINGER_COLORS.pinky },
  { pairs: [[5,9],[9,13],[13,17]], color: 'rgba(200,200,255,0.4)' },
];

function drawHandSkeleton(ctx, landmarks, width, height) {
  if (!landmarks) return;
  const toPixel = (lm) => ({ x: (1 - lm.x) * width, y: lm.y * height });

  CONNECTIONS.forEach(({ pairs, color }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    pairs.forEach(([a, b]) => {
      const pa = toPixel(landmarks[a]);
      const pb = toPixel(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });
  });

  landmarks.forEach((lm, i) => {
    const p = toPixel(lm);
    const isTip = [4, 8, 12, 16, 20].includes(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, isTip ? 6 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#ffffff' : 'rgba(255,255,255,0.7)';
    ctx.fill();

    if (i === 8) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f5c8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}