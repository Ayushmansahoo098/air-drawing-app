/**
 * handGestures.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility functions for interpreting MediaPipe hand landmark data into
 * high-level gestures used by the Air Drawing app.
 *
 * MediaPipe Hand Landmark indices (21 points):
 *   0  = Wrist
 *   1-4  = Thumb  (1=CMC, 2=MCP, 3=IP, 4=TIP)
 *   5-8  = Index  (5=MCP, 6=PIP, 7=DIP, 8=TIP)  ← drawing point
 *   9-12 = Middle (9=MCP, 10=PIP, 11=DIP, 12=TIP)
 *   13-16= Ring   (13=MCP, 14=PIP, 15=DIP, 16=TIP)
 *   17-20= Pinky  (17=MCP, 18=PIP, 19=DIP, 20=TIP)
 *
 * Landmark coordinates are normalized (0-1) relative to the image frame.
 */

// Landmark index constants for clarity
export const LM = {
  WRIST: 0,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_TIP: 20,
};

/**
 * Returns true if a finger is extended ("up").
 * Strategy: tip's y coordinate must be significantly above (less than) PIP joint.
 * Note: y increases downward in MediaPipe's coordinate space.
 *
 * @param {Array} landmarks  - array of {x,y,z} normalized coordinates
 * @param {number} tipIdx    - landmark index of fingertip
 * @param {number} pipIdx    - landmark index of PIP (proximal interphalangeal) joint
 * @param {number} threshold - how much higher the tip must be (default 0.06)
 */
export function isFingerUp(landmarks, tipIdx, pipIdx, threshold = 0.06) {
  if (!landmarks || !landmarks[tipIdx] || !landmarks[pipIdx]) return false;
  return landmarks[tipIdx].y < landmarks[pipIdx].y - threshold;
}

/**
 * Detect gesture mode from hand landmarks.
 * Returns one of: 'draw' | 'erase' | 'pause'
 *
 * Gesture rules:
 *  - DRAW  : only index finger up (middle is folded)
 *  - ERASE : index AND middle fingers up (peace/scissors gesture)
 *  - PAUSE : all fingers closed / fist
 */
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return 'pause';

  const indexUp  = isFingerUp(landmarks, LM.INDEX_TIP,  LM.INDEX_PIP,  0.05);
  const middleUp = isFingerUp(landmarks, LM.MIDDLE_TIP, LM.MIDDLE_PIP, 0.05);
  const ringUp   = isFingerUp(landmarks, LM.RING_TIP,   LM.RING_MCP,   0.05);
  const pinkyUp  = isFingerUp(landmarks, LM.PINKY_TIP,  LM.PINKY_MCP,  0.05);

  if (indexUp && middleUp) return 'erase';   // ✌️ Two fingers → erase
  if (indexUp && !middleUp) return 'draw';   // ☝️ One finger  → draw
  return 'pause';                            // ✊ Fist         → pause
}

/**
 * Get normalized position of index fingertip (landmark #8).
 * Returns {x, y} as 0–1 values. Note: x is mirrored for front camera.
 */
export function getIndexTip(landmarks) {
  if (!landmarks || !landmarks[LM.INDEX_TIP]) return null;
  const tip = landmarks[LM.INDEX_TIP];
  return { x: tip.x, y: tip.y };
}

/**
 * Convert normalized landmark position to canvas pixel coordinates.
 * MediaPipe returns mirrored x for selfie/front-facing camera, so we
 * optionally mirror it back.
 *
 * @param {{x:number, y:number}} normPoint - normalized position (0-1)
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {boolean} mirror - whether to flip x (default true for webcam)
 */
export function normToCanvas(normPoint, canvasWidth, canvasHeight, mirror = true) {
  if (!normPoint) return null;
  const x = mirror ? (1 - normPoint.x) * canvasWidth : normPoint.x * canvasWidth;
  const y = normPoint.y * canvasHeight;
  return { x, y };
}
