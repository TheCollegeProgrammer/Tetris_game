/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY — Piece Module
 *  Tetromino representation, rotation, SRS wall kicks
 * ═══════════════════════════════════════════════════════════
 */

import {
  PIECE_SHAPES,
  PIECE_TYPES,
  WALL_KICKS,
  I_WALL_KICKS,
  COLS,
} from './constants.js';

export class Piece {
  constructor(type) {
    this.type = type;
    this.rotationState = 0;
    this.shapes = PIECE_SHAPES[type];
    this.row = 0;
    this.col = 0;
    this._spawn();
  }

  /** Position piece at spawn location (centered, top) */
  _spawn() {
    const shape = this.currentShape;
    this.col = Math.floor((COLS - shape[0].length) / 2);
    // Start above the board for most pieces
    this.row = this.type === 'I' ? -1 : -1;
  }

  get currentShape() {
    return this.shapes[this.rotationState];
  }

  /** Get shape for a specific rotation */
  getShape(rotation) {
    return this.shapes[rotation % 4];
  }

  /** Get wall kick offsets for a rotation transition */
  getWallKicks(fromRot, toRot) {
    const key = `${fromRot}>${toRot}`;
    if (this.type === 'I') {
      return I_WALL_KICKS[key] || [[0, 0]];
    }
    return WALL_KICKS[key] || [[0, 0]];
  }

  /** Try to rotate CW, returns kick offset or null if failed */
  tryRotateCW(board) {
    const newRot = (this.rotationState + 1) % 4;
    return this._tryRotate(newRot, board);
  }

  /** Try to rotate CCW, returns kick offset or null if failed */
  tryRotateCCW(board) {
    const newRot = (this.rotationState + 3) % 4;
    return this._tryRotate(newRot, board);
  }

  _tryRotate(newRot, board) {
    const kicks = this.getWallKicks(this.rotationState, newRot);
    const newShape = this.getShape(newRot);

    for (const [kickX, kickY] of kicks) {
      const newCol = this.col + kickX;
      const newRow = this.row - kickY; // SRS uses inverted Y
      if (board.isValidPosition(newShape, newRow, newCol)) {
        return { rotation: newRot, row: newRow, col: newCol };
      }
    }
    return null;
  }

  /** Apply a successful rotation result */
  applyRotation(result) {
    this.rotationState = result.rotation;
    this.row = result.row;
    this.col = result.col;
  }

  /** Clone this piece for preview / ghost */
  clone() {
    const p = new Piece(this.type);
    p.rotationState = this.rotationState;
    p.row = this.row;
    p.col = this.col;
    return p;
  }

  /** Get the width of the current rotation */
  get width() {
    const shape = this.currentShape;
    let minC = shape[0].length, maxC = 0;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }
    return maxC - minC + 1;
  }

  /** Get lowest row of the piece (for hard drop effects) */
  getBottomRow() {
    const shape = this.currentShape;
    let maxR = 0;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) maxR = Math.max(maxR, r);
      }
    }
    return this.row + maxR;
  }

  /** Get leftmost column of the piece */
  getLeftCol() {
    const shape = this.currentShape;
    let minC = shape[0].length;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) minC = Math.min(minC, c);
      }
    }
    return this.col + minC;
  }
}

/**
 * 7-bag randomizer: shuffles all 7 piece types,
 * deals them out, then reshuffles.
 */
export class PieceBag {
  constructor() {
    this.bag = [];
    this._fill();
  }

  _fill() {
    this.bag = [...PIECE_TYPES];
    // Fisher-Yates shuffle
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  next() {
    if (this.bag.length === 0) this._fill();
    return this.bag.pop();
  }

  /** Peek at the next N pieces without consuming them */
  peek(count) {
    const result = [];
    const tempBag = [...this.bag];
    for (let i = 0; i < count; i++) {
      if (tempBag.length === 0) {
        // Need a new bag peek
        const newBag = [...PIECE_TYPES];
        for (let j = newBag.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [newBag[j], newBag[k]] = [newBag[k], newBag[j]];
        }
        tempBag.push(...newBag);
      }
      result.push(tempBag.pop());
    }
    return result;
  }
}
