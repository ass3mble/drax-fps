# DRAX FPS — development snapshot

The game is titled **DRAX FPS** in both `index.html` and its in-game interface.
This repository contains a source snapshot prepared from the local
`blackwater` working folder. The original folder and its existing Git origin
were not modified.

## Known build blockers in this snapshot

- `app/game/engine.ts` was deleted locally but is still imported from
  `app/page.tsx` and `app/fps-interface.tsx`.
- An older copy of the engine from the upstream Git commit does **not** match
  the current multiplayer/UI types and interfaces. It was **not** inserted
  into this snapshot because it would misrepresent the current work.
- `package.json` references older verification entrypoints
  (`verify-world.mjs`, `verify-combat.mjs`, and `verify-multiplayer.mjs`)
  that are not present in the current local working tree.

As a result, `npm run build` and `npm test` cannot currently succeed. This
snapshot is not a verified production build or deployable public demo.
Complete and validate the engine refactor and verification scripts before
claiming compatibility with the documented deployment flow.

## Included and excluded files

Included: current React/Three.js/TypeScript source, multiplayer server, project
configuration, README, original MIT license, third-party notices and runtime
models/textures. Third-party authors retain their own rights.

Excluded intentionally: `node_modules`, `dist`, Git credentials, local
Cloudflare/tunnel commands, browser test profiles, temporary logs and benchmark
output. This keeps the public repository focused on source without disclosing
machine-specific or sensitive material.
