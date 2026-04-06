/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY — Board Module
 *  Internal grid state, collision detection, line clearing
 * ═══════════════════════════════════════════════════════════
 */

import { COLS, ROWS } from './constants.js';

export class Board {
  constructor(cols = COLS, rows = ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.grid = this._createGrid();
  }

  _createGrid() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => null)
    );
  }

  reset() {
    this.grid = this._createGrid();
  }

  /** Get cell value (null = empty, string = color type) */
  getCell(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return undefined;
    return this.grid[row][col];
  }

  /** Set cell value */
  setCell(row, col, value) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.grid[row][col] = value;
    }
  }

  /** Check if a piece can be placed at the given position */
  isValidPosition(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const newRow = row + r;
        const newCol = col + c;
        // MUST NEVER GO OUT OF BOUNDS HORIZONTALLY
        if (newCol < 0 || newCol >= this.cols) return false;
        // Allow above the board (spawn area)
        if (newRow < 0) continue;
        // Out of bounds vertically
        if (newRow >= this.rows) return false;
        // Collision with locked piece
        if (this.grid[newRow][newCol] !== null) return false;
      }
    }
    return true;
  }

  /** Lock a piece into the grid */
  lockPiece(piece) {
    const shape = piece.currentShape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const row = piece.row + r;
        const col = piece.col + c;
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
          this.grid[row][col] = piece.type;
        }
      }
    }
  }

  /** Find and return completed rows */
  getFullRows() {
    const full = [];
    for (let r = 0; r < this.rows; r++) {
      if (this.grid[r].every(cell => cell !== null)) {
        full.push(r);
      }
    }
    return full;
  }

  /** Clear completed rows and drop above rows down */
  clearRows(rows) {
    let newGrid = this.grid.filter((_, i) => !rows.includes(i));
    while (newGrid.length < this.rows) {
      newGrid.unshift(Array.from({ length: this.cols }, () => null));
    }
    this.grid = newGrid;
  }

  /** Check if any block is above the visible area (game over check) */
  isTopOccupied() {
    return this.grid[0].some(cell => cell !== null) || this.grid[1].some(cell => cell !== null);
  }

  /** Get all occupied blocks (for antigravity explosion) */
  getOccupiedBlocks() {
    const blocks = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== null) {
          blocks.push({ row: r, col: c, type: this.grid[r][c] });
        }
      }
    }
    return blocks;
  }
}
