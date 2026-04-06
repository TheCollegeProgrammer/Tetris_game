/**
 * ═══════════════════════════════════════════════════════════
 *  TETRIS ANTIGRAVITY — Game Engine
 *  Core game loop, state machine, scoring, level progression
 * ═══════════════════════════════════════════════════════════
 */

import {
  COLS, ROWS, CELL_SIZE,
  STATE, COLORS,
  SCORE_TABLE, SOFT_DROP_SCORE, HARD_DROP_SCORE, COMBO_BONUS,
  SPEED_CURVE, LINES_PER_LEVEL,
  LOCK_DELAY, LOCK_MOVES,
  SCREEN_SHAKE_INTENSITY, SCREEN_SHAKE_DURATION,
  BOARD_WIDTH, BOARD_HEIGHT,
} from './constants.js';
import { Board } from './board.js';
import { Piece, PieceBag } from './piece.js';
import { Renderer } from './renderer.js';
import { ParticleSystem } from './particles.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { AntigravityEngine } from './antigravity.js';
import gsap from 'gsap';

export class Game {
  constructor() {
    // Core systems
    this.board = new Board();
    this.renderer = new Renderer();
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.antigravity = new AntigravityEngine();

    // Game state
    this.state = STATE.START;
    this.mode = 'classic'; // 'classic' or 'chaos'
    this.currentPiece = null;
    this.holdPiece = null;
    this.holdUsed = false;
    this.bag = new PieceBag();
    this.nextPieces = [];

    // Scoring
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = -1;
    this.highScore = parseInt(localStorage.getItem('tetris_highscore') || '0', 10);

    // Timing
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.isLocking = false;
    this.lastTime = 0;

    // Line clear animation
    this.clearingRows = null;
    this.clearFlashAlpha = 0;
    this.clearAnimTimer = 0;

    // Screen shake
    this.shakeTimer = 0;

    // Chaos mode
    this.chaosGravityTimer = 0;
    this.chaosDirection = 'down'; // 'down', 'up', 'left', 'right' — visual only during gameplay

    // DOM elements
    this.scoreDisplay = document.getElementById('score-display');
    this.levelDisplay = document.getElementById('level-display');
    this.linesDisplay = document.getElementById('lines-display');
    this.comboDisplay = document.getElementById('combo-display');
    this.actionText = document.getElementById('action-text');

    this._fillNextQueue();
    this._bindInput();
    this._bindUI();
    this._updateHighScoreDisplay();
  }

  // ═══════════════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════════════

  _fillNextQueue() {
    while (this.nextPieces.length < 5) {
      this.nextPieces.push(this.bag.next());
    }
  }

  _bindInput() {
    this.input.on('moveLeft', () => this._moveHorizontal(-1));
    this.input.on('moveRight', () => this._moveHorizontal(1));
    this.input.on('softDrop', () => this._softDrop());
    this.input.on('hardDrop', () => this._hardDrop());
    this.input.on('rotateCW', () => this._rotateCW());
    this.input.on('rotateCCW', () => this._rotateCCW());
    this.input.on('hold', () => this._holdSwap());
    this.input.on('pause', () => this._togglePause());
    this.input.on('confirm', () => this._handleConfirm());
    // Audio toggles are handled in _bindUI to keep all UI states in sync
  }

  _bindUI() {
    // Start button
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this._togglePause());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());

    // Audio sync helper
    const updateAudioUI = () => {
      const btnMusic = document.getElementById('btn-music');
      const pauseMusic = document.getElementById('pause-music-toggle');
      const musicOn = this.audio.musicEnabled;
      if (btnMusic) btnMusic.textContent = musicOn ? '♪ ON' : '♪ OFF';
      if (pauseMusic) {
        pauseMusic.textContent = musicOn ? '♪ ON' : '♪ OFF';
        pauseMusic.classList.toggle('off', !musicOn);
      }

      const btnSfx = document.getElementById('btn-sfx');
      const pauseSfx = document.getElementById('pause-sfx-toggle');
      const sfxOn = this.audio.sfxEnabled;
      if (btnSfx) btnSfx.textContent = sfxOn ? 'SFX ON' : 'SFX OFF';
      if (pauseSfx) {
        pauseSfx.textContent = sfxOn ? 'SFX ON' : 'SFX OFF';
        pauseSfx.classList.toggle('off', !sfxOn);
      }
    };

    // UI Audio toggles
    const handleMusicToggle = () => { this.audio.toggleMusic(); updateAudioUI(); };
    const handleSfxToggle = () => { this.audio.toggleSfx(); updateAudioUI(); };

    document.getElementById('btn-music').addEventListener('click', handleMusicToggle);
    document.getElementById('btn-sfx').addEventListener('click', handleSfxToggle);
    const pmt = document.getElementById('pause-music-toggle');
    if (pmt) pmt.addEventListener('click', handleMusicToggle);
    const pst = document.getElementById('pause-sfx-toggle');
    if (pst) pst.addEventListener('click', handleSfxToggle);

    // Keyboard shortcuts for audio
    this.input.on('toggleMusic', handleMusicToggle);
    this.input.on('toggleSfx', handleSfxToggle);

    // Exit to Main Menu
    const btnExit = document.getElementById('btn-exit-menu');
    if (btnExit) {
      btnExit.addEventListener('click', () => {
        this.state = STATE.START;
        this.audio.stopMusic();
        this._showOverlay('start-screen');
      });
    }

    // Volume Slider
    const volSlider = document.getElementById('volume-slider');
    const volValue = document.getElementById('volume-value');
    if (volSlider && volValue) {
      volSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        volValue.textContent = `${val}%`;
        this.audio.setVolume(val / 100);
      });
    }

    // Mode select
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
      });
    });

    // Touch controls HUD
    const mobilePause = document.getElementById('mobile-pause');
    if (mobilePause) {
      mobilePause.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this._togglePause(); // Pausing doesn't use input._emit, so direct call is fine
      });
    }
    const mobileHold = document.getElementById('mobile-hold');
    if (mobileHold) {
      mobileHold.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input._emit('hold');
      });
    }
  }

  _updateHighScoreDisplay() {
    const el = document.getElementById('high-score-display');
    if (el) el.textContent = this.highScore;
  }

  // ═══════════════════════════════════════════════════════
  //  GAME LIFECYCLE
  // ═══════════════════════════════════════════════════════

  startGame() {
    // Clean up antigravity if active
    this.antigravity.destroy();

    // Reset state
    this.board.reset();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = -1;
    this.holdPiece = null;
    this.holdUsed = false;
    this.bag = new PieceBag();
    this.nextPieces = [];
    this._fillNextQueue();
    this.clearingRows = null;
    this.clearFlashAlpha = 0;
    this.isLocking = false;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.chaosGravityTimer = 0;

    // Init audio on first user gesture
    this.audio.init();
    this.audio.resume();
    this.audio.startMusic();

    // Spawn first piece
    this._spawnPiece();

    // Update UI
    this._updateDisplay();
    this.renderer.drawHoldPiece(null);
    this.renderer.drawNextPieces(this.nextPieces);

    // Switch state
    this.state = STATE.PLAYING;
    this._hideAllOverlays();

    // animate in
    gsap.fromTo('#game-container', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
  }

  _spawnPiece() {
    const type = this.nextPieces.shift();
    this._fillNextQueue();
    this.currentPiece = new Piece(type);
    this.holdUsed = false;
    this.isLocking = false;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.dropTimer = 0;
    this.rowActiveTimer = 0;
    this.lastPieceRow = this.currentPiece.row;

    // Check if spawn is valid
    if (!this.board.isValidPosition(this.currentPiece.currentShape, this.currentPiece.row, this.currentPiece.col)) {
      this._gameOver();
    }

    this.renderer.drawNextPieces(this.nextPieces);
  }

  _gameOver() {
    this.state = STATE.GAME_OVER;
    this.audio.playGameOver();
    this.audio.stopMusic();

    // Update high score
    const isNew = this.score > this.highScore;
    if (isNew) {
      this.highScore = this.score;
      localStorage.setItem('tetris_highscore', String(this.highScore));
      this._updateHighScoreDisplay();
    }

    // Show game over screen
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-level').textContent = this.level;
    document.getElementById('final-lines').textContent = this.lines;
    const newHSel = document.getElementById('new-high-score');
    if (isNew) newHSel.classList.remove('hidden');
    else newHSel.classList.add('hidden');

    // Animate game over screen
    this._showOverlay('gameover-screen');

    // Start antigravity mode after a short delay
    setTimeout(() => this._startAntigravity(), 800);
  }

  _startAntigravity() {
    const blocks = this.board.getOccupiedBlocks();
    // Add color info
    const colorBlocks = blocks.map(b => ({
      ...b,
      color: COLORS[b.type] || '#00ffff',
    }));

    // Get board offset in the page
    const canvasRect = this.renderer.canvas.getBoundingClientRect();
    const boardOffsetX = canvasRect.left;
    const boardOffsetY = canvasRect.top;

    // Emit explosion particles
    this.particles.emitExplosion(colorBlocks, boardOffsetX, boardOffsetY);

    // Initialize antigravity
    this.antigravity.init(document.body);
    this.antigravity.explodeBlocks(blocks, boardOffsetX, boardOffsetY);
    this.antigravity.addFloatingPanels();

    // In chaos mode, add random gravity
    if (this.mode === 'chaos') {
      this.antigravity.startChaosGravity();
    }

    this.state = STATE.ANTIGRAVITY;
  }

  // ═══════════════════════════════════════════════════════
  //  INPUT ACTIONS
  // ═══════════════════════════════════════════════════════

  _moveHorizontal(dir) {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    const p = this.currentPiece;
    const newCol = p.col + dir;
    if (this.board.isValidPosition(p.currentShape, p.row, newCol)) {
      p.col = newCol;
      this.audio.playMove();
      this._resetLock();
    }
  }

  _softDrop() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    const p = this.currentPiece;
    if (this.board.isValidPosition(p.currentShape, p.row + 1, p.col)) {
      p.row++;
      this.score += SOFT_DROP_SCORE;
      this._updateDisplay();
      this.audio.playSoftDrop();
      this.dropTimer = 0;
    }
  }

  _hardDrop() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    const p = this.currentPiece;
    let dropped = 0;
    while (this.board.isValidPosition(p.currentShape, p.row + 1, p.col)) {
      p.row++;
      dropped++;
    }
    this.score += dropped * HARD_DROP_SCORE;
    this.audio.playHardDrop();

    // Particle effect (canvas-local coordinates)
    this.particles.emitHardDrop(
      p.getLeftCol(), p.getBottomRow(),
      p.width, 0, 0
    );

    // Screen shake
    this.shakeTimer = SCREEN_SHAKE_DURATION;
    this.renderer.applyShake(SCREEN_SHAKE_INTENSITY);

    this._lockPiece();
  }

  _rotateCW() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    const result = this.currentPiece.tryRotateCW(this.board);
    if (result) {
      this.currentPiece.applyRotation(result);
      this.audio.playRotate();
      this._resetLock();
    }
  }

  _rotateCCW() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    const result = this.currentPiece.tryRotateCCW(this.board);
    if (result) {
      this.currentPiece.applyRotation(result);
      this.audio.playRotate();
      this._resetLock();
    }
  }

  _holdSwap() {
    if (this.state !== STATE.PLAYING || this.holdUsed || !this.currentPiece) return;

    const currentType = this.currentPiece.type;
    if (this.holdPiece) {
      // Swap
      this.currentPiece = new Piece(this.holdPiece);
    } else {
      // No hold piece yet — spawn next
      this._spawnPiece();
    }
    this.holdPiece = currentType;
    this.holdUsed = true;
    this.isLocking = false;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.rowActiveTimer = 0;
    if (this.currentPiece) this.lastPieceRow = this.currentPiece.row;

    this.audio.playHold();
    this.renderer.drawHoldPiece(this.holdPiece);
  }

  _togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.audio.stopMusic();
      this._showOverlay('pause-screen');
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.audio.startMusic();
      this._hideAllOverlays();
    }
  }

  _handleConfirm() {
    if (this.state === STATE.START) {
      this.startGame();
    } else if (this.state === STATE.GAME_OVER || this.state === STATE.ANTIGRAVITY) {
      this.startGame();
    } else if (this.state === STATE.PAUSED) {
      this._togglePause();
    }
  }

  // ═══════════════════════════════════════════════════════
  //  PIECE LOCKING & LINE CLEARING
  // ═══════════════════════════════════════════════════════

  _resetLock() {
    if (this.isLocking && this.lockMoves < LOCK_MOVES) {
      this.lockTimer = 0;
      this.lockMoves++;
    }
  }

  _lockPiece() {
    if (!this.currentPiece) return;
    this.board.lockPiece(this.currentPiece);
    this.audio.playLock();

    // Lock visual effect
    const p = this.currentPiece;
    const shape = p.currentShape;
    this.particles.emitLock(p.col, p.row, shape[0].length, shape.length, 0, 0);

    // Check line clears
    const fullRows = this.board.getFullRows();
    if (fullRows.length > 0) {
      this._handleLineClear(fullRows);
    } else {
      this.combo = -1;
      this._spawnPiece();
    }
  }

  _handleLineClear(rows) {
    this.combo++;
    const lineCount = rows.length;

    // Calculate score
    const baseScore = SCORE_TABLE[lineCount] || lineCount * 100;
    const comboScore = this.combo > 0 ? this.combo * COMBO_BONUS : 0;
    this.score += (baseScore + comboScore) * this.level;
    this.lines += lineCount;

    // Level progression
    const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    const leveledUp = newLevel > this.level;
    this.level = newLevel;

    // Audio
    this.audio.playLineClear(lineCount);
    if (this.combo > 0) this.audio.playCombo(this.combo);

    // Flash text
    const labels = { 1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS!' };
    let text = labels[lineCount] || `${lineCount} LINES`;
    if (this.combo > 0) text += ` × ${this.combo + 1}`;
    this._showActionText(text);

    // Particle effects (canvas-local coordinates)
    this.particles.emitLineClear(rows, 0, 0, COLS);

    if (this.combo > 1) {
      this.particles.emitCombo(
        BOARD_WIDTH / 2,
        BOARD_HEIGHT / 2,
        this.combo
      );
    }

    // Start line clear flash animation
    this.clearingRows = rows;
    this.clearFlashAlpha = 1;
    this.clearAnimTimer = 0;

    // Animate clear then proceed
    const clearDuration = 300;
    const step = () => {
      this.clearAnimTimer += 16;
      this.clearFlashAlpha = 1 - this.clearAnimTimer / clearDuration;
      if (this.clearAnimTimer >= clearDuration) {
        this.board.clearRows(rows);
        this.clearingRows = null;
        this.clearFlashAlpha = 0;

        if (leveledUp) {
          this._handleLevelUp();
        }

        this._updateDisplay();
        this._spawnPiece();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _handleLevelUp() {
    this.audio.playLevelUp();
    this._showActionText(`LEVEL ${this.level}`);

    this.particles.emitLevelUp(
      BOARD_WIDTH / 2,
      BOARD_HEIGHT / 2
    );

    // Screen flash
    gsap.fromTo('#board-glow',
      { boxShadow: '0 0 40px rgba(255,255,0,0.6), inset 0 0 30px rgba(255,255,0,0.3)' },
      { boxShadow: '0 0 15px rgba(0,255,255,0.2), inset 0 0 15px rgba(0,255,255,0.05)', duration: 0.8, ease: 'power2.out' }
    );
  }

  // ═══════════════════════════════════════════════════════
  //  UI HELPERS
  // ═══════════════════════════════════════════════════════

  _updateDisplay() {
    this.scoreDisplay.textContent = this.score;
    this.levelDisplay.textContent = this.level;
    this.linesDisplay.textContent = this.lines;
    this.comboDisplay.textContent = Math.max(0, this.combo);
  }

  _showActionText(text) {
    const el = this.actionText;
    el.textContent = text;
    el.classList.remove('hidden');
    gsap.fromTo(el,
      { opacity: 1, scale: 1.5, y: 0 },
      {
        opacity: 0, scale: 2.0, y: -30,
        duration: 1.2, ease: 'power2.out',
        onComplete: () => el.classList.add('hidden'),
      }
    );
  }

  _showOverlay(id) {
    this._hideAllOverlays();
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      gsap.fromTo(el.querySelector('.overlay-content'),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }
      );
    }
  }

  _hideAllOverlays() {
    document.querySelectorAll('.overlay-screen').forEach(el => el.classList.remove('active'));
  }

  // ═══════════════════════════════════════════════════════
  //  MAIN GAME LOOP
  // ═══════════════════════════════════════════════════════

  /** Get current drop speed in ms */
  get dropInterval() {
    const idx = Math.min(this.level - 1, SPEED_CURVE.length - 1);
    return SPEED_CURVE[idx];
  }

  update(dt) {
    if (this.state === STATE.PLAYING) {
      this._updatePlaying(dt);
    } else if (this.state === STATE.ANTIGRAVITY) {
      this.antigravity.update(dt);
    }

    // Update particles regardless of state
    this.particles.update(dt);

    // Update input DAS
    this.input.update(dt);

    // Screen shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.renderer.clearShake();
      } else {
        this.renderer.applyShake(SCREEN_SHAKE_INTENSITY * (this.shakeTimer / SCREEN_SHAKE_DURATION));
      }
    }
  }

  _updatePlaying(dt) {
    if (!this.currentPiece || this.clearingRows) return;

    // Row Time Tracker (Prevent infinite spinning stall)
    if (this.currentPiece.row !== this.lastPieceRow) {
      this.rowActiveTimer = 0;
      this.lastPieceRow = this.currentPiece.row;
    } else {
      this.rowActiveTimer += dt;
      if (this.rowActiveTimer >= 3000) {
        // Force drop by 1 or lock
        if (this.board.isValidPosition(this.currentPiece.currentShape, this.currentPiece.row + 1, this.currentPiece.col)) {
          this.currentPiece.row++;
          this.isLocking = false;
          this.lockTimer = 0;
          this.dropTimer = 0;
          this.rowActiveTimer = 0;
          this.lastPieceRow = this.currentPiece.row;
        } else {
          this._lockPiece();
          return;
        }
      }
    }

    // Gravity
    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (this.board.isValidPosition(this.currentPiece.currentShape, this.currentPiece.row + 1, this.currentPiece.col)) {
        this.currentPiece.row++;
        this.isLocking = false;
        this.lockTimer = 0;
      } else {
        // Start lock delay
        if (!this.isLocking) {
          this.isLocking = true;
          this.lockTimer = 0;
          this.lockMoves = 0;
        }
      }
    }

    // Lock delay
    if (this.isLocking) {
      this.lockTimer += dt;
      // Check if piece can still drop (player moved it off ledge)
      if (this.board.isValidPosition(this.currentPiece.currentShape, this.currentPiece.row + 1, this.currentPiece.col)) {
        this.isLocking = false;
        this.lockTimer = 0;
      } else if (this.lockTimer >= LOCK_DELAY || this.lockMoves >= LOCK_MOVES) {
        this._lockPiece();
      }
    }

    // Chaos mode random gravity visual indicator
    if (this.mode === 'chaos') {
      this.chaosGravityTimer += dt;
      if (this.chaosGravityTimer > 8000) {
        this.chaosGravityTimer = 0;
        // Briefly shake screen as visual chaos feedback
        this.shakeTimer = 100;
        this.renderer.applyShake(3);
      }
    }
  }

  render() {
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
      this.renderer.renderFrame(this);
    } else if (this.state === STATE.GAME_OVER) {
      this.renderer.renderFrame(this);
    }

    // Render particles on top of everything
    this.particles.render(this.renderer.ctx, 0, 0);
  }

  // Main loop entry
  tick(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(timestamp - this.lastTime, 100); // Cap delta
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.tick(t));
  }

  start() {
    this._showOverlay('start-screen');
    requestAnimationFrame((t) => this.tick(t));
  }
}
