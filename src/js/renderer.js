/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY — Renderer
 *  Canvas drawing: board, pieces, ghost, grid, mini-previews
 * ═══════════════════════════════════════════════════════════
 */

import {
  COLS, ROWS, CELL_SIZE,
  COLORS, GLOW_COLORS, DARKER_COLORS,
  GRID_LINE_COLOR, GRID_BORDER_COLOR,
  GHOST_ALPHA, GLOW_INTENSITY, BLOCK_BORDER_RADIUS,
  BOARD_WIDTH, BOARD_HEIGHT,
  PIECE_SHAPES,
} from './constants.js';

export class Renderer {
  constructor() {
    // Main canvas
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = BOARD_WIDTH;
    this.canvas.height = BOARD_HEIGHT;

    // Hold canvas
    this.holdCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.holdCanvas.getContext('2d');

    // Next canvas
    this.nextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.nextCanvas.getContext('2d');

    // Screen shake offset
    this.shakeX = 0;
    this.shakeY = 0;

    // Line clear flash
    this.flashRows = [];
    this.flashAlpha = 0;
  }

  /** Clear the main canvas */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ─── Grid Drawing ──────────────────────────────────────

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, BOARD_HEIGHT);
      ctx.stroke();
    }

    // Horizontal lines
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(BOARD_WIDTH, r * CELL_SIZE);
      ctx.stroke();
    }
  }

  // ─── Block Drawing ─────────────────────────────────────

  _drawBlock(ctx, x, y, size, type, alpha = 1) {
    const color = COLORS[type];
    const glow = GLOW_COLORS[type];
    const dark = DARKER_COLORS[type];
    const r = BLOCK_BORDER_RADIUS;
    const inset = 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow
    ctx.shadowColor = glow;
    ctx.shadowBlur = GLOW_INTENSITY;

    // Main block
    ctx.fillStyle = color;
    this._roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, r);
    ctx.fill();

    // 3D highlight (top-left shine)
    ctx.shadowBlur = 0;
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, 'rgba(255,255,255,0.25)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad;
    this._roundRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, r);
    ctx.fill();

    // Inner border (fake depth)
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    this._roundRect(ctx, x + inset + 0.5, y + inset + 0.5, size - inset * 2 - 1, size - inset * 2 - 1, r);
    ctx.stroke();

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─── Board Drawing ─────────────────────────────────────

  drawBoard(board) {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.getCell(r, c);
        if (cell) {
          this._drawBlock(this.ctx, c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, cell);
        }
      }
    }
  }

  // ─── Active Piece Drawing ──────────────────────────────

  drawPiece(piece) {
    if (!piece) return;
    const shape = piece.currentShape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const drawRow = piece.row + r;
        if (drawRow < 0) continue; // Above visible area
        this._drawBlock(
          this.ctx,
          (piece.col + c) * CELL_SIZE,
          drawRow * CELL_SIZE,
          CELL_SIZE,
          piece.type
        );
      }
    }
  }

  // ─── Ghost Piece ───────────────────────────────────────

  drawGhost(piece, board) {
    if (!piece) return;
    // Find drop position
    let ghostRow = piece.row;
    while (board.isValidPosition(piece.currentShape, ghostRow + 1, piece.col)) {
      ghostRow++;
    }
    if (ghostRow === piece.row) return; // Already at bottom

    const shape = piece.currentShape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const drawRow = ghostRow + r;
        if (drawRow < 0) continue;
        this._drawBlock(
          this.ctx,
          (piece.col + c) * CELL_SIZE,
          drawRow * CELL_SIZE,
          CELL_SIZE,
          piece.type,
          GHOST_ALPHA
        );
      }
    }
  }

  // ─── Line Clear Flash ──────────────────────────────────

  drawLineFlash(rows, alpha) {
    if (!rows || rows.length === 0 || alpha <= 0) return;
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    for (const row of rows) {
      this.ctx.fillRect(0, row * CELL_SIZE, BOARD_WIDTH, CELL_SIZE);
    }
    this.ctx.restore();
  }

  // ─── Mini Canvas: Hold Piece ───────────────────────────

  drawHoldPiece(type) {
    const ctx = this.holdCtx;
    const canvas = this.holdCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const shape = PIECE_SHAPES[type][0];
    const miniSize = 22;
    const offsetX = (canvas.width - shape[0].length * miniSize) / 2;
    const offsetY = (canvas.height - shape.length * miniSize) / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          this._drawBlockMini(ctx, offsetX + c * miniSize, offsetY + r * miniSize, miniSize, type);
        }
      }
    }
  }

  // ─── Mini Canvas: Next Pieces ──────────────────────────

  drawNextPieces(types) {
    const ctx = this.nextCtx;
    const canvas = this.nextCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const miniSize = 20;
    const sectionHeight = 90;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const shape = PIECE_SHAPES[type][0];
      const offsetX = (canvas.width - shape[0].length * miniSize) / 2;
      const offsetY = i * sectionHeight + (sectionHeight - shape.length * miniSize) / 2;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            this._drawBlockMini(ctx, offsetX + c * miniSize, offsetY + r * miniSize, miniSize, type);
          }
        }
      }
    }
  }

  _drawBlockMini(ctx, x, y, size, type) {
    const color = COLORS[type];
    const glow = GLOW_COLORS[type];

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Highlight
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.restore();
  }

  // ─── Screen Shake ──────────────────────────────────────

  applyShake(intensity) {
    this.shakeX = (Math.random() - 0.5) * intensity * 2;
    this.shakeY = (Math.random() - 0.5) * intensity * 2;
    this.canvas.style.transform = `translate(${this.shakeX}px, ${this.shakeY}px)`;
  }

  clearShake() {
    this.shakeX = 0;
    this.shakeY = 0;
    this.canvas.style.transform = 'translate(0, 0)';
  }

  // ─── Full Frame Render ─────────────────────────────────

  renderFrame(game) {
    this.clear();
    this.drawGrid();
    this.drawBoard(game.board);
    this.drawGhost(game.currentPiece, game.board);
    this.drawPiece(game.currentPiece);

    // Line clear flash
    if (game.clearingRows && game.clearFlashAlpha > 0) {
      this.drawLineFlash(game.clearingRows, game.clearFlashAlpha);
    }
  }
}
