import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import useHandTracker from './HandTracker';
import CanvasManager from './CanvasManager';
import { apiUrl } from './config/api';

const MODES = [
  {
    id: 'neon',
    icon: '✦',
    emoji: '🎨',
    title: 'Neon Glow',
    subtitle: 'Point with index finger to draw, open palm to clear',
    tag: 'Creative',
    cardClass: 'card-neon',
    iconClass: 'icon-cyan',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'slasher',
    icon: '⚡',
    emoji: '🍉',
    title: 'Fruit Slasher',
    subtitle: 'Slash fruits mid-air with your fingertip before time runs out',
    tag: 'Score Attack',
    cardClass: 'card-slasher',
    iconClass: 'icon-magenta',
    badgeClass: 'badge-magenta',
  },
  {
    id: 'puzzle',
    icon: '◈',
    emoji: '🔮',
    title: 'Puzzle Lane',
    subtitle: 'Guide the orb through 10 maze levels from easy to hard',
    tag: 'Challenge',
    cardClass: 'card-puzzle',
    iconClass: 'icon-amber',
    badgeClass: 'badge-amber',
  },
];

/* ── Floating particle component ── */
function Particles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      hue: Math.random() * 80 + 260,
      alpha: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.018;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}

export default function App() {
  const webcamRef  = useRef(null);
  const canvasRef  = useRef(null);
  const mazeRef    = useRef(null);
  const stageRef   = useRef(null);
  const managerRef = useRef(null);
  const handRef    = useRef({ indexTip: null, pinchDistance: Number.POSITIVE_INFINITY, allFingersExtended: false, indexPointing: false });
  const usernameRef = useRef('Player');

  const [screen,        setScreen]        = useState('home');
  const [mode,          setMode]          = useState('neon');
  const [dimensions,    setDimensions]    = useState({ width: 1100, height: 680 });
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [username,      setUsername]      = useState('Player');
  const [score,         setScore]         = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(60);
  const [highScore,     setHighScore]     = useState(0);
  const [gameOver,      setGameOver]      = useState(false);
  const [mazeHits,      setMazeHits]      = useState(0);
  const [mazeCompleted, setMazeCompleted] = useState(false);
  const [puzzleLevel,   setPuzzleLevel]   = useState(1);
  const [isDrawing,     setIsDrawing]     = useState(false);

  const { ready, error, loadingProgress, indexTip, pinchDistance, allFingersExtended, indexPointing } = useHandTracker(webcamRef);
  const mazeNeedsLandscape = mode === 'puzzle' && dimensions.width < 900;
  const modeMeta = useMemo(() => MODES.find(m => m.id === mode) ?? MODES[0], [mode]);

  useEffect(() => { handRef.current = { indexTip, pinchDistance, allFingersExtended, indexPointing }; }, [indexTip, pinchDistance, allFingersExtended, indexPointing]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { if (screen === 'stage') setSidebarOpen(false); }, [screen]);

  /* resize observer */
  useEffect(() => {
    if (screen !== 'stage') return;
    const sync = () => {
      const r = stageRef.current?.getBoundingClientRect();
      if (r) setDimensions({ width: Math.max(320, Math.round(r.width)), height: Math.max(220, Math.round(r.height)) });
    };
    sync();
    window.addEventListener('resize', sync);
    const ro = new ResizeObserver(sync);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => { window.removeEventListener('resize', sync); ro.disconnect(); };
  }, [screen]);

  /* canvas manager */
  useEffect(() => {
    if (screen !== 'stage' || !canvasRef.current || !mazeRef.current) return;
    managerRef.current = new CanvasManager({
      canvas: canvasRef.current, mazeCanvas: mazeRef.current,
      onScoreChange:   v  => { setScore(v); setHighScore(p => Math.max(p, v)); },
      onTimerChange:   v  => setTimeLeft(v),
      onGameOver: async ({ score: s, mode: m }) => {
        setGameOver(true);
        try {
          const res = await axios.post(apiUrl('/api/scores'), { username: usernameRef.current.trim() || 'Player', score: s, mode: m });
          if (typeof res?.data?.highScore === 'number') setHighScore(p => Math.max(p, res.data.highScore));
        } catch (e) { console.error(e); }
      },
      onMazeEvent: ({ type }) => {
        if (type === 'wall-hit')  setMazeHits(p => p + 1);
        if (type === 'completed') setMazeCompleted(true);
      },
      onDrawingToggle: setIsDrawing,
    });
    managerRef.current.resize(dimensions.width, dimensions.height);
    managerRef.current.setMode(mode);
    return () => { managerRef.current = null; };
  }, [screen]);

  useEffect(() => { managerRef.current?.resize(dimensions.width, dimensions.height); }, [dimensions]);

  useEffect(() => {
    setGameOver(false);
    if (mode === 'slasher') { setScore(0); setTimeLeft(60); }
    if (mode === 'puzzle')  { setMazeHits(0); setMazeCompleted(false); }
    managerRef.current?.setMode(mode);
    if (mode === 'puzzle') managerRef.current?.setPuzzleLevel(puzzleLevel);
  }, [mode]);

  useEffect(() => {
    if (mode === 'puzzle') managerRef.current?.setPuzzleLevel(puzzleLevel);
  }, [puzzleLevel, mode]);

  /* RAF loop */
  useEffect(() => {
    if (screen !== 'stage') return;
    let raf;
    const tick = () => {
      if (ready && !mazeNeedsLandscape) managerRef.current?.step(handRef.current, performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, mazeNeedsLandscape, screen]);

  useEffect(() => {
    if (mode !== 'neon') return;
    document.documentElement.style.overscrollBehavior = isDrawing ? 'none' : 'auto';
    document.body.style.touchAction = isDrawing ? 'none' : 'auto';
    return () => { document.documentElement.style.overscrollBehavior = 'auto'; document.body.style.touchAction = 'auto'; };
  }, [isDrawing, mode]);

  const restartGame    = () => { setGameOver(false); setScore(0); setTimeLeft(60); managerRef.current?.startSlasherGame(); };
  const clearNeon      = () => managerRef.current?.clearNeon();

  /* ══════════════════════════════ HOME ══════════════════════════════ */
  if (screen === 'home') return (
    <div className="home-page">
      <Particles />
      <div className="aurora-1" />
      <div className="aurora-2" />
      <div className="aurora-3" />

      <div className="home-container">
        {/* Header */}
        <div className="home-header">
          <div>
            <div className="home-eyebrow">
              <span className="eyebrow-dot" />
              MediaPipe · Real-Time Hand Tracking · No Controller
            </div>
            <h1 className="home-title">
              Air Gesture
              <span className="title-line2">Arcade</span>
            </h1>
            <p className="home-subtitle">
              No controllers. No touch. Just your hand and the camera.
              Wave, pinch, and slice your way through three unique game modes.
            </p>
          </div>

          {/* Live version badge */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '999px',
              border: '1px solid rgba(103, 232, 249, 0.3)',
              background: 'rgba(103, 232, 249, 0.06)',
              fontFamily: 'var(--font-mono)', fontSize: '.6rem', letterSpacing: '.12em',
              color: 'var(--cyan)', textTransform: 'uppercase',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', animation: 'pulseDot 1.4s infinite' }} />
              v2.0 Live
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '.55rem', color: 'var(--text-dim)', letterSpacing: '.1em', textAlign: 'right',
            }}>
              MediaPipe · React · Canvas
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="home-stats">
          {[
            { value: '3', label: 'Game Modes' },
            { value: '60fps', label: 'Real-time' },
            { value: '21pt', label: 'Hand Landmarks' },
            { value: '∞', label: 'Creativity' },
          ].map(s => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mode cards */}
        <div className="modes-grid">
          {MODES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setMode(item.id); setScreen('stage'); }}
              className={`home-mode-card ${item.cardClass}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="floating-tag">MODE {String(i + 1).padStart(2, '0')}</span>

              <div className={`card-badge ${item.badgeClass}`}>
                {item.tag}
              </div>

              <div className={`card-icon-wrap ${item.iconClass}`}>
                <span style={{ fontSize: '1.7rem' }}>{item.emoji}</span>
              </div>

              <div className="card-title">{item.title}</div>
              <div className="card-subtitle">{item.subtitle}</div>

              <span className="card-cta">
                Launch
                <span className="cta-arrow">→</span>
              </span>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: '32px', paddingTop: '24px',
          borderTop: '1px solid rgba(139, 92, 246, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.6rem', color: 'var(--text-dim)', letterSpacing: '.08em' }}>
            ☝️ Point to draw · 🖐️ Open palm to clear
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', color: 'rgba(107, 77, 138, 0.5)', letterSpacing: '.08em' }}>
            Requires camera access
          </p>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════ STAGE ══════════════════════════════ */
  const sbW = 284;

  return (
    <>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.7} }
        @keyframes hudPop   { 0%{transform:scale(.88);opacity:0} 100%{transform:scale(1);opacity:1} }

        /* sidebar panel */
        .sb-wrap {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 30;
        }
        .sb-panel {
          pointer-events: all;
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: ${sbW}px;
          padding: 16px;
          background: rgba(3, 0, 12, 0.95);
          border-right: 1px solid rgba(139, 92, 246, 0.35);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          box-shadow: 6px 0 60px rgba(80, 20, 180, 0.4);
          overflow-y: auto; overflow-x: hidden;
          transform: translateX(${sidebarOpen ? '0' : `-${sbW}px`});
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        .sb-panel::-webkit-scrollbar { width: 3px; }
        .sb-panel::-webkit-scrollbar-thumb { background: rgba(139,92,246,.4); border-radius: 9px; }

        /* pull tab */
        .sb-tab {
          pointer-events: all;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: ${sidebarOpen ? `${sbW}px` : '0px'};
          transition: left 0.4s cubic-bezier(0.22,1,0.36,1);
          width: 22px;
          padding: 20px 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
          background: rgba(3, 0, 12, 0.92);
          border: 1px solid rgba(139, 92, 246, 0.45);
          border-left: none;
          border-radius: 0 10px 10px 0;
          cursor: pointer;
          backdrop-filter: blur(16px);
          z-index: 31;
          transition: left 0.4s cubic-bezier(0.22,1,0.36,1), background 0.2s, border-color 0.2s;
        }
        .sb-tab:hover { background: rgba(124,58,237,.25); border-color: rgba(168,85,247,.7); }
        .sb-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(168,85,247,.5); }
        .sb-dot.hi { background: var(--purple-400); box-shadow: 0 0 8px rgba(168,85,247,.9); animation: pulseDot 1.8s ease-in-out infinite; }

        /* arrow on tab */
        .sb-arrow {
          font-size: 8px;
          color: rgba(168,85,247,.7);
          line-height: 1;
          margin-top: 4px;
          transition: transform 0.3s;
          transform: rotate(${sidebarOpen ? '180deg' : '0deg'});
        }

        /* HUD pills */
        .hud-wrap { position: absolute; top: 14px; right: 14px; z-index: 20; display: flex; gap: 8px; pointer-events: none; animation: hudPop .35s ease both; }
        .hud-pill {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 10px 16px; border-radius: 14px;
          border: 1px solid rgba(139,92,246,.3);
          background: rgba(3,0,12,.88); backdrop-filter: blur(16px);
          box-shadow: 0 4px 20px rgba(0,0,0,.4);
        }
        .hud-lbl { font-family: var(--font-mono); font-size: .52rem; letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); }
        .hud-val { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: var(--purple-300); line-height: 1; }
        .hud-val.c { color: var(--cyan); }
        .hud-val.m { color: var(--magenta); }

        /* mode label bottom-right */
        .mode-lbl {
          position: absolute; bottom: 14px; right: 14px; z-index: 20;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 14px;
          border: 1px solid rgba(139,92,246,.22);
          background: rgba(3,0,12,.8); backdrop-filter: blur(16px);
          box-shadow: 0 4px 20px rgba(0,0,0,.4);
        }

        /* sb section title */
        .sb-section { font-family: var(--font-mono); font-size: .52rem; letter-spacing: .14em; text-transform: uppercase; color: var(--text-dim); margin: 12px 0 6px; }
        .sb-divider { height: 1px; background: rgba(139,92,246,.14); margin: 10px 0; }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '14px', display: 'flex', flexDirection: 'column' }}>
        <div ref={stageRef} style={{
          position: 'relative', margin: '0 auto', width: '100%', maxWidth: '1400px',
          height: 'calc(100vh - 28px)', overflow: 'hidden', borderRadius: '20px',
          border: '1px solid rgba(139,92,246,.3)', background: '#03000b',
          boxShadow: '0 0 0 1px rgba(168,85,247,.04) inset, 0 0 120px rgba(80,20,180,.22), 0 30px 80px rgba(0,0,0,.85)',
        }}>

          {/* camera */}
          <Webcam ref={webcamRef} audio={false} mirrored
            videoConstraints={{ facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .45 }}
          />

          {/* canvases */}
          <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }} />
          <canvas ref={mazeRef} width={dimensions.width} height={dimensions.height} style={{ display: 'none' }} />

          {/* ── sidebar wrapper ── */}
          <div className="sb-wrap">
            {/* pull-tab */}
            <div className="sb-tab" onClick={() => setSidebarOpen(v => !v)} title={sidebarOpen ? 'Hide menu' : 'Open menu'}>
              <div className="sb-dot hi" />
              <div className="sb-dot" />
              <div className="sb-dot" />
              <div className="sb-arrow">▶</div>
            </div>

            {/* panel */}
            <div className="sb-panel">
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '.66rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text)' }}>
                  Air Studio
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                    background: ready ? 'var(--cyan)' : 'var(--purple-400)',
                    boxShadow: ready ? '0 0 10px var(--cyan)' : '0 0 10px var(--purple-400)',
                    animation: 'pulseDot 1.8s ease-in-out infinite',
                  }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', letterSpacing: '.1em', textTransform: 'uppercase', color: ready ? 'var(--cyan)' : 'var(--purple-300)' }}>
                    {ready ? 'Live' : 'Init'}
                  </span>
                </div>
              </div>

              {/* back */}
              <button type="button"
                onClick={() => { setScreen('home'); setSidebarOpen(false); }}
                style={{
                  width: '100%', borderRadius: '8px', border: '1px solid rgba(139,92,246,.22)',
                  background: 'rgba(255,255,255,.02)', color: 'var(--text-muted)', padding: '8px 12px',
                  fontFamily: 'var(--font-mono)', fontSize: '.6rem', letterSpacing: '.1em', textTransform: 'uppercase',
                  cursor: 'pointer', marginBottom: '12px', transition: 'all .2s ease',
                  display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,.5)'; e.currentTarget.style.color = 'var(--purple-300)'; e.currentTarget.style.background = 'rgba(124,58,237,.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,.22)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
              >
                ← Back to Menu
              </button>

              <div className="sb-section">Mode Select</div>

              {/* modes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '4px' }}>
                {MODES.map(item => (
                  <button key={item.id} onClick={() => setMode(item.id)} style={{
                    width: '100%', borderRadius: '10px',
                    border: mode === item.id ? '1px solid rgba(168,85,247,.72)' : '1px solid rgba(139,92,246,.12)',
                    background: mode === item.id ? 'rgba(124,58,237,.24)' : 'rgba(255,255,255,.02)',
                    boxShadow: mode === item.id ? '0 0 24px rgba(168,85,247,.22), inset 0 0 0 1px rgba(200,150,255,.06)' : 'none',
                    padding: '10px 11px', textAlign: 'left', cursor: 'pointer', transition: 'all .2s ease',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontSize: '1.05rem', filter: mode === item.id ? 'drop-shadow(0 0 8px rgba(168,85,247,.9))' : 'none' }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '.58rem', letterSpacing: '.07em', textTransform: 'uppercase', color: mode === item.id ? 'var(--purple-200)' : 'var(--text)', fontWeight: 700 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-dim)', marginTop: '1px', fontFamily: 'var(--font-body)' }}>
                        {item.subtitle.split(' ').slice(0, 5).join(' ')}…
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="sb-divider" />

              {/* neon controls */}
              {mode === 'neon' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="sb-section">Neon Controls</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.56rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Status</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.62rem', color: isDrawing ? 'var(--cyan)' : 'var(--text-dim)' }}>
                      {isDrawing ? '● Drawing' : '○ Point to draw'}
                    </span>
                  </div>
                  <button type="button" onClick={clearNeon} style={{
                    borderRadius: '8px', border: '1px solid rgba(232,121,249,.32)', background: 'rgba(232,121,249,.08)',
                    color: 'var(--magenta)', padding: '9px', fontFamily: 'var(--font-body)', fontSize: '.82rem', fontWeight: 700,
                    cursor: 'pointer', width: '100%', transition: 'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,121,249,.16)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(232,121,249,.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,121,249,.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >🗑 Clear Canvas</button>
                </div>
              )}

              {/* slasher controls */}
              {mode === 'slasher' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="sb-section">Player</div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter name…" style={{
                      borderRadius: '8px', border: '1px solid rgba(139,92,246,.28)', background: 'rgba(255,255,255,.04)',
                      color: 'var(--text)', padding: '8px 11px', fontFamily: 'var(--font-body)', fontSize: '.88rem', outline: 'none', width: '100%',
                    }} />
                  </label>
                  <div className="sb-section">Stats</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                    {[['Score', score], ['Time', `${timeLeft}s`], ['Best', highScore]].map(([l, v]) => (
                      <div key={l} style={{ borderRadius: '8px', border: '1px solid rgba(139,92,246,.16)', background: 'rgba(255,255,255,.02)', padding: '8px 4px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.52rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>{l}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '.9rem', color: l === 'Time' ? 'var(--cyan)' : 'var(--purple-300)', fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {gameOver && (
                    <button type="button" onClick={restartGame} style={{
                      borderRadius: '8px', border: '1px solid rgba(103,232,249,.45)', background: 'rgba(103,232,249,.12)',
                      color: 'var(--cyan)', padding: '9px', fontFamily: 'var(--font-display)', fontSize: '.65rem', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', width: '100%',
                    }}>↺ Play Again</button>
                  )}
                </div>
              )}

              {/* puzzle controls */}
              {mode === 'puzzle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="sb-section">Level (1–10)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(lvl => (
                      <button key={lvl} type="button" onClick={() => { setPuzzleLevel(lvl); setMazeHits(0); setMazeCompleted(false); }}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: puzzleLevel === lvl ? '1px solid var(--amber)' : '1px solid rgba(139,92,246,.3)',
                          background: puzzleLevel === lvl ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.04)',
                          color: puzzleLevel === lvl ? 'var(--amber)' : 'var(--text-muted)', fontSize: '.6rem', fontWeight: 700, cursor: 'pointer',
                        }}
                      >{lvl}</button>
                    ))}
                  </div>
                  <div className="sb-section">Maze Status</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    {[['Wall Hits', mazeHits], ['Status', mazeCompleted ? '✓ Done' : 'In progress']].map(([l, v]) => (
                      <div key={l} style={{ borderRadius: '8px', border: '1px solid rgba(139,92,246,.16)', background: 'rgba(255,255,255,.02)', padding: '10px 6px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.52rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>{l}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '.95rem', color: mazeCompleted ? 'var(--cyan)' : 'var(--purple-300)', fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {mazeCompleted && (
                    <button type="button" onClick={() => { const next = puzzleLevel < 10 ? puzzleLevel + 1 : 1; setPuzzleLevel(next); setMazeHits(0); setMazeCompleted(false); }}
                      style={{
                        borderRadius: '8px', border: '1px solid rgba(251,191,36,.5)', background: 'rgba(251,191,36,.15)',
                        color: 'var(--amber)', padding: '9px', fontFamily: 'var(--font-display)', fontSize: '.65rem', fontWeight: 700,
                        letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', width: '100%',
                      }}
                    >{puzzleLevel < 10 ? 'Next Level →' : '↺ Level 1'}</button>
                  )}
                  <p style={{ fontSize: '.7rem', color: 'var(--text-dim)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>
                    Hitting walls resets your position. Reach FINISH with zero hits!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── HUD (visible when sidebar closed) ── */}
          {!sidebarOpen && mode === 'slasher' && (
            <div className="hud-wrap">
              <div className="hud-pill"><span className="hud-lbl">Score</span><span className="hud-val">{score}</span></div>
              <div className="hud-pill"><span className="hud-lbl">Time</span><span className="hud-val c">{timeLeft}s</span></div>
              <div className="hud-pill"><span className="hud-lbl">Best</span><span className="hud-val" style={{ color: 'var(--amber)', fontSize: '.9rem' }}>{highScore}</span></div>
              {gameOver && (
                <button type="button" onClick={restartGame} style={{
                  pointerEvents: 'all', borderRadius: '14px', border: '1px solid rgba(103,232,249,.45)',
                  background: 'rgba(103,232,249,.14)', color: 'var(--cyan)', padding: '0 18px',
                  fontFamily: 'var(--font-display)', fontSize: '.62rem', fontWeight: 700, letterSpacing: '.08em',
                  textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(16px)',
                  boxShadow: '0 0 20px rgba(103,232,249,.3)',
                }}>↺ Again</button>
              )}
            </div>
          )}

          {!sidebarOpen && mode === 'puzzle' && (
            <div className="hud-wrap">
              <div className="hud-pill"><span className="hud-lbl">Lvl</span><span className="hud-val" style={{ color: 'var(--amber)', fontSize: '.9rem' }}>{puzzleLevel}</span></div>
              <div className="hud-pill"><span className="hud-lbl">Hits</span><span className="hud-val m">{mazeHits}</span></div>
              {mazeCompleted && <div className="hud-pill"><span className="hud-lbl">Done!</span><span className="hud-val c">✓</span></div>}
            </div>
          )}

          {!sidebarOpen && mode === 'neon' && isDrawing && (
            <div className="hud-wrap">
              <div className="hud-pill" style={{ borderColor: 'rgba(103,232,249,.35)' }}>
                <span className="hud-lbl">Mode</span>
                <span className="hud-val c" style={{ fontSize: '.75rem' }}>● Drawing</span>
              </div>
            </div>
          )}

          {/* mode label bottom-right */}
          <div className="mode-lbl">
            <span style={{ fontSize: '1rem', filter: 'drop-shadow(0 0 8px rgba(168,85,247,.7))' }}>{modeMeta.emoji || modeMeta.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--purple-300)' }}>{modeMeta.title}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>{modeMeta.tag || modeMeta.subtitle?.split(' ').slice(0, 4).join(' ')}…</div>
            </div>
          </div>

          {/* loading overlay */}
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,0,8,.92)', backdropFilter: 'blur(12px)' }}>
              <div style={{ width: 420, maxWidth: '88vw', borderRadius: '24px', border: '1px solid rgba(139,92,246,.45)', background: 'rgba(4,0,14,.98)', padding: '40px', boxShadow: '0 0 100px rgba(124,58,237,.4)', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 24px' }}>
                  <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(168,85,247,.12)', borderTopColor: 'var(--purple-400)', borderRightColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
                  <div style={{ position: 'absolute', inset: 8, border: '1px solid rgba(103,232,249,.2)', borderBottomColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 1.4s linear infinite reverse' }} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.82rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '22px' }}>Calibrating Camera</h2>
                <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(139,92,246,.15)', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ height: '100%', borderRadius: '999px', width: `${loadingProgress}%`, background: 'linear-gradient(90deg,var(--purple-500),var(--cyan))', boxShadow: '0 0 14px rgba(168,85,247,.7)', transition: 'width .2s ease' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.6rem', color: 'var(--text-dim)', letterSpacing: '.08em' }}>Loading MediaPipe WASM · {loadingProgress}%</p>
                {error && <p style={{ marginTop: '14px', fontFamily: 'var(--font-mono)', fontSize: '.68rem', color: 'var(--magenta)' }}>{error}</p>}
              </div>
            </div>
          )}

          {/* landscape warning */}
          {mazeNeedsLandscape && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,0,8,.96)', backdropFilter: 'blur(8px)', textAlign: 'center' }}>
              <div style={{ borderRadius: '22px', border: '1px solid rgba(232,121,249,.35)', background: 'rgba(8,0,24,.98)', padding: '36px', boxShadow: '0 0 60px rgba(232,121,249,.2)' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '16px' }}>⟳</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '.8rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--magenta)', marginBottom: '10px' }}>Rotate to Landscape</h3>
                <p style={{ fontSize: '.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Puzzle Lane needs a wider screen for accurate maze tracking.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}