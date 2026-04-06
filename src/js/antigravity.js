/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY — Antigravity Physics Module
 *  Matter.js integration for post-game-over floating blocks
 *  and draggable physics interactions
 * ═══════════════════════════════════════════════════════════
 */

import Matter from 'matter-js';
import { CELL_SIZE, COLORS } from './constants.js';

const { Engine, Render, World, Bodies, Body, Mouse, MouseConstraint, Events } = Matter;

export class AntigravityEngine {
  constructor() {
    this.engine = null;
    this.world = null;
    this.bodies = [];
    this.domElements = [];
    this.active = false;
    this.chaosInterval = null;
    this.mouseConstraint = null;
  }

  /** Initialize Matter.js engine and add boundaries */
  init(containerEl) {
    this.engine = Engine.create({
      gravity: { x: 0, y: -0.3 }, // Antigravity — floats upward
    });
    this.world = this.engine.world;
    this.container = containerEl;
    this.active = true;

    // Screen boundaries
    const w = window.innerWidth;
    const h = window.innerHeight;
    const thickness = 60;

    const walls = [
      Bodies.rectangle(w / 2, -thickness / 2, w + 200, thickness, { isStatic: true }), // top
      Bodies.rectangle(w / 2, h + thickness / 2, w + 200, thickness, { isStatic: true }), // bottom
      Bodies.rectangle(-thickness / 2, h / 2, thickness, h + 200, { isStatic: true }), // left
      Bodies.rectangle(w + thickness / 2, h / 2, thickness, h + 200, { isStatic: true }), // right
    ];
    World.add(this.world, walls);

    // Mouse interaction for dragging
    const mouse = Mouse.create(containerEl);
    mouse.pixelRatio = window.devicePixelRatio || 1;
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    World.add(this.world, this.mouseConstraint);
  }

  /**
   * Explode board blocks into physics bodies represented by DOM elements.
   * @param {Array} blocks - [{row, col, type}, ...]
   * @param {number} boardOffsetX - board's left offset in px
   * @param {number} boardOffsetY - board's top offset in px
   */
  explodeBlocks(blocks, boardOffsetX, boardOffsetY) {
    for (const block of blocks) {
      const x = boardOffsetX + block.col * CELL_SIZE + CELL_SIZE / 2;
      const y = boardOffsetY + block.row * CELL_SIZE + CELL_SIZE / 2;
      const color = COLORS[block.type] || '#00ffff';
      const size = CELL_SIZE - 2;

      // Create physics body
      const body = Bodies.rectangle(x, y, size, size, {
        restitution: 0.7,
        friction: 0.1,
        frictionAir: 0.02,
        density: 0.002,
      });

      // Initial explosion velocity
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 15,
        y: -Math.random() * 12 - 5,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);

      World.add(this.world, body);
      this.bodies.push(body);

      // Create DOM element for the block
      const el = document.createElement('div');
      el.className = 'physics-block';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = color;
      el.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}40`;
      el.style.left = `${x - size / 2}px`;
      el.style.top = `${y - size / 2}px`;
      this.container.appendChild(el);
      this.domElements.push(el);
    }
  }

  /** Add floating UI panels to the physics world */
  addFloatingPanels() {
    const panels = document.querySelectorAll('.floating-panel');
    panels.forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const body = Bodies.rectangle(cx, cy, rect.width, rect.height, {
        restitution: 0.5,
        friction: 0.1,
        frictionAir: 0.05,
        density: 0.005,
      });

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: -Math.random() * 5 - 2,
      });

      World.add(this.world, body);
      this.bodies.push(body);
      this.domElements.push(panel);

      // Make panel position absolute for physics
      panel.style.position = 'fixed';
      panel.style.zIndex = '50';
    });
  }

  /** Update physics simulation and sync DOM */
  update(dt) {
    if (!this.active || !this.engine) return;

    Engine.update(this.engine, dt);

    // Sync DOM elements to physics bodies
    for (let i = 0; i < this.bodies.length && i < this.domElements.length; i++) {
      const body = this.bodies[i];
      const el = this.domElements[i];
      const { x, y } = body.position;
      const angle = body.angle;
      const w = el.offsetWidth || CELL_SIZE;
      const h = el.offsetHeight || CELL_SIZE;

      el.style.left = `${x - w / 2}px`;
      el.style.top = `${y - h / 2}px`;
      el.style.transform = `rotate(${angle}rad)`;
    }
  }

  /** Start chaos mode: random gravity shifts */
  startChaosGravity() {
    if (this.chaosInterval) return;
    this.chaosInterval = setInterval(() => {
      if (!this.engine) return;
      const gx = (Math.random() - 0.5) * 1.5;
      const gy = (Math.random() - 0.5) * 1.5;
      this.engine.gravity.x = gx;
      this.engine.gravity.y = gy;
    }, 2000);
  }

  /** Destroy and clean up */
  destroy() {
    this.active = false;
    if (this.chaosInterval) {
      clearInterval(this.chaosInterval);
      this.chaosInterval = null;
    }
    // Remove DOM elements (only physics-block elements, not panels)
    for (const el of this.domElements) {
      if (el.classList.contains('physics-block')) {
        el.remove();
      } else {
        // Reset panel styles
        el.style.position = '';
        el.style.zIndex = '';
        el.style.transform = '';
      }
    }
    this.domElements = [];
    this.bodies = [];
    if (this.engine) {
      World.clear(this.world);
      Engine.clear(this.engine);
      this.engine = null;
      this.world = null;
    }
  }
}
