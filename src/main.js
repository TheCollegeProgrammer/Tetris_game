/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY — Entry Point
 *  Boots the game, sets up the main loop
 * ═══════════════════════════════════════════════════════════
 */

import './css/main.css';
import { Game } from './js/game.js';

// ─── Boot ────────────────────────────────────────────────
const game = new Game();
game.start();

// ─── Resize handler ──────────────────────────────────────
function handleResize() {
  // Keep the game centered; the layout is CSS flex-based
  // so no manual repositioning needed, but we can adjust
  // canvas scaling for very small screens
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  const vh = window.innerHeight;
  const targetHeight = vh - 80; // some padding
  const boardHeight = canvas.height;

  if (boardHeight > targetHeight) {
    const scale = targetHeight / boardHeight;
    const wrapper = document.getElementById('board-wrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top center';
    }
  } else {
    const wrapper = document.getElementById('board-wrapper');
    if (wrapper) {
      wrapper.style.transform = '';
    }
  }
}

window.addEventListener('resize', handleResize);
handleResize();

// ─── Prevent zoom on mobile ─────────────────────────────
document.addEventListener('gesturestart', (e) => e.preventDefault());
