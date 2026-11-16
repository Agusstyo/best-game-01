// main.ts — ORBITFALL's hand-in program for make.fun (best-game-01).
//
// It copies the playable game (game/) and its screenshots (screenshots/)
// from this repository into the output directory, then writes the entry's
// dossier.json with buildDossier from the vendored make.fun library, so
// the dossier is exactly the one the gate rebuilds and compares against.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR names the output directory;
// inside it, /output is used.

import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the bounty's gate.json names for buildDossier: only
// text_max_bytes shapes the dossier's bytes, the rest only refuse.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function handInDirectory(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

handInDirectory('game');
handInDirectory('screenshots');

const dossierBytes = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
