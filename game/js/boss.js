// boss.js — the Dreadnought, ORBITFALL's wave-8 carrier. It flies in from
// deep space, takes up a slow strafing orbit around the planet, launches
// weaver drones and fires plasma bolts at the surface. game.js owns the
// drones and bolts once they exist; this file owns the carrier itself:
// its movement plan, its attack clocks and its drawing.

const TAU = Math.PI * 2;

export const BOSS_STATS = {
  radius: 46,
  hp: 60,
  score: 2000,
  orbitRadius: 322,
  enterSpeed: 95,
  strafeSpeed: 0.105,
};

export function createDreadnought(cx, cy) {
  const orbitAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  return {
    type: 'boss',
    orbitAngle,
    dist: 660,
    x: cx + Math.cos(orbitAngle) * 660,
    y: cy + Math.sin(orbitAngle) * 660,
    radius: BOSS_STATS.radius,
    hp: BOSS_STATS.hp,
    maxHp: BOSS_STATS.hp,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 5 + Math.random() * 3,
    droneTimer: 2.4,
    boltTimer: 2.6,
    entered: false,
    flash: 0,
    age: 0,
  };
}

// Advances the carrier one frame. Returns the attack events game.js must
// act on this frame: { launchDrone, fireBolts }.
export function stepDreadnought(boss, dt, cx, cy) {
  const events = { launchDrone: false, fireBolts: false };
  boss.age += dt;
  if (boss.flash > 0) boss.flash -= dt * 6;

  if (!boss.entered) {
    boss.dist -= BOSS_STATS.enterSpeed * dt;
    if (boss.dist <= BOSS_STATS.orbitRadius) {
      boss.dist = BOSS_STATS.orbitRadius;
      boss.entered = true;
    }
  } else {
    boss.strafeTimer -= dt;
    if (boss.strafeTimer <= 0) {
      boss.strafeDir *= -1;
      boss.strafeTimer = 5 + Math.random() * 3.5;
    }
    boss.orbitAngle += boss.strafeDir * BOSS_STATS.strafeSpeed * dt;
    boss.dist = BOSS_STATS.orbitRadius + Math.sin(boss.age * 0.45) * 26;
    boss.droneTimer -= dt;
    if (boss.droneTimer <= 0) {
      boss.droneTimer = 2.7 + Math.random() * 0.7;
      events.launchDrone = true;
    }
    boss.boltTimer -= dt;
    if (boss.boltTimer <= 0) {
      boss.boltTimer = 3.5 + Math.random() * 0.8;
      events.fireBolts = true;
    }
  }

  boss.x = cx + Math.cos(boss.orbitAngle) * boss.dist;
  boss.y = cy + Math.sin(boss.orbitAngle) * boss.dist;
  return events;
}

export function drawDreadnought(ctx, boss, t) {
  const heading = boss.orbitAngle + Math.PI / 2 * boss.strafeDir;
  const hurt = boss.hp / boss.maxHp < 0.35;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(heading);

  // Engine glow at the stern.
  const flicker = 0.75 + Math.sin(t * 31) * 0.25;
  const engine = ctx.createRadialGradient(0, 40, 2, 0, 40, 30);
  engine.addColorStop(0, `rgba(255, 170, 90, ${0.75 * flicker})`);
  engine.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = engine;
  ctx.beginPath();
  ctx.arc(0, 40, 30, 0, TAU);
  ctx.fill();

  // Side pods.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 30, -18);
    ctx.lineTo(side * 46, 2);
    ctx.lineTo(side * 40, 26);
    ctx.lineTo(side * 26, 18);
    ctx.closePath();
    ctx.fillStyle = boss.flash > 0 ? '#8d4a63' : '#4a2438';
    ctx.fill();
    ctx.strokeStyle = '#c2456e';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(side * 36, 4, 3.2, 0, TAU);
    ctx.fillStyle = '#ff7aa2';
    ctx.fill();
  }

  // Main hull: a long angular carrier body, bow at -y.
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.lineTo(17, -26);
  ctx.lineTo(22, 12);
  ctx.lineTo(12, 38);
  ctx.lineTo(-12, 38);
  ctx.lineTo(-22, 12);
  ctx.lineTo(-17, -26);
  ctx.closePath();
  const hull = ctx.createLinearGradient(-22, 0, 22, 0);
  hull.addColorStop(0, boss.flash > 0 ? '#a34a68' : '#5c2a40');
  hull.addColorStop(0.5, boss.flash > 0 ? '#c25b7d' : '#7a3552');
  hull.addColorStop(1, boss.flash > 0 ? '#a34a68' : '#522539');
  ctx.fillStyle = hull;
  ctx.fill();
  ctx.strokeStyle = '#ff8fb0';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Hull plating lines and running lights.
  ctx.strokeStyle = 'rgba(255, 160, 190, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-17, -8);
  ctx.lineTo(17, -8);
  ctx.moveTo(-20, 16);
  ctx.lineTo(20, 16);
  ctx.stroke();
  ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ffd94d' : 'rgba(255, 217, 77, 0.25)';
  for (const lx of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.arc(lx, 30, 1.8, 0, TAU);
    ctx.fill();
  }

  // The core: a pulsing reactor the player aims for.
  const pulse = 0.8 + Math.sin(t * 5.2) * 0.2;
  const core = ctx.createRadialGradient(0, -2, 1, 0, -2, 15 * pulse);
  core.addColorStop(0, '#fff1f6');
  core.addColorStop(0.45, '#ff5f92');
  core.addColorStop(1, 'rgba(255, 60, 120, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -2, 15 * pulse, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -2, 5.5, 0, TAU);
  ctx.fillStyle = '#ffe3ee';
  ctx.fill();

  // Damage smoke when the carrier is close to death.
  if (hurt) {
    ctx.fillStyle = 'rgba(30, 30, 36, 0.5)';
    for (let i = 0; i < 3; i++) {
      const sx = Math.sin(t * 2.1 + i * 2.4) * 14;
      const sy = -20 + i * 16 + Math.sin(t * 3 + i) * 4;
      ctx.beginPath();
      ctx.arc(sx, sy, 6 + i * 2.5 + Math.sin(t * 5 + i) * 1.5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
