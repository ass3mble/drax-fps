# DRAX FPS

DRAX FPS is a browser-based tactical shooter built with Three.js, React, and TypeScript. Multiplayer runs through a self-hosted WebSocket server, so players can join from a desktop browser without installing a separate game client.

**Current state:** This repository is a work-in-progress source snapshot, not a playable release. The engine refactor is unfinished: `app/game/engine.ts` is missing even though other modules still import it. Some test scripts are missing too. As a result, `npm run build` and `npm test` do not currently work. The details are in [development status](docs/DEVELOPMENT_STATUS.md).

The sections below describe the systems and intended development workflow. They should not be read as a claim that this snapshot has passed a fresh build or gameplay test.
## Multiplayer systems in the source

- Player nickname saved per browser/device
- Named public rooms with live room browser
- Direct join by room code
- Up to 8 players per room
- 20 Hz player pose synchronization
- Server-authoritative hit, damage, kill, death, and team score handling
- Server-side fire-rate, shot-origin, direction, and movement sanity checks
- Respawn flow and scoreboard state
- Ping display and heartbeat handling
- Automatic reconnect and same-room session resume
- Host migration when the current host leaves
- Multiple maps and weapon loadouts

## Combat and movement

- First-person movement, sprinting, jumping, aiming, firing, reloading, and leaning
- Multiple weapons including Ranger, Specter, Sentinel, and Breaker
- Crosshair, scoped aiming, recoil, hit feedback, health, ammo, radar, and scoreboard HUD
- Procedural/assembled 3D environments with imported third-party assets where noted

## Controls

| Action | Control |
| --- | --- |
| Move | WASD |
| Look | Mouse |
| Fire | Left mouse button |
| Aim | Right mouse button |
| Lean | Q / E |
| Sprint | Left Shift |
| Jump | Space |
| Reload | R |
| Scoreboard | Tab |
| Pause | Escape |

A desktop browser with WebGL, keyboard, and mouse is recommended.

## Requirements

- Node.js 22.13+ (Node.js 24 recommended)
- npm

## Local development

```sh
npm ci
npm run dev
```

## Hosting multiplayer

Once the build blockers are resolved, this command will build the client and start the HTTP and WebSocket server on port `8787`:

```sh
npm run host
```

Then open:

- Same PC: `http://127.0.0.1:8787`
- Same LAN: use one of the `LAN:` addresses printed by the server

The server binds to `0.0.0.0`. If Windows Firewall prompts, allow Node.js on the appropriate private network.

## Sharing a public browser link

When the server is running, Cloudflare Tunnel can expose it without opening a router port:

```sh
cloudflared tunnel --url http://localhost:8787
```

Cloudflare Quick Tunnel returns a temporary `https://*.trycloudflare.com` URL. Share that URL with friends and they can open DRAX directly in Chrome/Edge. For a stable custom hostname, use a named Cloudflare Tunnel and your own domain.

## Checks

```sh
npm test
npm run test:multiplayer
npm run build
npm run lint
```

The missing multiplayer verification script was intended to check room creation, two-player synchronization, hits and scoring, respawning, reconnection, and cleanup. Restore the verification scripts and complete the engine refactor before using these commands as release checks.

## Where to find things

- `app/game/`: rendering, maps, weapons, combat, physics, audio, bots, and gameplay systems
- `app/multiplayer/`: browser multiplayer client and protocol state
- `app/fps-interface.tsx`: deployment, lobby, HUD, settings, and scoreboard UI
- `app/combat-ui.css`: DRAX combat/lobby interface styling
- `server/index.mjs`: HTTP server, WebSocket rooms, authoritative combat, respawn, score, heartbeat, and reconnect state
- `verify-multiplayer.mjs`: end-to-end protocol verification
- `public/models/` and `public/textures/`: runtime assets

## License and assets

Original DRAX FPS code is released under the [MIT License](LICENSE). Third-party libraries and assets retain their respective licenses and attribution requirements; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `public/third-party-notices.txt`.

This snapshot came from a local worktree originally linked to [`Hiraeth010/blackwater`](https://github.com/Hiraeth010/blackwater). The original MIT copyright notice remains in place.
