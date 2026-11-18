// game.js — ORBITFALL's rules and state machine. One Game object owns the
// planet, the satellite, every hostile and the score, and moves through
// title -> playing -> (paused) -> won / lost, with a wave banner between
// waves. Rendering lives in render.js, things that fly in entities.js.

import {
  PICKUP_KINDS,
  createBolt,
  createBullet,
  createComet,
  createDrone,
  createFloatText,
  createMeteor,
  createPickup,
  createSparkBurst,
  drawBolt,
  drawBullet,
  drawComet,
  drawDrone,
  drawFloatText,
  drawMeteor,
  drawPickup,
  drawSpark,
  stepEntity,
} from './entities.js';
import {
  createDebrisBurst,
  createShockwave,
  createShootingStar,
  createTwinkles,
  drawDebris,
  drawShockwave,
  drawShootingStar,
  drawTwinkles,
  stepEffect,
} from './effects.js';
import { BOSS_STATS, createDreadnought, drawDreadnought, stepDreadnought } from './boss.js';
import { TOTAL_WAVES, createWaveDirector, wavePlan } from './waves.js';
import {
  createStarfield,
  drawAegisRing,
  drawDangerArrow,
  drawDangerVignette,
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
const PICKUP_DROP_CHANCE = { small: 0.04, medium: 0.16, large: 0.34, drone: 0.3, comet: 0.06, bolt: 0 };

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
    this.twinkles = createTwinkles(this.width, this.height);
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
    this.shockwaves = [];
    this.debris = [];
    this.shootingStars = [];
    this.shootingTimer = 3 + Math.random() * 5;
    this.pickups = [];
    this.texts = [];
    this.satellite = { angle: -Math.PI / 2, cooldown: 0, firing: false, recoil: 0, spin: 0 };
    this.power = null;
    this.pickupCycle = 0;
    this.banner = 0;
    this.hitFlash = 0;
    this.shake = 0;
    this.freeze = 0;
    this.boss = null;
    this.bossKilled = false;
  }

  startRun() {
    this.resetWorld();
    this.state = 'playing';
    this.beginWave();
    this.sound.unlock();
  }

  beginWave() {
    const plan = this.director.startWave(this.wave);
    this.banner = 2.1;
    if (plan.boss) {
      this.boss = createDreadnought(this.cx, this.cy);
      this.sound.bossAlarm();
    }
  }

  get multiplier() {
    return 1 + Math.min(4, Math.floor(this.combo / 5));
  }

  update(rawDt) {
    // Hit-stop: a big kill briefly slows the world so the blow lands.
    let dt = rawDt;
    if (this.freeze > 0) {
      this.freeze -= rawDt;
      dt = rawDt * 0.16;
    }
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
    for (const w of this.shockwaves) stepEffect(w, dt);
    this.shockwaves = this.shockwaves.filter((w) => w.life > 0);
    for (const d of this.debris) stepEffect(d, dt);
    this.debris = this.debris.filter((d) => d.life > 0);
    // Shooting stars cross the backdrop now and then.
    this.shootingTimer -= dt;
    if (this.shootingTimer <= 0) {
      this.shootingStars.push(createShootingStar(this.width, this.height));
      this.shootingTimer = 5 + Math.random() * 7;
    }
    for (const s of this.shootingStars) stepEffect(s, dt);
    this.shootingStars = this.shootingStars.filter((s) => s.life > 0);
    if (this.satellite.recoil > 0) this.satellite.recoil = Math.max(0, this.satellite.recoil - dt * 6.5);
    if (this.hitFlash > 0) this.hitFlash -= dt * 2.2;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
  }

  updatePlaying(dt) {
    if (this.banner > 0) this.banner -= dt;
    // Spawning.
    const kind = this.director.update(dt);
    if (kind === 'drone') this.hostiles.push(createDrone(this.cx, this.cy, wavePlan(this.wave).speedScale));
    else if (kind === 'comet') this.hostiles.push(createComet(this.cx, this.cy, wavePlan(this.wave).speedScale));
    else if (kind) this.hostiles.push(createMeteor(this.cx, this.cy, kind, wavePlan(this.wave).speedScale));
    this.stepBoss(dt);
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
    if (this.state === 'playing' && !this.director.hasQueued() && this.hostiles.length === 0 && !this.boss) {
      this.onWaveCleared();
    }
  }

  stepBoss(dt) {
    if (!this.boss) return;
    const events = stepDreadnought(this.boss, dt, this.cx, this.cy);
    if (events.launchDrone && this.hostiles.length < 26) this.launchBossDrone();
    if (events.fireBolts) this.fireBossBolts();
    if (this.boss.entered && this.boss.hp / this.boss.maxHp < 0.35 && Math.random() < dt * 6) {
      createSparkBurst(this.sparks, this.boss.x + (Math.random() - 0.5) * 40, this.boss.y + (Math.random() - 0.5) * 40, '#ff9d5c', 2, 70);
    }
  }

  launchBossDrone() {
    const drone = createDrone(this.cx, this.cy, wavePlan(this.wave).speedScale);
    drone.x = this.boss.x;
    drone.y = this.boss.y;
    const inward = Math.atan2(this.cy - drone.y, this.cx - drone.x);
    const speed = 88 * wavePlan(this.wave).speedScale;
    drone.vx = Math.cos(inward) * speed;
    drone.vy = Math.sin(inward) * speed;
    drone.heading = inward;
    this.hostiles.push(drone);
  }

  fireBossBolts() {
    // A three-bolt fan at the planet: center bolt true, the others
    // aimed a body's width to either side of the capital.
    for (const offset of [-30, 0, 30]) {
      const perp = this.boss.orbitAngle + Math.PI / 2;
      const tx = this.cx + Math.cos(perp) * offset;
      const ty = this.cy + Math.sin(perp) * offset;
      this.hostiles.push(createBolt(this.boss.x, this.boss.y, tx, ty));
    }
    this.sound.laser();
  }

  killBoss() {
    const boss = this.boss;
    this.boss = null;
    this.bossKilled = true;
    this.kills += 1;
    this.score += BOSS_STATS.score;
    this.freeze = 0.1;
    this.shake = 15;
    createSparkBurst(this.sparks, boss.x, boss.y, '#ff9dbd', 42, 320);
    createSparkBurst(this.sparks, boss.x, boss.y, '#ffd9a0', 30, 240);
    createSparkBurst(this.sparks, boss.x, boss.y, '#fff3c9', 16, 160);
    this.shockwaves.push(createShockwave(boss.x, boss.y, '#ff8fb0', 190));
    this.shockwaves.push(createShockwave(boss.x, boss.y, '#ffd9a0', 120));
    createDebrisBurst(this.debris, boss.x, boss.y, '#7a3552', 14, 210);
    createDebrisBurst(this.debris, boss.x, boss.y, '#c2456e', 8, 160);
    this.texts.push(createFloatText(boss.x, boss.y - 60, `DREADNOUGHT DOWN  +${BOSS_STATS.score}`, '#7dff8a', 24));
    this.sound.bossDown();
  }

  aimSatellite(dt) {
    const sat = this.satellite;
    const before = sat.angle;
    const dir = this.input.rotateDirection();
    if (dir !== 0) {
      sat.angle += dir * 2.9 * dt;
    } else {
      const p = this.input.pointer;
      if (p.inside) {
        const target = Math.atan2(p.y - this.cy, p.x - this.cx);
        sat.angle += shortestTurn(sat.angle, target) * Math.min(1, dt * 16);
      }
    }
    const velocity = dt > 0 ? shortestTurn(before, sat.angle) / dt : 0;
    sat.spin += (velocity - sat.spin) * Math.min(1, dt * 10);
  }

  fireGuns(dt) {
    const sat = this.satellite;
    sat.cooldown -= dt;
    sat.firing = this.input.fireHeld();
    if (!sat.firing || sat.cooldown > 0) return;
    const rapid = this.power && this.power.kind === 'rapid';
    sat.cooldown = rapid ? RAPID_FIRE_COOLDOWN : BASE_FIRE_COOLDOWN;
    sat.recoil = 1;
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
      // The Dreadnought is not in the hostiles list; test it separately.
      if (b.life > 0 && this.boss) {
        const d = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
        if (d < this.boss.radius + b.radius + 4) {
          b.life = 0;
          this.boss.hp -= 1;
          this.boss.flash = 1;
          createSparkBurst(this.sparks, b.x, b.y, '#ffb3c2', 5, 150);
          if (this.boss.hp % 6 === 0) this.sound.explosion(0.5);
          if (this.boss.hp <= 0) this.killBoss();
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
    const burstColor = e.type === 'drone' || e.type === 'bolt' ? '#ff9dbd' : e.type === 'comet' ? '#aef4ff' : '#ffb37a';
    const debrisColor = e.type === 'meteor' ? '#8a6a52' : e.type === 'comet' ? '#7fc8e8' : '#c2456e';
    createSparkBurst(this.sparks, e.x, e.y, burstColor, big ? 30 : 17, big ? 260 : 200);
    createSparkBurst(this.sparks, e.x, e.y, '#fff3c9', 8, 150);
    this.shockwaves.push(createShockwave(e.x, e.y, burstColor, e.radius * (big ? 3.8 : 2.7)));
    createDebrisBurst(this.debris, e.x, e.y, debrisColor, big ? 9 : 5, big ? 190 : 140);
    if (big) this.freeze = Math.max(this.freeze, 0.045);
    this.texts.push(createFloatText(e.x, e.y - e.radius - 6, `+${gained}`, '#ffe9a8'));
    if (this.combo > 0 && this.combo % 10 === 0) {
      this.texts.push(createFloatText(this.cx, this.cy - 150, `STREAK x${this.combo}!`, '#ffd94d', 26));
      this.sound.pickup();
    }
    this.sound.explosion(e.type === 'drone' ? 1 : e.kind === 'large' ? 1.4 : 0.7);
    if (e.type === 'meteor' && e.kind === 'large') this.splitMeteor(e);
    const chance = e.type === 'drone'
      ? PICKUP_DROP_CHANCE.drone
      : e.type === 'comet'
        ? PICKUP_DROP_CHANCE.comet
        : e.type === 'bolt'
          ? PICKUP_DROP_CHANCE.bolt
          : PICKUP_DROP_CHANCE[e.kind];
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
    const kinds = ['rapid', 'spread', 'shield', 'repair'];
    const kind = kinds[this.pickupCycle % kinds.length];
    this.pickupCycle += 1;
    this.pickups.push(createPickup(x, y, kind, this.cx, this.cy));
  }

  stepHostiles(dt) {
    for (const e of this.hostiles) {
      stepEntity(e, dt);
      // Burning rocks and streaking comets shed embers as they fall.
      if (e.type === 'meteor' && e.kind !== 'small' && Math.random() < dt * 9) {
        this.sparks.push({
          type: 'spark', x: e.x, y: e.y, vx: -e.vx * 0.14, vy: -e.vy * 0.14,
          radius: 1.4 + Math.random() * 1.6, color: '#ff9a4d', life: 0.32, maxLife: 0.32,
        });
      } else if (e.type === 'comet' && Math.random() < dt * 26) {
        this.sparks.push({
          type: 'spark', x: e.x, y: e.y, vx: -e.vx * 0.1, vy: -e.vy * 0.1,
          radius: 1.2 + Math.random() * 1.4, color: '#9fe4ff', life: 0.3, maxLife: 0.3,
        });
      }
      if (e.life !== undefined && e.life <= 0) {
        e.hp = 0; // Flew past or burned out: gone, but no impact.
        continue;
      }
      const dist = Math.hypot(e.x - this.cx, e.y - this.cy);
      if (dist < PLANET_RADIUS + e.radius * 0.55) {
        e.hp = 0;
        this.damagePlanet(e);
      }
    }
    this.hostiles = this.hostiles.filter((e) => e.hp > 0);
  }

  damagePlanet(e) {
    // An active Aegis shield eats the impact instead of the planet.
    if (this.power && this.power.kind === 'shield') {
      this.power.seconds -= 3;
      if (this.power.seconds <= 0) this.power = null;
      this.shake = Math.max(this.shake, 4);
      createSparkBurst(this.sparks, e.x, e.y, '#b18cff', 16, 220);
      this.shockwaves.push(createShockwave(e.x, e.y, '#b18cff', 54));
      this.texts.push(createFloatText(e.x, e.y - 18, 'SHIELD BLOCK', '#cdb4ff'));
      this.sound.shieldHit();
      return;
    }
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
      const seconds = p.kind === 'rapid' ? 8 : p.kind === 'shield' ? 12 : 10;
      this.power = { kind: p.kind, label: info.label, color: info.color, seconds };
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
    this.beginWave();
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
    drawTwinkles(ctx, this.twinkles, this.time);
    for (const s of this.shootingStars) drawShootingStar(ctx, s);
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawOrbitRail(ctx, this.cx, this.cy, ORBIT_RADIUS);
    for (const p of this.pickups) drawPickup(ctx, p);
    drawPlanet(ctx, this.cx, this.cy, PLANET_RADIUS, this.planetHp / PLANET_MAX_HP, this.time, Math.max(0, this.hitFlash));
    if (this.power && this.power.kind === 'shield') {
      drawAegisRing(ctx, this.cx, this.cy, PLANET_RADIUS, this.time, this.power.seconds / 12);
    }
    for (const e of this.hostiles) {
      if (e.type === 'drone') drawDrone(ctx, e);
      else if (e.type === 'comet') drawComet(ctx, e);
      else if (e.type === 'bolt') drawBolt(ctx, e);
      else drawMeteor(ctx, e);
    }
    if (this.boss) drawDreadnought(ctx, this.boss, this.time);
    for (const b of this.bullets) drawBullet(ctx, b);
    const sat = this.satellitePosition();
    const recoilBack = this.satellite.recoil * 4.5;
    drawSatellite(
      ctx,
      sat.x - Math.cos(this.satellite.angle) * recoilBack,
      sat.y - Math.sin(this.satellite.angle) * recoilBack,
      this.satellite.angle,
      this.satellite.firing && this.state === 'playing',
      this.time,
      this.satellite.spin,
    );
    for (const w of this.shockwaves) drawShockwave(ctx, w);
    for (const d of this.debris) drawDebris(ctx, d);
    for (const s of this.sparks) drawSpark(ctx, s);
    for (const t of this.texts) drawFloatText(ctx, t);
    ctx.restore();

    // Edge warnings for threats still off-screen.
    if (this.state === 'playing') {
      for (const e of this.hostiles) {
        if (e.x < -6 || e.x > this.width + 6 || e.y < -6 || e.y > this.height + 6) {
          const angle = Math.atan2(e.y - this.cy, e.x - this.cx);
          const ax = Math.max(20, Math.min(this.width - 20, e.x));
          const ay = Math.max(76, Math.min(this.height - 20, e.y));
          drawDangerArrow(ctx, ax, ay, angle, this.time);
        }
      }
      if (this.planetHp <= PLANET_MAX_HP * 0.3 && this.planetHp > 0) {
        drawDangerVignette(ctx, this.width, this.height, this.time, 1 - this.planetHp / (PLANET_MAX_HP * 0.3) * 0.45);
      }
    }

    if (this.state === 'playing' || this.state === 'paused') {
      drawHud(ctx, {
        width: this.width,
        height: this.height,
        score: this.score,
        wave: this.wave,
        totalWaves: TOTAL_WAVES,
        hostilesLeft: this.hostiles.length + this.director.queuedCount(),
        planetHp: this.planetHp,
        planetMaxHp: PLANET_MAX_HP,
        combo: this.combo,
        multiplier: this.multiplier,
        power: this.power,
        boss: this.boss ? { hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
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
        bossKilled: this.bossKilled,
      });
    }
  }
}
