// render.js — everything ORBITFALL paints that is not an entity: the
// starfield backdrop, the planet and its shield ring, the defense
// satellite on its orbit rail, the HUD, and the full-screen states
// (title, wave banner, pause, victory and defeat).

const TAU = Math.PI * 2;

export function createStarfield(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const ctx = off.getContext('2d');
  const grad = ctx.createRadialGradient(width / 2, height * 0.52, 80, width / 2, height * 0.52, height * 0.85);
  grad.addColorStop(0, '#0b1230');
  grad.addColorStop(0.55, '#070b1e');
  grad.addColorStop(1, '#03040a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const nebula = [
    { x: width * 0.16, y: height * 0.2, r: 210, color: 'rgba(64, 60, 160, 0.20)' },
    { x: width * 0.86, y: height * 0.72, r: 250, color: 'rgba(16, 92, 120, 0.16)' },
    { x: width * 0.78, y: height * 0.12, r: 150, color: 'rgba(120, 44, 96, 0.12)' },
  ];
  for (const n of nebula) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const bright = Math.random();
    ctx.fillStyle = bright > 0.92 ? '#ffffff' : bright > 0.6 ? 'rgba(190, 215, 255, 0.85)' : 'rgba(140, 165, 210, 0.55)';
    const r = bright > 0.92 ? 1.9 : 1.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  return off;
}

export function drawOrbitRail(ctx, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.strokeStyle = 'rgba(110, 190, 255, 0.20)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 9]);
  ctx.stroke();
  ctx.restore();
}

export function drawPlanet(ctx, cx, cy, radius, hpRatio, t, hitFlash) {
  ctx.save();
  // Atmosphere halo.
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.65);
  halo.addColorStop(0, 'rgba(70, 170, 255, 0.30)');
  halo.addColorStop(1, 'rgba(70, 170, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.65, 0, TAU);
  ctx.fill();
  // Body.
  const body = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.15, cx, cy, radius * 1.05);
  body.addColorStop(0, '#7fe0d4');
  body.addColorStop(0.45, '#2e9db8');
  body.addColorStop(0.8, '#14548a');
  body.addColorStop(1, '#0a2c52');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.fillStyle = body;
  ctx.fill();
  // Drifting cloud bands, clipped to the disc.
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const yOff = -radius * 0.45 + i * radius * 0.42;
    const xOff = Math.sin(t * 0.11 + i * 2.1) * radius * 0.22;
    ctx.beginPath();
    ctx.ellipse(cx + xOff, cy + yOff, radius * 0.78, radius * 0.16, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30, 160, 110, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.3, cy + radius * 0.28, radius * 0.34, radius * 0.18, 0.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + radius * 0.42, cy - radius * 0.3, radius * 0.22, radius * 0.12, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Impact flash.
  if (hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, hitFlash);
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.06, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // Shield ring: the arc that remains is the planet's integrity.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 11, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, hpRatio));
  ctx.strokeStyle = hpRatio > 0.5 ? '#5df2a0' : hpRatio > 0.25 ? '#ffc44d' : '#ff5a5a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

export function drawSatellite(ctx, x, y, angle, firing, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Solar wings.
  ctx.fillStyle = '#2d5f9e';
  ctx.fillRect(-3, -17, 6, 10);
  ctx.fillRect(-3, 7, 6, 10);
  ctx.fillStyle = '#4d8fd1';
  ctx.fillRect(-3, -17, 6, 3);
  ctx.fillRect(-3, 14, 6, 3);
  // Hull, nose pointing outward (+x is away from the planet).
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(-9, -5);
  ctx.lineTo(-9, 5);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fillStyle = '#dfe9f5';
  ctx.fill();
  ctx.strokeStyle = '#7fb2e5';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(3, 0, 3, 0, TAU);
  ctx.fillStyle = '#39d5ff';
  ctx.fill();
  // Cannon.
  ctx.fillStyle = '#8fa9c4';
  ctx.fillRect(12, -1.6, 9, 3.2);
  if (firing) {
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(17, -4);
    ctx.lineTo(17, 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(160, 245, 255, 0.9)';
    ctx.fill();
  }
  // Beacon.
  if (Math.sin(t * 5) > 0.4) {
    ctx.beginPath();
    ctx.arc(-8, 0, 2, 0, TAU);
    ctx.fillStyle = '#ff5a5a';
    ctx.fill();
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h, fill = 'rgba(6, 12, 28, 0.72)') {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(110, 190, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, view) {
  const { width, score, wave, totalWaves, hostilesLeft, planetHp, planetMaxHp, combo, multiplier, power } = view;
  panel(ctx, 12, 10, width - 24, 52);
  ctx.save();
  ctx.textBaseline = 'middle';
  // Score block.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7f9cc4';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('SCORE', 26, 27);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.fillText(String(score).padStart(6, '0'), 26, 50);
  if (multiplier > 1) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`COMBO x${multiplier}`, 196, 50);
  } else if (combo > 0) {
    ctx.fillStyle = '#9fb8d8';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`streak ${combo}`, 196, 50);
  }
  // Wave block.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7f9cc4';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('WAVE', width / 2, 27);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.fillText(`${wave} / ${totalWaves}`, width / 2, 50);
  ctx.fillStyle = '#9fb8d8';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`${hostilesLeft} incoming`, width / 2 + 74, 50);
  // Planet integrity block.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7f9cc4';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('PLANET INTEGRITY', width - 26, 27);
  const barW = 190;
  const barX = width - 26 - barW;
  const ratio = Math.max(0, planetHp / planetMaxHp);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.roundRect(barX, 40, barW, 13, 6);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#5df2a0' : ratio > 0.25 ? '#ffc44d' : '#ff5a5a';
  ctx.beginPath();
  ctx.roundRect(barX, 40, barW * ratio, 13, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(planetHp)}`, barX - 8, 47);
  ctx.restore();
  // Active power-up chip.
  if (power) {
    const label = `${power.label}  ${power.seconds.toFixed(0)}s`;
    ctx.save();
    ctx.font = 'bold 14px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 26;
    panel(ctx, 12, 72, w, 30, 'rgba(10, 18, 38, 0.8)');
    ctx.fillStyle = power.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 25, 88);
    ctx.restore();
  }
}

export function drawTitleScreen(ctx, view) {
  const { width, height, t, highScore } = view;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 5, 12, 0.42)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  // Title.
  ctx.font = '900 92px system-ui, sans-serif';
  ctx.shadowColor = '#39a5ff';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText('ORBITFALL', width / 2, 168);
  ctx.shadowBlur = 0;
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText('P L A N E T A R Y   D E F E N S E', width / 2, 206);
  // How to play panel.
  panel(ctx, width / 2 - 264, 238, 528, 196);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', width / 2, 266);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  const lines = [
    'Aim the defense satellite with your mouse (or arrow keys).',
    'Hold SPACE or the mouse button to fire. Stop every rock',
    'and drone before it strikes the planet.',
    'Catch falling cores for RAPID FIRE, TRIPLE SHOT and REPAIRS.',
    'Survive all 8 waves to win. If the planet falls, so do you.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, width / 2, 296 + i * 25));
  // Start prompt.
  const pulse = 0.65 + 0.35 * Math.sin(t * 3.4);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('CLICK OR PRESS ENTER TO START', width / 2, 486);
  ctx.globalAlpha = 1;
  if (highScore > 0) {
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillStyle = '#9fb8d8';
    ctx.fillText(`BEST SCORE  ${highScore}`, width / 2, 524);
  }
  ctx.restore();
}

export function drawWaveBanner(ctx, view) {
  const { width, height, wave, alpha } = view;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.shadowColor = '#39a5ff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(`WAVE ${wave}`, width / 2, height / 2 - 60);
  ctx.shadowBlur = 0;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText(wave === 8 ? 'THE FINAL BARRAGE' : 'INCOMING ROCKS — HOLD THE ORBIT', width / 2, height / 2 - 26);
  ctx.restore();
}

export function drawPauseOverlay(ctx, view) {
  const { width, height } = view;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 5, 12, 0.62)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText('PAUSED', width / 2, height / 2 - 10);
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText('Press P to resume', width / 2, height / 2 + 26);
  ctx.restore();
}

export function drawEndScreen(ctx, view) {
  const { width, height, victory, score, wave, kills, highScore, newBest } = view;
  ctx.save();
  ctx.fillStyle = victory ? 'rgba(4, 14, 10, 0.55)' : 'rgba(16, 4, 4, 0.58)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.font = '900 66px system-ui, sans-serif';
  ctx.shadowColor = victory ? '#5df2a0' : '#ff5a5a';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(victory ? 'PLANET SAVED' : 'PLANET DOWN', width / 2, 218);
  ctx.shadowBlur = 0;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText(
    victory ? 'All 8 waves broken. The orbit holds because of you.' : `The barrage broke through on wave ${wave}.`,
    width / 2, 256,
  );
  // Stats panel.
  panel(ctx, width / 2 - 190, 286, 380, 148);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = '#7f9cc4';
  ctx.textAlign = 'left';
  ctx.fillText('FINAL SCORE', width / 2 - 160, 322);
  ctx.fillText('WAVES CLEARED', width / 2 - 160, 352);
  ctx.fillText('TARGETS DESTROYED', width / 2 - 160, 382);
  ctx.fillText('BEST SCORE', width / 2 - 160, 412);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(String(score), width / 2 + 160, 322);
  ctx.fillText(String(victory ? 8 : wave - 1), width / 2 + 160, 352);
  ctx.fillText(String(kills), width / 2 + 160, 382);
  ctx.fillText(String(highScore), width / 2 + 160, 412);
  if (newBest) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('★ NEW BEST ★', width / 2, 462);
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', width / 2, 512);
  ctx.restore();
}
