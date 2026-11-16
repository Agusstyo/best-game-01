// game.js — ORBITFALL's rules and state machine. One Game object owns the
// planet, the satellite, every hostile and the score, and moves through
// title -> playing -> (paused) -> won / lost, with a wave banner between
// waves. Rendering lives in render.js, things that fly in entities.js.

import {
  PICKUP_KINDS,
  createBullet,
  createDrone,
  createFloatText,
  createMeteor,
  createPickup,
  createSparkBurst,
  drawBullet,
  drawDrone,
  drawFloatText,
  drawMeteor,
  drawPickup,
  drawSpark,
  stepEntity,
} from './entities.js';
import { TOTAL_WAVES, createWaveDirector, wavePlan } from './waves.js';
import {
  createStarfield,
  drawEndScreen,
  drawHud,
  drawOrbitRail,
  drawPauseOverlay,
  drawPlanet,
  drawSatellite,
  drawTitleScreen,
  drawWaveBanner,
} from './render.js';

const TAU = Math.PI * 2;
const PLANET_RADIUS = 56;
const ORBIT_RADIUS = 118;
const PLANET_MAX_HP = 100;
const BASE_FIRE_COOLDOWN = 0.16;
const RAPID_FIRE_COOLDOWN = 0.085;
const PICKUP_DROP_CHANCE = { small: 0.04, medium: 0.16, large: 0.34, drone: 0.3 };

function shortestTurn(from, to) {
  let diff = (to - from) % TAU;
  if (diff > Math.PI) diff -= TAU;
  if (diff < -Math.PI) diff += TAU;
  return diff;
}

function loadHighScore() {
  try {
    return Number(localStorage.getItem('orbitfall-high-score')) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem('orbitfall-high-score', String(value));
  } catch {
    // A private window may refuse storage; the game plays on regardless.
  }
}

export class Game {
  constructor(canvas, input, sound) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.sound = sound;
    this.width = canvas.width;
    this.height = canvas.height;
    this.cx = this.width / 2;
    this.cy = this.height / 2 + 36;
    this.starfield = createStarfield(this.width, this.height);
    this.director = createWaveDirector();
    this.state = 'title';
    this.time = 0;
    this.highScore = loadHighScore();
    this.newBest = false;
    this.resetWorld();
  }

  resetWorld() {
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.planetHp = PLANET_MAX_HP;
    this.wave = 1;
    this.hostiles = [];
    this.bullets = [];
    this.sparks = [];
    this.pickups = [];
    this.texts = [];
    this.satellite = { angle: -Math.PI / 2, cooldown: 0, firing: false };
    this.power = null;
    this.pickupCycle = 0;
    this.banner = 0;
    this.hitFlash = 0;
    this.shake = 0;
  }

  startRun() {
    this.resetWorld();
    this.state = 'playing';
    this.director.startWave(this.wave);
    this.banner = 2.1;
    this.sound.unlock();
  }

  get multiplier() {
    return 1 + Math.min(4, Math.floor(this.combo / 5));
  }

  update(dt) {
    this.time += dt;
    if (this.input.wasPressed('KeyM')) this.sound.toggleMute();
    switch (this.state) {
      case 'title':
        this.satellite.angle += dt * 0.25;
        this.stepAmbient(dt);
        if (this.input.wasPressed('Enter') || this.input.wasPressed('MouseDown')) {
          this.sound.uiClick();
          this.startRun();
        }
        break;
      case 'playing':
        if (this.input.wasPressed('KeyP')) {
          this.state = 'paused';
          break;
        }
        this.updatePlaying(dt);
        break;
      case 'paused':
        if (this.input.wasPressed('KeyP') || this.input.wasPressed('Enter')) this.state = 'playing';
        break;
      case 'won':
      case 'lost':
        this.stepAmbient(dt);
        if (this.input.wasPressed('KeyR') || this.input.wasPressed('Enter') || this.input.wasPressed('MouseDown')) {
          this.sound.uiClick();
          this.startRun();
        }
        break;
    }
  }

  stepAmbient(dt) {
    for (const s of this.sparks) stepEntity(s, dt);
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const t of this.texts) stepEntity(t, dt);
    this.texts = this.texts.filter((t) => t.life > 0);
    if (this.hitFlash > 0) this.hitFlash -= dt * 2.2;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
  }

  updatePlaying(dt) {
    if (this.banner > 0) this.banner -= dt;
    // Spawning.
    const kind = this.director.update(dt);
    if (kind === 'drone') this.hostiles.push(createDrone(this.cx, this.cy, wavePlan(this.wave).speedScale));
    else if (kind) this.hostiles.push(createMeteor(this.cx, this.cy, kind, wavePlan(this.wave).speedScale));
    this.aimSatellite(dt);
    this.fireGuns(dt);
    this.stepBullets(dt);
    this.stepHostiles(dt);
    this.stepPickups(dt);
    this.stepAmbient(dt);
    // Combo and power-up clocks.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.power) {
      this.power.seconds -= dt;
      if (this.power.seconds <= 0) this.power = null;
    }
    // Wave cleared?
    if (this.state === 'playing' && !this.director.hasQueued() && this.hostiles.length === 0) {
      this.onWaveCleared();
    }
  }

  aimSatellite(dt) {
    const sat = this.satellite;
    const dir = this.input.rotateDirection();
    if (dir !== 0) {
      sat.angle += dir * 2.9 * dt;
      return;
    }
    const p = this.input.pointer;
    if (p.inside) {
      const target = Math.atan2(p.y - this.cy, p.x - this.cx);
      sat.angle += shortestTurn(sat.angle, target) * Math.min(1, dt * 16);
    }
  }

  fireGuns(dt) {
    const sat = this.satellite;
    sat.cooldown -= dt;
    sat.firing = this.input.fireHeld();
    if (!sat.firing || sat.cooldown > 0) return;
    const rapid = this.power && this.power.kind === 'rapid';
    sat.cooldown = rapid ? RAPID_FIRE_COOLDOWN : BASE_FIRE_COOLDOWN;
    const nose = ORBIT_RADIUS + 18;
    const bx = this.cx + Math.cos(sat.angle) * nose;
    const by = this.cy + Math.sin(sat.angle) * nose;
    this.bullets.push(createBullet(bx, by, sat.angle));
    if (this.power && this.power.kind === 'spread') {
      this.bullets.push(createBullet(bx, by, sat.angle - 0.13));
      this.bullets.push(createBullet(bx, by, sat.angle + 0.13));
    }
    this.sound.laser();
  }

  stepBullets(dt) {
    for (const b of this.bullets) {
      stepEntity(b, dt);
      const dist = Math.hypot(b.x - this.cx, b.y - this.cy);
      if (dist > 590) b.life = 0;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.checkBulletHits();
  }

  checkBulletHits() {
    for (const b of this.bullets) {
      for (const e of this.hostiles) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < e.radius + b.radius + 2) {
          b.life = 0;
          e.hp -= 1;
          e.flash = 1;
          createSparkBurst(this.sparks, b.x, b.y, '#ffd9a0', 4, 130);
          if (e.hp <= 0) this.killHostile(e);
          break;
        }
      }
    }
    this.hostiles = this.hostiles.filter((e) => e.hp > 0);
  }

  killHostile(e) {
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = 2.5;
    const gained = e.score * this.multiplier;
    this.score += gained;
    const big = e.kind === 'large' || e.type === 'drone';
    createSparkBurst(this.sparks, e.x, e.y, e.type === 'drone' ? '#ff9dbd' : '#ffb37a', big ? 22 : 12, big ? 260 : 200);
    createSparkBurst(this.sparks, e.x, e.y, '#fff3c9', 6, 150);
    this.texts.push(createFloatText(e.x, e.y - e.radius - 6, `+${gained}`, '#ffe9a8'));
    this.sound.explosion(e.type === 'drone' ? 1 : e.kind === 'large' ? 1.4 : 0.7);
    if (e.type === 'meteor' && e.kind === 'large') this.splitMeteor(e);
    const chance = e.type === 'drone' ? PICKUP_DROP_CHANCE.drone : PICKUP_DROP_CHANCE[e.kind];
    if (Math.random() < chance) this.dropPickup(e.x, e.y);
  }

  splitMeteor(parent) {
    for (let i = 0; i < 2; i++) {
      const child = createMeteor(this.cx, this.cy, 'small', 1);
      child.x = parent.x;
      child.y = parent.y;
      const away = Math.atan2(parent.y - this.cy, parent.x - this.cx) + (i === 0 ? 0.7 : -0.7);
      const inward = Math.atan2(this.cy - parent.y, this.cx - parent.x);
      const dir = inward + (i === 0 ? 0.55 : -0.55);
      const speed = 66 + Math.random() * 20;
      child.vx = Math.cos(dir) * speed + Math.cos(away) * 12;
      child.vy = Math.sin(dir) * speed + Math.sin(away) * 12;
      this.hostiles.push(child);
    }
  }

  dropPickup(x, y) {
    const kinds = ['rapid', 'spread', 'repair'];
    const kind = kinds[this.pickupCycle % kinds.length];
    this.pickupCycle += 1;
    this.pickups.push(createPickup(x, y, kind, this.cx, this.cy));
  }

  stepHostiles(dt) {
    for (const e of this.hostiles) {
      stepEntity(e, dt);
      const dist = Math.hypot(e.x - this.cx, e.y - this.cy);
      if (dist < PLANET_RADIUS + e.radius * 0.55) {
        e.hp = 0;
        this.damagePlanet(e);
      }
    }
    this.hostiles = this.hostiles.filter((e) => e.hp > 0);
  }

  damagePlanet(e) {
    this.planetHp -= e.damage;
    this.hitFlash = 0.85;
    this.shake = 11;
    this.combo = 0;
    this.comboTimer = 0;
    createSparkBurst(this.sparks, e.x, e.y, '#ff7a5c', 20, 240);
    this.texts.push(createFloatText(this.cx, this.cy - PLANET_RADIUS - 26, `-${e.damage} PLANET`, '#ff9d8a'));
    this.sound.planetHit();
    if (this.planetHp <= 0) {
      this.planetHp = 0;
      this.finishRun(false);
    }
  }

  stepPickups(dt) {
    const sat = this.satellitePosition();
    for (const p of this.pickups) {
      stepEntity(p, dt);
      const toSat = Math.hypot(p.x - sat.x, p.y - sat.y);
      const toPlanet = Math.hypot(p.x - this.cx, p.y - this.cy);
      if (toSat < 36) {
        p.life = 0;
        this.collectPickup(p);
      } else if (toPlanet < PLANET_RADIUS + 8) {
        p.life = 0;
        createSparkBurst(this.sparks, p.x, p.y, '#5a6c8c', 6, 90);
      }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);
  }

  collectPickup(p) {
    const info = PICKUP_KINDS[p.kind];
    if (p.kind === 'repair') {
      this.planetHp = Math.min(PLANET_MAX_HP, this.planetHp + 18);
    } else {
      this.power = { kind: p.kind, label: info.label, color: info.color, seconds: p.kind === 'rapid' ? 8 : 10 };
    }
    this.texts.push(createFloatText(p.x, p.y - 20, info.label, info.color));
    this.sound.pickup();
  }

  onWaveCleared() {
    const bonus = wavePlan(this.wave).clearBonus;
    if (this.wave >= TOTAL_WAVES) {
      this.finishRun(true);
      return;
    }
    this.score += bonus;
    this.texts.push(createFloatText(this.cx, this.cy - 120, `WAVE ${this.wave} CLEAR  +${bonus}`, '#8fd0ff'));
    this.sound.waveClear();
    this.wave += 1;
    this.director.startWave(this.wave);
    this.banner = 2.1;
  }

  finishRun(victory) {
    if (victory) {
      const integrityBonus = Math.round(this.planetHp) * 10;
      this.score += integrityBonus;
      this.texts.push(createFloatText(this.cx, this.cy - 120, `INTEGRITY BONUS +${integrityBonus}`, '#7dff8a'));
      createSparkBurst(this.sparks, this.cx, this.cy - 90, '#7dff8a', 30, 300);
      this.sound.victory();
      this.state = 'won';
    } else {
      createSparkBurst(this.sparks, this.cx, this.cy, '#ff8a5c', 46, 340);
      createSparkBurst(this.sparks, this.cx, this.cy, '#ffd9a0', 26, 220);
      this.shake = 16;
      this.sound.gameOver();
      this.state = 'lost';
    }
    this.newBest = this.score > this.highScore;
    if (this.newBest) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
  }

  satellitePosition() {
    return {
      x: this.cx + Math.cos(this.satellite.angle) * ORBIT_RADIUS,
      y: this.cy + Math.sin(this.satellite.angle) * ORBIT_RADIUS,
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.drawImage(this.starfield, 0, 0);
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawOrbitRail(ctx, this.cx, this.cy, ORBIT_RADIUS);
    for (const p of this.pickups) drawPickup(ctx, p);
    drawPlanet(ctx, this.cx, this.cy, PLANET_RADIUS, this.planetHp / PLANET_MAX_HP, this.time, Math.max(0, this.hitFlash));
    for (const e of this.hostiles) {
      if (e.type === 'drone') drawDrone(ctx, e);
      else drawMeteor(ctx, e);
    }
    for (const b of this.bullets) drawBullet(ctx, b);
    const sat = this.satellitePosition();
    drawSatellite(ctx, sat.x, sat.y, this.satellite.angle, this.satellite.firing && this.state === 'playing', this.time);
    for (const s of this.sparks) drawSpark(ctx, s);
    for (const t of this.texts) drawFloatText(ctx, t);
    ctx.restore();

    if (this.state === 'playing' || this.state === 'paused') {
      drawHud(ctx, {
        width: this.width,
        score: this.score,
        wave: this.wave,
        totalWaves: TOTAL_WAVES,
        hostilesLeft: this.hostiles.length + this.director.queuedCount(),
        planetHp: this.planetHp,
        planetMaxHp: PLANET_MAX_HP,
        combo: this.combo,
        multiplier: this.multiplier,
        power: this.power,
      });
    }
    if (this.banner > 0 && this.state === 'playing') {
      const alpha = this.banner > 1.8 ? (2.1 - this.banner) / 0.3 : this.banner < 0.5 ? this.banner / 0.5 : 1;
      drawWaveBanner(ctx, { width: this.width, height: this.height, wave: this.wave, alpha });
    }
    if (this.state === 'title') {
      drawTitleScreen(ctx, { width: this.width, height: this.height, t: this.time, highScore: this.highScore });
    } else if (this.state === 'paused') {
      drawPauseOverlay(ctx, { width: this.width, height: this.height });
    } else if (this.state === 'won' || this.state === 'lost') {
      drawEndScreen(ctx, {
        width: this.width,
        height: this.height,
        victory: this.state === 'won',
        score: this.score,
        wave: this.wave,
        kills: this.kills,
        highScore: this.highScore,
        newBest: this.newBest,
      });
    }
  }
}
