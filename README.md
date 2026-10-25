# DRAX FPS | Browser-Based Tactical Shooter

**DRAX FPS is an open-source first-person shooter project built with Three.js, React, and TypeScript.** It explores tactical firefights, weapon handling, 3D arenas, and multiplayer sessions that run through a self-hosted WebSocket server.

The idea is simple: launch a match in a desktop browser without asking every player to install a separate game client.

> **Development status:** This repository is an unfinished source snapshot, not a tested game release. The engine refactor is in progress, `app/game/engine.ts` is absent even though other modules import it, and several verification scripts are missing. `npm run build` and `npm test` cannot succeed in the current snapshot. See [development status](docs/DEVELOPMENT_STATUS.md).

## What is being built

| Area | Systems in the source |
| --- | --- |
| Multiplayer | Named rooms, room codes, player nicknames, reconnect and host handoff logic. |
| Networking | WebSocket communication, 20 Hz player position updates, heartbeat, and ping display. |
| Match rules | Team scoring, damage and hit validation, respawn, and server-side sanity checks. |
| Combat | Aiming, recoil, reloading, leaning, hit feedback, health, ammunition, and a scoreboard. |
| Weapons | Ranger, Specter, Sentinel, and Breaker, with different intended combat roles. |
| Arenas | 3D environments, multiple map definitions, cover, and imported licensed assets. |

These describe features represented in the code. They have **not** all been validated end to end in this published snapshot.

## Controls

| Action | Key or input |
| --- | --- |
| Move | `W`, `A`, `S`, `D` |
| Look around | Mouse |
| Fire | Left mouse button |
| Aim | Right mouse button |
| Lean | `Q` / `E` |
| Sprint | Left `Shift` |
| Jump | `Space` |
| Reload | `R` |
| Scoreboard | `Tab` |
| Pause | `Escape` |

A modern desktop browser with WebGL, keyboard, and mouse is recommended.

## Technologies

- **Three.js:** 3D scenes, objects, cameras, and rendering.
- **React and TypeScript:** Game interface and application code.
- **Node.js and WebSocket:** Multiplayer server and room state.
- **Vite:** Local development and client builds.

## Local setup

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

The development server is useful for inspecting the project, but gameplay may not load until the missing engine module and its imports are repaired.

## Multiplayer hosting

After the engine and build blockers are fixed, the intended hosting command is:

```sh
npm run host
```

This builds the client and starts the HTTP and WebSocket server on port `8787`.

- Local machine: `http://127.0.0.1:8787`
- Other devices on the same network: use the address printed by the server.

For a temporary public browser link, the documented Cloudflare Tunnel command is:

```sh
cloudflared tunnel --url http://localhost:8787
```

This requires a working local server and an appropriately configured network. It is not evidence that the current snapshot can be deployed successfully.

## Repository structure

| Path | Purpose |
| --- | --- |
| `app/game/` | Weapons, maps, scene objects, movement, combat, and visuals |
| `app/multiplayer/` | Browser-side network client |
| `app/fps-interface.tsx` | Lobby, deployment, match interface, and scoreboard |
| `app/combat-ui.css` | Visual styling |
| `server/index.mjs` | Multiplayer rooms, events, validation, and score handling |
| `public/models/` | 3D models used by the project |
| `public/textures/` | Environmental textures |
| `docs/` | Technical research and development notes |

## What needs work next

1. Reconnect or rebuild `app/game/engine.ts` to match the current interface and multiplayer code.
2. Restore the missing verification scripts referenced in `package.json`.
3. Run builds, tests, and linting with the restored project.
4. Test real browser sessions and tune weapon feel, map balance, and network behavior.

Once the missing pieces are restored, the intended checks are:

```sh
npm test
npm run test:multiplayer
npm run build
npm run lint
```

## License and credits

Original DRAX FPS source code uses the [MIT License](LICENSE). Third-party assets and libraries retain their own licenses; see [asset and library notices](THIRD_PARTY_NOTICES.md).

This snapshot originated from a local worktree previously linked to [Hiraeth010/blackwater](https://github.com/Hiraeth010/blackwater). Its existing MIT copyright attribution is preserved.
