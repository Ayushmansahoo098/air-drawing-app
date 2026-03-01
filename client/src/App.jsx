import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import useHandTracker from './HandTracker';
import CanvasManager from './CanvasManager';
import { apiUrl } from './config/api';

// Mode options shown in both the home menu and in-game sidebar.
const MODES = [
  { id: 'neon', title: 'Neon Glow Canvas', subtitle: 'Pinch thumb + index to draw' },
  { id: 'slasher', title: 'Fruit Slasher', subtitle: 'Slice fruits with index fingertip' },
  { id: 'puzzle', title: 'Puzzle Lane', subtitle: 'Guide orb to finish, avoid walls' },
];

export default function App() {
  // Refs for camera + render surfaces + engine instance.
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const mazeRef = useRef(null);
  const stageRef = useRef(null);
  const managerRef = useRef(null);

  // Live hand snapshot and username are mirrored into refs for RAF callbacks.
  const handRef = useRef({ indexTip: null, pinchDistance: Number.POSITIVE_INFINITY });
  const usernameRef = useRef('Player');

  // Top-level navigation state: opening menu vs game stage.
  const [screen, setScreen] = useState('home');
  // Active mode on the stage.
  const [mode, setMode] = useState('neon');
  // Actual stage pixel size, used to size canvas buffers.
  const [dimensions, setDimensions] = useState({ width: 1100, height: 680 });

  // UI state for game-specific panels.
  const [username, setUsername] = useState('Player');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [mazeHits, setMazeHits] = useState(0);
  const [mazeCompleted, setMazeCompleted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // MediaPipe hook: camera tracking + loading state + fingertip data.
  const { ready, error, loadingProgress, indexTip, pinchDistance } = useHandTracker(webcamRef);

  // Puzzle mode requires a wider play area.
  const mazeNeedsLandscape = mode === 'puzzle' && dimensions.width < 900;

  // Used in small labels without re-searching in JSX repeatedly.
  const modeMeta = useMemo(() => MODES.find((item) => item.id === mode) ?? MODES[0], [mode]);

  // Keep latest hand data available to CanvasManager in RAF loop.
  useEffect(() => {
    handRef.current = { indexTip, pinchDistance };
  }, [indexTip, pinchDistance]);

  // Keep latest username for async score save callback.
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // Measure the bounded stage and keep canvas buffers in sync.
  useEffect(() => {
    if (screen !== 'stage') return undefined;

    const resizeFromStage = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      setDimensions({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(220, Math.round(rect.height)),
      });
    };

    resizeFromStage();
    window.addEventListener('resize', resizeFromStage);
    const observer = new ResizeObserver(resizeFromStage);
    if (stageRef.current) observer.observe(stageRef.current);

    return () => {
      window.removeEventListener('resize', resizeFromStage);
      observer.disconnect();
    };
  }, [screen]);

  // Build the CanvasManager once we enter the stage screen.
  useEffect(() => {
    if (screen !== 'stage') return undefined;
    if (!canvasRef.current || !mazeRef.current) return;

    managerRef.current = new CanvasManager({
      canvas: canvasRef.current,
      mazeCanvas: mazeRef.current,
      onScoreChange: (value) => {
        setScore(value);
        setHighScore((prev) => Math.max(prev, value));
      },
      onTimerChange: (value) => setTimeLeft(value),
      onGameOver: async ({ score: finalScore, mode: playedMode }) => {
        setGameOver(true);
        try {
          const res = await axios.post(apiUrl('/api/scores'), {
            username: usernameRef.current.trim() || 'Player',
            score: finalScore,
            mode: playedMode,
          });

          if (typeof res?.data?.highScore === 'number') {
            setHighScore((prev) => Math.max(prev, res.data.highScore));
          }
        } catch (saveError) {
          console.error('Failed to save score:', saveError);
        }
      },
      onMazeEvent: ({ type }) => {
        if (type === 'wall-hit') {
          setMazeHits((prev) => prev + 1);
        }
        if (type === 'completed') {
          setMazeCompleted(true);
        }
      },
      onDrawingToggle: (active) => setIsDrawing(active),
    });

    managerRef.current.resize(dimensions.width, dimensions.height);
    managerRef.current.setMode(mode);

    return () => {
      managerRef.current = null;
    };
  }, [screen]);

  // Propagate dimension changes into the manager (camera panel resize, rotation, etc.).
  useEffect(() => {
    managerRef.current?.resize(dimensions.width, dimensions.height);
  }, [dimensions]);

  // Reset mode-related UI state and inform manager whenever mode changes.
  useEffect(() => {
    setGameOver(false);
    if (mode === 'slasher') {
      setScore(0);
      setTimeLeft(60);
    }
    if (mode === 'puzzle') {
      setMazeHits(0);
      setMazeCompleted(false);
    }
    managerRef.current?.setMode(mode);
  }, [mode]);

  // Main render loop: delegates each frame to CanvasManager.
  useEffect(() => {
    if (screen !== 'stage') return undefined;
    let raf;

    const tick = () => {
      if (ready && !mazeNeedsLandscape) {
        managerRef.current?.step(handRef.current, performance.now());
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, mazeNeedsLandscape, screen]);

  // Mobile UX: disable page scroll gestures while air-drawing in neon mode.
  useEffect(() => {
    if (mode !== 'neon') return undefined;

    const originalOverscroll = document.documentElement.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    document.documentElement.style.overscrollBehavior = isDrawing ? 'none' : 'auto';
    document.body.style.touchAction = isDrawing ? 'none' : 'auto';

    return () => {
      document.documentElement.style.overscrollBehavior = originalOverscroll;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isDrawing, mode]);

  // Restart only the slasher game loop/state.
  const restartGame = () => {
    setGameOver(false);
    setScore(0);
    setTimeLeft(60);
    managerRef.current?.startSlasherGame();
  };

  // Clear only neon-mode strokes.
  const clearNeonCanvas = () => {
    managerRef.current?.clearNeon();
  };

  // Opening menu page with 3 entry buttons.
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-4 py-10 text-slate-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-8 shadow-2xl backdrop-blur-xl md:px-10 md:py-12">
          <h1 className="text-center text-3xl font-bold tracking-tight md:text-5xl">Air Gesture Arcade</h1>
          <p className="mt-3 max-w-2xl text-center text-sm text-slate-300 md:text-base">
            Pick a mode to start. The game view opens in a centered panel instead of full-screen.
          </p>

          <div className="mt-8 grid w-full max-w-3xl gap-4 md:grid-cols-3">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id);
                  setScreen('stage');
                }}
                className="rounded-2xl border border-white/20 bg-slate-900/50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-slate-900/75"
              >
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-xs text-slate-300">{item.subtitle}</p>
                <span className="mt-4 inline-block rounded-lg bg-cyan-500/25 px-3 py-1 text-xs font-semibold text-cyan-100">
                  Open Mode
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Game stage page: bounded camera/canvas panel + overlays/sidebar.
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-3 py-4 text-slate-100 md:px-5 md:py-6">
      <div
        ref={stageRef}
        className="relative mx-auto h-[calc(100vh-2rem)] w-full max-w-[1300px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl md:h-[calc(100vh-3rem)]"
      >
        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored
          videoConstraints={{
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />

        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0 h-full w-full"
          style={{ touchAction: 'none' }}
        />
        <canvas ref={mazeRef} width={dimensions.width} height={dimensions.height} className="hidden" />

        {/* Sidebar with mode switcher and mode-specific controls. */}
        <aside className="absolute left-3 top-3 z-20 w-[310px] rounded-2xl border border-white/25 bg-white/15 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Air Gesture Studio</h1>
            <span className="rounded-full bg-cyan-400/20 px-2 py-1 text-xs text-cyan-100">
              {ready ? 'Tracking Live' : 'Calibrating'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setScreen('home')}
            className="mb-3 w-full rounded-lg border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold hover:bg-black/40"
          >
            Back To Menu
          </button>

          <div className="mb-4 space-y-2">
            {MODES.map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  mode === item.id
                    ? 'border-cyan-200/70 bg-cyan-500/25'
                    : 'border-white/20 bg-slate-900/25 hover:bg-slate-900/45'
                }`}
              >
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-slate-300">{item.subtitle}</div>
              </button>
            ))}
          </div>

          {mode === 'neon' && (
            <div className="space-y-2 rounded-xl border border-white/15 bg-slate-900/30 p-3 text-xs text-slate-200">
              <div className="font-medium text-slate-100">Creative Mode</div>
              <div>Pinch threshold: &lt; 0.05</div>
              <div>Status: {isDrawing ? 'Drawing in air' : 'Open hand / paused'}</div>
              <button
                type="button"
                onClick={clearNeonCanvas}
                className="rounded-lg bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25"
              >
                Clear Canvas
              </button>
            </div>
          )}

          {mode === 'slasher' && (
            <div className="space-y-2 rounded-xl border border-white/15 bg-slate-900/30 p-3 text-xs text-slate-200">
              <div className="font-medium text-slate-100">Fruit Slasher</div>
              <label className="block">
                <span className="mb-1 block">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-2 py-1.5 text-sm outline-none"
                />
              </label>
              <div>Score: {score}</div>
              <div>Time: {timeLeft}s</div>
              <div>High Score: {highScore}</div>
              {gameOver && (
                <button
                  type="button"
                  onClick={restartGame}
                  className="rounded-lg bg-emerald-500/70 px-3 py-1.5 font-semibold hover:bg-emerald-500"
                >
                  Play Again
                </button>
              )}
            </div>
          )}

          {mode === 'puzzle' && (
            <div className="space-y-2 rounded-xl border border-white/15 bg-slate-900/30 p-3 text-xs text-slate-200">
              <div className="font-medium text-slate-100">Puzzle Lane</div>
              <div>Wall Hits: {mazeHits}</div>
              <div>Status: {mazeCompleted ? 'Completed' : 'In Progress'}</div>
              <div className="text-[11px] text-slate-300">Touching walls triggers vibration on mobile.</div>
            </div>
          )}
        </aside>

        <div className="absolute bottom-3 left-3 z-20 rounded-xl bg-black/35 px-3 py-2 text-xs backdrop-blur">
          <div className="font-semibold">{modeMeta.title}</div>
          <div className="text-slate-300">{modeMeta.subtitle}</div>
        </div>

        {/* Camera/model loading overlay. */}
        {!ready && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85">
            <div className="w-[440px] max-w-[90vw] rounded-2xl border border-cyan-200/20 bg-slate-900/70 p-6 backdrop-blur-xl">
              <h2 className="mb-3 text-xl font-semibold">Calibrating Camera...</h2>
              <div className="h-3 overflow-hidden rounded-full bg-slate-700/70">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-300">Loading MediaPipe WASM and hand model ({loadingProgress}%)</p>
              {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
            </div>
          </div>
        )}

        {/* Landscape guidance overlay for puzzle mode on narrow widths. */}
        {mazeNeedsLandscape && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-4 text-center">
            <div className="rounded-2xl border border-amber-200/20 bg-slate-900/70 p-6 backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-amber-200">Please rotate to Landscape</h3>
              <p className="mt-2 text-sm text-slate-300">Puzzle Lane needs a wider screen for accurate maze tracking.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
