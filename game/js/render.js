// render.js — everything ORBITFALL paints that is not an entity: the
// starfield backdrop with its distant moon, the planet (a pre-rendered
// world of continents and cloud bands that rotates under a fixed sun),
// the defense satellite on its orbit rail, the HUD with its wave pips
// and Dreadnought bar, and the full-screen states (title, wave banner,
// pause, victory and defeat).

const TAU = Math.PI * 2;

export function createStarfield(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const ctx = off.getContext('2d');
  const grad = ctx.createRadialGradient(width / 2, height * 0.52, 80, width / 2, height * 0.52, height * 0.85);
  grad.addColorStop(0, '#0c1434');
  grad.addColorStop(0.55, '#070b1e');
  grad.addColorStop(1, '#03040a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const nebula = [
    { x: width * 0.16, y: height * 0.2, r: 230, color: 'rgba(70, 62, 175, 0.22)' },
    { x: width * 0.86, y: height * 0.74, r: 260, color: 'rgba(16, 100, 130, 0.18)' },
    { x: width * 0.78, y: height * 0.12, r: 160, color: 'rgba(130, 48, 105, 0.14)' },
    { x: width * 0.34, y: height * 0.88, r: 190, color: 'rgba(30, 70, 150, 0.13)' },
  ];
  for (const n of nebula) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  // A distant ringed moon, small in the top-right dark.
  const mx = width * 0.885;
  const my = height * 0.16;
  const moonGlow = ctx.createRadialGradient(mx, my, 4, mx, my, 60);
  moonGlow.addColorStop(0, 'rgba(190, 205, 235, 0.20)');
  moonGlow.addColorStop(1, 'rgba(190, 205, 235, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(mx, my, 60, 0, TAU);
  ctx.fill();
  const moon = ctx.createRadialGradient(mx - 8, my - 9, 3, mx, my, 27);
  moon.addColorStop(0, '#d7deeb');
  moon.addColorStop(0.7, '#98a3ba');
  moon.addColorStop(1, '#5d6a84');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, 24, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(90, 102, 128, 0.5)';
  for (const c of [[-8, -4, 5], [7, 6, 4], [2, -11, 3], [11, -3, 2.6]]) {
    ctx.beginPath();
    ctx.arc(mx + c[0], my + c[1], c[2], 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(-0.32);
  ctx.strokeStyle = 'rgba(180, 200, 235, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 9, 0, 0.15 * Math.PI, 0.92 * Math.PI);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 300; i++) {
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

// --- The planet's pre-rendered world --------------------------------------
// One wide strip of ocean and continents (drawn once, then wrapped around
// the disc twice a frame) plus a separate, faster cloud strip: the world
// turns, the weather turns faster, and a fixed gradient lays the night
// side over both.

let planetArt = null;

function buildPlanetArt(radius) {
  const stripW = Math.ceil(radius * 2);
  const stripH = Math.ceil(radius * 2);
  const land = document.createElement('canvas');
  land.width = stripW;
  land.height = stripH;
  const lctx = land.getContext('2d');
  const ocean = lctx.createLinearGradient(0, 0, 0, stripH);
  ocean.addColorStop(0, '#1d6a99');
  ocean.addColorStop(0.5, '#155380');
  ocean.addColorStop(1, '#0d3a63');
  lctx.fillStyle = ocean;
  lctx.fillRect(0, 0, stripW, stripH);
  // Continents: clusters of soft blobs, tinted by latitude, each drawn
  // three times across the strip so the wrap seam never shows.
  const landTones = ['rgba(52, 146, 90, 0.95)', 'rgba(38, 128, 80, 0.95)', 'rgba(74, 158, 96, 0.9)', 'rgba(112, 150, 84, 0.85)'];
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * stripW;
    const y = stripH * 0.2 + Math.random() * stripH * 0.6;
    const r = 5 + Math.random() * 13;
    const polar = Math.abs(y - stripH / 2) > stripH * 0.42;
    lctx.fillStyle = polar ? 'rgba(214, 228, 234, 0.92)' : landTones[i % landTones.length];
    for (let j = 0; j < 5; j++) {
      const bx = x + (Math.random() - 0.5) * r * 1.7;
      const by = y + (Math.random() - 0.5) * r * 0.9;
      const brx = r * (0.45 + Math.random() * 0.55);
      const bry = r * (0.32 + Math.random() * 0.36);
      for (const wrap of [-stripW, 0, stripW]) {
        lctx.beginPath();
        lctx.ellipse(bx + wrap, by, brx, bry, Math.random() * 3, 0, TAU);
        lctx.fill();
      }
    }
  }
  const clouds = document.createElement('canvas');
  clouds.width = stripW;
  clouds.height = stripH;
  const cctx = clouds.getContext('2d');
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * stripW;
    const y = Math.random() * stripH;
    const r = 8 + Math.random() * 26;
    const g = cctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cctx.fillStyle = g;
    for (const wrap of [-stripW, 0, stripW]) {
      cctx.beginPath();
      cctx.ellipse(x + wrap, y, r * 1.7, r * 0.55, 0, 0, TAU);
      cctx.fill();
    }
  }
  return { land, clouds, stripW, stripH };
}

export function drawPlanet(ctx, cx, cy, radius, hpRatio, t, hitFlash) {
  if (!planetArt || planetArt.stripH !== Math.ceil(radius * 2)) planetArt = buildPlanetArt(radius);
  const { land, clouds, stripW } = planetArt;
  ctx.save();
  // Atmosphere halo.
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.7);
  halo.addColorStop(0, 'rgba(70, 170, 255, 0.32)');
  halo.addColorStop(1, 'rgba(70, 170, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.7, 0, TAU);
  ctx.fill();
  // The turning world, clipped to the disc.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.clip();
  const drawStrip = (img, off) => {
    const w = radius * 2;
    const start = cx - radius - off;
    ctx.drawImage(img, start, cy - radius, w, radius * 2);
    ctx.drawImage(img, start + w, cy - radius, w, radius * 2);
    ctx.drawImage(img, start - w, cy - radius, w, radius * 2);
  };
  drawStrip(land, (t * 3.2) % (radius * 2));
  ctx.globalAlpha = 0.7;
  drawStrip(clouds, (t * 5.1) % (radius * 2));
  ctx.globalAlpha = 1;
  // Sunlight and the night side.
  const shade = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius * 0.7);
  shade.addColorStop(0, 'rgba(255, 255, 230, 0.16)');
  shade.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(2, 6, 24, 0.52)');
  ctx.fillStyle = shade;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  const spec = ctx.createRadialGradient(cx - radius * 0.38, cy - radius * 0.42, 1, cx - radius * 0.38, cy - radius * 0.42, radius * 0.75);
  spec.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
  spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spec;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
  // Atmosphere rim.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.strokeStyle = 'rgba(140, 215, 255, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
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
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.restore();
}

export function drawAegisRing(ctx, cx, cy, radius, t, strength) {
  ctx.save();
  const pulse = 0.65 + Math.sin(t * 6) * 0.2;
  ctx.globalAlpha = Math.max(0.25, Math.min(0.9, strength)) * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 21, 0, TAU);
  ctx.strokeStyle = '#b18cff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#b18cff';
  ctx.shadowBlur = 12;
  ctx.setLineDash([16, 7]);
  ctx.lineDashOffset = -t * 26;
  ctx.stroke();
  ctx.restore();
}

export function drawSatellite(ctx, x, y, angle, firing, t, spin = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Engine flame while the satellite is swinging along its rail.
  const thrust = Math.min(1, Math.abs(spin) / 2.4);
  if (thrust > 0.15) {
    const len = 10 + thrust * 13 + Math.sin(t * 40) * 2;
    const flame = ctx.createLinearGradient(-9, 0, -9 - len, 0);
    flame.addColorStop(0, 'rgba(160, 230, 255, 0.85)');
    flame.addColorStop(1, 'rgba(80, 160, 255, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-9, -3.2);
    ctx.lineTo(-9 - len, 0);
    ctx.lineTo(-9, 3.2);
    ctx.closePath();
    ctx.fill();
  }
  // Solar wings.
  ctx.fillStyle = '#2d5f9e';
  ctx.fillRect(-3, -19, 6, 11);
  ctx.fillRect(-3, 8, 6, 11);
  ctx.fillStyle = '#4d8fd1';
  ctx.fillRect(-3, -19, 6, 3);
  ctx.fillRect(-3, 16, 6, 3);
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.6)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-3, -19, 6, 11);
  ctx.strokeRect(-3, 8, 6, 11);
  // Hull, nose pointing outward (+x is away from the planet).
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(5, -6.5);
  ctx.lineTo(-9, -5.5);
  ctx.lineTo(-9, 5.5);
  ctx.lineTo(5, 6.5);
  ctx.closePath();
  const hullGrad = ctx.createLinearGradient(0, -6, 0, 6);
  hullGrad.addColorStop(0, '#f2f7fd');
  hullGrad.addColorStop(0.55, '#cfdceC');
  hullGrad.addColorStop(1, '#93a9c4');
  ctx.fillStyle = hullGrad;
  ctx.fill();
  ctx.strokeStyle = '#7fb2e5';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(3, 0, 3.2, 0, TAU);
  ctx.fillStyle = '#39d5ff';
  ctx.shadowColor = '#39d5ff';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Cannon.
  ctx.fillStyle = '#8fa9c4';
  ctx.fillRect(13, -1.7, 10, 3.4);
  if (firing) {
    const flash = ctx.createRadialGradient(26, 0, 0.5, 26, 0, 11);
    flash.addColorStop(0, 'rgba(230, 253, 255, 0.95)');
    flash.addColorStop(1, 'rgba(120, 230, 255, 0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(26, 0, 11, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(19, -4.5);
    ctx.lineTo(19, 4.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(190, 250, 255, 0.95)';
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
  const { width, height, score, wave, totalWaves, hostilesLeft, planetHp, planetMaxHp, combo, multiplier, power, boss } = view;
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
  // Wave progress pips, centered under the panel.
  ctx.save();
  for (let i = 0; i < totalWaves; i++) {
    const px = width / 2 + (i - (totalWaves - 1) / 2) * 17;
    ctx.beginPath();
    ctx.arc(px, 76, 3.6, 0, TAU);
    if (i + 1 < wave) ctx.fillStyle = '#5df2a0';
    else if (i + 1 === wave) ctx.fillStyle = '#ffd94d';
    else ctx.fillStyle = 'rgba(160, 190, 230, 0.30)';
    ctx.fill();
  }
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
  // Dreadnought integrity bar, along the bottom edge where it never
  // hides the carrier itself.
  if (boss) {
    ctx.save();
    const bw = 330;
    const bx = width / 2 - bw / 2;
    const by = height - 46;
    panel(ctx, bx - 10, by, bw + 20, 34, 'rgba(24, 8, 18, 0.78)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9dbd';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillText('D R E A D N O U G H T', width / 2, by + 11);
    const bratio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.roundRect(bx, by + 18, bw, 9, 4);
    ctx.fill();
    ctx.fillStyle = '#ff5f92';
    ctx.beginPath();
    ctx.roundRect(bx, by + 18, bw * bratio, 9, 4);
    ctx.fill();
    ctx.restore();
  }
}

export function drawTitleScreen(ctx, view) {
  const { width, height, t, highScore } = view;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 5, 12, 0.30)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  // Title.
  ctx.font = '900 92px system-ui, sans-serif';
  ctx.shadowColor = '#39a5ff';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText('ORBITFALL', width / 2, 148);
  ctx.shadowBlur = 0;
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText('P L A N E T A R Y   D E F E N S E', width / 2, 184);
  if (highScore > 0) {
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = '#9fb8d8';
    ctx.fillText(`BEST SCORE  ${highScore}`, width / 2, 212);
  }
  // How to play panel, low on the screen so the planet and its satellite
  // stay on show above it.
  panel(ctx, width / 2 - 392, 540, 784, 112);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', width / 2, 562);
  ctx.font = '13.5px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.textAlign = 'left';
  const left = [
    'Mouse or arrow keys swing the satellite.',
    'Hold SPACE or the mouse button to fire.',
    'Blast rocks, drones, comets and plasma bolts.',
  ];
  const right = [
    'Catch cores: RAPID · TRIPLE · REPAIR · AEGIS.',
    'Chain kills to raise your combo multiplier.',
    'Wave 8: destroy the DREADNOUGHT. Save the planet.',
  ];
  left.forEach((line, i) => ctx.fillText(line, width / 2 - 372, 588 + i * 21));
  right.forEach((line, i) => ctx.fillText(line, width / 2 + 16, 588 + i * 21));
  // Start prompt.
  ctx.textAlign = 'center';
  const pulse = 0.65 + 0.35 * Math.sin(t * 3.4);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 23px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('CLICK OR PRESS ENTER TO START', width / 2, 692);
  ctx.globalAlpha = 1;
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
  ctx.fillText(wave === 8 ? 'THE DREADNOUGHT' : `WAVE ${wave}`, width / 2, height / 2 - 60);
  ctx.shadowBlur = 0;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = '#8fd0ff';
  ctx.fillText(wave === 8 ? 'DESTROY THE CARRIER — SAVE THE PLANET' : 'INCOMING ROCKS — HOLD THE ORBIT', width / 2, height / 2 - 26);
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
  const { width, height, victory, score, wave, kills, highScore, newBest, bossKilled } = view;
  ctx.save();
  ctx.fillStyle = victory ? 'rgba(4, 14, 10, 0.55)' : 'rgba(16, 4, 4, 0.58)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.font = '900 66px system-ui, sans-serif';
  ctx.shadowColor = victory ? '#5df2a0' : '#ff5a5a';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(victory ? 'PLANET SAVED' : 'PLANET DOWN', width / 2, 206);
  ctx.shadowBlur = 0;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText(
    victory ? 'The Dreadnought is wreckage and the orbit holds — because of you.' : `The barrage broke through on wave ${wave}.`,
    width / 2, 242,
  );
  // Stats panel.
  panel(ctx, width / 2 - 195, 268, 390, 178, 'rgba(6, 12, 28, 0.9)');
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = '#7f9cc4';
  ctx.textAlign = 'left';
  ctx.fillText('FINAL SCORE', width / 2 - 165, 300);
  ctx.fillText('WAVES CLEARED', width / 2 - 165, 330);
  ctx.fillText('TARGETS DESTROYED', width / 2 - 165, 360);
  ctx.fillText('DREADNOUGHT', width / 2 - 165, 390);
  ctx.fillText('BEST SCORE', width / 2 - 165, 420);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(String(score), width / 2 + 165, 300);
  ctx.fillText(String(victory ? 8 : wave - 1), width / 2 + 165, 330);
  ctx.fillText(String(kills), width / 2 + 165, 360);
  ctx.fillStyle = bossKilled ? '#7dff8a' : '#9fb8d8';
  ctx.fillText(bossKilled ? 'DESTROYED' : wave >= 8 ? 'SURVIVED' : '—', width / 2 + 165, 390);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(highScore), width / 2 + 165, 420);
  if (newBest) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('★ NEW BEST ★', width / 2, 472);
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', width / 2, 516);
  ctx.restore();
}

// A red warning arrow at the screen edge for a hostile that is still
// off-screen, so incoming threats are readable before they arrive.
export function drawDangerArrow(ctx, x, y, angle, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 7);
  ctx.fillStyle = '#ff7a5c';
  ctx.shadowColor = '#ff5a3c';
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Pulsing red vignette while the planet is close to falling.
export function drawDangerVignette(ctx, width, height, t, strength) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4.4);
  const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.34, width / 2, height / 2, height * 0.72);
  grad.addColorStop(0, 'rgba(255, 40, 30, 0)');
  grad.addColorStop(1, `rgba(255, 40, 30, ${(0.10 + 0.13 * pulse) * strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
