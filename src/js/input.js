/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY - Input Handler
 *  Keyboard with DAS + Mobile Swipe Gesture System
 *  
 *  Mobile controls:
 *    • Single tap → rotate CW
 *    • Two-finger tap → hold piece
 *    • Horizontal swipe → move (distance = cells moved)
 *    • Fast swipe down → hard drop
 *    • Slow drag down → soft drop (continuous)
 * ═══════════════════════════════════════════════════════════
 */

import { DAS_DELAY, DAS_REPEAT, CELL_SIZE } from './constants.js';

export class InputManager {
  constructor() {
    // Key states
    this.keys = {};
    this.justPressed = {};
    this.justReleased = {};

    // DAS state for left/right movement
    this.dasState = {
      left: { held: false, timer: 0, active: false },
      right: { held: false, timer: 0, active: false },
      down: { held: false, timer: 0, active: false },
    };

    // ─── Touch gesture state ───────────────────────────────
    this.touch = {
      active: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startTime: 0,
      movedCells: 0,       // How many cell widths were consumed horizontally
      softDropped: false,   // Did we already trigger soft drop this gesture?
      hardDropped: false,   // Did we hard-drop?
      rotated: false,       // tap-rotate guard
      isSwiping: false,     // Has meaningful movement occurred?
      fingerCount: 0,       // Number of fingers (for hold gesture)
    };

    // Swipe sensitivity: pixels of drag per cell move
    this.swipeCellSize = CELL_SIZE * 1.1;
    // Minimum pixels to consider a horizontal "swipe" vs. a tap
    this.swipeTapThreshold = 12;
    // How fast (px/ms) a downward swipe must be to count as hard drop
    this.hardDropVelocity = 0.6;
    // Max duration for a "tap" in ms
    this.tapMaxDuration = 220;

    // Detect if Touch device
    this.isTouchDevice = false;

    // Callbacks
    this.callbacks = {};

    this._setupKeyboard();
    this._setupTouch();
  }

  // ─── Event Registration ─────────────────────────────────

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  _emit(event, data) {
    if (this.callbacks[event]) {
      for (const cb of this.callbacks[event]) {
        cb(data);
      }
    }
  }

  // ─── Keyboard Setup ─────────────────────────────────────

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      
      this.keys[e.code] = true;
      this.justPressed[e.code] = true;

      // Prevent default for game keys
      const gameKeys = [
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Space', 'KeyZ', 'KeyX', 'KeyC', 'KeyP', 'Escape',
        'ShiftLeft', 'ShiftRight',
      ];
      if (gameKeys.includes(e.code)) {
        e.preventDefault();
      }

      // Immediate actions
      switch (e.code) {
        case 'ArrowLeft':
          this.dasState.left.held = true;
          this.dasState.left.timer = 0;
          this.dasState.left.active = false;
          this._emit('moveLeft');
          break;
        case 'ArrowRight':
          this.dasState.right.held = true;
          this.dasState.right.timer = 0;
          this.dasState.right.active = false;
          this._emit('moveRight');
          break;
        case 'ArrowDown':
          this.dasState.down.held = true;
          this.dasState.down.timer = 0;
          this.dasState.down.active = false;
          this._emit('softDrop');
          break;
        case 'ArrowUp':
        case 'KeyX':
          this._emit('rotateCW');
          break;
        case 'KeyZ':
          this._emit('rotateCCW');
          break;
        case 'Space':
          this._emit('hardDrop');
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          this._emit('hold');
          break;
        case 'KeyP':
        case 'Escape':
          this._emit('pause');
          break;
        case 'Enter':
          this._emit('confirm');
          break;
        case 'KeyM':
          this._emit('toggleMusic');
          break;
        case 'KeyN':
          this._emit('toggleSfx');
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.justReleased[e.code] = true;

      switch (e.code) {
        case 'ArrowLeft':
          this.dasState.left.held = false;
          this.dasState.left.active = false;
          break;
        case 'ArrowRight':
          this.dasState.right.held = false;
          this.dasState.right.active = false;
          break;
        case 'ArrowDown':
          this.dasState.down.held = false;
          this.dasState.down.active = false;
          break;
      }
    });
  }

  // ─── Touch / Swipe Gesture System ──────────────────────

  _setupTouch() {
    // Bind to the entire document body so swipes work everywhere
    // (overlay buttons have their own pointer handlers and won't conflict)
    const target = document.body;

    target.addEventListener('touchstart', (e) => {
      this.isTouchDevice = true;

      // Don't interfere with overlay buttons or mobile HUD
      if (this._isTouchOnUI(e.target)) return;

      const t = e.touches[0];
      this.touch.active = true;
      this.touch.startX = t.clientX;
      this.touch.startY = t.clientY;
      this.touch.lastX = t.clientX;
      this.touch.lastY = t.clientY;
      this.touch.startTime = Date.now();
      this.touch.movedCells = 0;
      this.touch.softDropped = false;
      this.touch.hardDropped = false;
      this.touch.rotated = false;
      this.touch.isSwiping = false;
      this.touch.fingerCount = e.touches.length;
    }, { passive: true });

    target.addEventListener('touchmove', (e) => {
      if (!this.touch.active) return;
      if (this.touch.hardDropped) return;

      const t = e.touches[0];
      const dx = t.clientX - this.touch.startX;
      const dy = t.clientY - this.touch.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Mark as swiping once past tap threshold
      if (absDx > this.swipeTapThreshold || absDy > this.swipeTapThreshold) {
        this.touch.isSwiping = true;
      }

      // ── Horizontal movement (distance-based) ──────────
      // Calculate how many full cell-widths the finger has moved
      // relative to the start position
      const cellsMoved = Math.floor(absDx / this.swipeCellSize);
      const cellDelta = cellsMoved - this.touch.movedCells;

      if (cellDelta > 0 && absDx > absDy * 0.6) {
        // Emit the right number of move events
        const direction = dx > 0 ? 'moveRight' : 'moveLeft';
        for (let i = 0; i < cellDelta; i++) {
          this._emit(direction);
        }
        this.touch.movedCells = cellsMoved;
      }

      // ── Downward drag (soft drop with velocity check) ──
      const currentDy = t.clientY - this.touch.lastY;
      if (dy > 20 && absDy > absDx * 1.2) {
        // Check velocity for hard drop
        const elapsed = Date.now() - this.touch.startTime;
        const velocity = absDy / Math.max(elapsed, 1);

        if (velocity > this.hardDropVelocity && absDy > 60) {
          // Fast swipe down = hard drop
          this._emit('hardDrop');
          this.touch.hardDropped = true;
        } else if (currentDy > 8 && !this.touch.softDropped) {
          // Slow drag down = soft drop
          this._emit('softDrop');
          this.touch.softDropped = true;
          // Reset after short interval to allow continuous soft drops
          setTimeout(() => { this.touch.softDropped = false; }, 80);
        }
      }

      this.touch.lastX = t.clientX;
      this.touch.lastY = t.clientY;
    }, { passive: true });

    target.addEventListener('touchend', (e) => {
      if (!this.touch.active) return;
      this.touch.active = false;

      const elapsed = Date.now() - this.touch.startTime;

      // ── TAP detection ─────────────────────────────────
      if (!this.touch.isSwiping && !this.touch.hardDropped && elapsed < this.tapMaxDuration) {
        if (this.touch.fingerCount >= 2) {
          // Two-finger tap = hold piece
          this._emit('hold');
        } else {
          // Single tap = rotate
          this._emit('rotateCW');
        }
      }
    }, { passive: true });

    // Track multi-touch for hold gesture
    target.addEventListener('touchstart', (e) => {
      if (this.touch.active) {
        this.touch.fingerCount = Math.max(this.touch.fingerCount, e.touches.length);
      }
    }, { passive: true });
  }

  /**
   * Check if the touch target is a UI button/overlay that
   * should handle its own events (not game swipe)
   */
  _isTouchOnUI(el) {
    if (!el) return false;
    // Walk up ancestors checking for UI elements
    let node = el;
    while (node && node !== document.body) {
      if (
        node.classList.contains('overlay-screen') ||
        node.classList.contains('retro-btn') ||
        node.classList.contains('mobile-hud-btn') ||
        node.classList.contains('retro-slider') ||
        node.id === 'mobile-hud'
      ) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  // ─── DAS (Auto-Repeat) Update ───────────────────────────

  update(dt) {
    // Process DAS for horizontal movement (keyboard only)
    for (const dir of ['left', 'right', 'down']) {
      const das = this.dasState[dir];
      if (das.held) {
        das.timer += dt;
        if (!das.active && das.timer >= DAS_DELAY) {
          das.active = true;
          das.timer = DAS_DELAY; // Reset for repeat phase
        }
        if (das.active && das.timer >= DAS_DELAY + DAS_REPEAT) {
          das.timer = DAS_DELAY; // Reset for next repeat
          const event = dir === 'left' ? 'moveLeft' : dir === 'right' ? 'moveRight' : 'softDrop';
          this._emit(event);
        }
      }
    }

    // Clear per-frame states
    this.justPressed = {};
    this.justReleased = {};
  }

  isKeyHeld(code) {
    return !!this.keys[code];
  }

  destroy() {
    // Clean-up would go here if needed
  }
}
