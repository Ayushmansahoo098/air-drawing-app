import { useState } from 'react';

const PALETTE = [
  { color: '#00f5c8', label: 'Cyan' },
  { color: '#ff4d6d', label: 'Red' },
  { color: '#ffd166', label: 'Yellow' },
  { color: '#7b5ea7', label: 'Purple' },
  { color: '#ffffff', label: 'White' },
];

/**
 * Toolbar
 * ─────────────────────────────────────────────────────────────────────────────
 * Drawing controls: color picker, eraser toggle, clear, thickness, save.
 */
export default function Toolbar({
  color,
  setColor,
  thickness,
  setThickness,
  onClear,
  onSave,
  erasing,
  setErasing,
}) {
  const [customColor, setCustomColor] = useState('#ff9500');

  const handleColorClick = (c) => {
    setColor(c);
    setErasing(false);
  };

  return (
    <div className="toolbar">
      {/* ── Color Palette ─────────────────────────────── */}
      <div className="toolbar-section">
        <span className="toolbar-label">Color</span>
        {PALETTE.map(({ color: c, label }) => (
          <button
            key={c}
            className={`color-swatch ${color === c && !erasing ? 'active' : ''}`}
            style={{ background: c }}
            title={label}
            onClick={() => handleColorClick(c)}
            aria-label={`Select ${label}`}
          />
        ))}

        {/* Custom color picker */}
        <input
          type="color"
          className="color-picker-input"
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            handleColorClick(e.target.value);
          }}
          title="Custom color"
        />
      </div>

      <div className="toolbar-divider" />

      {/* ── Brush Size ────────────────────────────────── */}
      <div className="toolbar-section">
        <span className="toolbar-label">Size {thickness}px</span>
        <input
          type="range"
          min={2}
          max={30}
          value={thickness}
          onChange={(e) => setThickness(Number(e.target.value))}
          className="thickness-slider"
          title="Brush thickness"
        />
      </div>

      <div className="toolbar-divider" />

      {/* ── Tools ─────────────────────────────────────── */}
      <div className="toolbar-section">
        <button
          className={`tool-btn ${erasing ? 'active' : ''}`}
          onClick={() => setErasing((e) => !e)}
          title="Eraser (or ✌️ gesture)"
        >
          ◻ <span>Eraser</span>
        </button>

        <button
          className="tool-btn danger"
          onClick={onClear}
          title="Clear canvas"
        >
          ✕ <span>Clear</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* ── Save ──────────────────────────────────────── */}
      <div className="toolbar-section" style={{ marginLeft: 'auto' }}>
        <button className="tool-btn save" onClick={onSave} title="Save to gallery">
          ↓ <span>Save Drawing</span>
        </button>
      </div>
    </div>
  );
}
