# DRAX FPS: Current development status

DRAX FPS is still being refactored. This repository was copied from the local `blackwater` worktree, without changing the original folder or its Git remote. The game title appears as DRAX FPS in `index.html` and the interface.

## What is blocking the build?

- `app/game/engine.ts` is missing, but `app/page.tsx` and `app/fps-interface.tsx` still import it.
- The older engine from the upstream commit does not match the current multiplayer and interface types. Copying it back would not be a reliable fix.
- The test commands in `package.json` refer to `verify-world.mjs`, `verify-combat.mjs`, and `verify-multiplayer.mjs`. Those files are not in this snapshot.

Until the engine and verification scripts are restored and checked, `npm run build` and `npm test` will fail. This is source code in progress, not a tested public release.

## What was uploaded?

The repository includes the application source, multiplayer server, configuration, documentation, original MIT license, third-party notices, and game assets. Asset authors and library maintainers keep their own licensing terms.

Local dependencies, build outputs, Git credentials, tunnel configuration, browser testing profiles, temporary logs, and benchmark artifacts were intentionally left out. None of those files are required in the public source snapshot.
