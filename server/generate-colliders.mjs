import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const arenaSource = await fs.readFile(path.join(root, 'app/game/arena.ts'), 'utf8');
const { outputText } = ts.transpileModule(arenaSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const rewritten = outputText
  .replaceAll("'./maps'", "'./app/game/maps.ts'")
  .replaceAll('"./maps"', '"./app/game/maps.ts"');
const tempModule = path.join(root, '.server-collider-arena.mjs');
await fs.writeFile(tempModule, rewritten);

const gradient = { addColorStop() {} };
const context = new Proxy(
  {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  },
  { get: (target, key) => (key in target ? target[key] : () => {}) },
);
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- minimal canvas shim for arena generation.
  createElement() {
    return { width: 0, height: 0, getContext: () => context };
  },
};

try {
  const { createArena } = await import(`${pathToFileURL(tempModule).href}?v=${Date.now()}`);
  const maps = {};
  for (const mapId of ['iron-divide', 'sun-relay', 'lockgate']) {
    const scene = new THREE.Scene();
    const arena = createArena(THREE, scene, mapId);
    maps[mapId] = arena.colliders.map((collider) => ({
      minX: collider.minX,
      maxX: collider.maxX,
      minZ: collider.minZ,
      maxZ: collider.maxZ,
      maxY: collider.maxY ?? 2.8,
    }));
    arena.dispose();
  }
  await fs.writeFile(
    path.join(root, 'server/map-colliders.json'),
    `${JSON.stringify(maps, null, 2)}\n`,
  );
} finally {
  await fs.rm(tempModule, { force: true });
}
