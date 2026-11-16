// waves.js — the siege plan for ORBITFALL. Eight waves, each louder than
// the last: more rocks, faster rocks, weaver drones joining from wave 3
// and splitting boulders from wave 4. Clear wave 8 and the planet holds.

export const TOTAL_WAVES = 8;

export function wavePlan(wave) {
  const n = wave;
  return {
    meteors: 5 + (n - 1) * 2,
    larges: n >= 4 ? Math.floor((n - 2) / 2) : 0,
    drones: n >= 3 ? Math.min(6, n - 2) : 0,
    spawnInterval: Math.max(0.55, 1.45 - n * 0.11),
    speedScale: 1 + (n - 1) * 0.07,
    clearBonus: 150 * n,
  };
}

export function createWaveDirector() {
  let queue = [];
  let timer = 0;
  let interval = 1;

  function buildQueue(wave) {
    const plan = wavePlan(wave);
    const list = [];
    for (let i = 0; i < plan.meteors; i++) list.push(Math.random() < 0.45 ? 'small' : 'medium');
    for (let i = 0; i < plan.larges; i++) list.push('large');
    for (let i = 0; i < plan.drones; i++) list.push('drone');
    // Shuffle so kinds arrive mixed, then make sure the first arrival is
    // a plain meteor: every wave should open readable, not chaotic.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const firstMeteor = list.findIndex((k) => k === 'small' || k === 'medium');
    if (firstMeteor > 0) [list[0], list[firstMeteor]] = [list[firstMeteor], list[0]];
    return { list, plan };
  }

  return {
    startWave(wave) {
      const built = buildQueue(wave);
      queue = built.list;
      interval = built.plan.spawnInterval;
      timer = 0.35;
      return built.plan;
    },
    // Returns the next spawn kind when its moment comes, else null.
    update(dt) {
      if (queue.length === 0) return null;
      timer -= dt;
      if (timer > 0) return null;
      timer = interval * (0.75 + Math.random() * 0.5);
      return queue.shift();
    },
    hasQueued() {
      return queue.length > 0;
    },
    queuedCount() {
      return queue.length;
    },
  };
}
