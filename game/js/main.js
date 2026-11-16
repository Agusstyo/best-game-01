// main.js — ORBITFALL's entry point: find the canvas, build the game with
// its input and sound, and run the frame loop. Everything else lives in
// the modules this one wires together.

import { createInput } from './input.js';
import { createSoundBank } from './audio.js';
import { Game } from './game.js';

const MAX_FRAME_SECONDS = 0.05;

function boot() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) throw new Error('ORBITFALL: #game-canvas is missing from the page');
  const input = createInput(canvas);
  const sound = createSoundBank();
  const game = new Game(canvas, input, sound);
  window.__orbitfall = game;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.draw();
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
