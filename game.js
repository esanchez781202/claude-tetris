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
  '#b0bec5', // Tuerca - gris acero
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
const overlayBox = document.querySelector('.overlay-box');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// ---- menú de pausa ----
const pauseScreen = document.getElementById('pause-screen');
const pauseResumeBtn = document.getElementById('pause-resume');
const pauseRestartBtn = document.getElementById('pause-restart');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseControls = document.getElementById('pause-controls');
const pauseLevelSelect = document.getElementById('pause-level-select');

// ---- records: elementos de las pantallas de inicio / game over ----
const startScreen = document.getElementById('start-screen');
const startScoresEl = document.getElementById('start-scores');
const startBestComboEl = document.getElementById('start-best-combo');
const startMaxLinesEl = document.getElementById('start-max-lines');
const playBtn = document.getElementById('play-btn');
const gameoverScreen = document.getElementById('gameover-screen');
const goScoreEl = document.getElementById('go-score');
const goNameRow = document.getElementById('go-name-row');
const goNameInput = document.getElementById('go-name');
const goSaveBtn = document.getElementById('go-save');
const goScoresEl = document.getElementById('go-scores');
const goRestartBtn = document.getElementById('go-restart');
const goResetBtn = document.getElementById('go-reset');

const THEME_KEY = 'tetris-theme';
const GRID_COLORS = { dark: '#22222e', light: '#d5d5e0' };
const HIGHLIGHT_COLORS = { dark: 'rgba(255,255,255,0.12)', light: 'rgba(0,0,0,0.12)' };

const SCORES_KEY = 'tetris-scores';
const MAX_SCORES = 5;
const MAX_NAME = 12;

const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 20;
let startLevelChoice = 1; // nivel con el que arrancará la próxima partida

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let theme = 'dark';
// ---- records: estado ----
let scores = [];        // top 5 { name, score } ordenado desc
let bestCombo = 0;      // mejor combo global (entre partidas)
let maxLines = 0;       // líneas máximas en una partida (entre partidas)
let combo = 0;          // combo de la partida actual
let bestComboRun = 0;   // mejor combo de la partida actual
let running = false;    // hay una partida en curso
let scoreSubmitted = false; // ya se guardó la puntuación de este game over
let resetArmed = false;     // confirmación inline del botón "Resetear records"

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

// ---- records: persistencia sobre localStorage['tetris-scores'] ----
// Estructura guardada: { scores: [{name, score}], bestCombo: n, maxLines: n }

function loadScores() {
  scores = [];
  bestCombo = 0;
  maxLines = 0;
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return;
    const arr = Array.isArray(data.scores) ? data.scores : [];
    scores = arr
      .filter(e => e && typeof e.name === 'string' &&
        typeof e.score === 'number' && isFinite(e.score))
      .map(e => ({ name: e.name.slice(0, MAX_NAME), score: Math.floor(e.score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES);
    if (typeof data.bestCombo === 'number' && isFinite(data.bestCombo)) {
      bestCombo = Math.max(0, Math.floor(data.bestCombo));
    }
    if (typeof data.maxLines === 'number' && isFinite(data.maxLines)) {
      maxLines = Math.max(0, Math.floor(data.maxLines));
    }
  } catch (e) {
    scores = [];
    bestCombo = 0;
    maxLines = 0;
  }
}

function saveScores() {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify({ scores, bestCombo, maxLines }));
  } catch (e) {
    /* almacenamiento no disponible: se ignora */
  }
}

function qualifies(s) {
  if (!(s > 0)) return false;
  if (scores.length < MAX_SCORES) return true;
  return s > scores[scores.length - 1].score;
}

function addScore(name, s) {
  const clean = String(name || '').trim().slice(0, MAX_NAME) || 'ANON';
  const entry = { name: clean, score: Math.floor(s) };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, MAX_SCORES);
  saveScores();
  return entry;
}

function resetScores() {
  scores = [];
  bestCombo = 0;
  maxLines = 0;
  saveScores();
}

// Repinta una tabla top 5; resalta la fila cuyo objeto === highlight
function renderScoreRows(tbody, highlight) {
  tbody.innerHTML = '';
  if (!scores.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'records-empty';
    td.textContent = 'Sin records todavía';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  scores.forEach((e, i) => {
    const tr = document.createElement('tr');
    if (highlight && e === highlight) tr.className = 'records-highlight';
    const rank = document.createElement('td');
    rank.textContent = String(i + 1);
    const nm = document.createElement('td');
    nm.textContent = e.name;
    const sc = document.createElement('td');
    sc.textContent = e.score.toLocaleString();
    tr.append(rank, nm, sc);
    tbody.appendChild(tr);
  });
}

function showStartScreen() {
  overlayBox.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  startBestComboEl.textContent = bestCombo.toLocaleString();
  startMaxLinesEl.textContent = maxLines.toLocaleString();
  renderScoreRows(startScoresEl, null);
  startScreen.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function showGameoverScreen() {
  overlayBox.classList.add('hidden');
  startScreen.classList.add('hidden');
  goScoreEl.textContent = score.toLocaleString();
  scoreSubmitted = false;
  disarmReset();
  if (qualifies(score)) {
    goNameInput.value = '';
    goNameRow.classList.remove('hidden');
  } else {
    goNameRow.classList.add('hidden');
  }
  renderScoreRows(goScoresEl, null);
  gameoverScreen.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function submitScore() {
  if (scoreSubmitted || !qualifies(score)) return;
  const entry = addScore(goNameInput.value, score);
  scoreSubmitted = true;
  goNameRow.classList.add('hidden');
  renderScoreRows(goScoresEl, entry);
}

function disarmReset() {
  resetArmed = false;
  goResetBtn.textContent = 'Resetear records';
  goResetBtn.classList.remove('armed');
}

playBtn.addEventListener('click', startGame);
goRestartBtn.addEventListener('click', () => init());
goSaveBtn.addEventListener('click', submitScore);
goNameInput.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.code === 'Enter') submitScore();
});
goResetBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    goResetBtn.textContent = '¿Seguro?';
    goResetBtn.classList.add('armed');
    return;
  }
  resetScores();
  disarmReset();
  // la tabla queda vacía; se puede volver a guardar la puntuación actual
  if (!scoreSubmitted && qualifies(score)) {
    goNameRow.classList.remove('hidden');
  } else {
    goNameRow.classList.add('hidden');
  }
  renderScoreRows(goScoresEl, null);
});

// ---- menú de pausa: nivel inicial ----
function loadStartLevel() {
  const n = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  startLevelChoice = (isFinite(n) && n >= 1 && n <= MAX_START_LEVEL) ? n : 1;
}

function setStartLevel(n) {
  startLevelChoice = Math.min(MAX_START_LEVEL, Math.max(1, Math.floor(n) || 1));
  try {
    localStorage.setItem(START_LEVEL_KEY, String(startLevelChoice));
  } catch (e) {
    /* almacenamiento no disponible: se ignora */
  }
}

for (let i = 1; i <= MAX_START_LEVEL; i++) {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = 'Nivel ' + i;
  pauseLevelSelect.appendChild(opt);
}

pauseLevelSelect.addEventListener('change', () => {
  setStartLevel(parseInt(pauseLevelSelect.value, 10));
});

pauseResumeBtn.addEventListener('click', () => {
  if (paused) togglePause();
});

pauseRestartBtn.addEventListener('click', () => {
  paused = false;
  init(startLevelChoice);
  startGame();
});

pauseControlsBtn.addEventListener('click', () => {
  pauseControls.classList.toggle('hidden');
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
    // combo: sube en cada lock que limpia >=1 linea
    combo++;
    if (combo > bestComboRun) bestComboRun = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    // lock sin lineas: se rompe el combo
    combo = 0;
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = HIGHLIGHT_COLORS[theme];
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLORS[theme];
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
  running = false;
  cancelAnimationFrame(animId);
  // consolidar records globales de esta partida
  if (bestComboRun > bestCombo) bestCombo = bestComboRun;
  if (lines > maxLines) maxLines = lines;
  saveScores();
  showGameoverScreen();
}

function togglePause() {
  if (gameOver || !running) return;
  paused = !paused;
  if (!paused) {
    pauseScreen.classList.add('hidden');
    pauseControls.classList.add('hidden');
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayBox.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    pauseControls.classList.add('hidden');
    pauseLevelSelect.value = String(startLevelChoice);
    pauseScreen.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
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

// init() resetea el estado y muestra la pantalla de inicio.
// NO arranca la partida: hay que pulsar JUGAR (-> startGame()).
function init(startLevel = startLevelChoice) {
  cancelAnimationFrame(animId);
  pauseScreen.classList.add('hidden');
  pauseControls.classList.add('hidden');
  board = createBoard();
  score = 0;
  lines = 0;
  level = Math.max(1, Math.floor(startLevel) || 1);
  combo = 0;
  bestComboRun = 0;
  paused = false;
  gameOver = false;
  running = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  current = null;
  next = null;
  updateHUD();
  showStartScreen();
}

// startGame() arranca el spawn y el bucle RAF.
function startGame() {
  if (running) return;
  startScreen.classList.add('hidden');
  overlay.classList.add('hidden');
  paused = false;
  gameOver = false;
  running = true;
  dropAccum = 0;
  next = randomPiece();
  spawn();
  updateHUD();
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (!running || paused || gameOver || !current) return;
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

restartBtn.addEventListener('click', () => init());

initTheme();
loadScores();
loadStartLevel();
init();
