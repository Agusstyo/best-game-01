// effects.js — ORBITFALL's ambient and impact dressing: twinkling stars
// and shooting stars over the static starfield, expanding shockwave
// rings, tumbling debris chunks and drifting ember trails. None of it
// touches the rules; it only makes hits and space itself feel alive.

const TAU = Math.PI * 2;

// --- Twinkling stars -------------------------------------------------------

export function createTwinkles(width, height, count = 80) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.8 + Math.random() * 1.5,
      phase: Math.random() * TAU,
      speed: 0.6 + Math.random() * 2.2,
      sparkle: Math.random() > 0.82,
    });
  }
  return stars;
}

export function drawTwinkles(ctx, stars, t) {
  ctx.save();
  for (const s of stars) {
    const glow = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = 0.18 + glow * 0.75;
    ctx.fillStyle = '#dfeaff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
    if (s.sparkle && glow > 0.86) {
      const arm = s.r * 5 * glow;
      ctx.strokeStyle = 'rgba(210, 232, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - arm, s.y);
      ctx.lineTo(s.x + arm, s.y);
      ctx.moveTo(s.x, s.y - arm);
      ctx.lineTo(s.x, s.y + arm);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- Shooting stars --------------------------------------------------------

export function createShootingStar(width, height) {
  const fromLeft = Math.random() > 0.5;
  const x = fromLeft ? Math.random() * width * 0.4 : width * 0.55 + Math.random() * width * 0.4;
  const dir = fromLeft ? 1 : -1;
  const speed = 520 + Math.random() * 260;
  return {
    type: 'shooting',
    x,
    y: Math.random() * height * 0.3,
    vx: dir * speed * 0.82,
    vy: speed * 0.42,
    life: 0.9,
    maxLife: 0.9,
  };
}

export function drawShootingStar(ctx, s) {
  const alpha = Math.max(0, s.life / s.maxLife);
  const tailX = s.x - s.vx * 0.16;
  const tailY = s.y - s.vy * 0.16;
  const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
  grad.addColorStop(0, 'rgba(160, 210, 255, 0)');
  grad.addColorStop(1, `rgba(230, 245, 255, ${0.85 * alpha})`);
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(s.x, s.y);
  ctx.stroke();
  ctx.restore();
}

// --- Shockwaves ------------------------------------------------------------

export function createShockwave(x, y, color, maxRadius) {
  return { type: 'shockwave', x, y, color, maxRadius, life: 0.38, maxLife: 0.38 };
}

export function drawShockwave(ctx, s) {
  const k = 1 - Math.max(0, s.life / s.maxLife);
  const radius = 6 + (s.maxRadius - 6) * (1 - (1 - k) * (1 - k));
  ctx.save();
  ctx.globalAlpha = (1 - k) * 0.85;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 1 + 3.5 * (1 - k);
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// --- Debris chunks ---------------------------------------------------------

export function createDebrisBurst(debris, x, y, color, count, baseSpeed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TAU;
    const speed = baseSpeed * (0.25 + Math.random() * 0.85);
    debris.push({
      type: 'debris',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 5.5,
      color,
      rotation: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 9,
      life: 0.5 + Math.random() * 0.55,
      maxLife: 1.05,
    });
  }
}

export function drawDebris(ctx, d) {
  const alpha = Math.max(0, Math.min(1, d.life / (d.maxLife * 0.6)));
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.rotation);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.moveTo(d.size, 0);
  ctx.lineTo(-d.size * 0.7, d.size * 0.75);
  ctx.lineTo(-d.size * 0.4, -d.size * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- Shared stepping for the pure-effect entity kinds ----------------------

export function stepEffect(e, dt) {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.life -= dt;
  if (e.type === 'debris') {
    e.rotation += e.spin * dt;
    const drag = Math.max(0, 1 - 1.6 * dt);
    e.vx *= drag;
    e.vy *= drag;
  }
}
