'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - light blue
  '#ffb74d', // L - orange
  '#ff9800', // Tuerca - naranja
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (nut) - 3x3 con hueco central
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

// --- menú de pausa ---
const overlayBox = document.querySelector('.overlay-box');
const pauseMenu = document.getElementById('pause-menu');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('pm-resume');
const menuRestartBtn = document.getElementById('pm-restart');
const showControlsBtn = document.getElementById('pm-controls');
const controlsBackBtn = document.getElementById('pm-controls-back');
const levelSelect = document.getElementById('pm-level-select');

const THEME_KEY = 'tetris-theme';

// ---- Temas visuales / skins ----
// Cada skin aporta: paleta de 8 colores (equivale a COLORS[1..8]), color de
// rejilla y de highlight por tema claro/oscuro, y un modo de dibujo de bloque.
// - retro : comportamiento actual EXACTO (colores planos + highlight superior 4px).
// - neon  : glow con shadowBlur/shadowColor; fuerza estetica oscura (fondo negro
//           via body.skin-neon en CSS) y rejilla/highlight fijos.
// - pastel: colores suaves + esquinas redondeadas con ctx.roundRect (fallback
//           a fillRect si el navegador no lo soporta). Respeta highlight por tema.
// - pixel : patron de textura (puntos oscuros) encima de cada bloque. Respeta
//           highlight por tema.
const SKIN_KEY = 'tetris-skin';
const SKINS = {
  retro: {
    // reutiliza la paleta global para no duplicarla: retro == comportamiento actual.
    colors: COLORS,
    grid: { dark: '#22222e', light: '#d5d5e0' },
    highlight: { dark: 'rgba(255,255,255,0.12)', light: 'rgba(0,0,0,0.12)' },
    mode: 'flat',
  },
  neon: {
    colors: [null, '#00e5ff', '#ffea00', '#e040fb', '#00e676', '#ff1744', '#2979ff', '#ff9100', '#cfd8dc'],
    // rejilla y highlight identicos en ambos temas: neon fuerza su estetica oscura.
    grid: { dark: '#0b2b33', light: '#0b2b33' },
    highlight: { dark: 'rgba(255,255,255,0.16)', light: 'rgba(255,255,255,0.16)' },
    mode: 'neon',
  },
  pastel: {
    colors: [null, '#a0e7e5', '#fdffb6', '#d5b8e8', '#b5ead7', '#ffb3ba', '#a2d2ff', '#ffd8a8', '#d9d9e0'],
    grid: { dark: '#2b2b36', light: '#e2e2ec' },
    highlight: { dark: 'rgba(255,255,255,0.20)', light: 'rgba(0,0,0,0.10)' },
    mode: 'round',
  },
  pixel: {
    colors: [null, '#3fa9c9', '#e0b93c', '#9a55b8', '#5fa563', '#c95050', '#4a82c9', '#d98a35', '#8f9aa3'],
    grid: { dark: '#1c1c26', light: '#cfcfda' },
    highlight: { dark: 'rgba(255,255,255,0.10)', light: 'rgba(0,0,0,0.14)' },
    mode: 'pixel',
  },
};
const SETTINGS_KEY = 'tetris-settings';
const MAX_START_LEVEL = 15;
const GRID_COLORS = { dark: '#22222e', light: '#d5d5e0' };
const HIGHLIGHT_COLORS = { dark: 'rgba(255,255,255,0.12)', light: 'rgba(0,0,0,0.12)' };

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let startLevelBase = 1; // nivel inicial de la partida en curso; el nivel nunca baja de aquí
let menuOpen = false;
let theme = 'dark';
let skin = 'retro';

// Ajustes persistidos en localStorage bajo la clave `tetris-settings`.
let settings = { startLevel: 1 };

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const n = parseInt(parsed && parsed.startLevel, 10);
      if (n >= 1 && n <= MAX_START_LEVEL) settings.startLevel = n;
    }
  } catch (e) {
    // en file:// el acceso a localStorage puede lanzar; se ignora
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // idem: se ignora si localStorage no está disponible
  }
}

function populateLevelSelect() {
  for (let i = 1; i <= MAX_START_LEVEL; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    levelSelect.appendChild(opt);
  }
}

function applyTheme(t) {
  theme = t;
  document.body.classList.toggle('light-theme', t === 'light');
  themeToggleBtn.textContent = t === 'light' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, t);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', () => {
  applyTheme(theme === 'light' ? 'dark' : 'light');
});

// ---- skins: calcado de applyTheme / initTheme ----
function isSkin(name) {
  return Object.prototype.hasOwnProperty.call(SKINS, name);
}

function applySkin(name) {
  skin = isSkin(name) ? name : 'retro';
  document.body.classList.remove('skin-retro', 'skin-neon', 'skin-pastel', 'skin-pixel');
  document.body.classList.add('skin-' + skin);
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch (e) {
    /* localStorage no disponible (modo privado, etc.) */
  }
  // Repintar de inmediato sin recargar. current/next solo existen tras spawn().
  if (current && next) {
    draw();
    drawNext();
  }
}

function initSkin() {
  let saved = null;
  try {
    saved = localStorage.getItem(SKIN_KEY);
  } catch (e) {
    /* localStorage no disponible */
  }
  applySkin(isSkin(saved) ? saved : 'retro');
  skinSelect.value = skin;
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  skinSelect.blur();
});

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.max(startLevelBase, Math.floor(lines / 10) + 1);
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const active = SKINS[skin];
  const color = active.colors[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const inner = size - 2;
  context.globalAlpha = alpha ?? 1;

  if (active.mode === 'neon') {
    // Glow: pintar el bloque con sombra y RESETEAR shadowBlur al terminar,
    // si no contamina la rejilla, el ghost y el siguiente bloque.
    context.save();
    context.shadowColor = color;
    context.shadowBlur = size * 0.45;
    context.fillStyle = color;
    context.fillRect(px, py, inner, inner);
    context.restore();
    context.shadowBlur = 0;
    context.fillStyle = active.highlight[theme];
    context.fillRect(px, py, inner, 4);
  } else if (active.mode === 'round') {
    // Esquinas redondeadas simuladas con roundRect (fallback: fillRect).
    context.fillStyle = color;
    if (typeof context.roundRect === 'function') {
      context.beginPath();
      context.roundRect(px, py, inner, inner, Math.max(2, size * 0.2));
      context.fill();
    } else {
      context.fillRect(px, py, inner, inner);
    }
    context.fillStyle = active.highlight[theme];
    context.fillRect(px, py, inner, 4);
  } else if (active.mode === 'pixel') {
    // Bloque plano + patron de puntos oscuros a modo de textura pixelada.
    context.fillStyle = color;
    context.fillRect(px, py, inner, inner);
    context.fillStyle = 'rgba(0,0,0,0.22)';
    const step = Math.max(4, Math.floor(size / 5));
    for (let gx = px + 2; gx < px + inner - 1; gx += step) {
      for (let gy = py + 2; gy < py + inner - 1; gy += step) {
        context.fillRect(gx, gy, 2, 2);
      }
    }
    context.fillStyle = active.highlight[theme];
    context.fillRect(px, py, inner, 4);
  } else {
    // retro: comportamiento actual EXACTO (colores planos + highlight 4px).
    context.fillStyle = color;
    context.fillRect(px, py, inner, inner);
    context.fillStyle = active.highlight[theme];
    context.fillRect(px, py, inner, 4);
  }

  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = SKINS[skin].grid[theme];
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  menuOpen = false;
  paused = false;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  pauseMenu.classList.add('hidden');
  overlayBox.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

// Muestra el sub-panel indicado del menú de pausa ('main' | 'controls').
function showPausePanel(which) {
  const main = which === 'main';
  pauseMain.classList.toggle('hidden', !main);
  pauseControls.classList.toggle('hidden', main);
}

// Elementos navegables con flechas según el panel visible.
function menuFocusables() {
  if (!pauseControls.classList.contains('hidden')) return [controlsBackBtn];
  return [resumeBtn, menuRestartBtn, showControlsBtn, levelSelect];
}

function moveMenuFocus(dir) {
  const items = menuFocusables();
  const idx = items.indexOf(document.activeElement);
  const nidx = idx < 0 ? 0 : (idx + dir + items.length) % items.length;
  items[nidx].focus();
}

function openPauseMenu() {
  if (gameOver || menuOpen) return;
  menuOpen = true;
  paused = true;
  cancelAnimationFrame(animId);
  showPausePanel('main');
  levelSelect.value = String(settings.startLevel);
  overlayBox.classList.add('hidden');
  pauseMenu.classList.remove('hidden');
  overlay.classList.remove('hidden');
  resumeBtn.focus();
}

function closePauseMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  paused = false;
  pauseMenu.classList.add('hidden');
  overlayBox.classList.remove('hidden');
  overlay.classList.add('hidden');
  lastTime = performance.now(); // evita un dt gigante; dropAccum se conserva a propósito
  animId = requestAnimationFrame(loop);
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init(startLevel = 1) {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  startLevelBase = startLevel;
  paused = false;
  gameOver = false;
  menuOpen = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  pauseMenu.classList.add('hidden');
  overlayBox.classList.remove('hidden');
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  // Con el menú de pausa abierto: capturamos navegación y bloqueamos el juego.
  // Ignoramos la repetición de tecla para evitar movimientos accidentales al volver.
  if (menuOpen) {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyP':
      case 'Escape':
        e.preventDefault();
        closePauseMenu();
        break;
      case 'ArrowUp':
        if (document.activeElement === levelSelect) return; // deja que el select cambie de valor
        e.preventDefault();
        moveMenuFocus(-1);
        break;
      case 'ArrowDown':
        if (document.activeElement === levelSelect) return;
        e.preventDefault();
        moveMenuFocus(1);
        break;
      case 'Enter':
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName !== 'SELECT') {
          document.activeElement.click();
        }
        break;
      case 'Space':
        e.preventDefault();
        break;
    }
    return;
  }

  // Abrir el menú con P o Escape (Escape no hace nada si hay game over).
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (e.code === 'Escape' && gameOver) return;
    e.preventDefault();
    openPauseMenu();
    return;
  }

  // Bloquea todos los inputs de juego mientras está en pausa o game over.
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => init(settings.startLevel));

// --- listeners del menú de pausa ---
resumeBtn.addEventListener('click', closePauseMenu);
menuRestartBtn.addEventListener('click', () => init(settings.startLevel));
showControlsBtn.addEventListener('click', () => {
  showPausePanel('controls');
  controlsBackBtn.focus();
});
controlsBackBtn.addEventListener('click', () => {
  showPausePanel('main');
  resumeBtn.focus();
});
levelSelect.addEventListener('change', () => {
  const n = parseInt(levelSelect.value, 10);
  if (n >= 1 && n <= MAX_START_LEVEL) {
    settings.startLevel = n;
    saveSettings();
  }
});

initTheme();
initSkin();
init();
loadSettings();
populateLevelSelect();
levelSelect.value = String(settings.startLevel);
init(settings.startLevel);
