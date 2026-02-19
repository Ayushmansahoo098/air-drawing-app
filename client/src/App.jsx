import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import HandTracking from './components/HandTracking';
import Toolbar from './components/Toolbar';
import Gallery from './components/Gallery';

// ─── Toast System ─────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Save Modal ───────────────────────────────────────────────────────────────
function SaveModal({ onSave, onCancel, loading }) {
  const [title, setTitle] = useState('Untitled Drawing');
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>💾 Save Drawing</h2>
        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Title
        </label>
        <input
          className="modal-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Air Drawing"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onSave(title)}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => onSave(title)} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('studio'); // 'studio' | 'gallery'
  const [color, setColor] = useState('#00f5c8');
  const [thickness, setThickness] = useState(5);
  const [erasing, setErasing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const handTrackingRef = useRef(null);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Clear canvas ───────────────────────────────────────────────────────────
  const handleClear = () => {
    handTrackingRef.current?.clearCanvas();
    addToast('Canvas cleared', 'info');
  };

  // ── Save drawing ───────────────────────────────────────────────────────────
  const handleSaveClick = () => setShowSaveModal(true);

  const handleSaveConfirm = async (title) => {
    const imageData = handTrackingRef.current?.getDataURL();
    if (!imageData) {
      addToast('Nothing to save yet!', 'error');
      setShowSaveModal(false);
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/drawings', {
        title: title || 'Untitled Drawing',
        imageData,
        color,
        thickness,
      });
      addToast('Drawing saved! 🎉', 'success');
      setShowSaveModal(false);
    } catch (err) {
      addToast('Save failed — is the server running?', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-dot" />
          AirDraw
        </div>
        <nav className="nav-links">
          <button
            className={`nav-btn ${page === 'studio' ? 'active' : ''}`}
            onClick={() => setPage('studio')}
          >
            ✦ Studio
          </button>
          <button
            className={`nav-btn ${page === 'gallery' ? 'active' : ''}`}
            onClick={() => setPage('gallery')}
          >
            ◈ Gallery
          </button>
        </nav>
      </header>

      {/* ── Pages ──────────────────────────────────────────────────── */}
      {page === 'studio' ? (
        <main className="studio-page">
          <HandTracking
            ref={handTrackingRef}
            color={color}
            thickness={thickness}
            erasing={erasing}
          />
          <Toolbar
            color={color}
            setColor={setColor}
            thickness={thickness}
            setThickness={setThickness}
            onClear={handleClear}
            onSave={handleSaveClick}
            erasing={erasing}
            setErasing={setErasing}
          />
        </main>
      ) : (
        <Gallery onToast={addToast} />
      )}

      {/* ── Save Modal ──────────────────────────────────────────────── */}
      {showSaveModal && (
        <SaveModal
          onSave={handleSaveConfirm}
          onCancel={() => setShowSaveModal(false)}
          loading={saving}
        />
      )}

      {/* ── Toasts ─────────────────────────────────────────────────── */}
      <Toast toasts={toasts} />
    </div>
  );
}
