/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY - Particle System
 *  Visual effects: line clears, level ups, combos, hard drops
 * ═══════════════════════════════════════════════════════════
 */

import { CELL_SIZE, COLORS } from './constants.js';

class Particle {
  constructor(x, y, vx, vy, color, life, size, type = 'square') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.gravity = 0.15;
    this.friction = 0.99;
  }

  update(dt) {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt;
    this.rotation += this.rotSpeed;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }

  get dead() {
    return this.life <= 0;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    const dtSec = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dtSec);
      if (this.particles[i].dead) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx, offsetX = 0, offsetY = 0) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8 * p.alpha;
      
      ctx.save();
      ctx.translate(offsetX + p.x, offsetY + p.y);
      ctx.rotate(p.rotation);
      
      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        this._drawStar(ctx, 0, 0, p.size * p.alpha, 5);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      
      ctx.restore();
    }
    ctx.restore();
  }

  _drawStar(ctx, cx, cy, size, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? size : size * 0.4;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ─── Effect Emitters ────────────────────────────────────

  /** Emit particles when lines are cleared */
  emitLineClear(rows, boardOffsetX, boardOffsetY, boardCols) {
    const colors = Object.values(COLORS);
    for (const row of rows) {
      for (let col = 0; col < boardCols; col++) {
        const cx = boardOffsetX + col * CELL_SIZE + CELL_SIZE / 2;
        const cy = boardOffsetY + row * CELL_SIZE + CELL_SIZE / 2;
        
        // Emit 6 particles per cell
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 6;
          const color = colors[Math.floor(Math.random() * colors.length)];
          const type = ['square', 'circle', 'star'][Math.floor(Math.random() * 3)];
          
          this.particles.push(new Particle(
            cx, cy,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 3,
            color,
            0.8 + Math.random() * 0.6,
            3 + Math.random() * 5,
            type
          ));
        }
      }
    }
  }

  /** Emit celebration particles for level up */
  emitLevelUp(centerX, centerY) {
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff66', '#ff8800'];
    
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      this.particles.push(new Particle(
        centerX, centerY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 5,
        color,
        1.0 + Math.random() * 1.0,
        4 + Math.random() * 8,
        'star'
      ));
    }
  }

  /** Emit impact particles for hard drop */
  emitHardDrop(pieceX, pieceY, pieceWidth, boardOffsetX, boardOffsetY) {
    const colors = ['#ffffff', '#00ffff', '#aaaaff'];
    
    for (let i = 0; i < 20; i++) {
      const x = boardOffsetX + pieceX * CELL_SIZE + Math.random() * pieceWidth * CELL_SIZE;
      const y = boardOffsetY + pieceY * CELL_SIZE;
      
      this.particles.push(new Particle(
        x, y,
        (Math.random() - 0.5) * 6,
        -Math.random() * 4 - 2,
        colors[Math.floor(Math.random() * colors.length)],
        0.4 + Math.random() * 0.3,
        2 + Math.random() * 3,
        'circle'
      ));
    }
  }

  /** Emit small visual flash when a piece locks into place */
  emitLock(pieceX, pieceY, pieceWidth, pieceHeight, boardOffsetX, boardOffsetY) {
    for (let i = 0; i < 15; i++) {
        const x = boardOffsetX + pieceX * CELL_SIZE + Math.random() * pieceWidth * CELL_SIZE;
        const y = boardOffsetY + pieceY * CELL_SIZE + Math.random() * pieceHeight * CELL_SIZE;
        const vx = (Math.random() - 0.5) * 2.5;
        const vy = (Math.random() - 0.5) * 2.5;
        this.particles.push(new Particle(x, y, vx, vy, '#ffffff', 0.25, 3, 'star'));
    }
  }

  /** Emit combo sparks */
  emitCombo(centerX, centerY, comboCount) {
    const intensity = Math.min(comboCount * 4, 30);
    const colors = ['#ffff00', '#ff8800', '#ff0055', '#ffffff'];
    
    for (let i = 0; i < intensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5 * (comboCount * 0.5);
      
      this.particles.push(new Particle(
        centerX, centerY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        colors[Math.floor(Math.random() * colors.length)],
        0.6 + Math.random() * 0.4,
        3 + Math.random() * 4,
        'star'
      ));
    }
  }

  /** Emit explosion for game over / antigravity mode */
  emitExplosion(blocks, boardOffsetX, boardOffsetY) {
    for (const block of blocks) {
      const cx = boardOffsetX + block.col * CELL_SIZE + CELL_SIZE / 2;
      const cy = boardOffsetY + block.row * CELL_SIZE + CELL_SIZE / 2;
      
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        
        this.particles.push(new Particle(
          cx, cy,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 2,
          block.color,
          1.5 + Math.random() * 1.0,
          4 + Math.random() * 6,
          'square'
        ));
      }
    }
  }

  clear() {
    this.particles = [];
  }

  get count() {
    return this.particles.length;
  }
}
