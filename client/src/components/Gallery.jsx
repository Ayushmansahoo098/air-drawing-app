import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

const API = apiUrl('/api/drawings');

/**
 * Gallery
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays all saved air drawings from the MongoDB backend.
 * Supports viewing and deleting drawings.
 */
export default function Gallery({ onToast }) {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(API);
      setDrawings(data.drawings || []);
    } catch (err) {
      setError('Failed to load drawings. Check backend URL/config.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this drawing?')) return;
    try {
      await axios.delete(`${API}/${id}`);
      setDrawings((prev) => prev.filter((d) => d._id !== id));
      if (selected?._id === id) setSelected(null);
      onToast?.('Drawing deleted', 'info');
    } catch (err) {
      onToast?.('Failed to delete drawing', 'error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <h1 className="gallery-title">Gallery</h1>
        <span className="gallery-count">{drawings.length} drawing{drawings.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="error-card">
          <h3>⚠️ Connection Error</h3>
          <p>{error}</p>
          <button
            className="btn-primary"
            onClick={fetchDrawings}
            style={{ marginTop: 16 }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="gallery-grid">
          {drawings.length === 0 ? (
            <div className="gallery-empty">
              <div className="gallery-empty-icon">🎨</div>
              <h3>No drawings yet</h3>
              <p>Head to the Studio to create your first air drawing!</p>
            </div>
          ) : (
            drawings.map((drawing) => (
              <div
                key={drawing._id}
                className="gallery-card"
                onClick={() => setSelected(drawing)}
              >
                <img
                  src={drawing.imageData}
                  alt={drawing.title}
                  className="gallery-card-img"
                  loading="lazy"
                />
                <div className="gallery-card-info">
                  <div>
                    <div className="gallery-card-title">{drawing.title}</div>
                    <div className="gallery-card-date">{formatDate(drawing.createdAt)}</div>
                  </div>
                  <button
                    className="gallery-card-delete"
                    onClick={(e) => handleDelete(drawing._id, e)}
                    title="Delete drawing"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            <img
              src={selected.imageData}
              alt={selected.title}
              style={{ display: 'block', maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain' }}
            />
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selected.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(selected.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={selected.imageData}
                  download={`${selected.title}.png`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', fontSize: '0.85rem' }}
                >
                  Download
                </a>
                <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
