// input.js — keyboard and mouse state for ORBITFALL. The game reads a
// simple snapshot each frame: where the pointer is (in canvas pixels),
// whether fire is held, and which one-shot keys were pressed since the
// last frame.

const WATCHED_CODES = new Set([
  'Space',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyA',
  'KeyD',
  'KeyR',
  'KeyP',
  'KeyM',
]);

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, inside: false, down: false };

  function toCanvasPixels(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (WATCHED_CODES.has(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });

  window.addEventListener('blur', () => {
    held.clear();
    pointer.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvasPixels(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
  });

  canvas.addEventListener('mousedown', (event) => {
    const p = toCanvasPixels(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    pressed.add('MouseDown');
  });

  window.addEventListener('mouseup', () => {
    pointer.down = false;
  });

  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const p = toCanvasPixels(event.touches[0]);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    pressed.add('MouseDown');
  }, { passive: false });

  canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const p = toCanvasPixels(event.touches[0]);
    pointer.x = p.x;
    pointer.y = p.y;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    pointer.down = false;
  });

  return {
    pointer,
    isHeld(code) {
      return held.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    fireHeld() {
      return held.has('Space') || pointer.down;
    },
    rotateDirection() {
      let dir = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) dir -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) dir += 1;
      return dir;
    },
    endFrame() {
      pressed.clear();
    },
  };
}
