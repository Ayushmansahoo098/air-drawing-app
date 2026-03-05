const WALL_RGB = { r: 25, g: 30, b: 56 };

// 10 puzzle levels: paths as [xRatio, yRatio] 0-1, lineWidth ratio, start/finish
// Start bottom-left, finish top-right
const PUZZLE_LEVELS = [
  { path: [[0.12, 0.84], [0.12, 0.2], [0.88, 0.2], [0.88, 0.16]], lineWidth: 0.12 }, // 1: simple L
  { path: [[0.12, 0.84], [0.12, 0.5], [0.5, 0.5], [0.5, 0.2], [0.88, 0.2], [0.88, 0.16]], lineWidth: 0.11 }, // 2: S shape
  { path: [[0.12, 0.84], [0.12, 0.6], [0.35, 0.6], [0.35, 0.35], [0.65, 0.35], [0.65, 0.2], [0.88, 0.2], [0.88, 0.16]], lineWidth: 0.10 }, // 3
  { path: [[0.12, 0.84], [0.12, 0.7], [0.3, 0.7], [0.3, 0.5], [0.5, 0.5], [0.5, 0.3], [0.7, 0.3], [0.7, 0.18], [0.88, 0.18], [0.88, 0.16]], lineWidth: 0.09 }, // 4
  { path: [[0.12, 0.84], [0.12, 0.75], [0.25, 0.75], [0.25, 0.55], [0.45, 0.55], [0.45, 0.4], [0.25, 0.4], [0.25, 0.25], [0.6, 0.25], [0.6, 0.2], [0.88, 0.2], [0.88, 0.16]], lineWidth: 0.085 }, // 5
  { path: [[0.12, 0.84], [0.12, 0.78], [0.22, 0.78], [0.22, 0.6], [0.38, 0.6], [0.38, 0.45], [0.22, 0.45], [0.22, 0.3], [0.5, 0.3], [0.5, 0.22], [0.72, 0.22], [0.72, 0.18], [0.88, 0.18], [0.88, 0.16]], lineWidth: 0.08 }, // 6
  { path: [[0.12, 0.84], [0.12, 0.8], [0.2, 0.8], [0.2, 0.65], [0.35, 0.65], [0.35, 0.5], [0.2, 0.5], [0.2, 0.35], [0.4, 0.35], [0.4, 0.25], [0.6, 0.25], [0.6, 0.2], [0.78, 0.2], [0.78, 0.17], [0.88, 0.17], [0.88, 0.16]], lineWidth: 0.075 }, // 7
  { path: [[0.12, 0.84], [0.12, 0.82], [0.18, 0.82], [0.18, 0.68], [0.3, 0.68], [0.3, 0.55], [0.18, 0.55], [0.18, 0.42], [0.35, 0.42], [0.35, 0.3], [0.2, 0.3], [0.2, 0.2], [0.55, 0.2], [0.55, 0.18], [0.75, 0.18], [0.75, 0.16], [0.88, 0.16]], lineWidth: 0.07 }, // 8
  { path: [[0.12, 0.84], [0.12, 0.8], [0.16, 0.8], [0.16, 0.7], [0.28, 0.7], [0.28, 0.58], [0.16, 0.58], [0.16, 0.48], [0.32, 0.48], [0.32, 0.38], [0.18, 0.38], [0.18, 0.28], [0.45, 0.28], [0.45, 0.22], [0.62, 0.22], [0.62, 0.18], [0.8, 0.18], [0.8, 0.16], [0.88, 0.16]], lineWidth: 0.065 }, // 9
  { path: [[0.12, 0.84], [0.12, 0.82], [0.14, 0.82], [0.14, 0.72], [0.24, 0.72], [0.24, 0.62], [0.14, 0.62], [0.14, 0.52], [0.28, 0.52], [0.28, 0.42], [0.14, 0.42], [0.14, 0.32], [0.32, 0.32], [0.32, 0.26], [0.48, 0.26], [0.48, 0.2], [0.64, 0.2], [0.64, 0.17], [0.82, 0.17], [0.82, 0.16], [0.88, 0.16]], lineWidth: 0.06 }, // 10: hardest
];

// Utility helpers shared across all modes.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toCanvasPoint(point, width, height) {
  return {
    x: clamp(point.x * width, 0, width),
    y: clamp(point.y * height, 0, height),
  };
}

function randomFruit(id, width, height) {
  const emojis = ['🍎', '🍊', '🍉', '🍓', '🥝', '🍍'];
  return {
    id,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: 60 + Math.random() * (width - 120),
    y: height + 40,
    vx: (Math.random() - 0.5) * 3,
    vy: -(9 + Math.random() * 6),
    radius: 28 + Math.random() * 14,
    sliced: false,
    slicedAt: 0,
  };
}

export default class CanvasManager {
  constructor({ canvas, mazeCanvas, onScoreChange, onTimerChange, onGameOver, onMazeEvent, onDrawingToggle }) {
    // Visible render surface (camera overlay).
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Offscreen maze surface used for wall-color collision checks.
    this.mazeCanvas = mazeCanvas;
    this.mazeCtx = mazeCanvas.getContext('2d', { willReadFrequently: true });

    this.mode = 'neon';
    this.width = canvas.width;
    this.height = canvas.height;

    this.onScoreChange = onScoreChange;
    this.onTimerChange = onTimerChange;
    this.onGameOver = onGameOver;
    this.onMazeEvent = onMazeEvent;
    this.onDrawingToggle = onDrawingToggle;

    // Neon mode state.
    this.hue = 0;
    this.prevDrawPoint = null;
    this.isDrawing = false;
    this.lastAllFingersExtended = false;

    // Fruit slasher mode state.
    this.swordTrail = [];
    this.fruits = [];
    this.spawnInterval = 620;
    this.lastSpawnAt = 0;
    this.gameDurationMs = 60000;
    this.gameStartedAt = 0;
    this.gameRunning = false;
    this.gameEnded = false;
    this.score = 0;
    this.fruitId = 1;

    // Puzzle mode state.
    this.puzzleLevel = 1;
    this.startPoint = { x: 80, y: this.height - 90 };
    this.finishPoint = { x: this.width - 90, y: 90 };
    this.orb = { ...this.startPoint };
    this.lastVibrateAt = 0;
    this.mazeCompleted = false;

    this.drawMazeLayout();
  }

  // Rebuild internal canvases when stage size changes.
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.mazeCanvas.width = width;
    this.mazeCanvas.height = height;

    if (this.mode === 'puzzle') {
      this.drawMazeLayout();
      this.orb = { ...this.startPoint };
    } else {
      this.startPoint = { x: width * 0.12, y: height * 0.84 };
      this.finishPoint = { x: width * 0.88, y: height * 0.16 };
    }
  }

  // Global mode switcher and per-mode reset.
  setMode(mode) {
    this.mode = mode;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.prevDrawPoint = null;
    this.isDrawing = false;
    this.lastAllFingersExtended = false;
    this.onDrawingToggle?.(false);

    if (mode === 'slasher') {
      this.startSlasherGame();
    }

    if (mode === 'puzzle') {
      this.mazeCompleted = false;
      this.orb = { ...this.startPoint };
      this.drawMazeLayout();
    }
  }

  setPuzzleLevel(level) {
    this.puzzleLevel = Math.max(1, Math.min(10, level));
    this.mazeCompleted = false;
    this.orb = { ...this.startPoint };
    this.drawMazeLayout();
  }

  // Initializes a fresh 60-second slasher session.
  startSlasherGame() {
    this.score = 0;
    this.fruits = [];
    this.swordTrail = [];
    this.gameStartedAt = performance.now();
    this.lastSpawnAt = this.gameStartedAt;
    this.gameRunning = true;
    this.gameEnded = false;
    this.onScoreChange?.(0);
    this.onTimerChange?.(60);
  }

  // Clears only the neon drawing layer.
  clearNeon() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.prevDrawPoint = null;
  }

  // Public frame entry point; routes frame to active mode logic.
  step(handData, now = performance.now()) {
    if (this.mode === 'neon') {
      this.stepNeon(handData);
      return;
    }

    if (this.mode === 'slasher') {
      this.stepSlasher(handData, now);
      return;
    }

    if (this.mode === 'puzzle') {
      this.stepPuzzle(handData, now);
    }
  }

  // Mode A: index finger only to draw, all fingers to clear.
  stepNeon({ indexTip, allFingersExtended, indexPointing }) {
    // Clear when all fingers extended (open palm)
    if (allFingersExtended) {
      if (!this.lastAllFingersExtended) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.prevDrawPoint = null;
      }
      this.lastAllFingersExtended = true;
      if (this.isDrawing) {
        this.isDrawing = false;
        this.onDrawingToggle?.(false);
      }
      return;
    }
    this.lastAllFingersExtended = false;

    if (!indexTip || !indexPointing) {
      this.prevDrawPoint = null;
      if (this.isDrawing) {
        this.isDrawing = false;
        this.onDrawingToggle?.(false);
      }
      return;
    }

    const raw = toCanvasPoint(indexTip, this.width, this.height);
    // Smooth point with lerp for cleaner strokes
    const smooth = this.prevDrawPoint
      ? {
          x: this.prevDrawPoint.x * 0.3 + raw.x * 0.7,
          y: this.prevDrawPoint.y * 0.3 + raw.y * 0.7,
        }
      : raw;
    const point = smooth;

    if (indexPointing) {
      const color = `hsl(${this.hue}, 100%, 62%)`;
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = color;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 7;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (this.prevDrawPoint) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.prevDrawPoint.x, this.prevDrawPoint.y);
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }

      this.hue = (this.hue + 5) % 360;
      this.prevDrawPoint = point;

      if (!this.isDrawing) {
        this.isDrawing = true;
        this.onDrawingToggle?.(true);
      }
      return;
    }

    this.prevDrawPoint = null;
    if (this.isDrawing) {
      this.isDrawing = false;
      this.onDrawingToggle?.(false);
    }
  }

  // Mode B: fruit spawn/movement, sword trail, collision, timer.
  stepSlasher({ indexTip }, now) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawSlasherBackground();

    if (!this.gameRunning) {
      this.drawGameOverOverlay();
      return;
    }

    const elapsed = now - this.gameStartedAt;
    const remainingSec = Math.max(0, Math.ceil((this.gameDurationMs - elapsed) / 1000));
    this.onTimerChange?.(remainingSec);

    if (elapsed >= this.gameDurationMs) {
      this.gameRunning = false;
      this.gameEnded = true;
      this.onGameOver?.({ score: this.score, mode: 'fruit-slasher' });
      this.drawGameOverOverlay();
      return;
    }

    if (now - this.lastSpawnAt >= this.spawnInterval) {
      this.fruits.push(randomFruit(this.fruitId++, this.width, this.height));
      this.lastSpawnAt = now;
    }

    let swordPoint = null;
    if (indexTip) {
      swordPoint = toCanvasPoint(indexTip, this.width, this.height);
      this.swordTrail.push({ ...swordPoint, life: 14 });
    }

    this.swordTrail = this.swordTrail
      .map((point) => ({ ...point, life: point.life - 1 }))
      .filter((point) => point.life > 0);

    this.fruits = this.fruits
      .map((fruit) => {
        const next = { ...fruit };

        if (!next.sliced) {
          next.vy += 0.17;
          next.x += next.vx;
          next.y += next.vy;

          if (swordPoint && dist(swordPoint, next) <= next.radius) {
            next.sliced = true;
            next.slicedAt = now;
            this.score += 10;
            this.onScoreChange?.(this.score);
          }
        }

        return next;
      })
      .filter((fruit) => {
        if (fruit.sliced) {
          return now - fruit.slicedAt < 220;
        }
        return fruit.y < this.height + 100;
      });

    this.drawSwordTrail();
    this.drawFruits(now);
    this.drawSlasherHud();
  }

  // Slasher visual helpers.
  drawSlasherBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, 'rgba(24, 16, 40, 0.28)');
    gradient.addColorStop(1, 'rgba(8, 10, 22, 0.44)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSlasherHud() {
    this.ctx.save();
    this.ctx.font = '700 24px Sora, sans-serif';
    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.fillText(`Score: ${this.score}`, 24, 42);
    this.ctx.restore();
  }

  drawGameOverOverlay() {
    if (!this.gameEnded) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(8, 10, 20, 0.65)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.font = '700 42px Sora, sans-serif';
    this.ctx.fillText('Game Over', this.width / 2, this.height / 2 - 12);
    this.ctx.font = '600 24px Sora, sans-serif';
    this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 28);
    this.ctx.restore();
  }

  drawSwordTrail() {
    if (this.swordTrail.length < 2) return;

    this.ctx.save();
    this.ctx.lineCap = 'round';
    for (let i = 1; i < this.swordTrail.length; i += 1) {
      const p1 = this.swordTrail[i - 1];
      const p2 = this.swordTrail[i];
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.strokeStyle = `rgba(111, 245, 255, ${p2.life / 14})`;
      this.ctx.lineWidth = (p2.life / 14) * 10;
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = 'rgba(111, 245, 255, 0.9)';
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawFruits(now) {
    this.fruits.forEach((fruit) => {
      this.ctx.save();
      this.ctx.translate(fruit.x, fruit.y);
      this.ctx.font = `${Math.round(fruit.radius * 1.7)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      if (fruit.sliced) {
        const life = clamp((now - fruit.slicedAt) / 220, 0, 1);
        this.ctx.globalAlpha = 1 - life;
        this.ctx.scale(1 + life * 0.7, 1 + life * 0.7);
      }

      this.ctx.fillText(fruit.emoji, 0, 0);

      if (fruit.sliced) {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-fruit.radius * 0.8, -fruit.radius * 0.8);
        this.ctx.lineTo(fruit.radius * 0.8, fruit.radius * 0.8);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  // Builds maze from PUZZLE_LEVELS for current puzzleLevel.
  drawMazeLayout() {
    this.mazeCtx.clearRect(0, 0, this.width, this.height);
    this.mazeCtx.fillStyle = `rgb(${WALL_RGB.r}, ${WALL_RGB.g}, ${WALL_RGB.b})`;
    this.mazeCtx.fillRect(0, 0, this.width, this.height);

    const level = PUZZLE_LEVELS[Math.min(this.puzzleLevel - 1, PUZZLE_LEVELS.length - 1)];
    const path = level.path.map(([rx, ry]) => [this.width * rx, this.height * ry]);
    this.startPoint = { x: path[0][0], y: path[0][1] };
    this.finishPoint = { x: path[path.length - 1][0], y: path[path.length - 1][1] };

    const lineWidth = Math.max(50, Math.min(this.width, this.height) * level.lineWidth);

    this.mazeCtx.save();
    this.mazeCtx.globalCompositeOperation = 'destination-out';
    this.mazeCtx.strokeStyle = 'rgba(0,0,0,1)';
    this.mazeCtx.lineWidth = lineWidth;
    this.mazeCtx.lineCap = 'round';
    this.mazeCtx.lineJoin = 'round';
    this.mazeCtx.beginPath();
    this.mazeCtx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i += 1) {
      this.mazeCtx.lineTo(path[i][0], path[i][1]);
    }
    this.mazeCtx.stroke();
    this.mazeCtx.restore();

    this.mazeCtx.save();
    this.mazeCtx.globalCompositeOperation = 'source-over';
    this.mazeCtx.fillStyle = '#21d07a';
    this.mazeCtx.beginPath();
    this.mazeCtx.arc(this.startPoint.x, this.startPoint.y, 28, 0, Math.PI * 2);
    this.mazeCtx.fill();

    this.mazeCtx.fillStyle = '#ff7b2f';
    this.mazeCtx.beginPath();
    this.mazeCtx.arc(this.finishPoint.x, this.finishPoint.y, 28, 0, Math.PI * 2);
    this.mazeCtx.fill();
    this.mazeCtx.restore();
  }

  // Mode C: move orb with finger, detect wall hits, trigger vibration, finish check.
  stepPuzzle({ indexTip }, now) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const bg = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    bg.addColorStop(0, 'rgba(8, 12, 30, 0.45)');
    bg.addColorStop(1, 'rgba(6, 16, 38, 0.58)');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.drawImage(this.mazeCanvas, 0, 0, this.width, this.height);

    if (indexTip) {
      this.orb = toCanvasPoint(indexTip, this.width, this.height);

      if (this.isWall(this.orb.x, this.orb.y)) {
        if (now - this.lastVibrateAt > 250) {
          if ('vibrate' in navigator) {
            navigator.vibrate(60);
          }
          this.lastVibrateAt = now;
        }

        this.orb = { ...this.startPoint };
        this.onMazeEvent?.({ type: 'wall-hit' });
      }

      if (!this.mazeCompleted && dist(this.orb, this.finishPoint) < 30) {
        this.mazeCompleted = true;
        this.onMazeEvent?.({ type: 'completed' });
      }
    }

    this.ctx.save();
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#9df7ff';
    this.ctx.fillStyle = '#95f2ff';
    this.ctx.beginPath();
    this.ctx.arc(this.orb.x, this.orb.y, 12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.font = '700 14px Sora, sans-serif';
    this.ctx.fillText('START', this.startPoint.x - 28, this.startPoint.y - 42);
    this.ctx.fillText('FINISH', this.finishPoint.x - 24, this.finishPoint.y - 42);
    this.ctx.font = '600 12px Sora, sans-serif';
    this.ctx.fillStyle = 'rgba(251,191,36,0.9)';
    this.ctx.fillText(`Level ${this.puzzleLevel}`, 14, 24);
  }

  // Wall collision via pixel color sampling from maze canvas.
  isWall(x, y) {
    const px = clamp(Math.round(x), 1, this.width - 2);
    const py = clamp(Math.round(y), 1, this.height - 2);

    const sample = this.mazeCtx.getImageData(px, py, 1, 1).data;
    const [r, g, b, a] = sample;

    if (a === 0) return false;

    return (
      Math.abs(r - WALL_RGB.r) < 10 &&
      Math.abs(g - WALL_RGB.g) < 10 &&
      Math.abs(b - WALL_RGB.b) < 10
    );
  }
}
