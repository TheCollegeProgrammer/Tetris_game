/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY - Game Constants
 *  All game configuration, piece definitions, and styling
 * ═══════════════════════════════════════════════════════════
 */

// ─── Board Dimensions ───────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const CELL_SIZE = 30;
export const BOARD_WIDTH = COLS * CELL_SIZE;
export const BOARD_HEIGHT = ROWS * CELL_SIZE;

// ─── Game States ────────────────────────────────────────
export const STATE = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  ANTIGRAVITY: 'antigravity',
};

// ─── Neon Color Palette ─────────────────────────────────
export const COLORS = {
  I: '#00ffff',   // Cyan
  O: '#ffff00',   // Yellow
  T: '#ff00ff',   // Magenta
  S: '#00ff66',   // Green
  Z: '#ff0055',   // Red-pink
  J: '#3366ff',   // Blue
  L: '#ff8800',   // Orange
};

export const GLOW_COLORS = {
  I: 'rgba(0, 255, 255, 0.6)',
  O: 'rgba(255, 255, 0, 0.6)',
  T: 'rgba(255, 0, 255, 0.6)',
  S: 'rgba(0, 255, 102, 0.6)',
  Z: 'rgba(255, 0, 85, 0.6)',
  J: 'rgba(51, 102, 255, 0.6)',
  L: 'rgba(255, 136, 0, 0.6)',
};

export const DARKER_COLORS = {
  I: '#009999',
  O: '#999900',
  T: '#990099',
  S: '#009944',
  Z: '#990033',
  J: '#223399',
  L: '#995500',
};

// ─── Piece Definitions (SRS Standard) ───────────────────
// Each piece has 4 rotation states defined as shape matrices
export const PIECE_SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ─── SRS Wall Kick Data ─────────────────────────────────
// Kicks for J, L, S, T, Z pieces
export const WALL_KICKS = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

// Kicks for I piece
export const I_WALL_KICKS = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// ─── Scoring ────────────────────────────────────────────
export const SCORE_TABLE = {
  1: 100,   // Single
  2: 300,   // Double
  3: 500,   // Triple
  4: 800,   // Tetris
};

export const SOFT_DROP_SCORE = 1;
export const HARD_DROP_SCORE = 2;
export const COMBO_BONUS = 50;

// ─── Timing ─────────────────────────────────────────────
export const BASE_DROP_INTERVAL = 1000;  // ms at level 1
export const SPEED_CURVE = [
  1000, 793, 618, 473, 355, 262, 190, 135, 94, 64,
  43, 28, 18, 11, 7, 5, 3, 2, 1, 1
]; // ms per level (NES-style)

export const DAS_DELAY = 170;     // Initial auto-repeat delay (ms)
export const DAS_REPEAT = 50;     // Auto-repeat rate (ms)
export const LOCK_DELAY = 500;    // Lock delay after landing (ms)
export const LOCK_MOVES = 15;     // Max moves during lock delay
export const LINES_PER_LEVEL = 10;

// ─── Visual Settings ────────────────────────────────────
export const GRID_LINE_COLOR = 'rgba(0, 255, 255, 0.06)';
export const GRID_BORDER_COLOR = 'rgba(0, 255, 255, 0.3)';
export const GHOST_ALPHA = 0.25;
export const BLOCK_BORDER_RADIUS = 2;
export const GLOW_INTENSITY = 12;
export const SCREEN_SHAKE_INTENSITY = 8;
export const SCREEN_SHAKE_DURATION = 150;
