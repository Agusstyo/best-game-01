// entities.js — the flying things of ORBITFALL: meteors, weaver drones,
// bullets, spark particles, power-up cores and floating score text.
// Each entity is a plain object; factories make them, update functions
// move them, draw functions paint them.

export const METEOR_STATS = {
  small: { radius: 11, hp: 1, damage: 8, score: 50 },
  medium: { radius: 17, hp: 2, damage: 12, score: 100 },
  large: { radius: 26, hp: 4, damage: 20, score: 150 },
};

export const DRONE_STATS = { radius: 12, hp: 2, damage: 10, score: 200 };

export const PICKUP_KINDS = {
  rapid: { color: '#ffd94d', label: 'RAPID FIRE', glyph: '»' },
  spread: { color: '#6ef2ff', label: 'TRIPLE SHOT', glyph: 'Y' },
  repair: { color: '#7dff8a', label: 'REPAIR +18', glyph: '+' },
};

const TAU = Math.PI * 2;

function rockOutline(radius, seedPoints) {
  const points = [];
  const n = 9 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    points.push({
      angle: (i / n) * TAU,
      scale: 0.72 + Math.random() * 0.45,
      seed: seedPoints ? Math.random() : 0,
    });
  }
  return points;
}

export function createMeteor(cx, cy, kind, speedScale) {
  const stats = METEOR_STATS[kind];
  const angle = Math.random() * TAU;
  const dist = 545 + Math.random() * 70;
  const x = cx + Math.cos(angle) * dist;
  const y = cy + Math.sin(angle) * dist;
  const speed = (34 + Math.random() * 26) * speedScale * (kind === 'large' ? 0.72 : 1);
  const aimSpread = (Math.random() - 0.5) * 0.16;
  const vx = -Math.cos(angle + aimSpread) * speed;
  const vy = -Math.sin(angle + aimSpread) * speed;
  return {
    type: 'meteor',
    kind,
    x, y, vx, vy,
    radius: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    score: stats.score,
    rotation: Math.random() * TAU,
    spin: (Math.random() - 0.5) * 1.4,
    outline: rockOutline(stats.radius, true),
    flash: 0,
  };
}

export function createDrone(cx, cy, speedScale) {
  const angle = Math.random() * TAU;
  const dist = 560 + Math.random() * 60;
  const speed = 82 * speedScale;
  return {
    type: 'drone',
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: -Math.cos(angle) * speed,
    vy: -Math.sin(angle) * speed,
    radius: DRONE_STATS.radius,
    hp: DRONE_STATS.hp,
    maxHp: DRONE_STATS.hp,
    damage: DRONE_STATS.damage,
    score: DRONE_STATS.score,
    weavePhase: Math.random() * TAU,
    weaveRate: 3.2 + Math.random() * 1.6,
    heading: angle + Math.PI,
    flash: 0,
  };
}

export function createBullet(x, y, angle) {
  const speed = 640;
  return {
    type: 'bullet',
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 4,
    life: 1.1,
  };
}

export function createSparkBurst(sparks, x, y, color, count, baseSpeed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TAU;
    const speed = baseSpeed * (0.3 + Math.random() * 0.9);
    sparks.push({
      type: 'spark',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 2.6,
      color,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
    });
  }
}

export function createPickup(x, y, kind, cx, cy) {
  const inward = Math.atan2(cy - y, cx - x);
  return {
    type: 'pickup',
    kind,
    x, y,
    vx: Math.cos(inward) * 26,
    vy: Math.sin(inward) * 26,
    radius: 13,
    spin: Math.random() * TAU,
    life: 9,
  };
}

export function createFloatText(x, y, text, color) {
  return { type: 'text', x, y, text, color, life: 0.95, maxLife: 0.95 };
}

export function stepEntity(e, dt) {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.type === 'meteor') {
    e.rotation += e.spin * dt;
    if (e.flash > 0) e.flash -= dt * 6;
  } else if (e.type === 'drone') {
    e.weavePhase += e.weaveRate * dt;
    const speed = Math.hypot(e.vx, e.vy);
    const baseAngle = Math.atan2(e.vy, e.vx);
    const wobble = Math.sin(e.weavePhase) * 0.55;
    e.heading = baseAngle + wobble * 0.6;
    e.x += Math.cos(baseAngle + Math.PI / 2) * Math.sin(e.weavePhase) * 26 * dt;
    e.y += Math.sin(baseAngle + Math.PI / 2) * Math.sin(e.weavePhase) * 26 * dt;
    if (e.flash > 0) e.flash -= dt * 6;
    void speed;
  } else if (e.type === 'bullet' || e.type === 'spark' || e.type === 'pickup' || e.type === 'text') {
    e.life -= dt;
    if (e.type === 'pickup') e.spin += dt * 2.4;
    if (e.type === 'text') e.y -= 34 * dt;
  }
}

export function drawMeteor(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rotation);
  ctx.beginPath();
  e.outline.forEach((p, i) => {
    const r = e.radius * p.scale;
    const px = Math.cos(p.angle) * r;
    const py = Math.sin(p.angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  const grad = ctx.createRadialGradient(-e.radius * 0.3, -e.radius * 0.3, e.radius * 0.2, 0, 0, e.radius * 1.25);
  grad.addColorStop(0, e.flash > 0 ? '#ffb37a' : '#8a6a52');
  grad.addColorStop(0.6, e.flash > 0 ? '#c97a3d' : '#5d4634');
  grad.addColorStop(1, '#33241a');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 138, 61, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-e.radius * 0.4, e.radius * 0.1);
  ctx.lineTo(-e.radius * 0.05, -e.radius * 0.2);
  ctx.lineTo(e.radius * 0.3, e.radius * 0.25);
  ctx.strokeStyle = 'rgba(255, 170, 80, 0.75)';
  ctx.stroke();
  ctx.restore();
  if (e.hp < e.maxHp) drawHpPip(ctx, e);
}

export function drawDrone(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.heading);
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fillStyle = e.flash > 0 ? '#ffb3c2' : '#c2456e';
  ctx.fill();
  ctx.strokeStyle = '#ff7aa2';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(2, 0, 3.4, 0, TAU);
  ctx.fillStyle = '#ffe9f1';
  ctx.fill();
  ctx.restore();
  if (e.hp < e.maxHp) drawHpPip(ctx, e);
}

function drawHpPip(ctx, e) {
  const w = e.radius * 1.7;
  const ratio = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(e.x - w / 2, e.y - e.radius - 11, w, 4);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(e.x - w / 2, e.y - e.radius - 11, w * ratio, 4);
}

export function drawBullet(ctx, e) {
  const angle = Math.atan2(e.vy, e.vx);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#bffbff';
  ctx.shadowColor = '#39d5ff';
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 2.6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawSpark(ctx, e) {
  const alpha = Math.max(0, e.life / e.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawPickup(ctx, e) {
  const info = PICKUP_KINDS[e.kind];
  const blink = e.life < 2.5 && Math.sin(e.life * 14) > 0.2;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.spin);
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.beginPath();
  ctx.moveTo(0, -e.radius);
  ctx.lineTo(e.radius, 0);
  ctx.lineTo(0, e.radius);
  ctx.lineTo(-e.radius, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8, 14, 30, 0.9)';
  ctx.fill();
  ctx.strokeStyle = info.color;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = info.color;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.rotate(-e.spin);
  ctx.fillStyle = info.color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.glyph, 0, 1);
  ctx.restore();
}

export function drawFloatText(ctx, e) {
  const alpha = Math.max(0, e.life / e.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = e.color;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(e.text, e.x, e.y);
  ctx.restore();
}
